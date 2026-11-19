import { Router, Response } from 'express';
import { query, queryOne } from '../db/index.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { DashboardData, Subject, QuizAttempt, StudentPreferences } from '../../../shared/types.js';

const router = Router();

// GET /api/dashboard
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // 1. Fetch User Profile
    const userRow = await queryOne<{
      id: string;
      email: string;
      full_name: string;
      avatar_url?: string;
      role: 'student' | 'educator' | 'admin';
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM users WHERE id = ?', [userId]);

    if (!userRow) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    // 2. Fetch Preferences
    const prefRow = await queryOne<{
      interests: string;
      primary_subjects: string;
      skill_level: 'beginner' | 'intermediate' | 'advanced';
      learning_objectives: string;
      preferred_difficulty: 'foundational' | 'moderate' | 'rigorous';
      daily_goal_minutes: number;
    }>('SELECT * FROM student_preferences WHERE user_id = ?', [userId]);

    const primarySubjectsList: string[] = prefRow ? JSON.parse(prefRow.primary_subjects || '[]') : [];

    const preferences: StudentPreferences | null = prefRow
      ? {
          userId,
          interests: JSON.parse(prefRow.interests || '[]'),
          primarySubjects: primarySubjectsList,
          skillLevel: prefRow.skill_level,
          learningObjectives: JSON.parse(prefRow.learning_objectives || '[]'),
          preferredDifficulty: prefRow.preferred_difficulty,
          dailyGoalMinutes: prefRow.daily_goal_minutes
        }
      : null;

    // 3. Fetch Enrolled Subjects
    let enrolledSubjects: Subject[] = [];
    if (primarySubjectsList.length > 0) {
      const placeholders = primarySubjectsList.map(() => '?').join(',');
      const rows = await query<{
        id: string;
        slug: string;
        title: string;
        description: string;
        category: string;
        icon: string;
        color: string;
        is_featured: number;
      }>(`SELECT * FROM subjects WHERE slug IN (${placeholders}) OR id IN (${placeholders})`, [
        ...primarySubjectsList,
        ...primarySubjectsList
      ]);

      for (const s of rows) {
        const countRow = await queryOne<{ count: number }>(
          'SELECT COUNT(*) as count FROM topics WHERE subject_id = ?',
          [s.id]
        );
        enrolledSubjects.push({
          id: s.id,
          slug: s.slug,
          title: s.title,
          description: s.description,
          category: s.category,
          icon: s.icon,
          color: s.color,
          isFeatured: Boolean(s.is_featured),
          topicCount: countRow?.count || 0
        });
      }
    } else {
      // Default to featured subjects if student has not selected yet
      const rows = await query<{
        id: string;
        slug: string;
        title: string;
        description: string;
        category: string;
        icon: string;
        color: string;
        is_featured: number;
      }>('SELECT * FROM subjects WHERE is_featured = 1 LIMIT 2');
      enrolledSubjects = rows.map(s => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        description: s.description,
        category: s.category,
        icon: s.icon,
        color: s.color,
        isFeatured: true
      }));
    }

    // 4. Progress Summary from real database records
    const inProgressRow = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM student_progress WHERE user_id = ? AND status = 'in_progress'",
      [userId]
    );
    const masteredRow = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM student_progress WHERE user_id = ? AND status = 'mastered'",
      [userId]
    );
    const studyTimeRow = await queryOne<{ total_seconds: number | null }>(
      'SELECT SUM(duration_seconds) as total_seconds FROM learning_sessions WHERE user_id = ?',
      [userId]
    );
    const quizStatsRow = await queryOne<{ avg_score: number | null; total_attempts: number }>(
      'SELECT AVG(score_percentage) as avg_score, COUNT(*) as total_attempts FROM quiz_attempts WHERE user_id = ?',
      [userId]
    );

    const totalStudyMinutes = Math.round((studyTimeRow?.total_seconds || 0) / 60);
    const averageQuizScore = Math.round(quizStatsRow?.avg_score || 0);
    const totalQuizAttempts = quizStatsRow?.total_attempts || 0;

    // 5. Continue Learning (topics with progress)
    const continueRows = await query<{
      topic_id: string;
      topic_slug: string;
      topic_title: string;
      subject_slug: string;
      subject_title: string;
      mastery_score: number;
      last_studied_at: string;
      estimated_minutes: number;
    }>(
      `SELECT sp.topic_id, t.slug as topic_slug, t.title as topic_title,
              s.slug as subject_slug, s.title as subject_title,
              sp.mastery_score, sp.last_studied_at, t.estimated_minutes
       FROM student_progress sp
       JOIN topics t ON sp.topic_id = t.id
       JOIN subjects s ON t.subject_id = s.id
       WHERE sp.user_id = ?
       ORDER BY sp.last_studied_at DESC
       LIMIT 4`,
      [userId]
    );

    const continueLearning = continueRows.map(r => ({
      topicId: r.topic_id,
      topicSlug: r.topic_slug,
      topicTitle: r.topic_title,
      subjectSlug: r.subject_slug,
      subjectTitle: r.subject_title,
      masteryScore: Math.round(r.mastery_score),
      lastStudiedAt: r.last_studied_at,
      estimatedMinutes: r.estimated_minutes
    }));

    // 6. Recommended Next Actions
    const recommendedActions: Array<{
      id: string;
      title: string;
      reason: string;
      actionType: 'start_topic' | 'review_quiz' | 'complete_session';
      targetUrl: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // Check if there is an unstudied topic in primary subjects
    const unstudiedTopic = await queryOne<{
      topic_id: string;
      topic_title: string;
      topic_slug: string;
      subject_slug: string;
    }>(
      `SELECT t.id as topic_id, t.title as topic_title, t.slug as topic_slug, s.slug as subject_slug
       FROM topics t
       JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN student_progress sp ON sp.topic_id = t.id AND sp.user_id = ?
       WHERE sp.id IS NULL
       LIMIT 1`,
      [userId]
    );

    if (unstudiedTopic) {
      recommendedActions.push({
        id: 'rec-start-new',
        title: `Begin studying ${unstudiedTopic.topic_title}`,
        reason: 'Recommended based on your academic curriculum track.',
        actionType: 'start_topic',
        targetUrl: `/workspace/${unstudiedTopic.subject_slug}/${unstudiedTopic.topic_slug}`,
        priority: 'high'
      });
    }

    if (continueLearning.length > 0) {
      const topTopic = continueLearning[0];
      recommendedActions.push({
        id: 'rec-test-knowledge',
        title: `Take Quiz: ${topTopic.topicTitle}`,
        reason: `Your current mastery is ${topTopic.masteryScore}%. Taking a quiz will reinforce your retention.`,
        actionType: 'review_quiz',
        targetUrl: `/workspace/${topTopic.subjectSlug}/${topTopic.topicSlug}?tab=quiz`,
        priority: 'medium'
      });
    }

    // 7. Recent Activity
    const recentActivity: Array<{
      id: string;
      type: 'study' | 'quiz' | 'preference_update';
      title: string;
      timestamp: string;
      metadata?: Record<string, any>;
    }> = [];

    // Add recent sessions
    const recentSessions = await query<{
      id: string;
      topic_title: string;
      start_time: string;
      duration_seconds: number;
    }>(
      `SELECT ls.id, t.title as topic_title, ls.start_time, ls.duration_seconds
       FROM learning_sessions ls
       JOIN topics t ON ls.topic_id = t.id
       WHERE ls.user_id = ?
       ORDER BY ls.start_time DESC
       LIMIT 5`,
      [userId]
    );

    for (const s of recentSessions) {
      recentActivity.push({
        id: `act-sess-${s.id}`,
        type: 'study',
        title: `Studied ${s.topic_title} for ${Math.round(s.duration_seconds / 60)} minutes`,
        timestamp: s.start_time,
        metadata: { durationMinutes: Math.round(s.duration_seconds / 60) }
      });
    }

    // Add recent quizzes
    const recentQuizRows = await query<{
      id: string;
      topic_title: string;
      score_percentage: number;
      completed_at: string;
    }>(
      `SELECT qa.id, t.title as topic_title, qa.score_percentage, qa.completed_at
       FROM quiz_attempts qa
       JOIN topics t ON qa.topic_id = t.id
       WHERE qa.user_id = ?
       ORDER BY qa.completed_at DESC
       LIMIT 5`,
      [userId]
    );

    for (const q of recentQuizRows) {
      recentActivity.push({
        id: `act-quiz-${q.id}`,
        type: 'quiz',
        title: `Completed quiz on ${q.topic_title} with score ${Math.round(q.score_percentage)}%`,
        timestamp: q.completed_at,
        metadata: { score: Math.round(q.score_percentage) }
      });
    }

    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 8. Quiz History
    const quizHistoryRows = await query<{
      id: string;
      user_id: string;
      topic_id: string;
      topic_title?: string;
      subject_title?: string;
      difficulty: 'foundational' | 'moderate' | 'rigorous';
      total_questions: number;
      correct_answers: number;
      score_percentage: number;
      time_taken_seconds: number;
      completed_at: string;
    }>(
      `SELECT qa.*, t.title as topic_title, s.title as subject_title
       FROM quiz_attempts qa
       JOIN topics t ON qa.topic_id = t.id
       JOIN subjects s ON t.subject_id = s.id
       WHERE qa.user_id = ?
       ORDER BY qa.completed_at DESC
       LIMIT 10`,
      [userId]
    );

    const quizHistory: QuizAttempt[] = quizHistoryRows.map(qa => ({
      id: qa.id,
      userId: qa.user_id,
      topicId: qa.topic_id,
      topicTitle: qa.topic_title,
      subjectTitle: qa.subject_title,
      difficulty: qa.difficulty,
      totalQuestions: qa.total_questions,
      correctAnswers: qa.correct_answers,
      scorePercentage: qa.score_percentage,
      timeTakenSeconds: qa.time_taken_seconds,
      completedAt: qa.completed_at
    }));

    const dashboardData: DashboardData = {
      student: {
        id: userRow.id,
        email: userRow.email,
        fullName: userRow.full_name,
        avatarUrl: userRow.avatar_url,
        role: userRow.role,
        createdAt: userRow.created_at,
        updatedAt: userRow.updated_at
      },
      preferences,
      enrolledSubjects,
      recentActivity: recentActivity.slice(0, 8),
      progressSummary: {
        topicsInProgress: inProgressRow?.count || 0,
        topicsMastered: masteredRow?.count || 0,
        totalStudyMinutes,
        averageQuizScore,
        totalQuizAttempts
      },
      continueLearning,
      recommendedActions,
      quizHistory
    };

    return res.json({ success: true, dashboard: dashboardData });
  } catch (err: any) {
    console.error('[Dashboard] Aggregation error:', err);
    return res.status(500).json({ success: false, error: 'Failed to aggregate dashboard metrics' });
  }
});

export default router;

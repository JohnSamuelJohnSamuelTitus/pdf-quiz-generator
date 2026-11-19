import { AnalyticsData, ProgressStatus } from '../../../shared/types.js';
import { query, queryOne } from '../db/index.js';
import { WeaknessDetectorService } from './weakness-detector.service.js';

export class AnalyticsService {
  /**
   * Generates comprehensive performance analytics derived strictly from real database records
   */
  static async getStudentAnalytics(userId: string): Promise<AnalyticsData> {
    // 1. Overall stats
    const overallRow = await queryOne<{
      total_quizzes: number;
      total_questions: number | null;
      avg_score: number | null;
    }>(
      `SELECT COUNT(id) as total_quizzes,
              SUM(total_questions) as total_questions,
              AVG(score_percentage) as avg_score
       FROM quiz_attempts
       WHERE user_id = ?`,
      [userId]
    );

    const studyTimeRow = await queryOne<{ total_seconds: number | null }>(
      'SELECT SUM(duration_seconds) as total_seconds FROM learning_sessions WHERE user_id = ?',
      [userId]
    );

    const masteredRow = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM student_progress WHERE user_id = ? AND (status = 'mastered' OR mastery_score >= 80)",
      [userId]
    );

    const overallAccuracy = Math.round(overallRow?.avg_score || 0);
    const totalQuizzesTaken = overallRow?.total_quizzes || 0;
    const totalQuestionsAnswered = overallRow?.total_questions || 0;
    const totalStudyHours = Math.round(((studyTimeRow?.total_seconds || 0) / 3600) * 10) / 10;
    const topicsMasteredCount = masteredRow?.count || 0;

    // 2. Subject performance breakdown
    const subjectRows = await query<{
      subject_title: string;
      subject_slug: string;
      avg_score: number | null;
      quizzes_taken: number;
      avg_mastery: number | null;
    }>(
      `SELECT s.title as subject_title, s.slug as subject_slug,
              AVG(qa.score_percentage) as avg_score,
              COUNT(qa.id) as quizzes_taken,
              AVG(sp.mastery_score) as avg_mastery
       FROM subjects s
       JOIN topics t ON t.subject_id = s.id
       LEFT JOIN quiz_attempts qa ON qa.topic_id = t.id AND qa.user_id = ?
       LEFT JOIN student_progress sp ON sp.topic_id = t.id AND sp.user_id = ?
       GROUP BY s.id
       ORDER BY s.title ASC`,
      [userId, userId]
    );

    const subjectPerformance = subjectRows.map(sr => ({
      subjectTitle: sr.subject_title,
      subjectSlug: sr.subject_slug,
      avgScore: Math.round(sr.avg_score || 0),
      quizzesTaken: sr.quizzes_taken,
      masteryScore: Math.round(sr.avg_mastery || 0)
    }));

    // 3. Topic accuracy breakdown
    const topicRows = await query<{
      topic_title: string;
      topic_slug: string;
      subject_title: string;
      avg_accuracy: number | null;
      mastery_score: number | null;
      status: ProgressStatus;
      attempts_count: number;
    }>(
      `SELECT t.title as topic_title, t.slug as topic_slug,
              s.title as subject_title,
              AVG(qa.score_percentage) as avg_accuracy,
              sp.mastery_score,
              COALESCE(sp.status, 'not_started') as status,
              COUNT(qa.id) as attempts_count
       FROM topics t
       JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN student_progress sp ON sp.topic_id = t.id AND sp.user_id = ?
       LEFT JOIN quiz_attempts qa ON qa.topic_id = t.id AND qa.user_id = ?
       GROUP BY t.id
       HAVING attempts_count > 0 OR sp.mastery_score > 0
       ORDER BY sp.mastery_score DESC`,
      [userId, userId]
    );

    const topicAccuracyBreakdown = topicRows.map(tr => ({
      topicTitle: tr.topic_title,
      topicSlug: tr.topic_slug,
      subjectTitle: tr.subject_title,
      accuracy: Math.round(tr.avg_accuracy || 0),
      masteryScore: Math.round(tr.mastery_score || 0),
      status: tr.status,
      attemptsCount: tr.attempts_count
    }));

    // 4. Score trends over time
    const trendRows = await query<{
      id: string;
      topic_title: string;
      score_percentage: number;
      completed_at: string;
    }>(
      `SELECT qa.id, t.title as topic_title, qa.score_percentage, qa.completed_at
       FROM quiz_attempts qa
       JOIN topics t ON qa.topic_id = t.id
       WHERE qa.user_id = ?
       ORDER BY qa.completed_at ASC
       LIMIT 15`,
      [userId]
    );

    const scoreTrends = trendRows.map(tr => ({
      attemptId: tr.id,
      topicTitle: tr.topic_title,
      score: Math.round(tr.score_percentage),
      date: new Date(tr.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
    }));

    // 5. Weaknesses & Strengths
    const weaknesses = await WeaknessDetectorService.detectStudentWeaknesses(userId);
    const strengthRows = await WeaknessDetectorService.detectStudentStrengths(userId);
    const strengths = strengthRows.map(sr => ({
      topicTitle: sr.topic_title,
      masteryScore: Math.round(sr.mastery_score),
      status: (sr.mastery_score >= 85 ? 'mastered' : 'completed') as ProgressStatus,
      quizzesCompleted: sr.quizzes_completed
    }));

    // 6. Learning distribution by day of week
    const distributionRows = await query<{
      day_name: string;
      total_mins: number;
    }>(
      `SELECT strftime('%w', start_time) as day_num,
              SUM(duration_seconds) / 60 as total_mins
       FROM learning_sessions
       WHERE user_id = ?
       GROUP BY day_num`,
      [userId]
    );

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const learningDistribution = dayLabels.map((day, idx) => {
      const match = distributionRows.find(r => parseInt((r as any).day_num, 10) === idx);
      return {
        day,
        minutes: match ? Math.round(match.total_mins) : 0
      };
    });

    return {
      overallAccuracy,
      totalQuizzesTaken,
      totalQuestionsAnswered,
      totalStudyHours,
      topicsMasteredCount,
      subjectPerformance,
      topicAccuracyBreakdown,
      scoreTrends,
      weaknesses,
      strengths,
      learningDistribution
    };
  }
}

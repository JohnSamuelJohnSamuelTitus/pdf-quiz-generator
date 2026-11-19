import { WeaknessReport } from '../../../shared/types.js';
import { query, queryOne, run } from '../db/index.js';

export class WeaknessDetectorService {
  /**
   * Identifies specific academic weaknesses from real quiz answer records
   */
  static async detectStudentWeaknesses(userId: string): Promise<WeaknessReport[]> {
    // 1. Query incorrect questions grouped by topic and concept
    const incorrectAnswers = await query<{
      topic_id: string;
      topic_title: string;
      topic_slug: string;
      subject_title: string;
      question_text: string;
      mistake_count: number;
      last_missed: string;
    }>(
      `SELECT t.id as topic_id, t.title as topic_title, t.slug as topic_slug,
              s.title as subject_title, qa.question_text,
              COUNT(qa.id) as mistake_count, MAX(att.completed_at) as last_missed
       FROM quiz_answers qa
       JOIN quiz_attempts att ON qa.attempt_id = att.id
       JOIN topics t ON att.topic_id = t.id
       JOIN subjects s ON t.subject_id = s.id
       WHERE att.user_id = ? AND qa.is_correct = 0
       GROUP BY t.id, qa.question_text
       HAVING mistake_count >= 1
       ORDER BY mistake_count DESC, last_missed DESC
       LIMIT 10`,
      [userId]
    );

    const reports: WeaknessReport[] = [];

    for (const item of incorrectAnswers) {
      // Extract brief concept keyword from question text
      const conceptName = item.question_text.length > 50
        ? item.question_text.substring(0, 47) + '...'
        : item.question_text;

      // Determine recommended remedial action
      let action = '';
      if (item.mistake_count >= 3) {
        action = `Critical repetition: missed ${item.mistake_count} times. Recommend reviewing the core Wikipedia extract and CLRS textbook notes before attempting another quiz.`;
      } else if (item.mistake_count === 2) {
        action = `Recurring error: missed twice. Review the question rationale and practice with foundational difficulty questions.`;
      } else {
        action = `Recent mistake recorded on ${new Date(item.last_missed).toLocaleDateString()}. Take a focused 3-question review session.`;
      }

      // Check or record into student_weaknesses table
      const weaknessId = `wk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      try {
        await run(
          `INSERT INTO student_weaknesses (id, user_id, topic_id, concept_name, mistake_count, last_missed_at, is_resolved)
           VALUES (?, ?, ?, ?, ?, ?, 0)
           ON CONFLICT(user_id, topic_id, concept_name) DO UPDATE SET
             mistake_count = excluded.mistake_count,
             last_missed_at = excluded.last_missed_at`,
          [weaknessId, userId, item.topic_id, conceptName, item.mistake_count, item.last_missed]
        );
      } catch (err) {
        // Table safe
      }

      reports.push({
        id: weaknessId,
        topicId: item.topic_id,
        topicSlug: item.topic_slug,
        topicTitle: item.topic_title,
        subjectTitle: item.subject_title,
        conceptName,
        mistakeCount: item.mistake_count,
        lastMissedAt: item.last_missed,
        isResolved: false,
        recommendedAction: action
      });
    }

    return reports;
  }

  /**
   * Evaluates overall academic strengths and mastery topics
   */
  static async detectStudentStrengths(userId: string) {
    return query<{
      topic_id: string;
      topic_title: string;
      topic_slug: string;
      subject_title: string;
      mastery_score: number;
      quizzes_completed: number;
    }>(
      `SELECT t.id as topic_id, t.title as topic_title, t.slug as topic_slug,
              s.title as subject_title, sp.mastery_score,
              COUNT(qa.id) as quizzes_completed
       FROM student_progress sp
       JOIN topics t ON sp.topic_id = t.id
       JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN quiz_attempts qa ON qa.topic_id = t.id AND qa.user_id = sp.user_id
       WHERE sp.user_id = ? AND sp.mastery_score >= 80
       GROUP BY t.id
       ORDER BY sp.mastery_score DESC`,
      [userId]
    );
  }
}

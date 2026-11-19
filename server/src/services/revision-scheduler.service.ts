import { RevisionRecommendation } from '../../../shared/types.js';
import { query, run } from '../db/index.js';

export class RevisionSchedulerService {
  /**
   * Calculates spaced-repetition revision schedules based on real student activity
   */
  static async getScheduledRevisions(userId: string): Promise<RevisionRecommendation[]> {
    // Query topics that have been studied or tested by the student
    const topicRecords = await query<{
      topic_id: string;
      topic_slug: string;
      topic_title: string;
      subject_slug: string;
      subject_title: string;
      mastery_score: number;
      last_studied_at: string;
      attempts_count: number;
      avg_score: number | null;
    }>(
      `SELECT sp.topic_id, t.slug as topic_slug, t.title as topic_title,
              s.slug as subject_slug, s.title as subject_title,
              sp.mastery_score, sp.last_studied_at,
              COUNT(qa.id) as attempts_count,
              AVG(qa.score_percentage) as avg_score
       FROM student_progress sp
       JOIN topics t ON sp.topic_id = t.id
       JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN quiz_attempts qa ON qa.topic_id = t.id AND qa.user_id = sp.user_id
       WHERE sp.user_id = ?
       GROUP BY sp.topic_id
       ORDER BY sp.last_studied_at ASC`,
      [userId]
    );

    const now = Date.now();
    const recommendations: RevisionRecommendation[] = [];

    for (const record of topicRecords) {
      const lastStudiedTime = new Date(record.last_studied_at).getTime();
      const elapsedDays = Math.max(0, Math.floor((now - lastStudiedTime) / (24 * 3600 * 1000)));
      const mastery = Math.round(record.mastery_score);

      let urgency: 'low' | 'medium' | 'high' = 'low';
      let dueDays = 7;
      let reason = '';

      // Spaced-repetition interval logic
      if (mastery < 50) {
        // Low mastery: review within 1-2 days
        dueDays = 1;
        if (elapsedDays >= 1) {
          urgency = 'high';
          reason = `Low topic mastery (${mastery}%). Spaced repetition requires immediate review (studied ${elapsedDays} day(s) ago).`;
        } else {
          urgency = 'medium';
          reason = `Low topic mastery (${mastery}%). Scheduled for review within 24 hours.`;
        }
      } else if (mastery >= 50 && mastery < 75) {
        // Moderate mastery: review within 3-4 days
        dueDays = 3;
        if (elapsedDays >= 3) {
          urgency = 'high';
          reason = `Retention decay risk: last reviewed ${elapsedDays} days ago with ${mastery}% mastery. Consolidating review needed.`;
        } else {
          urgency = 'medium';
          reason = `Progressing mastery (${mastery}%). Scheduled for spaced review in ${Math.max(1, dueDays - elapsedDays)} days.`;
        }
      } else {
        // High mastery (>= 75%): review within 7-10 days
        dueDays = 7;
        if (elapsedDays >= 7) {
          urgency = 'medium';
          reason = `Mastery retention check: last practiced ${elapsedDays} days ago. Quick refresher recommended.`;
        } else {
          urgency = 'low';
          reason = `Mastery strong (${mastery}%). Next maintenance review scheduled in ${Math.max(1, dueDays - elapsedDays)} days.`;
        }
      }

      const scheduledDate = new Date(lastStudiedTime + dueDays * 24 * 3600 * 1000)
        .toISOString()
        .split('T')[0];

      const recId = `rev-${record.topic_id}`;

      // Persist to revision_schedules table
      try {
        await run(
          `INSERT INTO revision_schedules (id, user_id, topic_id, scheduled_for, urgency, reason, is_completed)
           VALUES (?, ?, ?, ?, ?, ?, 0)
           ON CONFLICT(id) DO UPDATE SET
             scheduled_for = excluded.scheduled_for,
             urgency = excluded.urgency,
             reason = excluded.reason`,
          [recId, userId, record.topic_id, scheduledDate, urgency, reason]
        );
      } catch (err) {
        // Table safe
      }

      recommendations.push({
        id: recId,
        topicId: record.topic_id,
        topicSlug: record.topic_slug,
        topicTitle: record.topic_title,
        subjectSlug: record.subject_slug,
        subjectTitle: record.subject_title,
        scheduledFor: scheduledDate,
        urgency,
        reason,
        lastStudiedDaysAgo: elapsedDays,
        currentMastery: mastery
      });
    }

    // Sort by urgency: high first, then medium, then low
    const urgencyWeight = { high: 3, medium: 2, low: 1 };
    recommendations.sort((a, b) => urgencyWeight[b.urgency] - urgencyWeight[a.urgency]);

    return recommendations;
  }
}

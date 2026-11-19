import { DifficultyLevel, AdaptiveDifficultyStatus } from '../../../shared/types.js';
import { query, queryOne, run } from '../db/index.js';

export class AdaptiveDifficultyService {
  /**
   * Computes the adaptive difficulty recommendations for a student on a specific topic
   */
  static async evaluateTopicDifficulty(
    userId: string,
    topicId: string
  ): Promise<AdaptiveDifficultyStatus> {
    // 1. Fetch topic details
    const topic = await queryOne<{ id: string; title: string; difficulty_level: DifficultyLevel }>(
      'SELECT id, title, difficulty_level FROM topics WHERE id = ? OR slug = ?',
      [topicId, topicId]
    );

    const topicTitle = topic ? topic.title : 'Selected Topic';
    const currentDiff = topic ? topic.difficulty_level : 'moderate';

    // 2. Fetch past quiz attempts on this topic
    const attempts = await query<{
      score_percentage: number;
      difficulty: DifficultyLevel;
      completed_at: string;
    }>(
      'SELECT score_percentage, difficulty, completed_at FROM quiz_attempts WHERE user_id = ? AND topic_id = ? ORDER BY completed_at DESC LIMIT 5',
      [userId, topicId]
    );

    if (attempts.length === 0) {
      return {
        topicId,
        topicTitle,
        currentDifficulty: currentDiff,
        recommendedDifficulty: currentDiff,
        recentAccuracy: 0,
        attemptsCount: 0,
        reason: 'Initial baseline: start at curriculum recommended difficulty.'
      };
    }

    // 3. Compute weighted moving average accuracy (recent attempts carry higher weight)
    let weightedScoreSum = 0;
    let weightSum = 0;
    attempts.forEach((att, idx) => {
      const weight = 1 / (idx + 1); // 1.0 for most recent, 0.5 for second, etc.
      weightedScoreSum += att.score_percentage * weight;
      weightSum += weight;
    });

    const recentAccuracy = Math.round(weightedScoreSum / weightSum);
    const attemptsCount = attempts.length;

    // 4. Apply adaptive threshold rules
    let recommended: DifficultyLevel = 'moderate';
    let reason = '';

    if (recentAccuracy < 50) {
      recommended = 'foundational';
      reason = `Recent weighted accuracy is ${recentAccuracy}%. Recommended foundational questions with expanded explanations to reinforce core principles.`;
    } else if (recentAccuracy >= 50 && recentAccuracy < 70) {
      recommended = attemptsCount >= 2 ? 'moderate' : 'foundational';
      reason = `Recent weighted accuracy is ${recentAccuracy}%. Consolidating competency with moderate problem sets.`;
    } else if (recentAccuracy >= 70 && recentAccuracy < 85) {
      recommended = 'moderate';
      reason = `Consistent competency demonstrated (${recentAccuracy}% accuracy across ${attemptsCount} attempts). Ready for standard moderate problem solving.`;
    } else {
      // >= 85% accuracy
      if (attemptsCount >= 2) {
        recommended = 'rigorous';
        reason = `High mastery demonstrated (${recentAccuracy}% accuracy across ${attemptsCount} attempts). Introducing rigorous edge cases and proofs.`;
      } else {
        recommended = 'moderate';
        reason = `High single-attempt score (${recentAccuracy}%). Verifying retention before escalating to rigorous challenge.`;
      }
    }

    // 5. Record adjustment snapshot into topic_mastery_history
    try {
      const histId = `tmh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await run(
        `INSERT INTO topic_mastery_history (id, user_id, topic_id, mastery_score, difficulty_level)
         VALUES (?, ?, ?, ?, ?)`,
        [histId, userId, topicId, recentAccuracy, recommended]
      );
    } catch (err) {
      console.warn('[AdaptiveDifficulty] History snapshot failed:', err);
    }

    return {
      topicId,
      topicTitle,
      currentDifficulty: currentDiff,
      recommendedDifficulty: recommended,
      recentAccuracy,
      attemptsCount,
      reason
    };
  }

  /**
   * Retrieves full adaptive status across all topics for student dashboard
   */
  static async getStudentAdaptiveProfiles(userId: string): Promise<AdaptiveDifficultyStatus[]> {
    const activeTopics = await query<{ topic_id: string }>(
      'SELECT DISTINCT topic_id FROM quiz_attempts WHERE user_id = ?',
      [userId]
    );

    const profiles: AdaptiveDifficultyStatus[] = [];
    for (const t of activeTopics) {
      const status = await this.evaluateTopicDifficulty(userId, t.topic_id);
      profiles.push(status);
    }

    return profiles;
  }
}

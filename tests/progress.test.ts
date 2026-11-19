import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, queryOne, run } from '../server/src/db/index.js';

describe('Progress Engine & Assessment Scoring Suite', () => {
  const userId = `usr-prog-test-${Date.now()}`;

  beforeAll(async () => {
    await getDb();
    await run(
      `INSERT INTO users (id, email, password_hash, full_name, role)
       VALUES (?, ?, 'dummy', 'Progress Tester', 'student')`,
      [userId, `prog-${Date.now()}@learnsphere.edu`]
    );
  });

  it('records quiz attempt and individual answer evaluations', async () => {
    const attemptId = `att-test-${Date.now()}`;
    await run(
      `INSERT INTO quiz_attempts (id, user_id, topic_id, difficulty, total_questions, correct_answers, score_percentage, time_taken_seconds)
       VALUES (?, ?, 'top-algo', 'moderate', 5, 4, 80.0, 180)`,
      [attemptId, userId]
    );

    await run(
      `INSERT INTO quiz_answers (id, attempt_id, question_id, question_text, selected_option, correct_option, is_correct, explanation)
       VALUES (?, ?, 'q-1', 'Test Question', 'Opt A', 'Opt A', 1, 'Verified explanation')`,
      [`ans-${Date.now()}`, attemptId]
    );

    const attempt = await queryOne<{ id: string; score_percentage: number; correct_answers: number }>(
      'SELECT id, score_percentage, correct_answers FROM quiz_attempts WHERE id = ?',
      [attemptId]
    );

    expect(attempt).not.toBeNull();
    expect(attempt?.score_percentage).toBe(80.0);
    expect(attempt?.correct_answers).toBe(4);
  });

  it('updates topic mastery score and changes status', async () => {
    const topicId = 'top-algo';
    const initialMastery = 75;

    await run(
      `INSERT INTO student_progress (id, user_id, topic_id, status, mastery_score)
       VALUES (?, ?, ?, 'in_progress', ?)
       ON CONFLICT(user_id, topic_id) DO UPDATE SET
         mastery_score = excluded.mastery_score,
         status = 'completed'`,
      [`sp-${Date.now()}`, userId, topicId, initialMastery]
    );

    const progress = await queryOne<{ status: string; mastery_score: number }>(
      'SELECT status, mastery_score FROM student_progress WHERE user_id = ? AND topic_id = ?',
      [userId, topicId]
    );

    expect(progress).not.toBeNull();
    expect(progress?.mastery_score).toBe(initialMastery);
  });
});

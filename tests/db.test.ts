import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, query, queryOne, run } from '../server/src/db/index.js';

describe('Database Architecture & Persistence Suite', () => {
  beforeAll(async () => {
    await getDb();
  });

  it('initializes relational tables with correct schema', async () => {
    const tables = await query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('users');
    expect(tableNames).toContain('student_preferences');
    expect(tableNames).toContain('subjects');
    expect(tableNames).toContain('topics');
    expect(tableNames).toContain('learning_resources');
    expect(tableNames).toContain('learning_sessions');
    expect(tableNames).toContain('quiz_attempts');
    expect(tableNames).toContain('quiz_answers');
    expect(tableNames).toContain('student_progress');
    expect(tableNames).toContain('api_cache');
  });

  it('persists and retrieves student preferences', async () => {
    const testUserId = `usr-pref-${Date.now()}`;
    await run(
      `INSERT INTO users (id, email, password_hash, full_name, role)
       VALUES (?, ?, 'dummy', 'Pref Student', 'student')`,
      [testUserId, `pref-${Date.now()}@learnsphere.edu`]
    );

    await run(
      `INSERT INTO student_preferences (user_id, interests, primary_subjects, skill_level, learning_objectives, preferred_difficulty, daily_goal_minutes)
       VALUES (?, ?, ?, 'intermediate', ?, 'moderate', 45)`,
      [
        testUserId,
        JSON.stringify(['Algorithms', 'Linear Algebra']),
        JSON.stringify(['computer-science']),
        JSON.stringify(['Prepare for exam'])
      ]
    );

    const saved = await queryOne<{
      user_id: string;
      skill_level: string;
      daily_goal_minutes: number;
      interests: string;
    }>('SELECT * FROM student_preferences WHERE user_id = ?', [testUserId]);

    expect(saved).not.toBeNull();
    expect(saved?.skill_level).toBe('intermediate');
    expect(saved?.daily_goal_minutes).toBe(45);
    expect(JSON.parse(saved?.interests || '[]')).toContain('Algorithms');
  });

  it('enforces subject and topic relationships', async () => {
    const subjects = await query<{ id: string; slug: string }>('SELECT id, slug FROM subjects LIMIT 1');
    expect(subjects.length).toBeGreaterThan(0);

    const subject = subjects[0];
    const topics = await query<{ id: string; subject_id: string }>(
      'SELECT id, subject_id FROM topics WHERE subject_id = ?',
      [subject.id]
    );

    expect(topics.length).toBeGreaterThan(0);
    expect(topics[0].subject_id).toBe(subject.id);
  });

  it('logs study session and persists duration', async () => {
    const testUserId = `usr-sess-${Date.now()}`;
    await run(
      `INSERT INTO users (id, email, password_hash, full_name, role)
       VALUES (?, ?, 'dummy', 'Session Student', 'student')`,
      [testUserId, `sess-${Date.now()}@learnsphere.edu`]
    );

    const sessionId = `sess-${Date.now()}`;
    await run(
      `INSERT INTO learning_sessions (id, user_id, topic_id, duration_seconds, notes, status)
       VALUES (?, ?, 'top-algo', 1200, 'Reviewed asymptotic graphs', 'completed')`,
      [sessionId, testUserId]
    );

    const session = await queryOne<{ id: string; duration_seconds: number; notes: string }>(
      'SELECT id, duration_seconds, notes FROM learning_sessions WHERE id = ?',
      [sessionId]
    );

    expect(session).not.toBeNull();
    expect(session?.duration_seconds).toBe(1200);
    expect(session?.notes).toContain('asymptotic graphs');
  });
});

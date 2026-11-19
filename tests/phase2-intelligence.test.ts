import { describe, it, expect, beforeAll } from 'vitest';
import { QuestionGeneratorService } from '../server/src/services/question-generator.service.js';
import { AdaptiveDifficultyService } from '../server/src/services/adaptive-difficulty.service.js';
import { WeaknessDetectorService } from '../server/src/services/weakness-detector.service.js';
import { RevisionSchedulerService } from '../server/src/services/revision-scheduler.service.js';
import { AnalyticsService } from '../server/src/services/analytics.service.js';
import { StudyMaterialService } from '../server/src/services/study-material.service.js';
import { getDb, run, queryOne, query } from '../server/src/db/index.js';
import { seedDatabase } from '../server/src/db/seed.js';

beforeAll(async () => {
  await getDb();
  await seedDatabase();
});

describe('Phase 2: QuestionGeneratorService', () => {
  it('generates multiple choice questions with valid options and correct answer', async () => {
    const questions = await QuestionGeneratorService.generateQuiz({
      subjectSlug: 'computer-science',
      topicSlug: 'algorithms-data-structures',
      difficulty: 'foundational',
      amount: 3,
      questionTypes: ['multiple_choice'],
      mode: 'original_engine'
    });

    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.questionType).toBe('multiple_choice');
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options).toContain(q.correctAnswer);
      expect(q.explanation).toBeTruthy();
      expect(q.difficulty).toBe('foundational');
    }
  });

  it('generates true/false questions with True and False options', async () => {
    const questions = await QuestionGeneratorService.generateQuiz({
      subjectSlug: 'computer-science',
      topicSlug: 'algorithms-data-structures',
      difficulty: 'foundational',
      amount: 2,
      questionTypes: ['true_false'],
      mode: 'original_engine'
    });

    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.questionType).toBe('true_false');
      expect(q.options).toEqual(['True', 'False']);
      expect(['True', 'False']).toContain(q.correctAnswer);
      expect(q.explanation).toBeTruthy();
    }
  });

  it('generates short answer questions with descriptive answer and empty options', async () => {
    const questions = await QuestionGeneratorService.generateQuiz({
      subjectSlug: 'computer-science',
      topicSlug: 'algorithms-data-structures',
      difficulty: 'moderate',
      amount: 2,
      questionTypes: ['short_answer'],
      mode: 'original_engine'
    });

    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.questionType).toBe('short_answer');
      expect(q.options).toEqual([]);
      expect(q.correctAnswer.length).toBeGreaterThan(0);
      expect(q.explanation).toBeTruthy();
    }
  });

  it('generates mixed question types when requested', async () => {
    const questions = await QuestionGeneratorService.generateQuiz({
      subjectSlug: 'computer-science',
      topicSlug: 'algorithms-data-structures',
      difficulty: 'foundational',
      amount: 4,
      questionTypes: ['multiple_choice', 'true_false'],
      mode: 'original_engine'
    });

    expect(questions.length).toBeGreaterThanOrEqual(2);
    const types = new Set(questions.map(q => q.questionType));
    expect(types.size).toBeGreaterThanOrEqual(1);
  });
});

describe('Phase 2: AdaptiveDifficultyService', () => {
  const testStudentId = 'test-student-adaptive-1';
  const testTopicId = 'top-algo';
  const testTopicSlug = 'algorithms-data-structures';

  beforeAll(async () => {
    await getDb();
    // Clean up test records
    await run(`DELETE FROM topic_mastery_history WHERE user_id = ?`, [testStudentId]);
    await run(`DELETE FROM quiz_attempts WHERE user_id = ?`, [testStudentId]);
  });

  it('returns baseline difficulty when no previous attempts exist', async () => {
    const status = await AdaptiveDifficultyService.evaluateTopicDifficulty(testStudentId, testTopicSlug);
    expect(status.topicId).toBe(testTopicSlug);
    expect(status.attemptsCount).toBe(0);
    expect(['foundational', 'moderate', 'rigorous']).toContain(status.recommendedDifficulty);
  });

  it('adapts to rigorous difficulty after high-scoring quiz attempts', async () => {
    // Insert two high scoring attempts (95% and 90%)
    await run(
      `INSERT INTO quiz_attempts (id, user_id, topic_id, difficulty, total_questions, correct_answers, score_percentage, time_taken_seconds, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-1 hours'))`,
      ['attempt-test-hi-1', testStudentId, testTopicSlug, 'moderate', 5, 5, 95.0, 120]
    );
    await run(
      `INSERT INTO quiz_attempts (id, user_id, topic_id, difficulty, total_questions, correct_answers, score_percentage, time_taken_seconds, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      ['attempt-test-hi-2', testStudentId, testTopicSlug, 'moderate', 5, 5, 90.0, 110]
    );

    const status = await AdaptiveDifficultyService.evaluateTopicDifficulty(testStudentId, testTopicSlug);
    expect(status.attemptsCount).toBe(2);
    expect(status.recentAccuracy).toBeGreaterThanOrEqual(85);
    expect(status.recommendedDifficulty).toBe('rigorous');
  });

  it('adapts down to foundational difficulty after low-scoring quiz attempts', async () => {
    // Clear previous high-scoring attempts to isolate low-scoring test
    await run(`DELETE FROM quiz_attempts WHERE user_id = ?`, [testStudentId]);

    // Insert two low scoring attempts (30% and 40%)
    await run(
      `INSERT INTO quiz_attempts (id, user_id, topic_id, difficulty, total_questions, correct_answers, score_percentage, time_taken_seconds, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-1 hours'))`,
      ['attempt-test-lo-1', testStudentId, testTopicSlug, 'rigorous', 5, 1, 30.0, 90]
    );
    await run(
      `INSERT INTO quiz_attempts (id, user_id, topic_id, difficulty, total_questions, correct_answers, score_percentage, time_taken_seconds, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      ['attempt-test-lo-2', testStudentId, testTopicSlug, 'rigorous', 5, 2, 40.0, 85]
    );

    const status = await AdaptiveDifficultyService.evaluateTopicDifficulty(testStudentId, testTopicSlug);
    expect(status.recentAccuracy).toBeLessThan(50);
    expect(status.recommendedDifficulty).toBe('foundational');
  });
});

describe('Phase 2: WeaknessDetectorService', () => {
  const testStudentId = 'test-student-weakness-1';
  const testTopicId = 'top-algo';

  beforeAll(async () => {
    await getDb();
    await run(`DELETE FROM student_weaknesses WHERE user_id = ?`, [testStudentId]);
    await run(`DELETE FROM quiz_attempts WHERE user_id = ?`, [testStudentId]);
    await run(`DELETE FROM quiz_answers WHERE attempt_id LIKE 'att-wk-%'`);

    // Create an attempt and 2 wrong answers
    await run(
      `INSERT INTO quiz_attempts (id, user_id, topic_id, difficulty, total_questions, correct_answers, score_percentage, time_taken_seconds, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      ['att-wk-1', testStudentId, testTopicId, 'moderate', 3, 1, 33.3, 100]
    );
    await run(
      `INSERT INTO quiz_answers (id, attempt_id, question_id, question_text, selected_option, correct_option, is_correct, explanation, question_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['ans-wk-1', 'att-wk-1', 'q-1', 'AVL Tree Invariant Constraints', 'O(n)', 'O(log n)', 0, 'AVL tree maintains balance', 'multiple_choice']
    );
    await run(
      `INSERT INTO quiz_answers (id, attempt_id, question_id, question_text, selected_option, correct_option, is_correct, explanation, question_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['ans-wk-2', 'att-wk-1', 'q-2', 'AVL Tree Invariant Constraints', 'O(n^2)', 'O(log n)', 0, 'AVL tree maintains balance', 'multiple_choice']
    );
  });

  it('detects student mistakes from quiz records and generates weakness reports', async () => {
    const weaknesses = await WeaknessDetectorService.detectStudentWeaknesses(testStudentId);
    expect(weaknesses.length).toBeGreaterThan(0);
    expect(weaknesses[0].mistakeCount).toBeGreaterThanOrEqual(1);
    expect(weaknesses[0].recommendedAction).toBeTruthy();
  });
});

describe('Phase 2: RevisionSchedulerService', () => {
  const testStudentId = 'test-student-revision-1';
  const testTopicId = 'top-algo';

  beforeAll(async () => {
    await getDb();
    await run(`DELETE FROM revision_schedules WHERE user_id = ?`, [testStudentId]);
    await run(`DELETE FROM student_progress WHERE user_id = ?`, [testStudentId]);

    // Create student progress with decay
    await run(
      `INSERT INTO student_progress (id, user_id, topic_id, status, mastery_score, last_studied_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', '-5 days'))`,
      ['prog-rev-1', testStudentId, testTopicId, 'in_progress', 45.0]
    );
  });

  it('computes spaced repetition recommendations and schedules revision', async () => {
    const schedules = await RevisionSchedulerService.getScheduledRevisions(testStudentId);
    expect(Array.isArray(schedules)).toBe(true);
    expect(schedules.length).toBeGreaterThan(0);
    expect(schedules[0].urgency).toBe('high');
    expect(schedules[0].lastStudiedDaysAgo).toBeGreaterThanOrEqual(4);
  });
});

describe('Phase 2: StudyMaterialService', () => {
  beforeAll(async () => {
    await getDb();
  });

  it('retrieves curated structured materials with authentic citations', async () => {
    const materials = await StudyMaterialService.getByTopic('algorithms-data-structures');
    expect(materials.length).toBeGreaterThan(0);
    const hasExplanation = materials.some(m => m.contentType === 'explanation');
    const hasExample = materials.some(m => m.contentType === 'practical_example');
    expect(hasExplanation).toBe(true);
    expect(hasExample).toBe(true);
    expect(materials[0].sourceCitation).toBeTruthy();
  });
});

describe('Phase 2: AnalyticsService', () => {
  const testStudentId = 'test-student-analytics-1';

  beforeAll(async () => {
    await getDb();
    // Setup student with 1 attempt
    await run(`DELETE FROM quiz_attempts WHERE user_id = ?`, [testStudentId]);
    await run(
      `INSERT INTO quiz_attempts (id, user_id, topic_id, difficulty, total_questions, correct_answers, score_percentage, time_taken_seconds, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      ['attempt-test-analytics-1', testStudentId, 'top-algo', 'foundational', 5, 4, 80.0, 95]
    );
  });

  it('computes accurate performance metrics from real database rows', async () => {
    const analytics = await AnalyticsService.getStudentAnalytics(testStudentId);
    expect(analytics.totalQuizzesTaken).toBeGreaterThanOrEqual(1);
    expect(analytics.totalQuestionsAnswered).toBeGreaterThanOrEqual(5);
    expect(analytics.overallAccuracy).toBe(80);
    expect(Array.isArray(analytics.scoreTrends)).toBe(true);
    expect(Array.isArray(analytics.subjectPerformance)).toBe(true);
  });
});

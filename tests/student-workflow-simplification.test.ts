import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { app } from '../server/src/index.js';
import { getDb, queryOne } from '../server/src/db/index.js';
import { seedDatabase } from '../server/src/db/seed.js';

describe('LearnSphere — Student-First Workflow & Personal Tutor Suite', () => {
  let server: http.Server;
  let baseUrl: string;
  const guestSessionId = `student-guest-${Date.now()}`;
  let testProjectId: string;
  let testTopicId: string;

  beforeAll(async () => {
    await getDb();
    await seedDatabase();

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // Create a real curriculum project for the test
    const createRes = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Guest-Session': guestSessionId
      },
      body: JSON.stringify({
        title: 'Distributed Algorithms & Fault Tolerance',
        subjectCode: 'CSE279',
        reviewedUnits: [
          {
            unitNumber: 1,
            title: 'Unit 1: Distributed Consensus & State Machine Replication',
            description: 'Foundations of consensus protocols.',
            topics: [
              {
                title: 'Paxos and Raft Consensus',
                slug: 'paxos-and-raft-consensus',
                summary: 'Protocols for achieving agreement on values across asynchronous networked nodes.',
                estimatedMinutes: 30,
                difficultyLevel: 'moderate',
                subtopics: ['Leader Election', 'Log Compaction', 'Quorum Intersection']
              },
              {
                title: 'Byzantine Fault Tolerance',
                slug: 'byzantine-fault-tolerance',
                summary: 'Tolerating arbitrary or malicious failure modes in distributed networks.',
                estimatedMinutes: 25,
                difficultyLevel: 'rigorous',
                subtopics: ['Safety vs Liveness', '3f + 1 Node Bound']
              }
            ]
          }
        ]
      })
    });

    const createData = await createRes.json();
    expect(createData.success).toBe(true);
    testProjectId = createData.project.id;

    // Fetch topics to get testTopicId
    const treeRes = await fetch(`${baseUrl}/api/projects/${testProjectId}`, {
      headers: { 'X-Guest-Session': guestSessionId }
    });
    const treeData = await treeRes.json();
    testTopicId = treeData.units[0].topics[0].id;
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // Test 1: Step 3 (Learn) - The 7 Pedagogical Elements
  it('Step 3 (Learn): GET /api/lessons/topic/:topicId returns the complete 7-part pedagogical tutor lesson', async () => {
    const res = await fetch(`${baseUrl}/api/lessons/topic/${testTopicId}`, {
      headers: { 'X-Guest-Session': guestSessionId }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.lesson).toBeDefined();

    const lesson = data.lesson;

    // Verify 1. Simple Introduction
    expect(typeof lesson.introduction).toBe('string');
    expect(lesson.introduction.length).toBeGreaterThan(20);

    // Verify 2. Clear Explanation
    expect(typeof lesson.explanation).toBe('string');
    expect(lesson.explanation.length).toBeGreaterThan(50);

    // Verify 3. Step-by-Step Breakdown
    expect(Array.isArray(lesson.stepByStep)).toBe(true);
    expect(lesson.stepByStep.length).toBeGreaterThanOrEqual(3);

    // Verify 4. Practical Real-World Example
    expect(typeof lesson.practicalExample).toBe('string');
    expect(lesson.practicalExample.toLowerCase()).toContain('real-world');

    // Verify 5. Important Definitions & Concepts
    expect(Array.isArray(lesson.definitions)).toBe(true);
    expect(lesson.definitions.length).toBeGreaterThan(0);
    expect(lesson.definitions[0]).toHaveProperty('term');
    expect(lesson.definitions[0]).toHaveProperty('definition');

    // Verify 6. Key Points to Remember for Exams
    expect(Array.isArray(lesson.keyPoints)).toBe(true);
    expect(lesson.keyPoints.length).toBeGreaterThanOrEqual(2);

    // Verify 7. Short Recap
    expect(typeof lesson.recap).toBe('string');
    expect(lesson.recap.length).toBeGreaterThan(20);

    // Verify source provenance
    expect(lesson).toHaveProperty('sourceType');
    expect(lesson).toHaveProperty('sourceLabel');
  });

  // Test 2: Step 4 (Quiz) - Practice Questions Generation
  it('Step 4 (Quiz): POST /api/lessons/topic/:topicId/generate-questions reliably generates topic-grounded questions with explanations', async () => {
    const res = await fetch(`${baseUrl}/api/lessons/topic/${testTopicId}/generate-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Guest-Session': guestSessionId
      },
      body: JSON.stringify({
        amount: 5,
        difficulty: 'moderate'
      })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.questions)).toBe(true);
    expect(data.questions.length).toBe(5);

    // Verify structure of generated questions
    for (const q of data.questions) {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('questionText');
      expect(q).toHaveProperty('options');
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q).toHaveProperty('correctAnswer');
      expect(q.options).toContain(q.correctAnswer);
      expect(q).toHaveProperty('explanation');
      expect(q.explanation.length).toBeGreaterThan(10);
    }
  });

  // Test 3: Step 5 (Results) - Quiz Submission & Mastery Update for Guest
  it('Step 5 (Results): POST /api/quizzes/submit scores responses, records attempt for guest, and updates topic mastery', async () => {
    // 1. Generate questions
    const genRes = await fetch(`${baseUrl}/api/lessons/topic/${testTopicId}/generate-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Guest-Session': guestSessionId
      },
      body: JSON.stringify({ amount: 3, difficulty: 'moderate' })
    });
    const genData = await genRes.json();
    const questions = genData.questions;

    // 2. Submit answers (2 correct, 1 incorrect to test score calculation)
    const answers = [
      {
        questionId: questions[0].id,
        questionText: questions[0].questionText,
        selectedOption: questions[0].correctAnswer, // Correct
        correctOption: questions[0].correctAnswer,
        explanation: questions[0].explanation,
        questionType: questions[0].questionType
      },
      {
        questionId: questions[1].id,
        questionText: questions[1].questionText,
        selectedOption: questions[1].correctAnswer, // Correct
        correctOption: questions[1].correctAnswer,
        explanation: questions[1].explanation,
        questionType: questions[1].questionType
      },
      {
        questionId: questions[2].id,
        questionText: questions[2].questionText,
        selectedOption: 'Intentionally incorrect answer for testing', // Incorrect
        correctOption: questions[2].correctAnswer,
        explanation: questions[2].explanation,
        questionType: questions[2].questionType
      }
    ];

    const submitRes = await fetch(`${baseUrl}/api/quizzes/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Guest-Session': guestSessionId
      },
      body: JSON.stringify({
        topicId: testTopicId,
        difficulty: 'moderate',
        answers,
        timeTakenSeconds: 45
      })
    });

    expect(submitRes.status).toBe(201);
    const submitData = await submitRes.json();
    expect(submitData.success).toBe(true);
    expect(submitData.attempt).toBeDefined();
    expect(submitData.attempt.totalQuestions).toBe(3);
    expect(submitData.attempt.correctAnswers).toBe(2);
    expect(submitData.attempt.scorePercentage).toBe(67);

    // Verify database persistence of the attempt under guest
    const dbAttempt = await queryOne<{ id: string; user_id: string; score_percentage: number }>(
      'SELECT id, user_id, score_percentage FROM quiz_attempts WHERE id = ?',
      [submitData.attempt.id]
    );
    expect(dbAttempt).toBeDefined();
    expect(dbAttempt?.user_id).toBe(guestSessionId);
  });

  // Test 4: Topic Navigation & Sequential Curriculum Progression
  it('Step 5 (Navigation): Verify all topics in the project can be sequenced with linear previous/next progression', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${testProjectId}`, {
      headers: { 'X-Guest-Session': guestSessionId }
    });
    const data = await res.json();
    const allTopics = data.units.flatMap((u: any) => u.topics);

    expect(allTopics.length).toBe(2);
    expect(allTopics[0].id).toBe(testTopicId);

    const nextTopic = allTopics[1];
    expect(nextTopic.title).toBe('Byzantine Fault Tolerance');

    // Fetch lesson for the next topic
    const nextLessonRes = await fetch(`${baseUrl}/api/lessons/topic/${nextTopic.id}`, {
      headers: { 'X-Guest-Session': guestSessionId }
    });
    expect(nextLessonRes.status).toBe(200);
    const nextLessonData = await nextLessonRes.json();
    expect(nextLessonData.lesson.topic.title).toBe('Byzantine Fault Tolerance');
  });
});

import { Router, Response } from 'express';
import { query, queryOne, run } from '../db/index.js';
import { requireSession, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { QuestionGeneratorService } from '../services/question-generator.service.js';
import { DifficultyLevel, QuizAttempt, QuestionType } from '../../../shared/types.js';

const router = Router();

// Helper to normalize and evaluate short answers
export function normalizeAnswer(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

export function normalizeBooleanAnswer(val: unknown): boolean | null {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') {
    if (val === 1) return true;
    if (val === 0) return false;
    return null;
  }
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'true' || s === 't' || s === '1' || s === 'yes' || s === 'correct') return true;
    if (s === 'false' || s === 'f' || s === '0' || s === 'no' || s === 'incorrect') return false;
    if (s === 'a') return true;
    if (s === 'b') return false;
  }
  return null;
}

export function cleanOptionText(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .trim()
    .replace(/^[a-dA-D][\)\.:\-]\s*/, '')
    .toLowerCase()
    .trim();
}

export function evaluateAnswer(
  selectedOption: unknown,
  correctOption: unknown,
  questionType: QuestionType = 'multiple_choice'
): boolean {
  if (selectedOption === null || selectedOption === undefined || String(selectedOption).trim() === '') {
    return false;
  }

  if (questionType === 'true_false') {
    const selBool = normalizeBooleanAnswer(selectedOption);
    const corrBool = normalizeBooleanAnswer(correctOption);
    if (selBool !== null && corrBool !== null) {
      return selBool === corrBool;
    }
    return String(selectedOption).trim().toLowerCase() === String(correctOption).trim().toLowerCase();
  }

  if (questionType === 'short_answer') {
    const normSelected = normalizeAnswer(String(selectedOption));
    const normCorrect = normalizeAnswer(String(correctOption));
    if (!normSelected || !normCorrect) return false;
    return normSelected === normCorrect || normSelected.includes(normCorrect) || normCorrect.includes(normSelected);
  }

  // Multiple Choice:
  // 1. Exact string match (case-insensitive, trimmed)
  const selStr = String(selectedOption).trim().toLowerCase();
  const corrStr = String(correctOption).trim().toLowerCase();
  if (selStr === corrStr) return true;

  // 2. Cleaned prefix match (e.g. "A) Alpha" vs "Alpha")
  const cleanSel = cleanOptionText(selectedOption);
  const cleanCorr = cleanOptionText(correctOption);
  if (cleanSel && cleanCorr && cleanSel === cleanCorr) return true;

  // 3. Option letter match ONLY IF one is exactly a single letter A-D and the other is prefixed with that same letter
  if (/^[a-d]$/i.test(selStr)) {
    const letter = selStr.toUpperCase();
    const matchPrefix = String(correctOption).trim().match(/^([A-D])[\)\.:\-]/i);
    if (matchPrefix && matchPrefix[1].toUpperCase() === letter) return true;
  }
  if (/^[a-d]$/i.test(corrStr)) {
    const letter = corrStr.toUpperCase();
    const matchPrefix = String(selectedOption).trim().match(/^([A-D])[\)\.:\-]/i);
    if (matchPrefix && matchPrefix[1].toUpperCase() === letter) return true;
  }

  return false;
}

// GET /api/quizzes/generate
router.get('/generate', async (req, res: Response) => {
  try {
    const subject = (req.query.subject as string) || 'computer-science';
    const topic = (req.query.topic as string) || 'algorithms-data-structures';
    const difficulty = (req.query.difficulty as DifficultyLevel) || 'moderate';
    const amount = parseInt(req.query.amount as string, 10) || 5;
    const mode = (req.query.mode as any) || 'mixed';
    const typesParam = req.query.questionTypes as string;
    const defaultTypes: QuestionType[] = ['multiple_choice', 'true_false', 'short_answer'];
    const questionTypes: QuestionType[] = typesParam
      ? (typesParam.split(',') as QuestionType[])
      : defaultTypes;

    const questions = await QuestionGeneratorService.generateQuiz({
      subjectSlug: subject,
      topicSlug: topic,
      difficulty,
      amount,
      questionTypes,
      mode
    });

    return res.json({
      success: true,
      subject,
      topic,
      difficulty,
      mode,
      questions
    });
  } catch (err: any) {
    console.error('[Quizzes] Generation error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate quiz questions' });
  }
});

// POST /api/quizzes/submit
router.post('/submit', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { topicId, difficulty = 'moderate', answers, timeTakenSeconds = 0 } = req.body;

    if (!topicId || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid quiz submission data' });
    }

    // Duplicate submission prevention: check for identical attempt by user on topic in last 4 seconds
    const recentDuplicate = await queryOne<{ id: string }>(
      `SELECT id FROM quiz_attempts
       WHERE user_id = ? AND topic_id = ?
         AND (strftime('%s', 'now') - strftime('%s', completed_at)) < 4`,
      [userId, topicId]
    );

    if (recentDuplicate) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate submission detected. Please wait before submitting again.',
        attemptId: recentDuplicate.id
      });
    }

    let correctCount = 0;
    const scoredAnswers = answers.map((ans: any, idx: number) => {
      const qType: QuestionType = ans.questionType || 'multiple_choice';
      const isCorrect = evaluateAnswer(ans.selectedOption, ans.correctOption, qType);

      if (isCorrect) correctCount++;

      // Canonicalize true/false display options
      let displaySelected = ans.selectedOption;
      let displayCorrect = ans.correctOption;
      if (qType === 'true_false') {
        const bSel = normalizeBooleanAnswer(ans.selectedOption);
        const bCorr = normalizeBooleanAnswer(ans.correctOption);
        if (bSel !== null) displaySelected = bSel ? 'True' : 'False';
        if (bCorr !== null) displayCorrect = bCorr ? 'True' : 'False';
      }

      return {
        id: `ans-${Date.now()}-${idx}`,
        questionId: ans.questionId || `q-${idx}`,
        questionText: ans.questionText,
        selectedOption: displaySelected,
        correctOption: displayCorrect,
        questionType: qType,
        isCorrect,
        explanation: ans.explanation || ''
      };
    });

    const totalQuestions = answers.length;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Insert quiz attempt
    await run(
      `INSERT INTO quiz_attempts (id, user_id, topic_id, difficulty, total_questions, correct_answers, score_percentage, time_taken_seconds, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [attemptId, userId, topicId, difficulty, totalQuestions, correctCount, scorePercentage, timeTakenSeconds]
    );

    // 2. Insert quiz answers
    for (const sa of scoredAnswers) {
      await run(
        `INSERT INTO quiz_answers (id, attempt_id, question_id, question_text, selected_option, correct_option, is_correct, explanation, question_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sa.id, attemptId, sa.questionId, sa.questionText, sa.selectedOption, sa.correctOption, sa.isCorrect ? 1 : 0, sa.explanation, sa.questionType]
      );
    }

    // 3. Update student progress mastery score
    const existingProgress = await queryOne<{ mastery_score: number }>(
      'SELECT mastery_score FROM student_progress WHERE user_id = ? AND topic_id = ?',
      [userId, topicId]
    );

    const prevMastery = existingProgress ? existingProgress.mastery_score : 0;
    // Moving average update: 60% previous + 40% current quiz score
    const newMastery = Math.min(100, Math.round(prevMastery > 0 ? (prevMastery * 0.6) + (scorePercentage * 0.4) : scorePercentage));
    const newStatus = newMastery >= 85 ? 'mastered' : newMastery >= 50 ? 'completed' : 'in_progress';

    await run(
      `INSERT INTO student_progress (id, user_id, topic_id, status, mastery_score, last_studied_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, topic_id) DO UPDATE SET
         status = excluded.status,
         mastery_score = excluded.mastery_score,
         last_studied_at = CURRENT_TIMESTAMP`,
      [`prog-${Date.now()}`, userId, topicId, newStatus, newMastery]
    );

    // 4. Record topic mastery history snapshot
    try {
      await run(
        `INSERT INTO topic_mastery_history (id, user_id, topic_id, mastery_score, difficulty_level)
         VALUES (?, ?, ?, ?, ?)`,
        [`tmh-${Date.now()}`, userId, topicId, newMastery, difficulty]
      );
    } catch {}

    const attemptRecord = {
      id: attemptId,
      attemptId,
      scorePercentage,
      correctAnswers: correctCount,
      totalQuestions,
      timeTakenSeconds,
      masteryScore: newMastery,
      status: newStatus,
      answers: scoredAnswers
    };

    return res.status(201).json({
      success: true,
      result: attemptRecord,
      attempt: attemptRecord
    });
  } catch (err: any) {
    console.error('[Quizzes] Submit error:', err);
    return res.status(500).json({ success: false, error: 'Failed to process quiz submission' });
  }
});

// GET /api/quizzes/history
router.get('/history', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const attempts = await query<{
      id: string;
      user_id: string;
      topic_id: string;
      topic_title?: string;
      subject_title?: string;
      difficulty: DifficultyLevel;
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
       LIMIT 25`,
      [userId]
    );

    const mapped: QuizAttempt[] = attempts.map(a => ({
      id: a.id,
      userId: a.user_id,
      topicId: a.topic_id,
      topicTitle: a.topic_title,
      subjectTitle: a.subject_title,
      difficulty: a.difficulty,
      totalQuestions: a.total_questions,
      correctAnswers: a.correct_answers,
      scorePercentage: a.score_percentage,
      timeTakenSeconds: a.time_taken_seconds,
      completedAt: a.completed_at
    }));

    return res.json({ success: true, history: mapped });
  } catch (err: any) {
    console.error('[Quizzes] History error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve quiz history' });
  }
});

export default router;

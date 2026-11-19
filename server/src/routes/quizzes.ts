import { Router, Response } from 'express';
import multer from 'multer';
import { query, queryOne, run } from '../db/index.js';
import { requireSession, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { QuestionGeneratorService } from '../services/question-generator.service.js';
import { PdfExtractionService } from '../services/pdf-extraction.service.js';
import { QuestionExtractorService } from '../services/question-extractor.service.js';
import { DifficultyLevel, QuizAttempt, QuestionType, QuizQuestion } from '../../../shared/types.js';

const router = Router();

// Configure Multer for memory upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (
      allowedMimes.includes(file.mimetype) ||
      file.originalname.endsWith('.pdf') ||
      file.originalname.endsWith('.txt') ||
      file.originalname.endsWith('.docx')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only PDF, TXT, and DOCX files are supported.'));
    }
  }
});

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

// POST /api/quizzes/generate-from-pdf (Upload PDF/document or text and generate instant quiz)
router.post('/generate-from-pdf', upload.single('file'), async (req, res: Response) => {
  try {
    const file = req.file;
    const rawText = (req.body.text || req.body.rawText || '').trim();
    const amount = Math.min(20, Math.max(3, parseInt(req.body.amount, 10) || 5));
    const difficulty: DifficultyLevel = req.body.difficulty || 'moderate';
    const questionTypesParam = (req.body.questionTypes as string) || 'multiple_choice,true_false';
    const allowedTypes: QuestionType[] = questionTypesParam
      .split(',')
      .map((t: string) => t.trim())
      .filter((t: string) => ['multiple_choice', 'true_false', 'short_answer'].includes(t)) as QuestionType[];

    let extractedText = '';
    let pageCount = 1;
    let originalName = 'Lecture Notes / Document';
    let headings: string[] = [];

    if (file) {
      originalName = file.originalname;
      const lowerName = file.originalname.toLowerCase();
      if (file.mimetype === 'application/pdf' || lowerName.endsWith('.pdf')) {
        const extracted = await PdfExtractionService.extractPdf(file.buffer);
        extractedText = extracted.text;
        pageCount = extracted.pageCount;
        headings = extracted.headings;
      } else if (lowerName.endsWith('.docx') || file.mimetype.includes('wordprocessingml')) {
        const extracted = await PdfExtractionService.extractDocx(file.buffer);
        extractedText = extracted.text;
        pageCount = extracted.pageCount;
        headings = extracted.headings;
      } else {
        const extracted = PdfExtractionService.extractTxt(file.buffer);
        extractedText = extracted.text;
        pageCount = extracted.pageCount;
        headings = extracted.headings;
      }
    } else if (rawText) {
      extractedText = rawText;
      originalName = req.body.title || 'Pasted Notes';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please upload a PDF document or provide text to generate a quiz.'
      });
    }

    if (!extractedText || extractedText.trim().length < 25) {
      return res.status(400).json({
        success: false,
        error: 'Document contains insufficient readable text. If this is a scanned PDF without a text layer, please provide a searchable PDF or paste notes.'
      });
    }

    const cleanTitle = originalName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    const displayTitle = headings.length > 0 && headings[0].length < 60 ? headings[0] : cleanTitle;

    // 1. Check if the PDF contains pre-existing questions/exercises
    const extractedQs = QuestionExtractorService.extractQuestionsFromText(
      'doc-temp',
      'proj-temp',
      extractedText,
      originalName
    );

    const generatedQuestions: QuizQuestion[] = [];

    // Convert pre-existing questions found in the document
    if (extractedQs.length > 0) {
      for (const eq of extractedQs) {
        if (generatedQuestions.length >= amount) break;
        if (allowedTypes.length > 0 && !allowedTypes.includes(eq.questionType)) continue;

        const correctAnswer = eq.answerText || (eq.options && eq.options[0]) || 'Option A';
        const options = eq.options && eq.options.length >= 2
          ? eq.options
          : [correctAnswer, 'Alternative option B', 'Alternative option C', 'Alternative option D'];

        generatedQuestions.push({
          id: `pdf-q-ext-${Date.now()}-${generatedQuestions.length}`,
          topicId: displayTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          questionType: eq.questionType,
          questionText: eq.questionText,
          options,
          correctAnswer,
          explanation: `Extracted directly from "${originalName}".`,
          difficulty,
          category: displayTitle,
          source: 'original_engine'
        });
      }
    }

    // 2. Generate grounded questions from sentences / paragraphs of the PDF text
    if (generatedQuestions.length < amount) {
      const paragraphs = extractedText
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(p => p.length > 30);

      const needed = amount - generatedQuestions.length;
      const grounded = QuestionExtractorService.generateGroundedFromText(
        displayTitle,
        paragraphs.length > 0 ? paragraphs : [extractedText],
        needed * 2,
        difficulty
      );

      for (const gq of grounded) {
        if (generatedQuestions.length >= amount) break;
        if (allowedTypes.length > 0 && !allowedTypes.includes(gq.questionType)) continue;
        generatedQuestions.push(gq);
      }
    }

    // 3. Fallback to curriculum/topic question generation if more are still needed
    if (generatedQuestions.length < amount) {
      const needed = amount - generatedQuestions.length;
      const topicSubtopics = headings.length > 0 ? headings.slice(0, 4) : [`${displayTitle} fundamentals`, `applications of ${displayTitle}`];
      const fallback = QuestionExtractorService.generateCurriculumQuestions(
        displayTitle,
        topicSubtopics,
        needed,
        difficulty
      );
      for (const fq of fallback) {
        if (generatedQuestions.length >= amount) break;
        if (allowedTypes.length > 0 && !allowedTypes.includes(fq.questionType)) continue;
        generatedQuestions.push(fq);
      }
    }

    // Validate and normalize all questions
    const validated = generatedQuestions.map(q => QuestionGeneratorService.validateAndNormalizeQuestion(q));

    return res.json({
      success: true,
      document: {
        title: displayTitle,
        filename: originalName,
        pageCount,
        wordCount: extractedText.split(/\s+/).filter(Boolean).length,
        headings: headings.slice(0, 5)
      },
      questions: validated
    });
  } catch (err: any) {
    console.error('[Quizzes] PDF Generation error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to process document and generate quiz.'
    });
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

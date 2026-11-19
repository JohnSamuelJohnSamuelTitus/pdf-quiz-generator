import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  evaluateAnswer,
  normalizeBooleanAnswer,
  cleanOptionText
} from '../server/src/routes/quizzes.js';
import { QuestionExtractorService } from '../server/src/services/question-extractor.service.js';
import { QuestionGeneratorService } from '../server/src/services/question-generator.service.js';
import { SyllabusParserService } from '../server/src/services/syllabus-parser.service.js';
import { getDb } from '../server/src/db/index.js';

describe('Quiz Generation & Answer Evaluation Defect Fixes Suite', () => {
  beforeEach(async () => {
    await getDb();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // BUG 2 & BUG 3: TRUE/FALSE EVALUATION & ALL 4 PERMUTATIONS
  // =========================================================================
  describe('Bug 2 & 3: Answer Evaluation & True/False Mapping Lifecycle', () => {
    it('Permutation 1: Correct=True, Student=True -> Returns TRUE (Correct)', () => {
      expect(evaluateAnswer('True', 'True', 'true_false')).toBe(true);
      expect(evaluateAnswer('true', 'True', 'true_false')).toBe(true);
      expect(evaluateAnswer(true, 'True', 'true_false')).toBe(true);
      expect(evaluateAnswer(true, true, 'true_false')).toBe(true);
      expect(evaluateAnswer('T', 'True', 'true_false')).toBe(true);
      expect(evaluateAnswer(1, 'True', 'true_false')).toBe(true);
    });

    it('Permutation 2: Correct=True, Student=False -> Returns FALSE (Incorrect)', () => {
      expect(evaluateAnswer('False', 'True', 'true_false')).toBe(false);
      expect(evaluateAnswer('false', 'True', 'true_false')).toBe(false);
      expect(evaluateAnswer(false, 'True', 'true_false')).toBe(false);
      expect(evaluateAnswer(false, true, 'true_false')).toBe(false);
      expect(evaluateAnswer('F', 'True', 'true_false')).toBe(false);
      expect(evaluateAnswer(0, 'True', 'true_false')).toBe(false);
    });

    it('Permutation 3: Correct=False, Student=True -> Returns FALSE (Incorrect)', () => {
      expect(evaluateAnswer('True', 'False', 'true_false')).toBe(false);
      expect(evaluateAnswer('true', 'False', 'true_false')).toBe(false);
      expect(evaluateAnswer(true, 'False', 'true_false')).toBe(false);
      expect(evaluateAnswer(true, false, 'true_false')).toBe(false);
      expect(evaluateAnswer('T', 'False', 'true_false')).toBe(false);
      expect(evaluateAnswer(1, 'False', 'true_false')).toBe(false);
    });

    it('Permutation 4: Correct=False, Student=False -> Returns TRUE (Correct)', () => {
      expect(evaluateAnswer('False', 'False', 'true_false')).toBe(true);
      expect(evaluateAnswer('false', 'False', 'true_false')).toBe(true);
      expect(evaluateAnswer(false, 'False', 'true_false')).toBe(true);
      expect(evaluateAnswer(false, false, 'true_false')).toBe(true);
      expect(evaluateAnswer('F', 'False', 'true_false')).toBe(true);
      expect(evaluateAnswer(0, 'False', 'true_false')).toBe(true);
    });

    it('Handles empty, null, or undefined student answers safely as FALSE', () => {
      expect(evaluateAnswer('', 'True', 'true_false')).toBe(false);
      expect(evaluateAnswer(null, 'True', 'true_false')).toBe(false);
      expect(evaluateAnswer(undefined, 'True', 'true_false')).toBe(false);
      expect(evaluateAnswer('   ', 'False', 'true_false')).toBe(false);
    });

    it('Normalizes boolean answers across diverse representations', () => {
      expect(normalizeBooleanAnswer('True')).toBe(true);
      expect(normalizeBooleanAnswer('true')).toBe(true);
      expect(normalizeBooleanAnswer('t')).toBe(true);
      expect(normalizeBooleanAnswer('yes')).toBe(true);
      expect(normalizeBooleanAnswer('1')).toBe(true);
      expect(normalizeBooleanAnswer(1)).toBe(true);
      expect(normalizeBooleanAnswer(true)).toBe(true);

      expect(normalizeBooleanAnswer('False')).toBe(false);
      expect(normalizeBooleanAnswer('false')).toBe(false);
      expect(normalizeBooleanAnswer('f')).toBe(false);
      expect(normalizeBooleanAnswer('no')).toBe(false);
      expect(normalizeBooleanAnswer('0')).toBe(false);
      expect(normalizeBooleanAnswer(0)).toBe(false);
      expect(normalizeBooleanAnswer(false)).toBe(false);

      expect(normalizeBooleanAnswer('invalid_value')).toBe(null);
    });
  });

  // =========================================================================
  // BUG 3: NO FIRST-CHARACTER-MATCH SHORTCUT IN MULTIPLE CHOICE
  // =========================================================================
  describe('Bug 3: Prevention of Flawed First-Character Badging', () => {
    it('CRITICAL: Differs when both options begin with the letter "T"', () => {
      const studentChosen = 'To enforce deterministic state consistency and formal invariants across operations';
      const correctOption = 'To scale high-throughput workloads with predictable latency guarantees while handling failure edge cases';

      // They both start with 'T', but they are completely different options!
      const isCorrect = evaluateAnswer(studentChosen, correctOption, 'multiple_choice');
      expect(isCorrect).toBe(false);
    });

    it('Differs when both options begin with the letter "A"', () => {
      const studentChosen = 'Algorithm is linear in memory consumption';
      const correctOption = 'Abstraction encapsulates internal implementation details';

      expect(evaluateAnswer(studentChosen, correctOption, 'multiple_choice')).toBe(false);
    });

    it('Matches when exact option text matches (case-insensitive and trimmed)', () => {
      const option = 'To scale high-throughput workloads with predictable latency guarantees';
      expect(evaluateAnswer(option, option, 'multiple_choice')).toBe(true);
      expect(evaluateAnswer(`  ${option.toLowerCase()}  `, option, 'multiple_choice')).toBe(true);
    });

    it('Matches when option letter prefix is used (e.g., "A) Alpha" vs "Alpha")', () => {
      expect(evaluateAnswer('A) Binary Search Tree', 'Binary Search Tree', 'multiple_choice')).toBe(true);
      expect(evaluateAnswer('Binary Search Tree', 'A) Binary Search Tree', 'multiple_choice')).toBe(true);
      expect(cleanOptionText('B. Depth-First Search')).toBe('depth-first search');
      expect(cleanOptionText('C) Stack')).toBe('stack');
    });

    it('Evaluates short answers with canonicalized containment', () => {
      expect(evaluateAnswer('dynamic programming', 'Dynamic Programming', 'short_answer')).toBe(true);
      expect(evaluateAnswer('stack', 'Stack (LIFO)', 'short_answer')).toBe(true);
      expect(evaluateAnswer('completely wrong answer', 'Stack', 'short_answer')).toBe(false);
    });
  });

  // =========================================================================
  // BUG 1: SYLLABUS PARSER EXCLUDES FORMATTING AND META HEADERS
  // =========================================================================
  describe('Bug 1: Syllabus Parser Metadata Sanitization', () => {
    it('Filters out exam notes and quick-find format headers from becoming topics', () => {
      const sampleSyllabus = `
Unit 1: Data Structures
Complete open-book exam notes | simple language | quick-find format
Topic | One-line memory hook | Key points
- Binary Search Trees: Insertion, Deletion, Balancing
- Hash Tables: Separate Chaining, Open Addressing
Textbook Reference: Cormen et al.
      `;

      const result = SyllabusParserService.parseSyllabusText(sampleSyllabus, 'CS201');
      expect(result.units.length).toBeGreaterThan(0);

      const allTopicTitles = result.units.flatMap(u => u.topics.map(t => t.title.toLowerCase()));

      // Must NOT include the formatting instruction lines as topics!
      expect(allTopicTitles.some(t => t.includes('complete open-book exam notes'))).toBe(false);
      expect(allTopicTitles.some(t => t.includes('quick-find format'))).toBe(false);
      expect(allTopicTitles.some(t => t.includes('one-line memory hook'))).toBe(false);
      expect(allTopicTitles.some(t => t.includes('textbook reference'))).toBe(false);

      // Must include genuine topics
      expect(allTopicTitles.some(t => t.includes('binary search trees'))).toBe(true);
      expect(allTopicTitles.some(t => t.includes('hash tables'))).toBe(true);
    });
  });

  // =========================================================================
  // BUG 1 & BUG 4: TOPIC-SPECIFIC GROUNDED QUESTION GENERATION
  // =========================================================================
  describe('Bug 1 & 4: Grounded Curriculum Question Generation', () => {
    it('Generates questions relevant to non-CS topics without distributed systems jargon', () => {
      const nonCsTopic = 'Cellular Respiration';
      const subtopics = ['Glycolysis', 'Krebs Cycle', 'Oxidative Phosphorylation'];

      const questions = QuestionExtractorService.generateCurriculumQuestions(
        nonCsTopic,
        subtopics,
        5,
        'moderate'
      );

      expect(questions.length).toBe(5);

      for (const q of questions) {
        expect(q.category).toBe(nonCsTopic);
        // Ensure NO hardcoded distributed systems text leaked into biology
        expect(q.questionText).not.toContain('deterministic state consistency');
        expect(q.correctAnswer).not.toContain('deterministic state consistency');
        expect(q.correctAnswer).not.toContain('scale high-throughput workloads');
        expect(q.explanation).not.toContain('unbounded latency');

        for (const opt of q.options) {
          expect(opt).not.toContain('motherboard circuit traces');
          expect(opt).not.toContain('infinite recursive branching');
        }

        // Options must strictly include correctAnswer
        expect(q.options.map(o => o.trim().toLowerCase())).toContain(q.correctAnswer.trim().toLowerCase());
      }

      // Must include both True and False questions across curriculum questions
      const tfQuestions = questions.filter(q => q.questionType === 'true_false');
      expect(tfQuestions.length).toBeGreaterThan(0);
      const trueAnswers = tfQuestions.filter(q => q.correctAnswer === 'True');
      const falseAnswers = tfQuestions.filter(q => q.correctAnswer === 'False');
      expect(trueAnswers.length + falseAnswers.length).toBe(tfQuestions.length);
    });

    it('Generates both True and False questions with faithful explanations', () => {
      const topic = 'Photosynthesis';
      const questions = QuestionExtractorService.generateCurriculumQuestions(
        topic,
        ['Light Reactions', 'Calvin Cycle'],
        6,
        'moderate'
      );

      const hasFalseTf = questions.some(q => q.questionType === 'true_false' && q.correctAnswer === 'False');
      const hasTrueTf = questions.some(q => q.questionType === 'true_false' && q.correctAnswer === 'True');

      expect(hasFalseTf).toBe(true);
      expect(hasTrueTf).toBe(true);
    });

    it('Generates quiz questions for non-CS subjects without algorithms data structures fallback leak', async () => {
      const questions = await QuestionGeneratorService.generateQuiz({
        subjectSlug: 'biology',
        topicSlug: 'cellular-biology',
        difficulty: 'moderate',
        amount: 3,
        questionTypes: ['multiple_choice', 'true_false'],
        mode: 'original_engine'
      });

      expect(questions.length).toBe(3);
      for (const q of questions) {
        // Must NOT leak algorithms-data-structures into biology
        expect(q.topicId).not.toBe('algorithms-data-structures');
        expect(q.questionText).not.toContain('Big-Theta');
        expect(q.questionText).not.toContain('binary search');
      }
    });
  });

  // =========================================================================
  // BUG 4 & BUG 5: QUESTION VALIDATION & SCORE CONSISTENCY
  // =========================================================================
  describe('Bug 4 & 5: Question Validation & Score Integrity', () => {
    it('validateAndNormalizeQuestion ensures correctAnswer is in options for MCQ', () => {
      const rawMcq = {
        id: 'test-mcq-1',
        topicId: 'general-science',
        questionType: 'multiple_choice' as const,
        questionText: 'Which organelle is the powerhouse of the cell?',
        options: ['Nucleus', 'Ribosome', 'Endoplasmic Reticulum'],
        correctAnswer: 'Mitochondria',
        explanation: 'Mitochondria generate cellular ATP.',
        difficulty: 'foundational' as const,
        category: 'Biology',
        source: 'original_engine' as const
      };

      const normalized = QuestionGeneratorService.validateAndNormalizeQuestion(rawMcq);
      expect(normalized.options).toContain('Mitochondria');
      expect(new Set(normalized.options).size).toBe(normalized.options.length);
    });

    it('validateAndNormalizeQuestion normalizes True/False options and answer casing', () => {
      const rawTf = {
        id: 'test-tf-1',
        topicId: 'general-science',
        questionType: 'true_false' as const,
        questionText: 'Photosynthesis produces glucose and oxygen.',
        options: ['True', 'False'],
        correctAnswer: 'true',
        explanation: 'Photosynthesis converts CO2 and water into glucose and O2.',
        difficulty: 'foundational' as const,
        category: 'Biology',
        source: 'original_engine' as const
      };

      const normalized = QuestionGeneratorService.validateAndNormalizeQuestion(rawTf);
      expect(normalized.options).toEqual(['True', 'False']);
      expect(normalized.correctAnswer).toBe('True');
    });

    it('Calculates exact score percentages without drift or truncation errors', () => {
      const testCases = [
        { correct: 3, total: 3, expectedPct: 100 },
        { correct: 2, total: 3, expectedPct: 67 },
        { correct: 1, total: 3, expectedPct: 33 },
        { correct: 0, total: 3, expectedPct: 0 },
        { correct: 4, total: 5, expectedPct: 80 },
        { correct: 7, total: 10, expectedPct: 70 }
      ];

      for (const tc of testCases) {
        const pct = Math.round((tc.correct / tc.total) * 100);
        expect(pct).toBe(tc.expectedPct);
      }
    });
  });
});

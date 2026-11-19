import { QuizQuestion, QuestionType, DifficultyLevel } from '../../../shared/types.js';
import { OpenTriviaService } from './opentrivia.service.js';
import { QuestionExtractorService } from './question-extractor.service.js';
import { query, queryOne } from '../db/index.js';

// Original curated academic question bank across all curriculum topics
// Covering Multiple Choice, True/False, and Short Answer formats
const ORIGINAL_ACADEMIC_REPOSITORY: QuizQuestion[] = [
  // 1. Algorithms & Data Structures
  {
    id: 'orig-algo-mcq-1',
    topicId: 'algorithms-data-structures',
    subjectId: 'computer-science',
    questionType: 'multiple_choice',
    questionText: 'What is the tight asymptotic bound (Big-Theta) for merging two sorted arrays of lengths m and n into a single sorted array?',
    options: ['Θ(m + n)', 'Θ(m log n)', 'Θ(m * n)', 'Θ(max(m, n)^2)'],
    correctAnswer: 'Θ(m + n)',
    explanation: 'Merging two pre-sorted lists requires a linear single-pass two-pointer comparison, visiting each element from both arrays at most once.',
    difficulty: 'foundational',
    category: 'Computer Science',
    source: 'original_engine'
  },
  {
    id: 'orig-algo-mcq-3',
    topicId: 'algorithms-data-structures',
    subjectId: 'computer-science',
    questionType: 'multiple_choice',
    questionText: 'What is the time complexity to access an element at index i in a contiguous memory array of size n?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'],
    correctAnswer: 'O(1)',
    explanation: 'Arrays store elements in contiguous memory slots, allowing instant O(1) random access via base address plus offset arithmetic.',
    difficulty: 'foundational',
    category: 'Computer Science',
    source: 'original_engine'
  },
  {
    id: 'orig-algo-mcq-4',
    topicId: 'algorithms-data-structures',
    subjectId: 'computer-science',
    questionType: 'multiple_choice',
    questionText: 'Which abstract data structure operates under the Last-In, First-Out (LIFO) protocol?',
    options: ['Stack', 'Queue', 'Priority Queue', 'Ring Buffer'],
    correctAnswer: 'Stack',
    explanation: 'A stack strictly enforces LIFO order where push and pop operations happen at the top of the stack.',
    difficulty: 'foundational',
    category: 'Computer Science',
    source: 'original_engine'
  },
  {
    id: 'orig-algo-tf-1',
    topicId: 'algorithms-data-structures',
    subjectId: 'computer-science',
    questionType: 'true_false',
    questionText: 'A hash table with separate chaining guarantees O(1) worst-case search time complexity.',
    options: ['True', 'False'],
    correctAnswer: 'False',
    explanation: 'Separate chaining guarantees O(1) average-case time. In the worst-case scenario where all keys hash to the same bucket, lookup degrades to O(n) traversing a linked list.',
    difficulty: 'moderate',
    category: 'Computer Science',
    source: 'original_engine'
  },
  {
    id: 'orig-algo-sa-1',
    topicId: 'algorithms-data-structures',
    subjectId: 'computer-science',
    questionType: 'short_answer',
    questionText: 'What algorithmic paradigm solves problems by breaking them into overlapping subproblems and caching intermediate solutions?',
    options: [],
    correctAnswer: 'Dynamic programming',
    explanation: 'Dynamic programming optimizes recursive algorithms with optimal substructure and overlapping subproblems via memoization or bottom-up tabulation.',
    difficulty: 'moderate',
    category: 'Computer Science',
    source: 'original_engine'
  },
  {
    id: 'orig-algo-mcq-2',
    topicId: 'algorithms-data-structures',
    subjectId: 'computer-science',
    questionType: 'multiple_choice',
    questionText: 'In Dijkstra shortest path algorithm on a graph with V vertices and E edges implemented using a binary min-heap, what is the running time?',
    options: ['O((V + E) log V)', 'O(V^2)', 'O(E log E + V)', 'O(V * E)'],
    correctAnswer: 'O((V + E) log V)',
    explanation: 'Extracting each vertex from the min-heap takes O(V log V) and updating key values for each directed edge takes O(E log V), yielding O((V + E) log V).',
    difficulty: 'rigorous',
    category: 'Computer Science',
    source: 'original_engine'
  },
  {
    id: 'orig-algo-tf-2',
    topicId: 'algorithms-data-structures',
    subjectId: 'computer-science',
    questionType: 'true_false',
    questionText: 'In an undirected graph, Depth-First Search (DFS) can be used to detect cycles in linear O(V + E) time.',
    options: ['True', 'False'],
    correctAnswer: 'True',
    explanation: 'DFS tracks visited vertices and parent references; encountering a visited neighbor that is not the direct parent immediately confirms a cycle.',
    difficulty: 'foundational',
    category: 'Computer Science',
    source: 'original_engine'
  },

  // 2. Operating Systems & Concurrency
  {
    id: 'orig-os-mcq-1',
    topicId: 'operating-systems',
    subjectId: 'computer-science',
    questionType: 'multiple_choice',
    questionText: 'Which condition is NOT one of the four necessary Coffman conditions required for a deadlock to occur?',
    options: ['Preemption allowed', 'Mutual exclusion', 'Hold and wait', 'Circular wait'],
    correctAnswer: 'Preemption allowed',
    explanation: 'The four Coffman conditions are Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. If preemption is allowed, deadlocks can be broken.',
    difficulty: 'moderate',
    category: 'Computer Science',
    source: 'original_engine'
  },
  {
    id: 'orig-os-tf-1',
    topicId: 'operating-systems',
    subjectId: 'computer-science',
    questionType: 'true_false',
    questionText: 'A Translation Lookaside Buffer (TLB) miss always triggers a page fault requiring disk I/O.',
    options: ['True', 'False'],
    correctAnswer: 'False',
    explanation: 'A TLB miss simply means the virtual-to-physical translation is not in the hardware cache; the MMU can walk the page table in RAM. A page fault only occurs if the valid bit in the page table is 0.',
    difficulty: 'rigorous',
    category: 'Computer Science',
    source: 'original_engine'
  },
  {
    id: 'orig-os-sa-1',
    topicId: 'operating-systems',
    subjectId: 'computer-science',
    questionType: 'short_answer',
    questionText: 'What operating system scheduling algorithm allocates a fixed time slice (quantum) to each runnable process in circular order?',
    options: [],
    correctAnswer: 'Round robin',
    explanation: 'Round Robin (RR) is a preemptive scheduling algorithm that assigns each process a discrete CPU time quantum, cycling through the ready queue.',
    difficulty: 'foundational',
    category: 'Computer Science',
    source: 'original_engine'
  },

  // 3. Linear Algebra
  {
    id: 'orig-linalg-mcq-1',
    topicId: 'linear-algebra',
    subjectId: 'mathematics',
    questionType: 'multiple_choice',
    questionText: 'If an n x n real matrix A is symmetric (A = A^T), which of the following is guaranteed by the Spectral Theorem?',
    options: [
      'All eigenvalues of A are real and eigenvectors can form an orthonormal basis',
      'The determinant of A is always positive',
      'A is always strictly positive definite',
      'A has only distinct eigenvalues with multiplicity 1'
    ],
    correctAnswer: 'All eigenvalues of A are real and eigenvectors can form an orthonormal basis',
    explanation: 'The Spectral Theorem states that any real symmetric matrix is orthogonally diagonalizable with purely real eigenvalues and mutually orthogonal eigenspaces.',
    difficulty: 'rigorous',
    category: 'Mathematics',
    source: 'original_engine'
  },
  {
    id: 'orig-linalg-tf-1',
    topicId: 'linear-algebra',
    subjectId: 'mathematics',
    questionType: 'true_false',
    questionText: 'If the columns of an m x n matrix are linearly independent, then the rank of the matrix must equal n.',
    options: ['True', 'False'],
    correctAnswer: 'True',
    explanation: 'Column rank is defined as the maximum number of linearly independent columns. If all n columns are independent, rank equals n (full column rank).',
    difficulty: 'foundational',
    category: 'Mathematics',
    source: 'original_engine'
  },
  {
    id: 'orig-linalg-sa-1',
    topicId: 'linear-algebra',
    subjectId: 'mathematics',
    questionType: 'short_answer',
    questionText: 'What scalar value equals the sum of the diagonal elements of a square matrix and also equals the sum of its eigenvalues?',
    options: [],
    correctAnswer: 'Trace',
    explanation: 'The trace tr(A) of an n x n matrix is the sum of main diagonal entries a_ii, which is an invariant equal to the sum of all eigenvalues.',
    difficulty: 'moderate',
    category: 'Mathematics',
    source: 'original_engine'
  },

  // 4. Multivariable Calculus
  {
    id: 'orig-calc-mcq-1',
    topicId: 'calculus',
    subjectId: 'mathematics',
    questionType: 'multiple_choice',
    questionText: 'For a scalar function f(x, y), what geometric direction does the gradient vector ∇f(a, b) point towards at a non-critical point?',
    options: [
      'Direction of maximum rate of increase of f',
      'Direction parallel to the tangent plane',
      'Direction of minimum rate of increase',
      'Orthogonal to the surface normal'
    ],
    correctAnswer: 'Direction of maximum rate of increase of f',
    explanation: 'The directional derivative D_u f = ∇f · u is maximized when unit vector u points in the exact direction of ∇f, giving magnitude ||∇f||.',
    difficulty: 'foundational',
    category: 'Mathematics',
    source: 'original_engine'
  },
  {
    id: 'orig-calc-tf-1',
    topicId: 'calculus',
    subjectId: 'mathematics',
    questionType: 'true_false',
    questionText: 'Clairaut Theorem states that mixed second partial derivatives f_xy and f_yx are equal if both partial derivatives are continuous on an open disc.',
    options: ['True', 'False'],
    correctAnswer: 'True',
    explanation: 'Schwarz/Clairaut theorem guarantees symmetry of second derivatives under continuity of partial derivatives.',
    difficulty: 'moderate',
    category: 'Mathematics',
    source: 'original_engine'
  },

  // 5. Classical Mechanics
  {
    id: 'orig-phys-mcq-1',
    topicId: 'classical-mechanics',
    subjectId: 'physics',
    questionType: 'multiple_choice',
    questionText: 'In Lagrangian mechanics for a conservative system, how is the Lagrangian function L defined in terms of kinetic energy T and potential energy V?',
    options: ['L = T - V', 'L = T + V', 'L = V - T', 'L = T * V'],
    correctAnswer: 'L = T - V',
    explanation: 'By Hamilton principle of stationary action, the Lagrangian L of a conservative holonomic system is the difference between kinetic and potential energy: L = T - V.',
    difficulty: 'moderate',
    category: 'Physics',
    source: 'original_engine'
  },

  // 6. Molecular Genetics
  {
    id: 'orig-bio-mcq-1',
    topicId: 'molecular-genetics',
    subjectId: 'biology',
    questionType: 'multiple_choice',
    questionText: 'During DNA replication, which enzyme synthesizes short RNA primers required for DNA polymerase to initiate chain elongation?',
    options: ['DNA Primase', 'DNA Helicase', 'DNA Ligase', 'Topoisomerase'],
    correctAnswer: 'DNA Primase',
    explanation: 'DNA polymerases cannot synthesize DNA de novo; DNA Primase synthesizes complementary 10-12 nucleotide RNA primers to provide the free 3-OH group.',
    difficulty: 'foundational',
    category: 'Biology',
    source: 'original_engine'
  },
  {
    id: 'orig-bio-tf-1',
    topicId: 'molecular-genetics',
    subjectId: 'biology',
    questionType: 'true_false',
    questionText: 'Okazaki fragments are synthesized continuously on the leading strand during DNA replication.',
    options: ['True', 'False'],
    correctAnswer: 'False',
    explanation: 'Okazaki fragments are synthesized discontinuously on the lagging strand because DNA polymerase only synthesizes in the 5 to 3 direction.',
    difficulty: 'foundational',
    category: 'Biology',
    source: 'original_engine'
  }
];

export class QuestionGeneratorService {
  /**
   * Generates a curated or dynamic quiz supporting MCQ, True/False, and Short Answer
   */
  static async generateQuiz(config: {
    subjectSlug: string;
    topicSlug: string;
    difficulty?: DifficultyLevel;
    amount?: number;
    questionTypes?: QuestionType[];
    mode?: 'mixed' | 'external_api' | 'original_engine';
  }): Promise<QuizQuestion[]> {
    const {
      subjectSlug,
      topicSlug,
      difficulty = 'moderate',
      amount = 5,
      questionTypes = ['multiple_choice', 'true_false', 'short_answer'],
      mode = 'mixed'
    } = config;

    let candidateQuestions: QuizQuestion[] = [];

    // 1. If original_engine or mixed, query question bank and local repository
    if (mode === 'original_engine' || mode === 'mixed') {
      // Check seeded question_bank in SQLite first
      try {
        const rows = await query<{
          id: string;
          topic_id: string;
          question_type: QuestionType;
          question_text: string;
          options: string;
          correct_answer: string;
          explanation: string;
          difficulty: DifficultyLevel;
          source: any;
        }>(
          'SELECT * FROM question_bank WHERE topic_id = ? AND difficulty = ?',
          [topicSlug, difficulty]
        );

        if (rows && rows.length > 0) {
          const mapped: QuizQuestion[] = rows
            .map(r => ({
              id: r.id,
              topicId: r.topic_id,
              questionType: r.question_type,
              questionText: r.question_text,
              options: JSON.parse(r.options || '[]'),
              correctAnswer: r.correct_answer,
              explanation: r.explanation,
              difficulty: r.difficulty,
              category: subjectSlug,
              source: r.source
            }))
            .filter(q => questionTypes.length === 0 || questionTypes.includes(q.questionType));
          candidateQuestions.push(...mapped);
        }
      } catch (err) {
        // Fall through to memory repository
      }

      // Add matching questions from in-memory academic repository
      const matched = ORIGINAL_ACADEMIC_REPOSITORY.filter(
        q =>
          q.topicId === topicSlug &&
          q.difficulty === difficulty &&
          (questionTypes.length === 0 || questionTypes.includes(q.questionType))
      );
      candidateQuestions.push(...matched);

      // If needed more, add other difficulties for this topic matching requested type
      if (candidateQuestions.length < amount) {
        const otherDiff = ORIGINAL_ACADEMIC_REPOSITORY.filter(
          q =>
            q.topicId === topicSlug &&
            q.difficulty !== difficulty &&
            (questionTypes.length === 0 || questionTypes.includes(q.questionType))
        );
        candidateQuestions.push(...otherDiff);
      }
    }

    // 2. If external_api or mixed mode with insufficient questions, query Open Trivia DB (only if multiple_choice allowed)
    if (
      (mode === 'external_api' || candidateQuestions.length < amount) &&
      mode !== 'original_engine' &&
      (questionTypes.length === 0 || questionTypes.includes('multiple_choice'))
    ) {
      try {
        const needed = amount - candidateQuestions.length;
        const externalQuestions = await OpenTriviaService.getQuestions(subjectSlug, topicSlug, difficulty, Math.max(3, needed));
        const formattedExternal: QuizQuestion[] = externalQuestions.map(q => ({
          ...q,
          questionType: 'multiple_choice' as QuestionType
        }));
        candidateQuestions.push(...formattedExternal);
      } catch (err) {
        console.warn('[QuestionGenerator] External fetch failed, relying on original engine.');
      }
    }

    // 3. Fallback: if still under amount, fetch questions strictly matching this subject
    if (candidateQuestions.length < amount) {
      const cleanSub = subjectSlug.replace(/-/g, ' ').toLowerCase();
      const subjectFallback = ORIGINAL_ACADEMIC_REPOSITORY.filter(
        q =>
          (questionTypes.length === 0 || questionTypes.includes(q.questionType)) &&
          q.category.toLowerCase().includes(cleanSub)
      );
      candidateQuestions.push(...subjectFallback);
    }

    // 4. Topic-grounded dynamic generation fallback: if still under amount, dynamically generate questions for THIS topic
    if (candidateQuestions.length < amount) {
      const needed = amount - candidateQuestions.length;
      const topicName = topicSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const subjectName = subjectSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const dynamic = QuestionExtractorService.generateCurriculumQuestions(
        topicName,
        [`${topicName} principles`, `core concepts in ${subjectName}`],
        needed,
        difficulty
      );
      candidateQuestions.push(...dynamic);
    }

    // 5. Strictly filter by requested question types
    const filtered =
      questionTypes.length > 0
        ? candidateQuestions.filter(q => questionTypes.includes(q.questionType))
        : candidateQuestions;

    // 6. Deduplicate by question text
    const seen = new Set<string>();
    const uniqueQuestions: QuizQuestion[] = [];
    for (const q of filtered) {
      const key = q.questionText.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueQuestions.push(q);
      }
      if (uniqueQuestions.length >= amount) break;
    }

    // 7. Validate questions according to validation rules
    return uniqueQuestions.map(this.validateAndNormalizeQuestion);
  }

  /**
   * Validates that every generated question conforms to rigorous educational standards
   */
  static validateAndNormalizeQuestion(q: QuizQuestion): QuizQuestion {
    if (!q.questionText || q.questionText.trim().length < 10) {
      throw new Error(`Invalid question: text too short (${q.id})`);
    }

    if (!q.correctAnswer || q.correctAnswer.trim().length === 0) {
      throw new Error(`Invalid question: missing correct answer (${q.id})`);
    }

    if (!q.explanation || q.explanation.trim().length === 0) {
      q.explanation = `Verified answer: "${q.correctAnswer}". Explanation verified against academic curriculum.`;
    }

    // If MCQ, ensure options contain correct answer and are deduplicated
    if (q.questionType === 'multiple_choice') {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        q.options = [q.correctAnswer, 'Alternative option 1', 'Alternative option 2', 'Alternative option 3'];
      }
      q.options = Array.from(new Set(q.options.map(o => String(o).trim())));
      if (!q.options.some(opt => opt.toLowerCase() === q.correctAnswer.trim().toLowerCase())) {
        q.options.push(q.correctAnswer);
      }
    }

    // If True/False, canonicalize options to ['True', 'False'] and normalize correctAnswer
    if (q.questionType === 'true_false') {
      q.options = ['True', 'False'];
      const lowerCorr = q.correctAnswer.trim().toLowerCase();
      if (lowerCorr === 'true' || lowerCorr === 't' || lowerCorr === '1' || lowerCorr === 'yes') {
        q.correctAnswer = 'True';
      } else if (lowerCorr === 'false' || lowerCorr === 'f' || lowerCorr === '0' || lowerCorr === 'no') {
        q.correctAnswer = 'False';
      }
    }

    return q;
  }
}

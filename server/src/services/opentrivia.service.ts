import { QuizQuestion, DifficultyLevel } from '../../../shared/types.js';
import { getCached, setCached } from './cache.service.js';

function decodeHtml(html: string): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&eacute;/g, 'é')
    .replace(/&deg;/g, '°');
}

const CATEGORY_MAP: Record<string, number> = {
  'computer-science': 18, // Science: Computers
  'mathematics': 19,      // Science: Mathematics
  'physics': 17,          // Science & Nature
  'biology': 17           // Science & Nature
};

const FALLBACK_QUESTIONS: Record<string, QuizQuestion[]> = {
  'algorithms-data-structures': [
    {
      id: 'fb-algo-1',
      topicId: 'top-algo',
      questionText: 'What is the average and worst-case time complexity of binary search on a sorted array of size n?',
      questionType: 'multiple_choice',
      options: ['O(1) average, O(n) worst', 'O(log n) average, O(log n) worst', 'O(n) average, O(n log n) worst', 'O(log n) average, O(n) worst'],
      correctAnswer: 'O(log n) average, O(log n) worst',
      explanation: 'Binary search halves the search space at each iteration, yielding logarithmic O(log n) time complexity in both average and worst cases.',
      difficulty: 'foundational',
      category: 'Computer Science',
      source: 'academic_repository'
    },
    {
      id: 'fb-algo-2',
      topicId: 'top-algo',
      questionText: 'Which data structure enforces Last-In-First-Out (LIFO) order?',
      questionType: 'multiple_choice',
      options: ['Queue', 'Stack', 'Heap', 'Binary Search Tree'],
      correctAnswer: 'Stack',
      explanation: 'A stack operates on a LIFO discipline where elements pushed last are popped first.',
      difficulty: 'foundational',
      category: 'Computer Science',
      source: 'academic_repository'
    },
    {
      id: 'fb-algo-3',
      topicId: 'top-algo',
      questionText: 'What is the worst-case time complexity of standard QuickSort without randomized pivot selection?',
      questionType: 'multiple_choice',
      options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(2^n)'],
      correctAnswer: 'O(n^2)',
      explanation: 'When the chosen pivot is repeatedly the extreme element (such as in an already sorted array), recursion depth is n, resulting in O(n^2).',
      difficulty: 'moderate',
      category: 'Computer Science',
      source: 'academic_repository'
    },
    {
      id: 'fb-algo-4',
      topicId: 'top-algo',
      questionText: 'Which graph traversal algorithm uses a priority queue or min-heap to find single-source shortest paths in non-negative weighted graphs?',
      questionType: 'multiple_choice',
      options: ['Breadth-First Search', 'Dijkstra Algorithm', 'Bellman-Ford Algorithm', 'Floyd-Warshall Algorithm'],
      correctAnswer: 'Dijkstra Algorithm',
      explanation: 'Dijkstra algorithm uses a min-priority queue to greedily extract the unvisited vertex with smallest provisional distance.',
      difficulty: 'moderate',
      category: 'Computer Science',
      source: 'academic_repository'
    },
    {
      id: 'fb-algo-5',
      topicId: 'top-algo',
      questionText: 'In an AVL tree or Red-Black tree, what is the guaranteed upper bound on search and insertion operations?',
      questionType: 'multiple_choice',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      correctAnswer: 'O(log n)',
      explanation: 'Self-balancing binary search trees maintain logarithmic height invariant via tree rotations, guaranteeing O(log n) operations.',
      difficulty: 'rigorous',
      category: 'Computer Science',
      source: 'academic_repository'
    }
  ],
  'linear-algebra': [
    {
      id: 'fb-linalg-1',
      topicId: 'top-linalg',
      questionText: 'If a square matrix A has a determinant of 0, what does this imply about its invertibility?',
      questionType: 'multiple_choice',
      options: ['A is invertible', 'A is singular and has no inverse', 'A is orthogonal', 'A has all positive eigenvalues'],
      correctAnswer: 'A is singular and has no inverse',
      explanation: 'A matrix is invertible if and only if its determinant is non-zero. A determinant of 0 indicates linearly dependent rows/columns.',
      difficulty: 'foundational',
      category: 'Mathematics',
      source: 'academic_repository'
    },
    {
      id: 'fb-linalg-2',
      topicId: 'top-linalg',
      questionText: 'For an n x n matrix A, if A v = λ v with non-zero vector v, what is λ called?',
      questionType: 'multiple_choice',
      options: ['Singular value', 'Eigenvalue', 'Determinant', 'Trace'],
      correctAnswer: 'Eigenvalue',
      explanation: 'By definition, λ is the scalar eigenvalue corresponding to the eigenvector v under the linear operator A.',
      difficulty: 'foundational',
      category: 'Mathematics',
      source: 'academic_repository'
    },
    {
      id: 'fb-linalg-3',
      topicId: 'top-linalg',
      questionText: 'What is the relationship between the row rank and column rank of any real m x n matrix?',
      questionType: 'multiple_choice',
      options: ['Row rank is always greater than column rank', 'They are always strictly equal', 'They depend on the condition number', 'Row rank equals column rank squared'],
      correctAnswer: 'They are always strictly equal',
      explanation: 'Fundamental theorem of linear algebra establishes that the row rank and column rank of any matrix are always equal.',
      difficulty: 'moderate',
      category: 'Mathematics',
      source: 'academic_repository'
    }
  ]
};

export class OpenTriviaService {
  private static readonly API_URL = 'https://opentdb.com/api.php';

  static async getQuestions(
    subjectSlug: string,
    topicSlug: string,
    difficulty: DifficultyLevel = 'moderate',
    amount: number = 5
  ): Promise<QuizQuestion[]> {
    const cacheKey = `trivia:${subjectSlug}:${topicSlug}:${difficulty}:${amount}`;

    // 1. Check cache
    const cached = await getCached<QuizQuestion[]>(cacheKey);
    if (cached && cached.length >= amount) return cached.slice(0, amount);

    // 2. Try Open Trivia DB live query if category exists
    const catId = CATEGORY_MAP[subjectSlug];
    const diffParam = difficulty === 'foundational' ? 'easy' : difficulty === 'rigorous' ? 'hard' : 'medium';

    if (catId) {
      try {
        const url = `${this.API_URL}?amount=${amount}&category=${catId}&difficulty=${diffParam}&type=multiple`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data: any = await res.json();
          if (data.response_code === 0 && Array.isArray(data.results) && data.results.length > 0) {
            const mapped: QuizQuestion[] = data.results.map((r: any, idx: number) => {
              const correct = decodeHtml(r.correct_answer);
              const incorrect = (r.incorrect_answers || []).map((ans: string) => decodeHtml(ans));
              const allOptions = [...incorrect, correct].sort(() => 0.5 - Math.random());

              return {
                id: `otdb-${Date.now()}-${idx}`,
                topicId: topicSlug,
                questionText: decodeHtml(r.question),
                questionType: 'multiple_choice' as const,
                options: allOptions,
                correctAnswer: correct,
                explanation: `Verified answer: "${correct}". Source: Open Trivia Database (${r.category}).`,
                difficulty,
                category: r.category,
                source: 'open_trivia_db' as const
              };
            });

            await setCached(cacheKey, 'Open Trivia DB', mapped, 3600 * 1000);
            return mapped;
          }
        }
      } catch (err) {
        console.warn(`[OpenTriviaService] Live fetch failed for "${subjectSlug}". Falling back.`);
      }
    }

    // 3. Fallback to curated verified questions ONLY if matching topic exists or subject is computer-science
    const fallbackList = FALLBACK_QUESTIONS[topicSlug] || (subjectSlug === 'computer-science' ? FALLBACK_QUESTIONS['algorithms-data-structures'] : []);
    if (fallbackList.length === 0) {
      return [];
    }
    const filtered = fallbackList.filter(q => q.difficulty === difficulty);
    const result = filtered.length >= amount ? filtered.slice(0, amount) : fallbackList.slice(0, amount);

    await setCached(cacheKey, 'Academic Repository', result, 24 * 3600 * 1000);
    return result;
  }
}

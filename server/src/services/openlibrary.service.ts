import { OpenLibraryBook } from '../../../shared/types.js';
import { getCached, setCached } from './cache.service.js';

const FALLBACK_BOOKS: Record<string, OpenLibraryBook[]> = {
  'computer_science': [
    {
      key: '/works/OL15843403W',
      title: 'Introduction to Algorithms',
      authorNames: ['Thomas H. Cormen', 'Charles E. Leiserson', 'Ronald L. Rivest', 'Clifford Stein'],
      firstPublishYear: 1990,
      coverUrl: 'https://covers.openlibrary.org/b/id/8316126-M.jpg',
      subject: ['Algorithms', 'Data structures', 'Computer science'],
      editionCount: 22
    },
    {
      key: '/works/OL3307521W',
      title: 'Structure and Interpretation of Computer Programs',
      authorNames: ['Harold Abelson', 'Gerald Jay Sussman', 'Julie Sussman'],
      firstPublishYear: 1984,
      coverUrl: 'https://covers.openlibrary.org/b/id/240726-M.jpg',
      subject: ['Computer programming', 'LISP', 'Computer science'],
      editionCount: 15
    },
    {
      key: '/works/OL2747141W',
      title: 'Operating System Concepts',
      authorNames: ['Abraham Silberschatz', 'Peter B. Galvin', 'Greg Gagne'],
      firstPublishYear: 1983,
      coverUrl: 'https://covers.openlibrary.org/b/id/11149454-M.jpg',
      subject: ['Operating systems', 'System design'],
      editionCount: 18
    }
  ],
  'mathematics': [
    {
      key: '/works/OL2747124W',
      title: 'Linear Algebra and Its Applications',
      authorNames: ['Gilbert Strang'],
      firstPublishYear: 1976,
      coverUrl: 'https://covers.openlibrary.org/b/id/728148-M.jpg',
      subject: ['Linear algebra', 'Matrices', 'Vector spaces'],
      editionCount: 12
    },
    {
      key: '/works/OL1529124W',
      title: 'Calculus: Early Transcendentals',
      authorNames: ['James Stewart'],
      firstPublishYear: 1995,
      coverUrl: 'https://covers.openlibrary.org/b/id/9255566-M.jpg',
      subject: ['Calculus', 'Mathematical analysis'],
      editionCount: 14
    }
  ],
  'physics': [
    {
      key: '/works/OL15320508W',
      title: 'The Feynman Lectures on Physics',
      authorNames: ['Richard P. Feynman', 'Robert B. Leighton', 'Matthew Sands'],
      firstPublishYear: 1963,
      coverUrl: 'https://covers.openlibrary.org/b/id/8404561-M.jpg',
      subject: ['Physics', 'Quantum mechanics', 'Electromagnetism'],
      editionCount: 25
    }
  ],
  'algorithms': [
    {
      key: '/works/OL15843403W',
      title: 'Introduction to Algorithms (CLRS)',
      authorNames: ['Thomas H. Cormen', 'Charles E. Leiserson', 'Ronald L. Rivest', 'Clifford Stein'],
      firstPublishYear: 1990,
      coverUrl: 'https://covers.openlibrary.org/b/id/8316126-M.jpg',
      subject: ['Algorithms', 'Data structures', 'Graph algorithms', 'Dynamic programming'],
      editionCount: 22
    },
    {
      key: '/works/OL3426743W',
      title: 'The Algorithm Design Manual',
      authorNames: ['Steven S. Skiena'],
      firstPublishYear: 1997,
      coverUrl: 'https://covers.openlibrary.org/b/id/7222246-M.jpg',
      subject: ['Algorithms', 'Combinatorics', 'Heuristics'],
      editionCount: 9
    },
    {
      key: '/works/OL15354964W',
      title: 'Algorithms',
      authorNames: ['Robert Sedgewick', 'Kevin Wayne'],
      firstPublishYear: 2011,
      coverUrl: 'https://covers.openlibrary.org/b/id/8231846-M.jpg',
      subject: ['Algorithms', 'Java', 'Data structures'],
      editionCount: 8
    }
  ],
  'operating_systems': [
    {
      key: '/works/OL2747141W',
      title: 'Operating System Concepts (Dinosaur Book)',
      authorNames: ['Abraham Silberschatz', 'Peter B. Galvin', 'Greg Gagne'],
      firstPublishYear: 1983,
      coverUrl: 'https://covers.openlibrary.org/b/id/11149454-M.jpg',
      subject: ['Operating systems', 'Concurrency', 'Virtual memory', 'Deadlocks'],
      editionCount: 18
    },
    {
      key: '/works/OL3144837W',
      title: 'Modern Operating Systems',
      authorNames: ['Andrew S. Tanenbaum', 'Herbert Bos'],
      firstPublishYear: 1992,
      coverUrl: 'https://covers.openlibrary.org/b/id/8321456-M.jpg',
      subject: ['Operating systems', 'File systems', 'Distributed systems'],
      editionCount: 14
    }
  ],
  'artificial_intelligence': [
    {
      key: '/works/OL262758W',
      title: 'Artificial Intelligence: A Modern Approach',
      authorNames: ['Stuart Russell', 'Peter Norvig'],
      firstPublishYear: 1995,
      coverUrl: 'https://covers.openlibrary.org/b/id/8258678-M.jpg',
      subject: ['Artificial intelligence', 'Machine learning', 'Search algorithms', 'Knowledge graphs'],
      editionCount: 20
    },
    {
      key: '/works/OL17356247W',
      title: 'Deep Learning',
      authorNames: ['Ian Goodfellow', 'Yoshua Bengio', 'Aaron Courville'],
      firstPublishYear: 2016,
      coverUrl: 'https://covers.openlibrary.org/b/id/8272332-M.jpg',
      subject: ['Deep learning', 'Neural networks', 'Machine learning'],
      editionCount: 6
    }
  ],
  'databases': [
    {
      key: '/works/OL2747143W',
      title: 'Database System Concepts',
      authorNames: ['Abraham Silberschatz', 'Henry F. Korth', 'S. Sudarshan'],
      firstPublishYear: 1986,
      coverUrl: 'https://covers.openlibrary.org/b/id/8316126-M.jpg',
      subject: ['Databases', 'Relational database', 'SQL', 'ACID transactions'],
      editionCount: 16
    },
    {
      key: '/works/OL18195159W',
      title: 'Designing Data-Intensive Applications',
      authorNames: ['Martin Kleppmann'],
      firstPublishYear: 2017,
      coverUrl: 'https://covers.openlibrary.org/b/id/8231846-M.jpg',
      subject: ['Distributed systems', 'Databases', 'Replication', 'Partitioning'],
      editionCount: 5
    }
  ],
  'literature': [
    {
      key: '/works/OL66554W',
      title: 'Pride and Prejudice',
      authorNames: ['Jane Austen'],
      firstPublishYear: 1813,
      coverUrl: 'https://covers.openlibrary.org/b/id/8235114-M.jpg',
      subject: ['Classic literature', 'English fiction', 'Romance'],
      editionCount: 110
    },
    {
      key: '/works/OL450099W',
      title: 'Frankenstein',
      authorNames: ['Mary Wollstonecraft Shelley'],
      firstPublishYear: 1818,
      coverUrl: 'https://covers.openlibrary.org/b/id/8258612-M.jpg',
      subject: ['Gothic fiction', 'Science fiction', 'Classic literature'],
      editionCount: 85
    }
  ]
};

export class OpenLibraryService {
  private static readonly SUBJECT_URL = 'https://openlibrary.org/subjects';
  private static readonly SEARCH_URL = 'https://openlibrary.org/search.json';

  static async getBooksBySubject(subjectKey: string, limit: number = 8): Promise<OpenLibraryBook[]> {
    const normalizedKey = subjectKey.trim().toLowerCase().replace(/[\s-]+/g, '_');
    const cacheKey = `openlib:subj:${normalizedKey}:${limit}`;

    // 1. Check cache
    const cached = await getCached<OpenLibraryBook[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    // 2. Attempt live query to Open Library
    try {
      const url = `${this.SUBJECT_URL}/${encodeURIComponent(normalizedKey)}.json?limit=${limit}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LearnSphere/1.0 (academic CSE279 project; student@learnsphere.edu)'
        }
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data: any = await res.json();
        const works = data.works || [];
        const books: OpenLibraryBook[] = works.map((w: any) => ({
          key: w.key,
          title: w.title,
          authorNames: (w.authors || []).map((a: any) => a.name).filter(Boolean),
          firstPublishYear: w.first_publish_year,
          coverUrl: w.cover_id
            ? `https://covers.openlibrary.org/b/id/${w.cover_id}-M.jpg`
            : undefined,
          subject: (w.subject || []).slice(0, 4),
          editionCount: w.edition_count
        }));

        if (books.length > 0) {
          await setCached(cacheKey, 'Open Library', books, 24 * 3600 * 1000);
          return books;
        }
      }
    } catch (err) {
      console.warn(`[OpenLibraryService] Live fetch failed for subject "${subjectKey}". Falling back.`);
    }

    // 3. Fallback
    const fallback =
      normalizedKey === 'all'
        ? [
            ...FALLBACK_BOOKS['computer_science'],
            ...FALLBACK_BOOKS['algorithms'],
            ...FALLBACK_BOOKS['artificial_intelligence'],
            ...FALLBACK_BOOKS['operating_systems'],
            ...FALLBACK_BOOKS['databases'],
            ...FALLBACK_BOOKS['mathematics'],
            ...FALLBACK_BOOKS['physics'],
            ...FALLBACK_BOOKS['literature']
          ]
        : FALLBACK_BOOKS[normalizedKey] || FALLBACK_BOOKS['computer_science'];
    await setCached(cacheKey, 'Open Library', fallback, 3600 * 1000);
    return fallback;
  }
}

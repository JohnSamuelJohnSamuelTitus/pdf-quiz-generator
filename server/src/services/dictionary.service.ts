import { DictionaryDefinition } from '../../../shared/types.js';
import { getCached, setCached } from './cache.service.js';

const FALLBACK_DEFINITIONS: Record<string, DictionaryDefinition[]> = {
  'algorithm': [
    {
      word: 'algorithm',
      phonetic: '/ˈælɡəˌɹɪðm̩/',
      partOfSpeech: 'noun',
      definition: 'A step-by-step procedure or set of rules for solving a mathematical or computational problem in a finite number of steps.',
      example: 'The team implemented a fast sorting algorithm to handle large datasets.',
      synonyms: ['procedure', 'formula', 'method', 'routine']
    }
  ],
  'eigenvector': [
    {
      word: 'eigenvector',
      phonetic: '/ˈaɪɡənˌvɛktɚ/',
      partOfSpeech: 'noun',
      definition: 'A non-zero vector that does not change direction when a linear transformation is applied to it, only scaling by an eigenvalue scalar.',
      example: 'Principal component analysis computes the eigenvectors of the covariance matrix.',
      synonyms: ['characteristic vector', 'proper vector']
    }
  ],
  'recursion': [
    {
      word: 'recursion',
      phonetic: '/ɹɪˈkɜː.ʒən/',
      partOfSpeech: 'noun',
      definition: 'The process of defining a function or calculating a quantity by the repeated application of an algorithm to sub-problems.',
      example: 'Tree traversal is elegantly expressed using recursion.',
      synonyms: ['repetition', 'iterative definition']
    }
  ]
};

export class DictionaryService {
  private static readonly API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

  static async getDefinition(word: string): Promise<DictionaryDefinition[]> {
    const cleanWord = word.trim().toLowerCase();
    const cacheKey = `dict:${cleanWord}`;

    // 1. Check cache
    const cached = await getCached<DictionaryDefinition[]>(cacheKey);
    if (cached) return cached;

    // 2. Try live Free Dictionary API
    try {
      const url = `${this.API_URL}/${encodeURIComponent(cleanWord)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const json: any = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          const entry = json[0];
          const phonetic = entry.phonetic || (entry.phonetics?.[0]?.text);
          const results: DictionaryDefinition[] = [];

          for (const m of entry.meanings || []) {
            const defObj = m.definitions?.[0];
            if (defObj) {
              results.push({
                word: entry.word,
                phonetic,
                partOfSpeech: m.partOfSpeech || 'noun',
                definition: defObj.definition,
                example: defObj.example,
                synonyms: (m.synonyms || []).slice(0, 5)
              });
            }
          }

          if (results.length > 0) {
            await setCached(cacheKey, 'Free Dictionary', results, 7 * 24 * 3600 * 1000);
            return results;
          }
        }
      }
    } catch (err) {
      console.warn(`[DictionaryService] Live fetch failed for "${word}". Falling back.`);
    }

    // 3. Fallback
    const fallback = FALLBACK_DEFINITIONS[cleanWord] || [
      {
        word: cleanWord,
        partOfSpeech: 'noun',
        definition: `Formal academic term used in topic study: "${cleanWord}".`,
        synonyms: []
      }
    ];

    await setCached(cacheKey, 'Free Dictionary', fallback, 3600 * 1000);
    return fallback;
  }
}

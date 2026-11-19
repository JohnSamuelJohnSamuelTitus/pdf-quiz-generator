import { describe, it, expect, beforeAll } from 'vitest';
import { WikipediaService } from '../server/src/services/wikipedia.service.js';
import { OpenLibraryService } from '../server/src/services/openlibrary.service.js';
import { OpenTriviaService } from '../server/src/services/opentrivia.service.js';
import { DictionaryService } from '../server/src/services/dictionary.service.js';
import { getCached, setCached } from '../server/src/services/cache.service.js';
import { getDb } from '../server/src/db/index.js';

describe('Public APIs Integration & Multi-Tier Resilience Suite', () => {
  beforeAll(async () => {
    await getDb();
  });

  it('WikipediaService retrieves structured topic summaries with fallbacks', async () => {
    const summary = await WikipediaService.getSummary('Algorithm');
    expect(summary).toBeDefined();
    expect(summary.title.toLowerCase()).toContain('algorithm');
    expect(summary.extract.length).toBeGreaterThan(20);
    expect(summary.pageUrl).toContain('wikipedia.org');
  });

  it('OpenLibraryService retrieves published books and bibliography', async () => {
    const books = await OpenLibraryService.getBooksBySubject('computer_science', 4);
    expect(Array.isArray(books)).toBe(true);
    expect(books.length).toBeGreaterThan(0);
    expect(books[0].title).toBeDefined();
    expect(books[0].key).toBeDefined();
  });

  it('OpenTriviaService generates categorized questions with options and explanations', async () => {
    const questions = await OpenTriviaService.getQuestions(
      'computer-science',
      'algorithms-data-structures',
      'foundational',
      3
    );

    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBe(3);
    for (const q of questions) {
      expect(q.questionText).toBeDefined();
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options).toContain(q.correctAnswer);
      expect(q.explanation).toBeDefined();
    }
  });

  it('DictionaryService retrieves academic definitions and phonetics', async () => {
    const defs = await DictionaryService.getDefinition('algorithm');
    expect(Array.isArray(defs)).toBe(true);
    expect(defs.length).toBeGreaterThan(0);
    expect(defs[0].word.toLowerCase()).toBe('algorithm');
    expect(defs[0].definition).toBeDefined();
  });

  it('CacheService stores and retrieves cached responses', async () => {
    const key = `test:cache:${Date.now()}`;
    const payload = { test: true, timestamp: Date.now() };

    await setCached(key, 'TestService', payload, 5000);
    const retrieved = await getCached<typeof payload>(key);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.test).toBe(true);
    expect(retrieved?.timestamp).toBe(payload.timestamp);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WikipediaService } from '../server/src/services/wikipedia.service.js';
import { OpenLibraryService } from '../server/src/services/openlibrary.service.js';
import { OpenTriviaService } from '../server/src/services/opentrivia.service.js';
import { DictionaryService } from '../server/src/services/dictionary.service.js';
import { getCached, setCached } from '../server/src/services/cache.service.js';
import { getDb, query } from '../server/src/db/index.js';

describe('API Failure Simulation & Resilience Suite', () => {
  beforeEach(async () => {
    await getDb();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Condition 1: Successful response
  it('Condition 1: Handles successful response with structured parsing', async () => {
    const mockData = {
      title: 'Mock Topic',
      displaytitle: 'Mock Topic',
      extract: 'This is a valid mock extract for testing successful responses.',
      description: 'Educational topic',
      content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Mock_Topic' } }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData
    } as any);

    const result = await WikipediaService.getSummary('Mock_Topic_Success');
    expect(result).toBeDefined();
    expect(result.title).toBe('Mock Topic');
    expect(result.extract).toContain('valid mock extract');
  });

  // Condition 2: HTTP 404 Not Found
  it('Condition 2: Handles HTTP 404 without crashing and returns graceful fallback', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ type: 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found' })
    } as any);

    const result = await WikipediaService.getSummary('NonExistentTopic12345');
    expect(result).toBeDefined();
    expect(result.title).toBe('NonExistentTopic12345');
    expect(result.extract).toBeDefined();
  });

  // Condition 3: HTTP 429 Rate Limiting
  it('Condition 3: Handles HTTP 429 Rate Limiting and serves fallback without throwing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({ error: 'Rate limit exceeded' })
    } as any);

    const questions = await OpenTriviaService.getQuestions('computer-science', 'algorithms-data-structures', 'moderate', 3);
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBe(3);
    expect(questions[0].questionText).toBeDefined();
  });

  // Condition 4: HTTP 500 Server Error
  it('Condition 4: Handles HTTP 500 Internal Server Error seamlessly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: 'Database connection failed upstream' })
    } as any);

    const books = await OpenLibraryService.getBooksBySubject('computer_science', 2);
    expect(Array.isArray(books)).toBe(true);
    expect(books.length).toBeGreaterThan(0);
  });

  // Condition 5: Network unavailable / Connection refused
  it('Condition 5: Handles network disconnection (fetch failure) with fallback', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('fetch failed: ECONNREFUSED 127.0.0.1:443'));

    const defs = await DictionaryService.getDefinition('algorithm');
    expect(Array.isArray(defs)).toBe(true);
    expect(defs.length).toBeGreaterThan(0);
    expect(defs[0].word).toBe('algorithm');
  });

  // Condition 6: Request timeout (AbortError)
  it('Condition 6: Handles request timeout (AbortController signal aborted)', async () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    global.fetch = vi.fn().mockRejectedValue(abortErr);

    const summary = await WikipediaService.getSummary('algorithm');
    expect(summary).toBeDefined();
    expect(summary.title).toBe('Algorithm');
  });

  // Condition 7: Invalid JSON response
  it('Condition 7: Handles malformed/invalid JSON without unhandled exception', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON at position 0');
      }
    } as any);

    const books = await OpenLibraryService.getBooksBySubject('mathematics', 2);
    expect(Array.isArray(books)).toBe(true);
    expect(books.length).toBeGreaterThan(0);
  });

  // Condition 8: Empty response body
  it('Condition 8: Handles empty array or empty object response correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => []
    } as any);

    const defs = await DictionaryService.getDefinition('algorithm');
    expect(Array.isArray(defs)).toBe(true);
    expect(defs.length).toBeGreaterThan(0);
  });

  // Condition 9: Missing expected fields
  it('Condition 9: Handles response missing standard fields gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ unexpected_schema: true, data: null })
    } as any);

    const questions = await OpenTriviaService.getQuestions('computer-science', 'algorithms-data-structures', 'moderate', 2);
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBe(2);
    expect(questions[0].options.length).toBeGreaterThanOrEqual(2);
  });

  // Database integrity check: failed API calls must never write corrupt records
  it('Database Safety: verifies failed or invalid calls do not corrupt api_cache', async () => {
    const invalidKey = `corrupt-test-${Date.now()}`;
    const cachedBefore = await getCached(invalidKey);
    expect(cachedBefore).toBeNull();

    // Verify cache table has no broken entries
    const badRows = await query("SELECT * FROM api_cache WHERE response_data IS NULL OR response_data = ''");
    expect(badRows.length).toBe(0);
  });
});

import { Router, Request, Response } from 'express';
import { WikipediaService } from '../services/wikipedia.service.js';
import { OpenLibraryService } from '../services/openlibrary.service.js';
import { OpenTriviaService } from '../services/opentrivia.service.js';
import { DictionaryService } from '../services/dictionary.service.js';
import { ApiHealthStatus } from '../../../shared/types.js';

const router = Router();

// GET /api/external/wikipedia/:topic
router.get('/wikipedia/:topic', async (req: Request, res: Response) => {
  try {
    const { topic } = req.params;
    const summary = await WikipediaService.getSummary(topic);
    return res.json({ success: true, data: summary });
  } catch (err: any) {
    console.error('[API Router] Wikipedia error:', err);
    return res.status(500).json({ success: false, error: 'Failed to query Wikipedia API' });
  }
});

// GET /api/external/books/:subject
router.get('/books/:subject', async (req: Request, res: Response) => {
  try {
    const { subject } = req.params;
    const limit = parseInt(req.query.limit as string, 10) || 8;
    const books = await OpenLibraryService.getBooksBySubject(subject, limit);
    return res.json({ success: true, data: books });
  } catch (err: any) {
    console.error('[API Router] Open Library error:', err);
    return res.status(500).json({ success: false, error: 'Failed to query Open Library API' });
  }
});

// GET /api/external/dictionary/:term
router.get('/dictionary/:term', async (req: Request, res: Response) => {
  try {
    const { term } = req.params;
    const definitions = await DictionaryService.getDefinition(term);
    return res.json({ success: true, data: definitions });
  } catch (err: any) {
    console.error('[API Router] Dictionary error:', err);
    return res.status(500).json({ success: false, error: 'Failed to query Dictionary API' });
  }
});

// GET /api/external/health — API Diagnostics & Verification Monitor
router.get('/health', async (_req: Request, res: Response) => {
  const results: ApiHealthStatus[] = [];
  const checkTime = new Date().toISOString();

  // 1. Wikipedia REST check
  const startWiki = Date.now();
  try {
    await WikipediaService.getSummary('Algorithm');
    results.push({
      service: 'Wikipedia REST API',
      status: 'operational',
      latencyMs: Date.now() - startWiki,
      lastChecked: checkTime,
      details: 'Authoritative summaries & knowledge extracts verified'
    });
  } catch (e: any) {
    results.push({
      service: 'Wikipedia REST API',
      status: 'cached_fallback',
      latencyMs: Date.now() - startWiki,
      lastChecked: checkTime,
      details: 'Operating on cached educational database'
    });
  }

  // 2. Open Library check
  const startLib = Date.now();
  try {
    await OpenLibraryService.getBooksBySubject('computer_science', 2);
    results.push({
      service: 'Open Library Subjects API',
      status: 'operational',
      latencyMs: Date.now() - startLib,
      lastChecked: checkTime,
      details: 'Curated academic textbooks & bibliography verified'
    });
  } catch (e: any) {
    results.push({
      service: 'Open Library Subjects API',
      status: 'cached_fallback',
      latencyMs: Date.now() - startLib,
      lastChecked: checkTime,
      details: 'Operating on cached library database'
    });
  }

  // 3. Open Trivia DB check
  const startTrivia = Date.now();
  try {
    await OpenTriviaService.getQuestions('computer-science', 'algorithms-data-structures', 'moderate', 2);
    results.push({
      service: 'Open Trivia Database API',
      status: 'operational',
      latencyMs: Date.now() - startTrivia,
      lastChecked: checkTime,
      details: 'Categorized assessment questions active'
    });
  } catch (e: any) {
    results.push({
      service: 'Open Trivia Database API',
      status: 'cached_fallback',
      latencyMs: Date.now() - startTrivia,
      lastChecked: checkTime,
      details: 'Operating on verified academic repository'
    });
  }

  // 4. Free Dictionary check
  const startDict = Date.now();
  try {
    await DictionaryService.getDefinition('algorithm');
    results.push({
      service: 'Free Dictionary API',
      status: 'operational',
      latencyMs: Date.now() - startDict,
      lastChecked: checkTime,
      details: 'Etymological & definition lookups active'
    });
  } catch (e: any) {
    results.push({
      service: 'Free Dictionary API',
      status: 'cached_fallback',
      latencyMs: Date.now() - startDict,
      lastChecked: checkTime,
      details: 'Operating on cached dictionary definitions'
    });
  }

  return res.json({
    success: true,
    timestamp: checkTime,
    services: results
  });
});

export default router;

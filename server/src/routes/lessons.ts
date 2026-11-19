import { Router, Response } from 'express';
import { run, query, queryOne } from '../db/index.js';
import { requireSession, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { LessonGeneratorService } from '../services/lesson-generator.service.js';
import { QuestionExtractorService } from '../services/question-extractor.service.js';
import { TopicNote } from '../../../shared/types.js';

const router = Router();

// GET /api/lessons/topic/:topicId
router.get('/topic/:topicId', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topicId } = req.params;
    const lesson = await LessonGeneratorService.generateLesson(topicId);
    return res.json({ success: true, lesson });
  } catch (err: any) {
    console.error('[Lessons] Generate lesson error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to generate source-grounded lesson' });
  }
});

// GET /api/lessons/topic/:topicId/notes
router.get('/topic/:topicId/notes', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topicId } = req.params;
    const userId = req.user!.id;

    const notes = await query<any>(
      `SELECT id, user_id as userId, topic_id as topicId, project_id as projectId,
              note_content as noteContent, is_bookmarked as isBookmarked,
              highlight_text as highlightText, created_at as createdAt, updated_at as updatedAt
       FROM topic_notes
       WHERE topic_id = ? AND user_id = ?
       ORDER BY updated_at DESC`,
      [topicId, userId]
    );

    return res.json({
      success: true,
      notes: notes.map(n => ({
        ...n,
        isBookmarked: Boolean(n.isBookmarked)
      }))
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve notes' });
  }
});

// POST /api/lessons/topic/:topicId/notes
router.post('/topic/:topicId/notes', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topicId } = req.params;
    const userId = req.user!.id;
    const { noteContent, isBookmarked = false, highlightText } = req.body;

    const topic = await queryOne<{ project_id: string }>(
      'SELECT project_id FROM syllabus_topics WHERE id = ?',
      [topicId]
    );

    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }

    const noteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    await run(
      `INSERT INTO topic_notes (id, user_id, topic_id, project_id, note_content, is_bookmarked, highlight_text)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [noteId, userId, topicId, topic.project_id, noteContent || '', isBookmarked ? 1 : 0, highlightText || null]
    );

    const saved: TopicNote = {
      id: noteId,
      userId,
      topicId,
      projectId: topic.project_id,
      noteContent: noteContent || '',
      isBookmarked: Boolean(isBookmarked),
      highlightText: highlightText || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return res.status(201).json({ success: true, note: saved });
  } catch (err: any) {
    console.error('[Lessons] Save note error:', err);
    return res.status(500).json({ success: false, error: 'Failed to save note' });
  }
});

// POST /api/lessons/topic/:topicId/generate-questions
router.post('/topic/:topicId/generate-questions', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topicId } = req.params;
    const { amount = 5, difficulty = 'moderate' } = req.body;

    const topic = await queryOne<{ id: string; title: string; summary: string | null; subtopics?: string | null }>(
      'SELECT id, title, summary, subtopics FROM syllabus_topics WHERE id = ?',
      [topicId]
    );

    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }

    let subtopics: string[] = [];
    if (topic.subtopics) {
      try {
        subtopics = typeof topic.subtopics === 'string' ? JSON.parse(topic.subtopics) : topic.subtopics;
      } catch {}
    }

    // Get mapped document section excerpts
    const mapped = await query<{ content_text: string }>(
      `SELECT s.content_text
       FROM topic_document_mappings m
       JOIN document_sections s ON m.section_id = s.id
       WHERE m.topic_id = ?
       ORDER BY m.relevance_score DESC
       LIMIT 5`,
      [topicId]
    );

    const excerpts = mapped.map(m => m.content_text);
    if (excerpts.length === 0 && topic.summary) {
      excerpts.push(topic.summary);
    }

    // Enrich excerpts with topic lesson content (definitions, explanation, key points)
    try {
      const lesson = await LessonGeneratorService.generateLesson(topicId);
      if (lesson) {
        if (lesson.explanation) excerpts.push(lesson.explanation);
        if (lesson.introduction) excerpts.push(lesson.introduction);
        if (Array.isArray(lesson.definitions)) {
          for (const d of lesson.definitions) {
            if (d && d.term && d.definition) {
              excerpts.push(`${d.term} is defined as ${d.definition}`);
            }
          }
        }
        if (Array.isArray(lesson.keyPoints)) {
          excerpts.push(...lesson.keyPoints);
        }
        if (lesson.recap) excerpts.push(lesson.recap);
      }
    } catch (e) {
      // Graceful fallback to topic summary or curriculum questions if lesson generation is not cached
    }

    const questions = QuestionExtractorService.generateGroundedQuestions(
      topic.title,
      excerpts,
      Number(amount),
      difficulty,
      subtopics
    );

    return res.json({ success: true, questions });
  } catch (err: any) {
    console.error('[Lessons] Generate grounded questions error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate questions' });
  }
});

export default router;

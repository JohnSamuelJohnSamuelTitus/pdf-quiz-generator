import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, run } from '../db/index.js';
import { requireSession, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { LearningSession } from '../../../shared/types.js';

const router = Router();

const startSessionSchema = z.object({
  topicId: z.string().min(1, 'topicId is required')
});

const completeSessionSchema = z.object({
  durationSeconds: z.number().min(0),
  notes: z.string().optional()
});

// GET /api/sessions
router.get('/', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const rows = await query<{
      id: string;
      user_id: string;
      topic_id: string;
      topic_title?: string;
      subject_title?: string;
      start_time: string;
      end_time?: string;
      duration_seconds: number;
      notes?: string;
      status: 'active' | 'completed';
    }>(
      `SELECT ls.*, t.title as topic_title, s.title as subject_title
       FROM learning_sessions ls
       JOIN topics t ON ls.topic_id = t.id
       JOIN subjects s ON t.subject_id = s.id
       WHERE ls.user_id = ?
       ORDER BY ls.start_time DESC
       LIMIT 20`,
      [userId]
    );

    const sessions: LearningSession[] = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      topicId: r.topic_id,
      topicTitle: r.topic_title,
      subjectTitle: r.subject_title,
      startTime: r.start_time,
      endTime: r.end_time,
      durationSeconds: r.duration_seconds,
      notes: r.notes,
      status: r.status
    }));

    return res.json({ success: true, sessions });
  } catch (err: any) {
    console.error('[Sessions] Fetch error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve study sessions' });
  }
});

// POST /api/sessions/start
router.post('/start', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parse = startSessionSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.errors[0]?.message });
    }

    const { topicId } = parse.data;
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    await run(
      `INSERT INTO learning_sessions (id, user_id, topic_id, start_time, status)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'active')`,
      [sessionId, userId, topicId]
    );

    // Also mark topic as in_progress if not already started
    await run(
      `INSERT INTO student_progress (id, user_id, topic_id, status, mastery_score, last_studied_at)
       VALUES (?, ?, ?, 'in_progress', 10.0, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, topic_id) DO UPDATE SET
         status = CASE WHEN student_progress.status = 'not_started' THEN 'in_progress' ELSE student_progress.status END,
         last_studied_at = CURRENT_TIMESTAMP`,
      [`prog-${Date.now()}`, userId, topicId]
    );

    return res.status(201).json({
      success: true,
      message: 'Learning session started',
      sessionId
    });
  } catch (err: any) {
    console.error('[Sessions] Start error:', err);
    return res.status(500).json({ success: false, error: 'Failed to start learning session' });
  }
});

// POST /api/sessions/:id/complete
router.post('/:id/complete', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;
    const parse = completeSessionSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({ success: false, error: 'Invalid completion payload' });
    }

    const { durationSeconds, notes } = parse.data;

    const session = await queryOne<{ id: string; topic_id: string }>(
      'SELECT id, topic_id FROM learning_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId]
    );

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    await run(
      `UPDATE learning_sessions
       SET end_time = CURRENT_TIMESTAMP,
           duration_seconds = ?,
           notes = ?,
           status = 'completed'
       WHERE id = ?`,
      [durationSeconds, notes || '', sessionId]
    );

    // Increment progress slightly on session completion
    await run(
      `UPDATE student_progress
       SET mastery_score = MIN(100.0, mastery_score + 5.0),
           last_studied_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND topic_id = ?`,
      [userId, session.topic_id]
    );

    return res.json({ success: true, message: 'Learning session completed' });
  } catch (err: any) {
    console.error('[Sessions] Complete error:', err);
    return res.status(500).json({ success: false, error: 'Failed to complete session' });
  }
});

export default router;

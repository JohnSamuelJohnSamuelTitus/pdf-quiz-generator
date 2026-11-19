import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { RevisionSchedulerService } from '../services/revision-scheduler.service.js';
import { run } from '../db/index.js';

const router = Router();

// GET /api/revision
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const revisions = await RevisionSchedulerService.getScheduledRevisions(userId);
    return res.json({ success: true, revisions });
  } catch (err: any) {
    console.error('[RevisionScheduler] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve revision schedule' });
  }
});

// POST /api/revision/:topicId/mark-done
router.post('/:topicId/mark-done', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { topicId } = req.params;
    await run(
      'UPDATE revision_schedules SET is_completed = 1 WHERE user_id = ? AND topic_id = ?',
      [userId, topicId]
    );
    return res.json({ success: true, message: 'Revision marked completed' });
  } catch (err: any) {
    console.error('[RevisionScheduler] Mark-done error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update revision status' });
  }
});

export default router;

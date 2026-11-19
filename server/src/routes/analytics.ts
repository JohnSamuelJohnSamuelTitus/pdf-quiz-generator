import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AnalyticsService } from '../services/analytics.service.js';

const router = Router();

// GET /api/analytics
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const analytics = await AnalyticsService.getStudentAnalytics(userId);
    return res.json({ success: true, analytics });
  } catch (err: any) {
    console.error('[Analytics] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to compute student analytics' });
  }
});

export default router;

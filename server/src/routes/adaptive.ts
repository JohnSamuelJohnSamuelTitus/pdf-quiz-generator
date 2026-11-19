import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AdaptiveDifficultyService } from '../services/adaptive-difficulty.service.js';

const router = Router();

// GET /api/adaptive/evaluate/:topicSlug
router.get('/evaluate/:topicSlug', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { topicSlug } = req.params;
    const status = await AdaptiveDifficultyService.evaluateTopicDifficulty(userId, topicSlug);
    return res.json({ success: true, status });
  } catch (err: any) {
    console.error('[Adaptive] Evaluation error:', err);
    return res.status(500).json({ success: false, error: 'Failed to evaluate adaptive difficulty' });
  }
});

// GET /api/adaptive/profiles
router.get('/profiles', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profiles = await AdaptiveDifficultyService.getStudentAdaptiveProfiles(userId);
    return res.json({ success: true, profiles });
  } catch (err: any) {
    console.error('[Adaptive] Profiles error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve adaptive profiles' });
  }
});

export default router;

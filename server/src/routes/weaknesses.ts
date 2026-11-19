import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { WeaknessDetectorService } from '../services/weakness-detector.service.js';

const router = Router();

// GET /api/weaknesses
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const weaknesses = await WeaknessDetectorService.detectStudentWeaknesses(userId);
    const strengths = await WeaknessDetectorService.detectStudentStrengths(userId);
    return res.json({ success: true, weaknesses, strengths });
  } catch (err: any) {
    console.error('[WeaknessDetector] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to detect academic weaknesses' });
  }
});

export default router;

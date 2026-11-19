import { Router, Request, Response } from 'express';
import { StudyMaterialService } from '../services/study-material.service.js';

const router = Router();

// GET /api/materials/topic/:slug
router.get('/topic/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const materials = await StudyMaterialService.getMaterialsForTopic(slug);
    return res.json({ success: true, materials });
  } catch (err: any) {
    console.error('[Materials] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve study materials' });
  }
});

export default router;

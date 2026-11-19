import { Router, Response } from 'express';
import { requireSession, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { IntegrationsService } from '../services/integrations.service.js';

const router = Router();

// GET /api/integrations (List all educational API integrations with health status)
router.get('/', requireSession, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const integrations = await IntegrationsService.getAllIntegrations();
    return res.json({ success: true, integrations });
  } catch (err: any) {
    console.error('[Integrations] List error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve integrations' });
  }
});

// POST /api/integrations/:providerId/test (Run live health test against real endpoint)
router.post('/:providerId/test', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { providerId } = req.params;
    const result = await IntegrationsService.testIntegration(providerId);
    return res.json({
      success: true,
      status: result.status,
      latencyMs: result.latencyMs,
      details: result.details
    });
  } catch (err: any) {
    console.error('[Integrations] Test error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Health test failed' });
  }
});

// PATCH /api/integrations/:providerId (Toggle enable/disable or configure API key)
router.patch('/:providerId', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { providerId } = req.params;
    const { isEnabled, apiKey } = req.body;

    await IntegrationsService.updateIntegration(providerId, { isEnabled, apiKey });
    const all = await IntegrationsService.getAllIntegrations();
    const updated = all.find(i => i.providerId === providerId);

    return res.json({
      success: true,
      integration: updated
    });
  } catch (err: any) {
    console.error('[Integrations] Update error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update integration settings' });
  }
});

export default router;

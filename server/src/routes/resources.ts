import { Router, Response } from 'express';
import { run, query, queryOne } from '../db/index.js';
import { requireSession, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ResourceDiscoveryService } from '../services/resource-discovery.service.js';
import { ExternalResource } from '../../../shared/types.js';

const router = Router();

// GET /api/resources/topic/:topicId
router.get('/topic/:topicId', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topicId } = req.params;

    const topic = await queryOne<{ id: string; title: string; project_id: string }>(
      'SELECT id, title, project_id FROM syllabus_topics WHERE id = ?',
      [topicId]
    );

    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }

    // Check existing stored resources
    let rows = await query<any>(
      `SELECT id, topic_id as topicId, provider, title, url,
              author_or_institution as authorOrInstitution, resource_type as resourceType,
              summary, publication_date as publicationDate, doi_or_id as doiOrId
       FROM external_resources
       WHERE topic_id = ?
       ORDER BY retrieved_at DESC`,
      [topicId]
    );

    // If no resources cached, auto-discover
    if (rows.length === 0) {
      rows = await ResourceDiscoveryService.discoverResourcesForTopic(topicId, topic.title);
    }

    return res.json({ success: true, resources: rows });
  } catch (err: any) {
    console.error('[Resources] Get resources error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve resources' });
  }
});

// POST /api/resources/topic/:topicId/discover
router.post('/topic/:topicId/discover', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topicId } = req.params;
    const { subjectCategory = 'computer-science' } = req.body;

    const topic = await queryOne<{ id: string; title: string }>(
      'SELECT id, title FROM syllabus_topics WHERE id = ?',
      [topicId]
    );

    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }

    const resources = await ResourceDiscoveryService.discoverResourcesForTopic(
      topicId,
      topic.title,
      subjectCategory
    );

    const providersUsed = Array.from(new Set(resources.map(r => r.provider)));

    return res.json({
      success: true,
      resources,
      providersUsed
    });
  } catch (err: any) {
    console.error('[Resources] Discover error:', err);
    return res.status(500).json({ success: false, error: 'Failed to discover external resources' });
  }
});

// POST /api/resources/math/eval
router.post('/math/eval', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { expression } = req.body;
    if (!expression || typeof expression !== 'string') {
      return res.status(400).json({ success: false, error: 'Math expression is required' });
    }

    const evalResult = await ResourceDiscoveryService.evaluateMathExpression(expression);

    return res.json({
      success: true,
      expression,
      result: evalResult.result,
      latencyMs: evalResult.latencyMs
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Evaluation failed' });
  }
});

export default router;

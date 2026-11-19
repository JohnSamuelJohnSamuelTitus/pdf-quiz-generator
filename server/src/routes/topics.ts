import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query, queryOne } from '../db/index.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Topic, LearningResource, ProgressStatus } from '../../../shared/types.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'learnsphere-default-secret-change-in-prod';

// Optional auth helper: extracts user id if valid token present, otherwise null
function tryGetUserId(req: AuthenticatedRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    return decoded.id;
  } catch {
    return null;
  }
}

// GET /api/topics/:subjectSlug/:topicSlug
router.get('/:subjectSlug/:topicSlug', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subjectSlug, topicSlug } = req.params;
    const userId = tryGetUserId(req);

    const subject = await queryOne<{
      id: string;
      slug: string;
      title: string;
      color: string;
    }>('SELECT id, slug, title, color FROM subjects WHERE slug = ?', [subjectSlug]);

    if (!subject) {
      return res.status(404).json({ success: false, error: `Subject "${subjectSlug}" not found` });
    }

    const topicRow = await queryOne<{
      id: string;
      subject_id: string;
      slug: string;
      title: string;
      summary: string;
      difficulty_level: 'foundational' | 'moderate' | 'rigorous';
      estimated_minutes: number;
      sort_order: number;
    }>('SELECT * FROM topics WHERE subject_id = ? AND slug = ?', [subject.id, topicSlug]);

    if (!topicRow) {
      return res.status(404).json({ success: false, error: `Topic "${topicSlug}" not found in subject` });
    }

    // Get all topics in this subject for navigation
    const allSubjectTopics = await query<{
      id: string;
      slug: string;
      title: string;
      sort_order: number;
    }>('SELECT id, slug, title, sort_order FROM topics WHERE subject_id = ? ORDER BY sort_order ASC', [subject.id]);

    // Get learning resources
    const resources = await query<{
      id: string;
      topic_id: string;
      title: string;
      resource_type: any;
      provider: string;
      url: string;
      author?: string;
      description: string;
      metadata: string;
      created_at: string;
    }>('SELECT * FROM learning_resources WHERE topic_id = ?', [topicRow.id]);

    const mappedResources: LearningResource[] = resources.map(r => ({
      id: r.id,
      topicId: r.topic_id,
      title: r.title,
      resourceType: r.resource_type,
      provider: r.provider,
      url: r.url,
      author: r.author,
      description: r.description,
      metadata: r.metadata ? JSON.parse(r.metadata) : {},
      createdAt: r.created_at
    }));

    // Check user progress if logged in
    let masteryScore = 0;
    let status: ProgressStatus = 'not_started';

    if (userId) {
      const progress = await queryOne<{
        status: ProgressStatus;
        mastery_score: number;
      }>('SELECT status, mastery_score FROM student_progress WHERE user_id = ? AND topic_id = ?', [userId, topicRow.id]);

      if (progress) {
        masteryScore = progress.mastery_score;
        status = progress.status;
      }
    }

    const topic: Topic = {
      id: topicRow.id,
      subjectId: topicRow.subject_id,
      slug: topicRow.slug,
      title: topicRow.title,
      summary: topicRow.summary,
      difficultyLevel: topicRow.difficulty_level,
      estimatedMinutes: topicRow.estimated_minutes,
      sortOrder: topicRow.sort_order,
      subjectTitle: subject.title,
      subjectSlug: subject.slug,
      masteryScore,
      status
    };

    return res.json({
      success: true,
      topic,
      subject,
      resources: mappedResources,
      adjacentTopics: allSubjectTopics
    });
  } catch (err: any) {
    console.error('[Topics] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve topic workspace' });
  }
});

export default router;

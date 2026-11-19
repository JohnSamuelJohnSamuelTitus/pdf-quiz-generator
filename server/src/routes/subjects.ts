import { Router, Response, Request } from 'express';
import { query, queryOne } from '../db/index.js';
import { Subject, Topic } from '../../../shared/types.js';

const router = Router();

// GET /api/subjects
router.get('/', async (_req: Request, res: Response) => {
  try {
    const subjects = await query<{
      id: string;
      slug: string;
      title: string;
      description: string;
      category: string;
      icon: string;
      color: string;
      is_featured: number;
    }>('SELECT * FROM subjects ORDER BY is_featured DESC, title ASC');

    // Attach topic counts
    const mapped: Subject[] = [];
    for (const s of subjects) {
      const countRow = await queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM topics WHERE subject_id = ?',
        [s.id]
      );
      mapped.push({
        id: s.id,
        slug: s.slug,
        title: s.title,
        description: s.description,
        category: s.category,
        icon: s.icon,
        color: s.color,
        isFeatured: Boolean(s.is_featured),
        topicCount: countRow?.count || 0
      });
    }

    return res.json({ success: true, subjects: mapped });
  } catch (err: any) {
    console.error('[Subjects] Fetch error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve academic subjects' });
  }
});

// GET /api/subjects/:slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const subject = await queryOne<{
      id: string;
      slug: string;
      title: string;
      description: string;
      category: string;
      icon: string;
      color: string;
      is_featured: number;
    }>('SELECT * FROM subjects WHERE slug = ?', [slug]);

    if (!subject) {
      return res.status(404).json({ success: false, error: `Subject "${slug}" not found` });
    }

    const topics = await query<{
      id: string;
      subject_id: string;
      slug: string;
      title: string;
      summary: string;
      difficulty_level: 'foundational' | 'moderate' | 'rigorous';
      estimated_minutes: number;
      sort_order: number;
    }>('SELECT * FROM topics WHERE subject_id = ? ORDER BY sort_order ASC', [subject.id]);

    const mappedTopics: Topic[] = topics.map(t => ({
      id: t.id,
      subjectId: t.subject_id,
      slug: t.slug,
      title: t.title,
      summary: t.summary,
      difficultyLevel: t.difficulty_level,
      estimatedMinutes: t.estimated_minutes,
      sortOrder: t.sort_order,
      subjectTitle: subject.title,
      subjectSlug: subject.slug
    }));

    return res.json({
      success: true,
      subject: {
        id: subject.id,
        slug: subject.slug,
        title: subject.title,
        description: subject.description,
        category: subject.category,
        icon: subject.icon,
        color: subject.color,
        isFeatured: Boolean(subject.is_featured),
        topicCount: mappedTopics.length
      },
      topics: mappedTopics
    });
  } catch (err: any) {
    console.error('[Subjects] Detail error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve subject detail' });
  }
});

export default router;

import { Router, Response } from 'express';
import multer from 'multer';
import { run, query, queryOne } from '../db/index.js';
import { requireSession, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { SyllabusParserService } from '../services/syllabus-parser.service.js';
import { PdfExtractionService } from '../services/pdf-extraction.service.js';
import { DocumentMappingService } from '../services/document-mapping.service.js';
import { SyllabusUnit, SyllabusTopic, LearningProject, ParsedSyllabusResult } from '../../../shared/types.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (
      allowedMimes.includes(file.mimetype) ||
      file.originalname.endsWith('.pdf') ||
      file.originalname.endsWith('.txt') ||
      file.originalname.endsWith('.docx')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only PDF, TXT, and DOCX files are supported.'));
    }
  }
});

/**
 * POST /api/syllabus/preview
 * Analyzes syllabus text or document file and returns parsed curriculum hierarchy
 * without persisting to database, allowing client inspection and editing.
 */
router.post(
  ['/preview', '/syllabus/preview'],
  (req, res, next) => {
    upload.single('file')(req, res, err => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  async (req: any, res: Response) => {
    try {
      const file = req.file;
      const rawText = req.body?.rawText;
      const fallbackTitle = req.body?.fallbackTitle || (file ? file.originalname.replace(/\.[^/.]+$/, '') : 'Course Syllabus');

      let textToParse = '';
      let detectedType: any = 'syllabus';
      let ocrRequired = false;
      let ocrMessage: string | undefined = undefined;

      if (file) {
        if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
          const extracted = await PdfExtractionService.extractPdf(file.buffer);
          textToParse = extracted.text;
          detectedType = extracted.detectedType;
          ocrRequired = extracted.ocrRequired;
          ocrMessage = extracted.ocrMessage;
        } else if (file.originalname.toLowerCase().endsWith('.docx') || file.mimetype.includes('wordprocessingml')) {
          const extracted = await PdfExtractionService.extractDocx(file.buffer);
          textToParse = extracted.text;
          detectedType = extracted.detectedType;
        } else {
          const extracted = PdfExtractionService.extractTxt(file.buffer);
          textToParse = extracted.text;
          detectedType = extracted.detectedType;
        }
      } else if (typeof rawText === 'string') {
        textToParse = rawText.trim();
      }

      if (!textToParse || textToParse.length < 15) {
        return res.status(400).json({
          success: false,
          error: 'Please provide valid syllabus content with at least 15 characters of educational text.'
        });
      }

      const parsed = SyllabusParserService.parseSyllabusText(textToParse, fallbackTitle);

      return res.json({
        success: true,
        courseTitle: parsed.courseTitle,
        courseCode: parsed.courseCode,
        units: parsed.units,
        totalUnits: parsed.totalUnits || parsed.units.length,
        totalTopics: parsed.totalTopics || 0,
        totalSubtopics: parsed.totalSubtopics || 0,
        detectedType,
        ocrRequired,
        ocrMessage
      });
    } catch (err: any) {
      console.error('[Syllabus Preview] Error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to analyze syllabus document'
      });
    }
  }
);

// POST /api/projects/:projectId/syllabus/parse (Reparse existing project)
router.post('/projects/:projectId/syllabus/parse', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const { rawText } = req.body;

    const project = await queryOne<{ id: string; title: string; raw_syllabus_text: string | null }>(
      'SELECT id, title, raw_syllabus_text FROM learning_projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (!project) {
      return res.status(404).json({ success: false, error: 'Learning project not found' });
    }

    const textToParse = rawText || project.raw_syllabus_text;
    if (!textToParse || textToParse.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'No syllabus text provided to parse' });
    }

    if (rawText && rawText !== project.raw_syllabus_text) {
      await run('UPDATE learning_projects SET raw_syllabus_text = ? WHERE id = ?', [rawText, projectId]);
    }

    const parsed = SyllabusParserService.parseSyllabusText(textToParse, project.title);
    const savedUnits = await SyllabusParserService.persistSyllabusTree(projectId, parsed);

    let topicCount = 0;
    savedUnits.forEach(u => (topicCount += u.topics.length));

    await DocumentMappingService.mapProjectDocuments(projectId);

    return res.json({
      success: true,
      units: savedUnits,
      topicCount,
      message: `Parsed syllabus into ${savedUnits.length} units and ${topicCount} topics.`
    });
  } catch (err: any) {
    console.error('[Syllabus] Parse error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to parse syllabus' });
  }
});

// GET /api/projects/:projectId/syllabus/tree
router.get('/projects/:projectId/syllabus/tree', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const project = await queryOne<any>(
      'SELECT * FROM learning_projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );
    if (!project) {
      return res.status(404).json({ success: false, error: 'Learning project not found' });
    }

    const units = await query<{
      id: string;
      unit_number: number;
      title: string;
      description: string | null;
      sort_order: number;
    }>('SELECT * FROM syllabus_units WHERE project_id = ? ORDER BY sort_order ASC', [projectId]);

    const topics = await query<{
      id: string;
      unit_id: string;
      project_id: string;
      title: string;
      slug: string;
      summary: string | null;
      estimated_minutes: number;
      difficulty_level: any;
      mastery_score: number;
      status: any;
      sort_order: number;
      subtopics?: string | null;
    }>('SELECT * FROM syllabus_topics WHERE project_id = ? ORDER BY sort_order ASC', [projectId]);

    const structuredUnits: SyllabusUnit[] = units.map(u => ({
      id: u.id,
      projectId,
      unitNumber: u.unit_number,
      title: u.title,
      description: u.description || undefined,
      sortOrder: u.sort_order,
      topics: topics
        .filter(t => t.unit_id === u.id)
        .map(t => {
          let parsedSubtopics: string[] = [];
          try {
            if (t.subtopics) {
              parsedSubtopics = JSON.parse(t.subtopics);
            }
          } catch {}

          return {
            id: t.id,
            unitId: t.unit_id,
            projectId: t.project_id,
            title: t.title,
            slug: t.slug,
            summary: t.summary || undefined,
            estimatedMinutes: t.estimated_minutes,
            difficultyLevel: t.difficulty_level,
            masteryScore: t.mastery_score,
            status: t.status,
            sortOrder: t.sort_order,
            subtopics: parsedSubtopics
          };
        })
    }));

    return res.json({
      success: true,
      project: {
        id: project.id,
        userId: project.user_id,
        title: project.title,
        subjectCode: project.subject_code || undefined,
        targetExamDate: project.target_exam_date || undefined,
        rawSyllabusText: project.raw_syllabus_text || undefined,
        status: project.status,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      },
      units: structuredUnits
    });
  } catch (err: any) {
    console.error('[Syllabus] Tree error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve syllabus tree' });
  }
});

// POST /api/projects/:projectId/syllabus/units (Add new Unit)
router.post('/projects/:projectId/syllabus/units', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const { title, unitNumber, description } = req.body;

    const project = await queryOne('SELECT id FROM learning_projects WHERE id = ? AND user_id = ?', [projectId, userId]);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Unit title is required' });
    }

    const unitCountRes = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM syllabus_units WHERE project_id = ?',
      [projectId]
    );
    const assignedNum = unitNumber || (unitCountRes?.count || 0) + 1;
    const unitId = `unit-${projectId}-${assignedNum}-${Math.random().toString(36).substring(2, 6)}`;

    await run(
      `INSERT INTO syllabus_units (id, project_id, unit_number, title, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [unitId, projectId, assignedNum, title.trim(), description || '', assignedNum]
    );

    const created = await queryOne('SELECT * FROM syllabus_units WHERE id = ?', [unitId]);
    return res.status(201).json({ success: true, unit: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to add unit' });
  }
});

// PATCH /api/syllabus/units/:unitId (Rename / update unit)
router.patch('/syllabus/units/:unitId', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { unitId } = req.params;
    const userId = req.user!.id;
    const { title, description } = req.body;

    const unit = await queryOne<any>(
      `SELECT u.* FROM syllabus_units u
       JOIN learning_projects p ON p.id = u.project_id
       WHERE u.id = ? AND p.user_id = ?`,
      [unitId, userId]
    );
    if (!unit) return res.status(404).json({ success: false, error: 'Unit not found or unauthorized' });

    const newTitle = title !== undefined ? title.trim() : unit.title;
    const newDesc = description !== undefined ? description : unit.description;

    await run('UPDATE syllabus_units SET title = ?, description = ? WHERE id = ?', [newTitle, newDesc, unitId]);
    const updated = await queryOne('SELECT * FROM syllabus_units WHERE id = ?', [unitId]);
    return res.json({ success: true, unit: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update unit' });
  }
});

// DELETE /api/syllabus/units/:unitId (Delete unit)
router.delete('/syllabus/units/:unitId', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { unitId } = req.params;
    const userId = req.user!.id;

    const unit = await queryOne<any>(
      `SELECT u.* FROM syllabus_units u
       JOIN learning_projects p ON p.id = u.project_id
       WHERE u.id = ? AND p.user_id = ?`,
      [unitId, userId]
    );
    if (!unit) return res.status(404).json({ success: false, error: 'Unit not found or unauthorized' });

    await run('DELETE FROM syllabus_topics WHERE unit_id = ?', [unitId]);
    await run('DELETE FROM syllabus_units WHERE id = ?', [unitId]);

    return res.json({ success: true, message: 'Unit deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete unit' });
  }
});

// POST /api/projects/:projectId/syllabus/topics (Add topic to unit)
router.post('/projects/:projectId/syllabus/topics', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const { unitId, title, summary, estimatedMinutes, difficultyLevel, subtopics } = req.body;

    const unit = await queryOne<any>(
      `SELECT u.* FROM syllabus_units u
       JOIN learning_projects p ON p.id = u.project_id
       WHERE u.id = ? AND p.id = ? AND p.user_id = ?`,
      [unitId, projectId, userId]
    );
    if (!unit) return res.status(404).json({ success: false, error: 'Unit or Project not found' });

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Topic title is required' });
    }

    const topicCountRes = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM syllabus_topics WHERE unit_id = ?',
      [unitId]
    );
    const sortOrder = (topicCountRes?.count || 0) + 1;
    const topicId = `top-${projectId}-${unit.unit_number}-${Date.now()}`;
    const slug = title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
    const subtopicsJson = JSON.stringify(Array.isArray(subtopics) ? subtopics : []);

    await run(
      `INSERT INTO syllabus_topics (id, unit_id, project_id, title, slug, summary, estimated_minutes, difficulty_level, mastery_score, status, sort_order, subtopics)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'not_started', ?, ?)`,
      [
        topicId,
        unitId,
        projectId,
        title.trim(),
        slug,
        summary || `Study material for ${title.trim()}`,
        Number(estimatedMinutes) || 25,
        difficultyLevel || 'moderate',
        sortOrder,
        subtopicsJson
      ]
    );

    return res.status(201).json({
      success: true,
      topic: {
        id: topicId,
        unitId,
        projectId,
        title: title.trim(),
        slug,
        summary,
        estimatedMinutes: Number(estimatedMinutes) || 25,
        difficultyLevel: difficultyLevel || 'moderate',
        masteryScore: 0,
        status: 'not_started',
        sortOrder,
        subtopics: Array.isArray(subtopics) ? subtopics : []
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to add topic' });
  }
});

// DELETE /api/syllabus/topics/:topicId (Delete topic)
router.delete('/syllabus/topics/:topicId', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topicId } = req.params;
    const userId = req.user!.id;

    const topic = await queryOne<any>(
      `SELECT t.* FROM syllabus_topics t
       JOIN learning_projects p ON p.id = t.project_id
       WHERE t.id = ? AND p.user_id = ?`,
      [topicId, userId]
    );
    if (!topic) return res.status(404).json({ success: false, error: 'Topic not found or unauthorized' });

    await run('DELETE FROM topic_document_mappings WHERE topic_id = ?', [topicId]);
    await run('DELETE FROM topic_notes WHERE topic_id = ?', [topicId]);
    await run('DELETE FROM syllabus_topics WHERE id = ?', [topicId]);

    return res.json({ success: true, message: 'Topic deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete topic' });
  }
});

// PATCH /api/syllabus/topics/:topicId
router.patch('/syllabus/topics/:topicId', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topicId } = req.params;
    const userId = req.user!.id;
    const { title, summary, estimatedMinutes, difficultyLevel, status, masteryScore, subtopics } = req.body;

    const topic = await queryOne<any>(
      `SELECT t.*, p.user_id
       FROM syllabus_topics t
       JOIN learning_projects p ON p.id = t.project_id
       WHERE t.id = ? AND p.user_id = ?`,
      [topicId, userId]
    );

    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found or unauthorized' });
    }

    const updatedTitle = title !== undefined ? title.trim() : topic.title;
    const updatedSummary = summary !== undefined ? summary : topic.summary;
    const updatedEst = estimatedMinutes !== undefined ? Number(estimatedMinutes) : topic.estimated_minutes;
    const updatedDiff = difficultyLevel !== undefined ? difficultyLevel : topic.difficulty_level;
    const updatedStatus = status !== undefined ? status : topic.status;
    const updatedMastery = masteryScore !== undefined ? Number(masteryScore) : topic.mastery_score;
    const updatedSubtopics = subtopics !== undefined ? JSON.stringify(subtopics) : topic.subtopics;

    await run(
      `UPDATE syllabus_topics
       SET title = ?, summary = ?, estimated_minutes = ?, difficulty_level = ?, status = ?, mastery_score = ?, subtopics = ?
       WHERE id = ?`,
      [updatedTitle, updatedSummary, updatedEst, updatedDiff, updatedStatus, updatedMastery, updatedSubtopics, topicId]
    );

    const updated = await queryOne<any>('SELECT * FROM syllabus_topics WHERE id = ?', [topicId]);
    let parsedSubs: string[] = [];
    try {
      if (updated.subtopics) parsedSubs = JSON.parse(updated.subtopics);
    } catch {}

    const result: SyllabusTopic = {
      id: updated.id,
      unitId: updated.unit_id,
      projectId: updated.project_id,
      title: updated.title,
      slug: updated.slug,
      summary: updated.summary || undefined,
      estimatedMinutes: updated.estimated_minutes,
      difficultyLevel: updated.difficulty_level,
      masteryScore: updated.mastery_score,
      status: updated.status,
      sortOrder: updated.sort_order,
      subtopics: parsedSubs
    };

    return res.json({ success: true, topic: result });
  } catch (err: any) {
    console.error('[Syllabus] Topic update error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update topic' });
  }
});

// POST /api/projects/:projectId/syllabus/map-documents
router.post('/projects/:projectId/syllabus/map-documents', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const project = await queryOne<{ id: string }>(
      'SELECT id FROM learning_projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (!project) {
      return res.status(404).json({ success: false, error: 'Learning project not found' });
    }

    const mappingsCount = await DocumentMappingService.mapProjectDocuments(projectId);

    return res.json({
      success: true,
      mappingsCount,
      message: `Successfully mapped document sections to syllabus topics (${mappingsCount} connections found).`
    });
  } catch (err: any) {
    console.error('[Syllabus] Map documents error:', err);
    return res.status(500).json({ success: false, error: 'Failed to map documents' });
  }
});

export default router;

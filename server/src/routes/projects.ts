import { Router, Response } from 'express';
import { z } from 'zod';
import { run, query, queryOne } from '../db/index.js';
import { requireSession, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { SyllabusParserService } from '../services/syllabus-parser.service.js';
import { LearningProject, SyllabusUnit } from '../../../shared/types.js';

const router = Router();

const createProjectSchema = z.object({
  title: z.string().min(2, 'Course title is required'),
  subjectCode: z.string().optional(),
  targetExamDate: z.string().optional(),
  rawSyllabusText: z.string().optional(),
  reviewedUnits: z.array(z.object({
    unitNumber: z.number(),
    title: z.string(),
    description: z.string().optional(),
    topics: z.array(z.object({
      title: z.string(),
      slug: z.string().optional(),
      summary: z.string().optional(),
      estimatedMinutes: z.number().optional(),
      difficultyLevel: z.enum(['foundational', 'moderate', 'rigorous']).optional(),
      subtopics: z.array(z.string()).optional()
    }))
  })).optional()
});

// POST /api/projects (Create a new curriculum project — Guests or Users)
router.post('/', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = createProjectSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.errors[0]?.message || 'Invalid input' });
    }

    const userId = req.user!.id;
    const { title, subjectCode, targetExamDate, rawSyllabusText, reviewedUnits } = parse.data;
    const projectId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    await run(
      `INSERT INTO learning_projects (id, user_id, title, subject_code, target_exam_date, raw_syllabus_text, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [projectId, userId, title.trim(), subjectCode?.trim() || null, targetExamDate || null, rawSyllabusText || null]
    );

    // If student reviewed curriculum units are provided, persist them directly
    if (reviewedUnits && reviewedUnits.length > 0) {
      await SyllabusParserService.persistSyllabusTree(projectId, {
        courseTitle: title.trim(),
        courseCode: subjectCode?.trim(),
        units: reviewedUnits.map(u => ({
          unitNumber: u.unitNumber,
          title: u.title,
          description: u.description,
          topics: u.topics.map(t => ({
            title: t.title,
            slug: t.slug,
            summary: t.summary,
            estimatedMinutes: t.estimatedMinutes || 25,
            difficultyLevel: t.difficultyLevel || 'moderate',
            subtopics: t.subtopics || []
          }))
        }))
      });
    } else if (rawSyllabusText && rawSyllabusText.trim().length > 15) {
      // Otherwise parse automatically from raw syllabus text
      const parsed = SyllabusParserService.parseSyllabusText(rawSyllabusText, title);
      await SyllabusParserService.persistSyllabusTree(projectId, parsed);
    }

    const project: LearningProject = {
      id: projectId,
      userId,
      title: title.trim(),
      subjectCode,
      targetExamDate,
      rawSyllabusText,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return res.status(201).json({
      success: true,
      message: 'Learning project created successfully',
      project
    });
  } catch (err: any) {
    console.error('[Projects] Create error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create project' });
  }
});

// GET /api/projects (List projects for current student session)
router.get('/', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const projects = await query<{
      id: string;
      user_id: string;
      title: string;
      subject_code: string | null;
      target_exam_date: string | null;
      status: 'active' | 'archived' | 'processing';
      created_at: string;
      updated_at: string;
      document_count: number;
      topic_count: number;
      avg_mastery: number | null;
    }>(
      `SELECT p.id, p.user_id, p.title, p.subject_code, p.target_exam_date, p.status, p.created_at, p.updated_at,
              COUNT(DISTINCT d.id) as document_count,
              COUNT(DISTINCT t.id) as topic_count,
              AVG(t.mastery_score) as avg_mastery
       FROM learning_projects p
       LEFT JOIN uploaded_documents d ON d.project_id = p.id
       LEFT JOIN syllabus_topics t ON t.project_id = p.id
       WHERE p.user_id = ?
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      [userId]
    );

    return res.json({
      success: true,
      projects: projects.map(p => ({
        id: p.id,
        userId: p.user_id,
        title: p.title,
        subjectCode: p.subject_code || undefined,
        targetExamDate: p.target_exam_date || undefined,
        status: p.status,
        documentCount: p.document_count,
        topicCount: p.topic_count,
        overallMastery: Math.round(p.avg_mastery || 0),
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }))
    });
  } catch (err: any) {
    console.error('[Projects] List error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve projects' });
  }
});

// GET /api/projects/:id (Get project detail with units, topics, and documents)
router.get('/:id', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const project = await queryOne<{
      id: string;
      user_id: string;
      title: string;
      subject_code: string | null;
      target_exam_date: string | null;
      raw_syllabus_text: string | null;
      status: 'active' | 'archived' | 'processing';
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM learning_projects WHERE id = ? AND user_id = ?', [id, userId]);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Learning project not found' });
    }

    // Fetch units and topics
    const units = await query<{
      id: string;
      unit_number: number;
      title: string;
      description: string | null;
      sort_order: number;
    }>('SELECT * FROM syllabus_units WHERE project_id = ? ORDER BY sort_order ASC', [id]);

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
    }>('SELECT * FROM syllabus_topics WHERE project_id = ? ORDER BY sort_order ASC', [id]);

    // Group topics under units
    const structuredUnits: SyllabusUnit[] = units.map(u => ({
      id: u.id,
      projectId: id,
      unitNumber: u.unit_number,
      title: u.title,
      description: u.description || undefined,
      sortOrder: u.sort_order,
      topics: topics
        .filter(t => t.unit_id === u.id)
        .map(t => {
          let parsedSubtopics: string[] = [];
          try {
            if (t.subtopics) parsedSubtopics = JSON.parse(t.subtopics);
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

    // Fetch documents
    const documents = await query<any>(
      'SELECT id, project_id, user_id, filename, original_name as originalName, mime_type as mimeType, file_size as fileSize, document_type as documentType, page_count as pageCount, status, created_at as createdAt FROM uploaded_documents WHERE project_id = ? ORDER BY created_at DESC',
      [id]
    );

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
      units: structuredUnits,
      documents
    });
  } catch (err: any) {
    console.error('[Projects] Detail error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve project details' });
  }
});

// PATCH /api/projects/:id (Update project details)
router.patch('/:id', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { title, subjectCode, targetExamDate, status } = req.body;

    const existing = await queryOne<any>(
      'SELECT * FROM learning_projects WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Learning project not found' });
    }

    const updatedTitle = title !== undefined ? title.trim() : existing.title;
    const updatedCode = subjectCode !== undefined ? (subjectCode ? subjectCode.trim() : null) : existing.subject_code;
    const updatedExam = targetExamDate !== undefined ? targetExamDate : existing.target_exam_date;
    const updatedStatus = status !== undefined ? status : existing.status;

    await run(
      `UPDATE learning_projects
       SET title = ?, subject_code = ?, target_exam_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [updatedTitle, updatedCode, updatedExam, updatedStatus, id, userId]
    );

    const updated = await queryOne<any>(
      'SELECT * FROM learning_projects WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    return res.json({
      success: true,
      project: {
        id: updated.id,
        userId: updated.user_id,
        title: updated.title,
        subjectCode: updated.subject_code || undefined,
        targetExamDate: updated.target_exam_date || undefined,
        rawSyllabusText: updated.raw_syllabus_text || undefined,
        status: updated.status,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      }
    });
  } catch (err: any) {
    console.error('[Projects] Update error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update project' });
  }
});

// GET /api/projects/:id/questions/extracted (Get extracted questions from uploaded documents)
router.get('/:id/questions/extracted', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { topicId } = req.query;

    let sql = `
      SELECT q.id, q.document_id as documentId, q.project_id as projectId, q.topic_id as topicId,
             q.question_text as questionText, q.question_type as questionType, q.options,
             q.correct_answer as correctAnswer, q.source_page as sourcePage,
             q.original_context as originalContext, q.confidence_score as confidenceScore,
             q.created_at as createdAt,
             d.original_name as documentName,
             t.title as topicTitle
      FROM extracted_questions q
      JOIN uploaded_documents d ON d.id = q.document_id
      LEFT JOIN syllabus_topics t ON t.id = q.topic_id
      WHERE q.project_id = ? AND d.user_id = ?
    `;
    const params: any[] = [id, userId];

    if (topicId) {
      sql += ' AND q.topic_id = ?';
      params.push(topicId);
    }

    sql += ' ORDER BY q.source_page ASC, q.created_at ASC';

    const rows = await query<any>(sql, params);

    const questions = rows.map(r => ({
      id: r.id,
      documentId: r.documentId,
      projectId: r.projectId,
      topicId: r.topicId || undefined,
      questionText: r.questionText,
      questionType: r.questionType,
      options: r.options ? JSON.parse(r.options) : [],
      correctAnswer: r.correctAnswer || undefined,
      sourcePage: r.sourcePage,
      originalContext: r.originalContext || undefined,
      confidenceScore: r.confidenceScore,
      createdAt: r.createdAt,
      documentName: r.documentName,
      topicTitle: r.topicTitle || undefined
    }));

    return res.json({ success: true, questions });
  } catch (err: any) {
    console.error('[Projects] Extracted questions error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve extracted questions' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    await run('DELETE FROM learning_projects WHERE id = ? AND user_id = ?', [id, userId]);
    return res.json({ success: true, message: 'Learning project deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

export default router;

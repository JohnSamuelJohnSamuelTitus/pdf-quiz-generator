import { Router, Response } from 'express';
import multer from 'multer';
import { run, query, queryOne } from '../db/index.js';
import { requireSession, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { PdfExtractionService } from '../services/pdf-extraction.service.js';
import { SyllabusParserService } from '../services/syllabus-parser.service.js';
import { DocumentMappingService } from '../services/document-mapping.service.js';
import { QuestionExtractorService } from '../services/question-extractor.service.js';
import { UploadedDocument, DocumentType } from '../../../shared/types.js';

const router = Router();

// Configure Multer memory storage with 25MB limit and strict file filters
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.pdf') || file.originalname.endsWith('.txt') || file.originalname.endsWith('.docx')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only PDF, TXT, and DOCX files are supported.'));
    }
  }
});

// POST /api/projects/:projectId/documents (Upload and process document)
router.post(
  '/projects/:projectId/documents',
  requireSession,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ success: false, error: 'No document file uploaded' });
      }

      // Verify project ownership
      const project = await queryOne<{ id: string; title: string }>(
        'SELECT id, title FROM learning_projects WHERE id = ? AND user_id = ?',
        [projectId, userId]
      );
      if (!project) {
        return res.status(404).json({ success: false, error: 'Learning project not found' });
      }

      const explicitType = (req.body.documentType as DocumentType) || 'syllabus';

      // 1. Genuine Text Extraction
      let extracted: any;
      const filename = `${Date.now()}-${file.originalname.replace(/[^\w.-]/g, '_')}`;

      if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
        extracted = await PdfExtractionService.extractPdf(file.buffer);
      } else if (file.originalname.endsWith('.docx') || file.mimetype.includes('wordprocessingml')) {
        extracted = await PdfExtractionService.extractDocx(file.buffer);
      } else {
        extracted = PdfExtractionService.extractTxt(file.buffer);
      }

      const detectedType: DocumentType = explicitType !== 'syllabus' ? explicitType : extracted.detectedType;
      const documentId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // 2. Insert document record
      await run(
        `INSERT INTO uploaded_documents (id, project_id, user_id, filename, original_name, mime_type, file_size, document_type, page_count, raw_text, extracted_metadata, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed')`,
        [
          documentId,
          projectId,
          userId,
          filename,
          file.originalname,
          file.mimetype,
          file.size,
          detectedType,
          extracted.pageCount,
          extracted.text.substring(0, 50000), // Persist substantial text excerpt
          JSON.stringify({
            headings: extracted.headings,
            totalWords: extracted.metadata?.totalWords || 0,
            hasQuestions: extracted.hasQuestions,
            ocrRequired: extracted.ocrRequired
          })
        ]
      );

      // 3. Chunk text into document sections
      const sectionsToInsert: Array<{ page: number; heading: string; text: string }> = [];

      if (extracted.pages && extracted.pages.length > 0) {
        for (const p of extracted.pages) {
          if (p.text.length < 15) continue;
          sectionsToInsert.push({
            page: p.pageNumber,
            heading: extracted.headings[p.pageNumber - 1] || `Page ${p.pageNumber}`,
            text: p.text
          });
        }
      } else {
        sectionsToInsert.push({
          page: 1,
          heading: file.originalname,
          text: extracted.text
        });
      }

      for (let sIdx = 0; sIdx < Math.min(sectionsToInsert.length, 30); sIdx++) {
        const sec = sectionsToInsert[sIdx];
        const secId = `sec-${documentId}-${sIdx + 1}`;
        await run(
          `INSERT INTO document_sections (id, document_id, page_number, section_heading, content_text, content_type, sort_order)
           VALUES (?, ?, ?, ?, ?, 'text', ?)`,
          [secId, documentId, sec.page, sec.heading, sec.text, sIdx + 1]
        );
      }

      // 4. Discover existing questions in document
      const discovered = QuestionExtractorService.extractQuestionsFromText(
        documentId,
        projectId,
        extracted.text,
        file.originalname
      );

      for (const dq of discovered) {
        await run(
          `INSERT INTO extracted_questions (id, document_id, project_id, question_text, question_type, options, answer_text, is_verified_answer, source_reference, difficulty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dq.id,
            documentId,
            projectId,
            dq.questionText,
            dq.questionType,
            JSON.stringify(dq.options),
            dq.answerText || null,
            dq.isVerifiedAnswer ? 1 : 0,
            dq.sourceReference,
            dq.difficulty
          ]
        );
      }

      // 5. If document is a syllabus and project has 0 units, auto-generate syllabus tree
      const existingUnits = await query('SELECT id FROM syllabus_units WHERE project_id = ?', [projectId]);
      if (detectedType === 'syllabus' && existingUnits.length === 0 && extracted.text.length > 30) {
        const parsed = SyllabusParserService.parseSyllabusText(extracted.text, project.title);
        await SyllabusParserService.persistSyllabusTree(projectId, parsed);
      }

      // 6. Automatically map document sections to syllabus topics
      await DocumentMappingService.mapDocumentToTopics(projectId, documentId);

      const docRecord: UploadedDocument = {
        id: documentId,
        projectId,
        userId,
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        documentType: detectedType,
        pageCount: extracted.pageCount,
        extractedMetadata: {
          headings: extracted.headings,
          hasQuestions: extracted.hasQuestions,
          ocrUsed: extracted.ocrRequired
        },
        status: 'processed',
        createdAt: new Date().toISOString()
      };

      return res.status(201).json({
        success: true,
        message: `Document "${file.originalname}" processed successfully (${extracted.pageCount} pages, ${discovered.length} questions discovered).`,
        document: docRecord
      });
    } catch (err: any) {
      console.error('[Documents] Upload error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Document processing failed' });
    }
  }
);

// GET /api/projects/:projectId/documents (List documents)
router.get('/projects/:projectId/documents', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const docs = await query<any>(
      `SELECT id, project_id as projectId, user_id as userId, filename, original_name as originalName,
              mime_type as mimeType, file_size as fileSize, document_type as documentType,
              page_count as pageCount, status, created_at as createdAt
       FROM uploaded_documents
       WHERE project_id = ? AND user_id = ?
       ORDER BY created_at DESC`,
      [projectId, userId]
    );

    return res.json({ success: true, documents: docs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve documents' });
  }
});

// GET /api/documents/:documentId/sections (View document sections/pages)
router.get('/documents/:documentId/sections', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const userId = req.user!.id;

    const doc = await queryOne<any>(
      'SELECT * FROM uploaded_documents WHERE id = ? AND user_id = ?',
      [documentId, userId]
    );
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const sections = await query<any>(
      'SELECT id, document_id as documentId, page_number as pageNumber, section_heading as sectionHeading, content_text as contentText, content_type as contentType, sort_order as sortOrder FROM document_sections WHERE document_id = ? ORDER BY sort_order ASC',
      [documentId]
    );

    return res.json({
      success: true,
      document: {
        id: doc.id,
        originalName: doc.original_name,
        documentType: doc.document_type,
        pageCount: doc.page_count
      },
      sections
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve document sections' });
  }
});

// DELETE /api/documents/:documentId
router.delete('/documents/:documentId', requireSession, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const userId = req.user!.id;
    await run('DELETE FROM uploaded_documents WHERE id = ? AND user_id = ?', [documentId, userId]);
    return res.json({ success: true, message: 'Document and derived mappings removed successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete document' });
  }
});

export default router;

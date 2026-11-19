import fs from 'fs';
import path from 'path';
import { DocumentType } from '../../../shared/types.js';

export interface ExtractedDocumentData {
  text: string;
  pageCount: number;
  pages: Array<{ pageNumber: number; text: string; wordCount: number }>;
  headings: string[];
  detectedType: DocumentType;
  hasQuestions: boolean;
  ocrRequired: boolean;
  ocrMessage?: string;
  metadata?: Record<string, any>;
}

export class PdfExtractionService {
  /**
   * Extracts text, page divisions, headings, and structure from a PDF buffer or file
   */
  static async extractPdf(buffer: Buffer): Promise<ExtractedDocumentData> {
    // 1. Validate buffer presence and size
    if (!buffer || buffer.length < 10) {
      throw new Error('Empty PDF document: file contains no data or is less than 10 bytes.');
    }

    // 2. Validate PDF signature (%PDF-)
    const headerSlice = buffer.subarray(0, Math.min(1024, buffer.length)).toString('latin1');
    if (!headerSlice.includes('%PDF-')) {
      throw new Error('Corrupted or invalid PDF file: missing PDF specification header (%PDF-).');
    }

    // 3. Import and initialize pdf-parse v2
    let parser: any = null;
    try {
      const pdfModule = await import('pdf-parse');
      // pdf-parse v2 exports { PDFParse } class
      const PDFParseClass = (pdfModule as any).PDFParse || (pdfModule as any).default?.PDFParse || (pdfModule as any).default;

      if (!PDFParseClass) {
        throw new Error('PDF parsing library failed to initialize.');
      }

      parser = new PDFParseClass({ data: buffer });
      const textResult = await parser.getText();

      const fullText = (textResult.text || '').trim();
      const pageCount = textResult.total || (textResult.pages ? textResult.pages.length : 1) || 1;

      // Extract per-page text
      const pages: Array<{ pageNumber: number; text: string; wordCount: number }> = [];
      if (textResult.pages && Array.isArray(textResult.pages) && textResult.pages.length > 0) {
        for (const p of textResult.pages) {
          const pageTxt = (p.text || '').trim();
          const wordCount = pageTxt ? pageTxt.split(/\s+/).filter(Boolean).length : 0;
          pages.push({
            pageNumber: p.num || pages.length + 1,
            text: pageTxt,
            wordCount
          });
        }
      } else {
        const wordCount = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;
        pages.push({
          pageNumber: 1,
          text: fullText,
          wordCount
        });
      }

      // Check for scanned / image-only PDFs (no selectable text layer)
      const alphanumericChars = fullText.replace(/[^a-zA-Z0-9]/g, '');
      const totalWords = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;
      const isScannedOrImage = (alphanumericChars.length < 50 || totalWords < 20) && pageCount >= 1;

      const headings = this.detectHeadings(fullText);
      const hasQuestions = this.detectHasQuestions(fullText);
      const detectedType = this.classifyDocumentHeuristic(fullText);

      return {
        text: fullText,
        pageCount,
        pages,
        headings,
        detectedType,
        hasQuestions,
        ocrRequired: isScannedOrImage,
        ocrMessage: isScannedOrImage
          ? 'Scanned image-only PDF detected. This document contains scanned images without selectable text. Please upload a searchable text-based PDF or paste syllabus text.'
          : undefined,
        metadata: {
          totalWords,
          alphanumericLength: alphanumericChars.length
        }
      };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const errLower = errMsg.toLowerCase();

      // Check for encryption / password requirements
      if (
        errLower.includes('password') ||
        errLower.includes('encrypt') ||
        errLower.includes('passwordexception') ||
        errLower.includes('need password')
      ) {
        throw new Error('Password-protected PDF document. Please upload an unencrypted file.');
      }

      // Check for corrupt structure
      if (
        errLower.includes('corrupted') ||
        errLower.includes('invalid') ||
        errLower.includes('header') ||
        errLower.includes('stream') ||
        errLower.includes('malformed') ||
        errLower.includes('xref')
      ) {
        throw new Error(`Corrupted PDF document: ${errMsg}`);
      }

      throw new Error(`Failed to parse PDF document: ${errMsg}`);
    } finally {
      if (parser && typeof parser.destroy === 'function') {
        try {
          await parser.destroy();
        } catch {}
      }
    }
  }

  /**
   * Extracts text from Microsoft Word (.docx) files
   */
  static async extractDocx(buffer: Buffer): Promise<ExtractedDocumentData> {
    if (!buffer || buffer.length < 10) {
      throw new Error('Empty DOCX document: file contains no data.');
    }

    try {
      const mammothModule = await import('mammoth');
      const mammoth = (mammothModule as any).default || mammothModule;
      const result = await mammoth.extractRawText({ buffer });
      const fullText = (result.value || '').trim();
      const totalWords = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;
      const headings = this.detectHeadings(fullText);

      return {
        text: fullText,
        pageCount: Math.max(1, Math.ceil(totalWords / 450)),
        pages: [{ pageNumber: 1, text: fullText, wordCount: totalWords }],
        headings,
        detectedType: this.classifyDocumentHeuristic(fullText),
        hasQuestions: this.detectHasQuestions(fullText),
        ocrRequired: false,
        metadata: { totalWords }
      };
    } catch (err: any) {
      throw new Error(`Failed to parse DOCX document: ${err.message}`);
    }
  }

  /**
   * Extracts text from plain text (.txt) files
   */
  static extractTxt(buffer: Buffer): ExtractedDocumentData {
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty TXT document: file contains no data.');
    }
    const fullText = buffer.toString('utf-8').trim();
    const totalWords = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;
    return {
      text: fullText,
      pageCount: Math.max(1, Math.ceil(totalWords / 500)),
      pages: [{ pageNumber: 1, text: fullText, wordCount: totalWords }],
      headings: this.detectHeadings(fullText),
      detectedType: this.classifyDocumentHeuristic(fullText),
      hasQuestions: this.detectHasQuestions(fullText),
      ocrRequired: false,
      metadata: { totalWords }
    };
  }

  /**
   * Detects section headings (e.g., "Unit 1: Arrays", "Chapter 3", "Section A", uppercase headings)
   */
  static detectHeadings(text: string): string[] {
    const lines = text.split('\n');
    const headings: string[] = [];
    const headingPatterns = [
      /^(?:unit|module|chapter|section|part)\s+[0-9ivx]+[\s.:\-–—]+(.+)$/i,
      /^([0-9]+\.[0-9]+(?:\.[0-9]+)?\s+[A-Z][A-Za-z0-9\s,–—\-]{3,60})$/,
      /^([A-Z\s]{4,50})$/
    ];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length < 4 || trimmed.length > 80) continue;

      for (const pattern of headingPatterns) {
        if (pattern.test(trimmed)) {
          headings.push(trimmed);
          break;
        }
      }
      if (headings.length >= 50) break;
    }

    return Array.from(new Set(headings));
  }

  /**
   * Detects whether the text contains academic exercises, questions, or question paper formatting
   */
  static detectHasQuestions(text: string): boolean {
    const questionPatterns = [
      /\b(?:question|que|q\.?\s*[0-9]+|exercise|problem)\s*[:.-]/i,
      /\b(?:marks?|max marks|time allowed|attempt any|multiple choice)\b/i,
      /\([a-d]\)\s+[A-Za-z0-9]/i,
      /\?[ \t]*$/m
    ];
    let matchCount = 0;
    for (const p of questionPatterns) {
      if (p.test(text)) matchCount++;
    }
    return matchCount >= 2;
  }

  /**
   * Classifies document type using content vocabulary heuristics
   */
  static classifyDocumentHeuristic(text: string): DocumentType {
    const lower = text.toLowerCase();

    // Check for answer key / solutions
    if (
      lower.includes('answer key') ||
      lower.includes('solutions for chapter') ||
      lower.includes('exercise solutions') ||
      lower.includes('marking scheme') ||
      lower.includes('model answers') ||
      (lower.includes('answers:') && (lower.includes('1. (a)') || lower.includes('1. (b)')))
    ) {
      return 'answer_key';
    }

    // Check for question paper / exam
    if (
      (lower.includes('question paper') || lower.includes('semester examination') || lower.includes('mid-term') || lower.includes('final exam')) &&
      (lower.includes('marks') || lower.includes('time:') || lower.includes('attempt all') || lower.includes('section a'))
    ) {
      return 'question_paper';
    }

    // Check for syllabus / curriculum
    if (
      (lower.includes('syllabus') || lower.includes('course outline') || lower.includes('curriculum') || lower.includes('course objective') || lower.includes('learning outcomes')) ||
      (lower.includes('unit 1') && lower.includes('unit 2') && (lower.includes('prerequisites') || lower.includes('credits') || lower.includes('course code')))
    ) {
      return 'syllabus';
    }

    // Check for lecture notes
    if (
      lower.includes('lecture') ||
      lower.includes('slide') ||
      lower.includes('handout') ||
      lower.includes('notes') ||
      lower.includes('prof.') ||
      lower.includes('instructor:')
    ) {
      return 'lecture_notes';
    }

    // Check for textbook
    if (
      lower.includes('isbn') ||
      lower.includes('edition') ||
      lower.includes('preface') ||
      (lower.includes('chapter 1') && lower.includes('chapter 2') && lower.includes('contents'))
    ) {
      return 'textbook';
    }

    return 'reference';
  }
}

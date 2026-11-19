import { run, query, queryOne } from '../db/index.js';
import { SyllabusUnit, SyllabusTopic, DifficultyLevel, ParsedSyllabusResult, ParsedSyllabusUnit, ParsedSyllabusTopic } from '../../../shared/types.js';

export class SyllabusParserService {
  /**
   * Parses raw syllabus text (pasted or extracted from a PDF) into structured units, topics, and subtopics
   */
  static parseSyllabusText(rawText: string, fallbackTitle: string = 'Personalized Curriculum'): ParsedSyllabusResult {
    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Syllabus text cannot be empty');
    }

    const rawLines = rawText.split('\n');

    // 1. Detect Course Title & Code
    let courseTitle = fallbackTitle;
    let courseCode: string | undefined = undefined;

    const titleCodeRegex = /(?:course\s+(?:title|name)|subject)\s*[:\-–—]\s*([A-Za-z0-9\s,\-–—]+)/i;
    const codeRegex = /\b([A-Z]{2,4}\s*[-–—]?[0-9]{3,4}[A-Z]?)\b/;

    for (let i = 0; i < Math.min(15, rawLines.length); i++) {
      const line = rawLines[i].trim();
      if (!line) continue;

      const codeMatch = line.match(codeRegex);
      if (codeMatch && !courseCode) {
        courseCode = codeMatch[1].replace(/\s+/g, '');
      }

      const titleMatch = line.match(titleCodeRegex);
      if (titleMatch) {
        courseTitle = titleMatch[1].trim();
      } else if (
        i === 0 &&
        line.length > 5 &&
        line.length < 80 &&
        !line.toLowerCase().startsWith('unit') &&
        !line.toLowerCase().startsWith('module') &&
        !line.toLowerCase().startsWith('chapter')
      ) {
        courseTitle = line.replace(/^(?:course|syllabus|subject)\s*[:\-–—]?\s*/i, '').trim();
      }
    }

    // 2. Identify Units using regex markers
    const unitRegex = /^(?:unit|module|chapter|part)\s+([0-9ivx]+)[\s.:\-–—]*(.*)$/i;
    const unitsMap: Array<{
      unitNumber: number;
      title: string;
      description?: string;
      lines: Array<{ text: string; indent: number }>;
    }> = [];

    let currentUnit: { unitNumber: number; title: string; lines: Array<{ text: string; indent: number }> } | null = null;
    let fallbackUnitNum = 1;

    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      // Calculate leading indent: tabs = 4 spaces
      const leadingSpaces = rawLine.match(/^[\t ]*/)?.[0] || '';
      const indentLevel = leadingSpaces.replace(/\t/g, '    ').length;

      const match = trimmed.match(unitRegex);
      if (match) {
        if (currentUnit && currentUnit.lines.length > 0) {
          unitsMap.push(currentUnit);
        }
        const parsedNum = this.parseRomanOrInt(match[1]) || fallbackUnitNum++;
        const rawTitle = match[2]?.trim();
        currentUnit = {
          unitNumber: parsedNum,
          title: rawTitle && rawTitle.length > 2 ? rawTitle : `Unit ${parsedNum}`,
          lines: []
        };
      } else if (currentUnit) {
        currentUnit.lines.push({ text: trimmed, indent: indentLevel });
      }
    }

    if (currentUnit && currentUnit.lines.length > 0) {
      unitsMap.push(currentUnit);
    }

    // 3. Fallback: if no formal "Unit" markers found, segment by numbered sections (e.g. 1. Introduction, 2. ...)
    if (unitsMap.length === 0) {
      const numberedSectionRegex = /^([0-9]+)\.\s+([A-Z][A-Za-z0-9\s,–—\-]{3,70})$/;
      let secUnit: { unitNumber: number; title: string; lines: Array<{ text: string; indent: number }> } | null = null;

      for (const rawLine of rawLines) {
        const trimmed = rawLine.trim();
        if (!trimmed) continue;

        const leadingSpaces = rawLine.match(/^[\t ]*/)?.[0] || '';
        const indentLevel = leadingSpaces.replace(/\t/g, '    ').length;

        const match = trimmed.match(numberedSectionRegex);
        if (match) {
          if (secUnit && secUnit.lines.length > 0) unitsMap.push(secUnit);
          secUnit = {
            unitNumber: parseInt(match[1], 10),
            title: match[2].trim(),
            lines: []
          };
        } else if (secUnit) {
          secUnit.lines.push({ text: trimmed, indent: indentLevel });
        }
      }
      if (secUnit && secUnit.lines.length > 0) unitsMap.push(secUnit);
    }

    // 4. Absolute fallback: synthesize 2-3 logical units if text has no explicit unit headers
    if (unitsMap.length === 0) {
      const meaningfulLines = rawLines
        .map(l => ({ text: l.trim(), indent: (l.match(/^[\t ]*/)?.[0] || '').replace(/\t/g, '    ').length }))
        .filter(l => l.text.length > 3);

      const half = Math.ceil(meaningfulLines.length / 2);
      unitsMap.push({
        unitNumber: 1,
        title: 'Core Foundations & Principles',
        lines: meaningfulLines.slice(0, half)
      });
      unitsMap.push({
        unitNumber: 2,
        title: 'Advanced Applications & Analysis',
        lines: meaningfulLines.slice(half)
      });
    }

    // 5. Extract structured topics and subtopics for each unit
    let totalTopics = 0;
    let totalSubtopics = 0;

    const units: ParsedSyllabusUnit[] = unitsMap.map(u => {
      const topicList = this.extractHierarchicalTopics(u.lines);

      // Ensure every unit has at least 1-2 distinct topics
      if (topicList.length === 0) {
        topicList.push(
          {
            title: `${u.title}: Core Principles`,
            slug: this.slugify(`${u.title}-core`),
            summary: `Foundational study of ${u.title} including principles, mathematical models, and formal properties.`,
            estimatedMinutes: 25,
            difficultyLevel: 'foundational' as DifficultyLevel,
            subtopics: ['Fundamental Definitions', 'System Architecture', 'Core Assumptions']
          },
          {
            title: `${u.title}: Applied Problem Solving`,
            slug: this.slugify(`${u.title}-applied`),
            summary: `Practical problem-solving, structural patterns, and computational methods for ${u.title}.`,
            estimatedMinutes: 30,
            difficultyLevel: 'moderate' as DifficultyLevel,
            subtopics: ['Implementation Patterns', 'Performance Trade-offs', 'Case Studies']
          }
        );
      }

      totalTopics += topicList.length;
      topicList.forEach(t => totalSubtopics += t.subtopics.length);

      return {
        unitNumber: u.unitNumber,
        title: u.title,
        description: `Comprehensive module covering ${u.title} and related analytical topics.`,
        topics: topicList
      };
    });

    return {
      courseTitle,
      courseCode,
      units,
      totalUnits: units.length,
      totalTopics,
      totalSubtopics
    };
  }

  /**
   * Identifies whether a line is a formatting instruction, table/column header, or meta note rather than a syllabus topic
   */
  private static isMetadataOrHeaderLine(text: string): boolean {
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // Pipe-separated formatting instructions, e.g. "Complete open-book exam notes | simple language | quick-find format"
    if (trimmed.includes('|')) {
      const pipeParts = trimmed.split('|').map(p => p.trim());
      if (pipeParts.length >= 2) {
        if (
          lower.includes('exam notes') ||
          lower.includes('quick-find') ||
          lower.includes('quick find') ||
          lower.includes('memory hook') ||
          lower.includes('format') ||
          lower.includes('language') ||
          lower.includes('order') ||
          lower.includes('open-book') ||
          pipeParts.some(p => /^(?:notes|overview|format|summary|key points|topic|unit|table of contents|quick revision)$/i.test(p))
        ) {
          return true;
        }
      }
    }

    if (/^(?:textbook|reference|hours:|credits:|prerequisite|course outcomes|marking scheme|grading|course code|lecture schedule|assessment|format:|note:|notes:|instructions:)/i.test(lower)) {
      return true;
    }

    if (/(?:exam\s+notes|quick-find|memory\s+hook|syllabus\s+order|table\s+of\s+contents|open-book\s+exam|quick\s+revision\s+notes)/i.test(lower)) {
      return true;
    }

    // Markdown headers that are instructions/formatting instead of topics
    if (/^#+\s*(?:notes|format|summary|quick|overview|table|index|instructions|outline|open-book)/i.test(trimmed)) {
      return true;
    }

    return false;
  }

  /**
   * Extracts topics and nested subtopics from indented syllabus lines
   */
  private static extractHierarchicalTopics(lines: Array<{ text: string; indent: number }>): ParsedSyllabusTopic[] {
    const validLines = lines.filter(({ text }) => {
      if (text.trim().length < 3) return false;
      return !this.isMetadataOrHeaderLine(text);
    });

    if (validLines.length === 0) return [];

    const baseIndent = Math.min(...validLines.map(l => l.indent));
    const topics: ParsedSyllabusTopic[] = [];
    let currentTopic: ParsedSyllabusTopic | null = null;
    let currentTopicIndent = baseIndent;

    for (const { text, indent } of validLines) {
      // Check if this line is indented deeper than the current topic
      const isIndentedDeeper = indent >= currentTopicIndent + 2;
      const isSubBulletMarker = /^[*•o+]\s+/.test(text) || /^\([a-z0-9ivx]+\)\s+/i.test(text);
      const isSubNumbered = /^[0-9]+\.[0-9]+(?:\.[0-9]+)?\s+/i.test(text) || /^[a-z]\)\s+/i.test(text);

      const isSubtopic = currentTopic !== null && (isIndentedDeeper || isSubBulletMarker || isSubNumbered);

      const cleanText = text
        .replace(/^[-*•o+–—\d.)\]\s]+/, '')
        .trim();

      if (!cleanText || cleanText.length < 2) continue;

      if (isSubtopic && currentTopic) {
        if (cleanText.includes(',') && cleanText.length < 80) {
          const items = cleanText.split(/,\s*/).map(s => s.trim()).filter(s => s.length > 2);
          currentTopic.subtopics.push(...items);
        } else {
          currentTopic.subtopics.push(cleanText);
        }
        continue;
      }

      // Check inline colon format: "Topic Name: Subtopic 1, Subtopic 2, Subtopic 3"
      const colonMatch = cleanText.match(/^([A-Za-z0-9\s&/\\-]{3,50})\s*[:\-–—]\s*(.+)$/);
      if (colonMatch && colonMatch[2].includes(',')) {
        const topicTitle = colonMatch[1].trim();
        const inlineSubtopics = colonMatch[2]
          .split(/[,;]\s+/)
          .map(s => s.trim())
          .filter(s => s.length > 2 && s.length < 60);

        currentTopic = {
          title: topicTitle,
          slug: this.slugify(topicTitle),
          summary: `Academic examination of ${topicTitle}, exploring underlying mechanisms and applications.`,
          estimatedMinutes: 25,
          difficultyLevel: topics.length === 0 ? 'foundational' : topics.length < 3 ? 'moderate' : 'rigorous',
          subtopics: inlineSubtopics
        };
        topics.push(currentTopic);
        currentTopicIndent = indent;
        continue;
      }

      // Top-level topic
      const topicTitle = cleanText;
      currentTopic = {
        title: topicTitle,
        slug: this.slugify(topicTitle),
        summary: `Analytical study of ${topicTitle}, covering foundational concepts, theory, and practical implications.`,
        estimatedMinutes: 20 + (topics.length % 3) * 10,
        difficultyLevel: topics.length === 0 ? 'foundational' : topics.length < 3 ? 'moderate' : 'rigorous',
        subtopics: []
      };
      topics.push(currentTopic);
      currentTopicIndent = indent;

      if (topics.length >= 10) break; // Limit to 10 top-level topics per unit for cognitive clarity
    }

    return topics;
  }

  /**
   * Persists a parsed syllabus tree into database tables for a project
   */
  static async persistSyllabusTree(projectId: string, parsed: ParsedSyllabusResult): Promise<SyllabusUnit[]> {
    // 1. Clear existing units and topics for clean update
    await run('DELETE FROM syllabus_topics WHERE project_id = ?', [projectId]);
    await run('DELETE FROM syllabus_units WHERE project_id = ?', [projectId]);

    // Update project title and code if found
    await run(
      `UPDATE learning_projects
       SET title = ?, subject_code = COALESCE(?, subject_code), updated_at = datetime('now')
       WHERE id = ?`,
      [parsed.courseTitle, parsed.courseCode || null, projectId]
    );

    const savedUnits: SyllabusUnit[] = [];

    for (let uIdx = 0; uIdx < parsed.units.length; uIdx++) {
      const u = parsed.units[uIdx];
      const unitId = `unit-${projectId}-${u.unitNumber}-${Math.random().toString(36).substring(2, 6)}`;

      await run(
        `INSERT INTO syllabus_units (id, project_id, unit_number, title, description, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [unitId, projectId, u.unitNumber, u.title, u.description || '', uIdx + 1]
      );

      const savedTopics: SyllabusTopic[] = [];

      for (let tIdx = 0; tIdx < u.topics.length; tIdx++) {
        const t = u.topics[tIdx];
        const topicId = `top-${projectId}-${u.unitNumber}-${tIdx + 1}`;
        const subtopicsJson = JSON.stringify(t.subtopics || []);

        await run(
          `INSERT INTO syllabus_topics (id, unit_id, project_id, title, slug, summary, estimated_minutes, difficulty_level, mastery_score, status, sort_order, subtopics)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'not_started', ?, ?)`,
          [
            topicId,
            unitId,
            projectId,
            t.title,
            t.slug || this.slugify(t.title),
            t.summary || `Study guide for ${t.title}`,
            t.estimatedMinutes || 25,
            t.difficultyLevel || 'moderate',
            tIdx + 1,
            subtopicsJson
          ]
        );

        savedTopics.push({
          id: topicId,
          unitId,
          projectId,
          title: t.title,
          slug: t.slug || this.slugify(t.title),
          summary: t.summary,
          estimatedMinutes: t.estimatedMinutes || 25,
          difficultyLevel: t.difficultyLevel || 'moderate',
          masteryScore: 0,
          status: 'not_started',
          sortOrder: tIdx + 1,
          subtopics: t.subtopics || []
        });
      }

      savedUnits.push({
        id: unitId,
        projectId,
        unitNumber: u.unitNumber,
        title: u.title,
        description: u.description,
        sortOrder: uIdx + 1,
        topics: savedTopics
      });
    }

    return savedUnits;
  }

  /**
   * Helper to parse Roman numerals or Integers into numbers
   */
  private static parseRomanOrInt(val: string): number | null {
    const trimmed = val.trim().toUpperCase();
    const intVal = parseInt(trimmed, 10);
    if (!isNaN(intVal)) return intVal;

    const romanMap: Record<string, number> = {
      I: 1,
      II: 2,
      III: 3,
      IV: 4,
      V: 5,
      VI: 6,
      VII: 7,
      VIII: 8,
      IX: 9,
      X: 10
    };
    return romanMap[trimmed] || null;
  }

  private static slugify(text: string): string {
    return (
      text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'topic'
    );
  }
}

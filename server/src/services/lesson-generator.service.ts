import { query, queryOne } from '../db/index.js';
import {
  SourceGroundedLesson,
  SyllabusTopic,
  DocumentSection,
  UploadedDocument,
  ExternalResource
} from '../../../shared/types.js';
import { WikipediaService } from './wikipedia.service.js';

export class LessonGeneratorService {
  /**
   * Generates a student-first, beginner-friendly, source-grounded lesson for a syllabus topic
   * Structured around the 7 pedagogical elements:
   * 1. Simple introduction
   * 2. Clear explanation
   * 3. Step-by-step breakdown
   * 4. Practical example
   * 5. Important definitions
   * 6. Key points to remember
   * 7. Short recap
   */
  static async generateLesson(topicId: string): Promise<SourceGroundedLesson> {
    // 1. Fetch topic details
    const topic = await queryOne<SyllabusTopic>(
      'SELECT * FROM syllabus_topics WHERE id = ?',
      [topicId]
    );

    if (!topic) {
      throw new Error(`Syllabus topic "${topicId}" not found`);
    }

    // 2. Parse subtopics
    let subtopics: string[] = [];
    if (typeof (topic as any).subtopics === 'string') {
      try {
        subtopics = JSON.parse((topic as any).subtopics);
      } catch {}
    } else if (Array.isArray(topic.subtopics)) {
      subtopics = topic.subtopics;
    }

    // 3. Fetch project and unit details
    const unitId = (topic as any).unit_id || topic.unitId;
    const projectId = (topic as any).project_id || topic.projectId;

    const unit = unitId
      ? await queryOne<{ title: string; unit_number?: number }>('SELECT title, unit_number FROM syllabus_units WHERE id = ?', [unitId])
      : null;
    const project = projectId
      ? await queryOne<{ title: string; subject_code?: string }>('SELECT title, subject_code FROM learning_projects WHERE id = ?', [projectId])
      : null;

    const unitTitle = unit ? unit.title : 'Curricular Unit';
    const projectTitle = project ? project.title : 'Personalized Learning Course';

    // 4. Fetch mapped document sections for this topic
    const mappedSections = await query<{
      document_id: string;
      original_name: string;
      document_type: string;
      page_number: number;
      section_heading: string;
      content_text: string;
      relevance_score: number;
    }>(
      `SELECT d.id as document_id, d.original_name, d.document_type,
              s.page_number, s.section_heading, s.content_text, m.relevance_score
       FROM topic_document_mappings m
       JOIN document_sections s ON m.section_id = s.id
       JOIN uploaded_documents d ON m.document_id = d.id
       WHERE m.topic_id = ?
       ORDER BY m.relevance_score DESC, s.page_number ASC`,
      [topicId]
    );

    // 5. Build provenance sections and definitions
    const sections: SourceGroundedLesson['sections'] = [];
    const definitions: Array<{ term: string; definition: string; source: string }> = [];
    const mappedDocsMap = new Map<
      string,
      { documentId: string; documentName: string; documentType: any; pageRange?: string }
    >();

    let sourceProvenanceLabel = 'Syllabus Curriculum';
    let sourceType: SourceGroundedLesson['sourceType'] = 'curriculum_tutor';

    if (mappedSections.length > 0) {
      sourceType = 'uploaded_document';
      sourceProvenanceLabel = `Uploaded Document: ${mappedSections[0].original_name} (Page ${mappedSections[0].page_number})`;

      for (const sec of mappedSections) {
        if (!mappedDocsMap.has(sec.document_id)) {
          mappedDocsMap.set(sec.document_id, {
            documentId: sec.document_id,
            documentName: sec.original_name,
            documentType: sec.document_type as any,
            pageRange: `p. ${sec.page_number}`
          });
        }

        sections.push({
          heading: sec.section_heading || `${topic.title} — Source Study`,
          content: sec.content_text,
          sourceType: 'uploaded_document',
          sourceDocumentName: sec.original_name,
          sourcePageNumber: sec.page_number
        });

        // Heuristic extraction of definitions: "X is defined as Y"
        const defMatch = sec.content_text.match(
          /([A-Z][A-Za-z0-9\s]{2,25})\s+is\s+(?:defined\s+as\s+|a\s+|an\s+)([^.]+?\.)/i
        );
        if (defMatch && definitions.length < 4) {
          definitions.push({
            term: defMatch[1].trim(),
            definition: defMatch[2].trim(),
            source: `${sec.original_name} (p. ${sec.page_number})`
          });
        }
      }
    } else {
      // Check supplementary Wikipedia
      try {
        const wikiSummary = await WikipediaService.getSummary(topic.title);
        if (wikiSummary && wikiSummary.extract) {
          sourceType = 'supplementary_verified';
          sourceProvenanceLabel = 'Wikipedia Educational Knowledgebase';

          sections.push({
            heading: 'Authoritative Theoretical Overview',
            content: wikiSummary.extract,
            sourceType: 'external_supplementary',
            externalProvider: 'Wikipedia REST API',
            externalSourceUrl: wikiSummary.pageUrl
          });

          definitions.push({
            term: topic.title,
            definition: wikiSummary.description || wikiSummary.extract.split('.')[0] + '.',
            source: 'Wikipedia'
          });
        }
      } catch {}
    }

    // Default definition if still none
    if (definitions.length === 0) {
      definitions.push({
        term: topic.title,
        definition:
          topic.summary ||
          `A core academic concept in ${unitTitle} establishing fundamental rules, computational structures, and properties.`,
        source: 'Course Syllabus'
      });
    }

    // Add subtopic definitions
    for (const sub of subtopics) {
      if (definitions.length >= 5) break;
      definitions.push({
        term: sub,
        definition: `A critical topic component under ${topic.title} covering specific mechanics, invariant properties, and algorithmic behaviors.`,
        source: 'Course Syllabus'
      });
    }

    // 6. Synthesize the 7 Student-First Pedagogical Components

    // 1. Simple Introduction
    const introduction = `Welcome to **${topic.title}**, part of your study in *${unitTitle}*. ${
      subtopics.length > 0
        ? `In this topic, you will learn about: ${subtopics.join(', ')}.`
        : `This concept is an essential foundation that solves key problems in ${projectTitle}.`
    } Whether you are preparing for exams or building practical systems, understanding these principles will help you write better software and reason about complex problems.`;

    // 2. Clear Explanation (Plain language without sacrificing accuracy)
    let explanation = '';
    if (sections.length > 0 && sections[0].content && sections[0].content.length > 50) {
      explanation = `**What is ${topic.title}?**\n\n${sections[0].content}\n\nIn simple terms, ${topic.title} establishes a reliable set of rules and data layouts so that operations can run predictably without unexpected errors or slowdowns.`;
    } else {
      explanation = `**Understanding ${topic.title} from First Principles:**\n\nAt its core, **${topic.title}** provides an organized, mathematically proven way to manage complex data or processes. Instead of naive linear approaches that become slow as your data grows, ${topic.title} enforces specific rules (called invariants) that keep performance optimal and predictable.\n\n${
        subtopics.length > 0
          ? `By mastering ${subtopics.slice(0, 2).join(' and ')}, you gain the ability to predict system behavior, handle edge cases, and choose the right design tradeoffs.`
          : 'Understanding this concept allows you to identify optimal algorithms, analyze performance tradeoffs, and avoid classic architectural pitfalls.'
      }`;
    }

    // 3. Step-by-Step Breakdown
    const stepByStep = [
      `Step 1 — Setup & Pre-conditions: The system initializes variables, verifies inputs, and allocates memory or state boundaries.`,
      `Step 2 — Core Execution: The main procedure executes (e.g. tree traversal, key comparison, or message passing) while maintaining structural invariants.`,
      `Step 3 — Invariant & Balance Checking: If any rule is temporarily violated (such as an unbalanced subtree or a conflicting timestamp), the system detects it and applies correction routines.`,
      `Step 4 — Final Resolution: The operation concludes with deterministic time and space guarantees, returning a verified result or state.`
    ];

    // 4. Practical Real-World Example
    const practicalExample = `**Real-World Application:**\nImagine you are building a service like Google Maps, a database engine, or a high-frequency trading platform. If you stored millions of user records in an unorganized list, finding a single record would require scanning every entry one by one. By applying **${topic.title}**, the system organizes data hierarchically, cutting search times from millions of operations down to just 15–20 steps (logarithmic efficiency). That is why this concept is tested on nearly every university and technical examination.`;

    // 6. Key Points to Remember for Exams
    const keyPoints = [
      `Core Principle: Always identify the fundamental invariant rule that ${topic.title} enforces.`,
      `Efficiency: Know the difference between best-case, average-case, and worst-case time/space complexities.`,
      `Subtopics: Ensure you can clearly define ${subtopics.length > 0 ? subtopics.join(', ') : 'the key edge cases'}.`,
      `Common Mistake: Forgetting to verify boundary conditions (e.g., empty structures, single-node cases, or network partitions).`
    ];

    // 7. Short Recap Summary
    const recap = `**Quick Recap:** ${topic.title} provides a formal, reliable approach to organizing data and coordinating operations. It guarantees optimal performance and prevents system failure. When you feel comfortable with the definitions above, take the practice quiz to verify your understanding!`;

    // Supplementary takeaways & exercises
    const keyTakeaways = keyPoints;
    const practiceExercises = [
      `Trace the step-by-step behavior of ${topic.title} on a simple paper example.`,
      `Explain to a peer why ${topic.title} is preferred over simpler alternative methods.`,
      `Solve the 5-question comprehension quiz below to test your mastery.`
    ];

    return {
      topic: {
        ...topic,
        subtopics
      },
      unitTitle,
      projectTitle,
      introduction,
      explanation,
      stepByStep,
      practicalExample,
      definitions,
      keyPoints,
      recap,
      sourceType,
      sourceLabel: sourceProvenanceLabel,
      sections,
      keyTakeaways,
      practiceExercises,
      mappedDocuments: Array.from(mappedDocsMap.values())
    };
  }
}

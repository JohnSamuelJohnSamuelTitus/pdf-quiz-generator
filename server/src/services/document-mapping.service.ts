import { run, query } from '../db/index.js';
import { SyllabusTopic, DocumentSection, TopicDocumentMapping } from '../../../shared/types.js';

export class DocumentMappingService {
  /**
   * Automatically maps document sections to syllabus topics based on keyword and semantic co-occurrence
   */
  static async mapDocumentToTopics(projectId: string, documentId: string): Promise<number> {
    // 1. Fetch all syllabus topics for this project
    const topics = await query<SyllabusTopic>(
      'SELECT id, title, slug, summary FROM syllabus_topics WHERE project_id = ?',
      [projectId]
    );

    if (topics.length === 0) return 0;

    // 2. Fetch sections/chunks of this document
    const sections = await query<{
      id: string;
      document_id: string;
      page_number: number;
      section_heading: string | null;
      content_text: string;
    }>(
      'SELECT id, document_id, page_number, section_heading, content_text FROM document_sections WHERE document_id = ?',
      [documentId]
    );

    if (sections.length === 0) return 0;

    // 3. Clear existing mappings for this document
    await run('DELETE FROM topic_document_mappings WHERE document_id = ?', [documentId]);

    let createdMappings = 0;

    // 4. Calculate relevance scores
    for (const topic of topics) {
      const topicTokens = this.tokenize(`${topic.title} ${topic.summary || ''}`);

      for (const sec of sections) {
        const secContent = sec.content_text || (sec as any).contentText || '';
        const secHeading = sec.section_heading || (sec as any).sectionHeading || '';
        const secTokens = this.tokenize(`${secHeading} ${secContent}`);
        const score = this.calculateJaccardSimilarity(topicTokens, secTokens);

        // If strong match (score >= 0.08 or exact topic title phrase match)
        const hasDirectPhrase = secContent.toLowerCase().includes(topic.title.toLowerCase()) ||
          (secHeading && secHeading.toLowerCase().includes(topic.title.toLowerCase()));

        if (score >= 0.08 || hasDirectPhrase) {
          const mappingId = `map-${topic.id}-${sec.id}`;
          const finalScore = hasDirectPhrase ? Math.max(score, 0.75) : score;

          try {
            await run(
              `INSERT INTO topic_document_mappings (id, topic_id, document_id, section_id, relevance_score, mapping_type)
               VALUES (?, ?, ?, ?, ?, 'automatic')`,
              [mappingId, topic.id, documentId, sec.id, Number(finalScore.toFixed(3))]
            );
            createdMappings++;
          } catch {}
        }
      }
    }

    // 5. Fallback: if no section met the threshold, map first section to first topic so document is never orphaned
    if (createdMappings === 0 && topics.length > 0 && sections.length > 0) {
      await run(
        `INSERT INTO topic_document_mappings (id, topic_id, document_id, section_id, relevance_score, mapping_type)
         VALUES (?, ?, ?, ?, 0.5, 'automatic')`,
        [`map-${topics[0].id}-${sections[0].id}`, topics[0].id, documentId, sections[0].id]
      );
      createdMappings++;
    }

    return createdMappings;
  }

  /**
   * Maps all documents of a project to its syllabus topics
   */
  static async mapProjectDocuments(projectId: string): Promise<number> {
    const docs = await query<{ id: string }>('SELECT id FROM uploaded_documents WHERE project_id = ?', [projectId]);
    let total = 0;
    for (const doc of docs) {
      total += await this.mapDocumentToTopics(projectId, doc.id);
    }
    return total;
  }

  /**
   * Helper to tokenize text into lowercase word tokens, stripping stop words
   */
  private static tokenize(text: string): Set<string> {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'of', 'for', 'to', 'with', 'by', 'as',
      'this', 'that', 'from', 'or', 'be', 'are', 'was', 'were', 'it', 'its', 'can', 'has', 'have'
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    return new Set(words);
  }

  /**
   * Jaccard similarity index between token sets
   */
  private static calculateJaccardSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    let intersection = 0;
    for (const item of a) {
      if (b.has(item)) intersection++;
    }
    const union = a.size + b.size - intersection;
    return union > 0 ? intersection / union : 0;
  }
}

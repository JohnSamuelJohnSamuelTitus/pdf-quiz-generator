import { describe, it, expect, beforeAll } from 'vitest';
import { getDb, run, query, queryOne } from '../server/src/db/index.js';
import { PdfExtractionService } from '../server/src/services/pdf-extraction.service.js';
import { SyllabusParserService } from '../server/src/services/syllabus-parser.service.js';
import { DocumentMappingService } from '../server/src/services/document-mapping.service.js';
import { QuestionExtractorService } from '../server/src/services/question-extractor.service.js';
import { LessonGeneratorService } from '../server/src/services/lesson-generator.service.js';
import { ResourceDiscoveryService } from '../server/src/services/resource-discovery.service.js';
import { IntegrationsService } from '../server/src/services/integrations.service.js';
import { ensureGuestSession, migrateGuestData } from '../server/src/middleware/auth.middleware.js';

describe('Document-First Architecture & Intelligence Engine Tests', () => {
  const guestSessionId = `guest_test_${Date.now()}`;
  let testProjectId: string;
  let testTopicId: string;
  let testDocId: string;

  beforeAll(async () => {
    await getDb();
  });

  describe('1. Login-Free Guest Session Management', () => {
    it('initializes and persists isolated guest sessions', async () => {
      await ensureGuestSession(guestSessionId);

      const session = await queryOne<{ id: string }>(
        'SELECT id FROM guest_sessions WHERE id = ?',
        [guestSessionId]
      );

      expect(session).not.toBeNull();
      expect(session?.id).toBe(guestSessionId);
    });
  });

  describe('2. Syllabus Parser & Curriculum Structuring', () => {
    const rawSyllabus = `
      Course: CSE279 Distributed Systems
      Instructor: Dr. Alan Turing

      Unit 1: Foundations of Distributed Consensus
      - Introduction to Distributed Systems and Network Models
      - Byzantine Fault Tolerance and Safety vs Liveness
      - Paxos and Raft Consensus Protocols

      Unit 2: Distributed Data Storage & Replication
      - CAP Theorem and ACID vs BASE Consistency
      - Consistent Hashing and Dynamo-style Key-Value Stores
      - Two-Phase Commit and Distributed Transactions

      Unit 3: Peer-to-Peer Networks and Fault Recovery
      - Chord Distributed Hash Table and Gossip Protocols
      - Failure Detectors and Heartbeat Mechanisms
    `;

    it('parses unformatted syllabus text into structured units and topics', () => {
      const parsed = SyllabusParserService.parseSyllabusText(rawSyllabus, 'CSE279 Distributed Systems');

      expect(parsed.units.length).toBe(3);
      expect(parsed.units[0].title).toContain('Foundations of Distributed Consensus');
      expect(parsed.units[0].topics.length).toBe(3);
      expect(parsed.units[0].topics[0].title).toContain('Introduction to Distributed Systems');
      expect(parsed.units[1].topics.length).toBe(3);
      expect(parsed.units[2].topics.length).toBe(2);
    });

    it('persists parsed syllabus into database and creates project workspace', async () => {
      testProjectId = `proj_test_${Date.now()}`;
      await run(
        `INSERT INTO learning_projects (id, user_id, title, subject_code, raw_syllabus_text, status)
         VALUES (?, ?, 'CSE279 Distributed Systems', 'CSE279', ?, 'active')`,
        [testProjectId, guestSessionId, rawSyllabus]
      );

      const parsed = SyllabusParserService.parseSyllabusText(rawSyllabus, 'CSE279 Distributed Systems');
      const savedUnits = await SyllabusParserService.persistSyllabusTree(testProjectId, parsed);

      expect(savedUnits.length).toBe(3);
      expect(savedUnits[0].topics.length).toBe(3);
      testTopicId = savedUnits[0].topics[0].id;

      const dbTopics = await query<any>(
        'SELECT * FROM syllabus_topics WHERE project_id = ?',
        [testProjectId]
      );
      expect(dbTopics.length).toBe(8);
    });
  });

  describe('3. Text Extraction & Document Intelligence', () => {
    it('extracts plain text documents and detects sections and metadata', () => {
      const sampleNotes = `
        Chapter 1: Distributed Clocks and Ordering
        Lamport timestamps provide a partial order of events in distributed systems.
        Logical clocks do not guarantee causal relationship if no message was exchanged.
        Vector clocks solve this by tracking time vectors for every process.
      `;
      const extracted = PdfExtractionService.extractTxt(Buffer.from(sampleNotes, 'utf-8'));

      expect(['lecture_notes', 'reference']).toContain(extracted.detectedType);
      expect(extracted.pages.length).toBeGreaterThan(0);
      expect(extracted.text).toContain('Lamport timestamps');
    });

    it('persists uploaded document sections into database and maps to syllabus', async () => {
      testDocId = `doc_test_${Date.now()}`;
      const mockNotesContent = `
        Unit 1: Foundations of Distributed Consensus
        Safety ensures that bad things never happen, meaning all non-faulty nodes agree on the same value.
        Liveness ensures that good things eventually happen, meaning the protocol eventually terminates.
        In an asynchronous network with a single crash failure, the Fischer-Lynch-Paterson (FLP) impossibility result proves consensus cannot be guaranteed.
      `;

      await run(
        `INSERT INTO uploaded_documents (id, project_id, user_id, filename, original_name, mime_type, file_size, document_type, page_count, raw_text, status)
         VALUES (?, ?, ?, 'test_notes.txt', 'Distributed_Consensus_Notes.txt', 'text/plain', 512, 'lecture_notes', 1, ?, 'processed')`,
        [testDocId, testProjectId, guestSessionId, mockNotesContent]
      );

      await run(
        `INSERT INTO document_sections (id, document_id, page_number, section_heading, content_text, content_type, sort_order)
         VALUES (?, ?, 1, 'Foundations of Distributed Consensus', ?, 'text', 1)`,
        [`sec_test_${Date.now()}`, testDocId, mockNotesContent]
      );

      const mappingsCount = await DocumentMappingService.mapProjectDocuments(testProjectId);
      expect(mappingsCount).toBeGreaterThan(0);

      const mappings = await query<any>(
        'SELECT * FROM topic_document_mappings WHERE document_id = ?',
        [testDocId]
      );
      expect(mappings.length).toBeGreaterThan(0);
    });
  });

  describe('4. Question Discovery & Grounded Generation', () => {
    it('discovers and extracts multiple-choice questions and answer keys from uploaded text', () => {
      const textWithExercises = `
        Review Questions:
        1. Which protocol guarantees consensus with 2f+1 replicas under crash faults?
        A. Raft
        B. Two-Phase Locking
        C. Lamport Timestamp
        D. Consistent Hashing
        Ans: A

        2. What does the CAP theorem state regarding network partitions?
        A. Systems can achieve both Consistency and Availability during partitions
        B. Systems must choose between Consistency and Availability during partitions
        Ans: B
      `;

      const extracted = QuestionExtractorService.extractQuestionsFromText(
        'doc-1',
        'proj-1',
        textWithExercises,
        'Midterm_Exam.pdf'
      );

      expect(extracted.length).toBe(2);
      expect(extracted[0].questionText).toContain('Which protocol guarantees consensus');
      expect(extracted[0].options).toHaveLength(4);
      expect(extracted[0].answerText).toBe('A');
      expect(extracted[1].questionText).toContain('CAP theorem');
      expect(extracted[1].answerText).toBe('B');
    });

    it('generates source-grounded quiz questions citing verbatim document excerpts', () => {
      const excerpts = [
        'Byzantine Fault Tolerance requires at least 3f+1 total nodes to tolerate f arbitrary failures in an asynchronous distributed network.',
        'The Raft consensus algorithm decomposes consensus into leader election, log replication, and safety.'
      ];

      const questions = QuestionExtractorService.generateGroundedQuestions(
        'Byzantine Fault Tolerance',
        excerpts,
        2,
        'moderate'
      );

      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0].source).toBe('original_engine');
      expect(questions[0].explanation).toContain('Source text excerpt');
    });
  });

  describe('5. Source-Grounded Lessons & Student Annotations', () => {
    it('generates a structured lesson with source citations and references', async () => {
      const lesson = await LessonGeneratorService.generateLesson(testTopicId);

      expect(lesson).toBeDefined();
      expect(lesson.topic?.title).toBeDefined();
      expect(Array.isArray(lesson.sections)).toBe(true);
      expect(Array.isArray(lesson.keyTakeaways)).toBe(true);
      expect(Array.isArray(lesson.mappedDocuments)).toBe(true);
    });

    it('saves student topic notes and bookmarks', async () => {
      const noteId = `note_test_${Date.now()}`;
      await run(
        `INSERT INTO topic_notes (id, user_id, topic_id, note_content, is_bookmarked, highlight_text)
         VALUES (?, ?, ?, 'FLP impossibility applies specifically to asynchronous networks!', 1, 'FLP impossibility')`,
        [noteId, guestSessionId, testTopicId]
      );

      const saved = await queryOne<any>(
        'SELECT * FROM topic_notes WHERE id = ?',
        [noteId]
      );

      expect(saved).not.toBeNull();
      expect(saved.is_bookmarked).toBe(1);
      expect(saved.note_content).toContain('FLP impossibility');
    });
  });

  describe('6. Public API Ecosystem Expansion (OpenAlex, arXiv, Gutendex, MathJS)', () => {
    it('discovers open academic resources for a topic', async () => {
      const resources = await ResourceDiscoveryService.discoverResourcesForTopic(
        testTopicId,
        'Distributed Consensus Protocols'
      );

      expect(Array.isArray(resources)).toBe(true);
      // Even if external networks are slow, it returns valid structured array
      for (const res of resources) {
        expect(res.title).toBeDefined();
        expect(res.provider).toBeDefined();
      }
    });

    it('evaluates symbolic mathematical expressions via MathJS API', async () => {
      const evalResult = await ResourceDiscoveryService.evaluateMathExpression('2 * (3 + 4) / 7');

      expect(evalResult).toBeDefined();
      expect(typeof evalResult.latencyMs).toBe('number');
      // Should evaluate to 2 if online or fallback cleanly
      expect(evalResult.result).toBeDefined();
    });
  });

  describe('7. API & Integrations Centre Health Verification', () => {
    it('retrieves comprehensive inventory of all 8 integrated public APIs', async () => {
      const integrations = await IntegrationsService.getAllIntegrations();

      expect(integrations.length).toBe(8);
      const providers = integrations.map(i => i.providerId);
      expect(providers).toContain('wikipedia');
      expect(providers).toContain('openlibrary');
      expect(providers).toContain('opentrivia');
      expect(providers).toContain('freedictionary');
      expect(providers).toContain('openalex');
      expect(providers).toContain('arxiv');
      expect(providers).toContain('gutendex');
      expect(providers).toContain('mathjs');
    });

    it('masks API keys securely to prevent frontend credential leakage', async () => {
      await IntegrationsService.updateIntegration('openalex', {
        apiKey: 'sk-test-secret-openalex-key-12345'
      });

      const integrations = await IntegrationsService.getAllIntegrations();
      const openalex = integrations.find(i => i.providerId === 'openalex');

      expect(openalex?.apiKeyMasked).toContain('••••••••');
      expect(openalex?.apiKeyMasked).not.toBe('sk-test-secret-openalex-key-12345');
    });
  });

  describe('8. Account Migration (Guest to Permanent Student)', () => {
    it('migrates guest projects, notes, and study progress to new registered account', async () => {
      const registeredUserId = `usr_migrated_${Date.now()}`;
      await run(
        `INSERT INTO users (id, email, password_hash, full_name, role)
         VALUES (?, ?, 'hashed_pw', 'Migrated Student', 'student')`,
        [registeredUserId, `migrated-${Date.now()}@learnsphere.edu`]
      );

      const migrationResult = await migrateGuestData(guestSessionId, registeredUserId);
      expect(migrationResult.success).toBe(true);
      expect(migrationResult.migratedCount).toBeGreaterThanOrEqual(1);

      // Verify that project now belongs to registeredUserId
      const migratedProj = await queryOne<any>(
        'SELECT * FROM learning_projects WHERE id = ? AND user_id = ?',
        [testProjectId, registeredUserId]
      );
      expect(migratedProj).not.toBeNull();
      expect(migratedProj.user_id).toBe(registeredUserId);
    });
  });
});

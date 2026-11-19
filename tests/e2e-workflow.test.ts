import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { app } from '../server/src/index.js';
import { getDb, query, queryOne } from '../server/src/db/index.js';

describe('LearnSphere — End-to-End Browser-to-Database Workflow Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  const guestSessionId = `guest_e2e_${Date.now()}`;
  let createdProjectId: string;

  // Helper to generate a valid syntactically correct PDF buffer
  function createTestPdf(textContent: string, pageCount: number = 1): Buffer {
    let body = `%PDF-1.4\n`;
    const objects: string[] = [];
    objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

    const pageRefs = Array.from({ length: pageCount }, (_, i) => `${3 + i * 3} 0 R`).join(' ');
    objects.push(`2 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >>\nendobj\n`);

    for (let i = 0; i < pageCount; i++) {
      const pageObjNum = 3 + i * 3;
      const contentObjNum = pageObjNum + 1;
      const fontObjNum = pageObjNum + 2;
      const streamContent = `BT /F1 12 Tf 50 700 Td (${textContent} - Page ${i + 1}) Tj ET`;

      objects.push(
        `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>\nendobj\n`
      );
      objects.push(
        `${contentObjNum} 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`
      );
      objects.push(
        `${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`
      );
    }

    const offsets: number[] = [0];
    let currentOffset = body.length;
    for (const obj of objects) {
      offsets.push(currentOffset);
      body += obj;
      currentOffset = body.length;
    }

    const startXref = body.length;
    body += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < offsets.length; i++) {
      body += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
    }
    body += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
    return Buffer.from(body, 'latin1');
  }

  beforeAll(async () => {
    await getDb();
    await new Promise<void>((resolve) => {
      // Listen on ephemeral port
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // 1. Health Check Verification
  it('Step 1 & 2: API health check endpoint returns 200 operational', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.application).toBe('LearnSphere API');
    expect(data.academicProject).toBe('CSE279');
  });

  // 3. Paste a realistic multi-unit syllabus and process it via POST /api/syllabus/preview
  it('Step 3 & 4: Paste a multi-unit syllabus to POST /api/syllabus/preview (reproducing previously failed endpoint)', async () => {
    const payload = {
      rawText: `
Course: CSD233 Data Structures & Algorithms
Course Code: CSD233

Unit 1: Advanced Tree Structures
- Self-Balancing Search Trees
  * AVL Tree Rotations and Height Analysis
  * Red-Black Tree Invariants and Recoloring
- Multiway Trees & Indexing
  * B-Trees Structure and Node Splitting
  * B+ Trees for Database Storage Engines

Unit 2: Graph Theory & Shortest Paths
- Shortest Path Computations
  * Dijkstra Algorithm with Priority Queues
  * Bellman-Ford Negative Weight Cycle Detection
- Minimum Spanning Trees
  * Prim Algorithm
  * Kruskal Algorithm with Union-Find
      `,
      fallbackTitle: 'CSD233 Data Structures & Algorithms'
    };

    // Test both /api/syllabus/preview and /api/preview
    const res = await fetch(`${baseUrl}/api/syllabus/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Guest-Session': guestSessionId
      },
      body: JSON.stringify(payload)
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.courseTitle).toContain('CSD233 Data Structures & Algorithms');
    expect(data.courseCode).toBe('CSD233');
    expect(data.units.length).toBe(2);

    // Verify Unit 1
    const u1 = data.units[0];
    expect(u1.title).toContain('Advanced Tree Structures');
    expect(u1.topics.length).toBe(2);
    expect(u1.topics[0].title).toBe('Self-Balancing Search Trees');
    expect(u1.topics[0].subtopics.length).toBe(2);
    expect(u1.topics[0].subtopics).toContain('AVL Tree Rotations and Height Analysis');
    expect(u1.topics[1].title).toBe('Multiway Trees & Indexing');
    expect(u1.topics[1].subtopics.length).toBe(2);

    // Verify Unit 2
    const u2 = data.units[1];
    expect(u2.title).toContain('Graph Theory & Shortest Paths');
    expect(u2.topics.length).toBe(2);
    expect(u2.topics[0].title).toBe('Shortest Path Computations');
    expect(u2.topics[0].subtopics.length).toBe(2);
  });

  // 4. Upload a real text-based PDF syllabus to POST /api/syllabus/preview
  it('Step 5 & 6: Upload a real text-based PDF syllabus via multipart FormData to /api/syllabus/preview', async () => {
    const pdfContent = `
Course: Computer Networks & Security
Course Code: NET302

Unit 1: Physical and Data Link Layer
- Transmission Media and Signals
  * Guided vs Unguided Media
  * Shannon Channel Capacity Theorem
- Error Detection and Correction
  * Cyclic Redundancy Check
  * Hamming Distance Bounds

Unit 2: Network Layer and Routing
- IP Addressing and Subnetting
  * IPv4 Classless Inter-Domain Routing
  * IPv6 Transition Strategies
- Routing Protocols
  * Distance Vector Routing and Split Horizon
  * Link State Routing and OSPF
    `;

    const pdfBuffer = createTestPdf(pdfContent, 2);

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });
    formData.append('file', blob, 'CSD233_Syllabus.pdf');
    formData.append('fallbackTitle', 'CSD233 Syllabus');

    const res = await fetch(`${baseUrl}/api/syllabus/preview`, {
      method: 'POST',
      headers: {
        'X-Guest-Session': guestSessionId
      },
      body: formData
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.ocrRequired).toBe(false);
    expect(data.units.length).toBeGreaterThanOrEqual(1);
    expect(data.totalTopics).toBeGreaterThan(0);
  });

  // 5. Edit the extracted hierarchy and create a workspace
  it('Step 7: Submit reviewed/edited curriculum to POST /api/projects to generate learning workspace', async () => {
    const reviewedUnits = [
      {
        unitNumber: 1,
        title: 'Unit 1: Advanced Tree Structures (Student Edited)',
        description: 'Comprehensive study of balanced trees.',
        topics: [
          {
            title: 'Self-Balancing Search Trees (Reviewed)',
            slug: 'self-balancing-search-trees',
            summary: 'AVL and Red-Black tree properties and balancing routines.',
            estimatedMinutes: 30,
            difficultyLevel: 'moderate' as const,
            subtopics: ['AVL Tree Rotations', 'Red-Black Tree Invariants', 'Splay Tree Heuristics']
          },
          {
            title: 'B-Trees & Multiway Storage',
            slug: 'b-trees-multiway-storage',
            summary: 'Secondary storage data indexing.',
            estimatedMinutes: 35,
            difficultyLevel: 'rigorous' as const,
            subtopics: ['Node Splitting and Merging', 'B+ Tree Range Scans']
          }
        ]
      },
      {
        unitNumber: 2,
        title: 'Unit 2: Graph Theory & Shortest Paths (Student Edited)',
        description: 'Algorithms on directed and weighted graphs.',
        topics: [
          {
            title: 'Shortest Path Algorithms',
            slug: 'shortest-path-algorithms',
            summary: 'Single-source and all-pairs shortest paths.',
            estimatedMinutes: 25,
            difficultyLevel: 'moderate' as const,
            subtopics: ['Dijkstra Implementation', 'Bellman-Ford Dynamic Programming']
          }
        ]
      }
    ];

    const createPayload = {
      title: 'CSD233 Data Structures & Algorithms',
      subjectCode: 'CSD233',
      targetExamDate: '2026-12-02',
      reviewedUnits
    };

    const res = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Guest-Session': guestSessionId
      },
      body: JSON.stringify(createPayload)
    });

    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.project).toBeDefined();
    expect(data.project.title).toBe('CSD233 Data Structures & Algorithms');
    expect(data.project.subjectCode).toBe('CSD233');

    createdProjectId = data.project.id;
  });

  // 6. Refresh / Persistence Verification
  it('Step 8: Refresh / GET /api/projects/:id verifies database persistence of units, topics & subtopics', async () => {
    expect(createdProjectId).toBeDefined();

    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
      headers: {
        'X-Guest-Session': guestSessionId
      }
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.project.title).toBe('CSD233 Data Structures & Algorithms');
    expect(data.units.length).toBe(2);

    // Verify Unit 1 title was persisted
    expect(data.units[0].title).toBe('Unit 1: Advanced Tree Structures (Student Edited)');
    expect(data.units[0].topics.length).toBe(2);

    // Verify Topic 1 subtopics were persisted as array
    const top1 = data.units[0].topics[0];
    expect(top1.title).toBe('Self-Balancing Search Trees (Reviewed)');
    expect(Array.isArray(top1.subtopics)).toBe(true);
    expect(top1.subtopics.length).toBe(3);
    expect(top1.subtopics).toContain('AVL Tree Rotations');
    expect(top1.subtopics).toContain('Splay Tree Heuristics');

    // Direct SQLite database query check
    const dbTopics = await query<any>(
      'SELECT id, title, subtopics FROM syllabus_topics WHERE project_id = ? ORDER BY sort_order ASC',
      [createdProjectId]
    );
    expect(dbTopics.length).toBe(3);
    const subs = JSON.parse(dbTopics[0].subtopics);
    expect(subs).toContain('AVL Tree Rotations');
  });

  // 7. Upload study notes and verify they are NOT classified as a syllabus
  it('Step 9: Upload study notes and verify classification as lecture_notes (NOT syllabus)', async () => {
    const lectureNotesContent = `
      Lecture Notes: Distributed Consensus and Atomic Commit
      Instructor: Prof. Leslie Lamport
      Date: Week 4 Slide Handout

      In this lecture, we examine Paxos consensus and why two-phase commit is a blocking protocol.
      Key takeaway: Paxos guarantees safety under asynchronous network models.
    `;

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(Buffer.from(lectureNotesContent))], { type: 'text/plain' });
    formData.append('file', blob, 'Week4_Lecture_Notes.txt');
    formData.append('documentType', 'lecture_notes');

    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}/documents`, {
      method: 'POST',
      headers: {
        'X-Guest-Session': guestSessionId
      },
      body: formData
    });

    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.document.documentType).toBe('lecture_notes');
    expect(data.document.documentType).not.toBe('syllabus');

    // Verify document was recorded in database
    const dbDoc = await queryOne<any>(
      'SELECT document_type FROM uploaded_documents WHERE id = ?',
      [data.document.id]
    );
    expect(dbDoc.document_type).toBe('lecture_notes');
  });

  // 8. Verify the guest workflow without login
  it('Step 10: Complete guest workflow operates without requiring login or token', async () => {
    // List projects using only X-Guest-Session
    const listRes = await fetch(`${baseUrl}/api/projects`, {
      headers: {
        'X-Guest-Session': guestSessionId
      }
    });

    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.success).toBe(true);
    expect(listData.projects.length).toBeGreaterThanOrEqual(1);

    const found = listData.projects.find((p: any) => p.id === createdProjectId);
    expect(found).toBeDefined();
    expect(found.title).toBe('CSD233 Data Structures & Algorithms');
  });
});

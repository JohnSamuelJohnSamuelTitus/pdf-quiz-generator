# LearnSphere — Product Transformation & Architecture Audit (Stage A)

**Document**: `PRODUCT_TRANSFORMATION_AUDIT.md`  
**Module**: CSE279 Academic Project  
**Author**: Principal Software Architect & Lead Engineer  
**Date**: November 15, 2026  
**Status**: AUDIT COMPLETE — BASELINE VERIFIED  

---

## 1. Executive Summary & Objective

LearnSphere began as a curated academic learning platform with fixed subjects, topics, and quiz generation (Phases 1 & 2, commits `872ae95` and `927465e`). While the core foundation—authentication, database persistence, adaptive difficulty, Recharts analytics, and 4 educational API integrations—is functional and tested with 37 passing unit/integration tests, it currently operates under a **catalogue-first paradigm** rather than a **document-first paradigm**.

This audit details the transition from predefined curricular tracks to a **document-first, login-free personalized learning ecosystem** where students bring their own university syllabus and study materials (PDF, DOCX, TXT) as the primary source of truth.

---

## 2. Current Architecture Overview

```
Client (React 18, Vite, Tailwind CSS, Recharts)
  ├── Pages: Landing, Login, Register, Onboarding, Dashboard, Workspace, QuizHub, Analytics, Settings
  ├── Navigation: Enforces AuthGuard (ProtectedRoute) on /dashboard, /quiz, /analytics, /settings
  └── API Client: Axios/Fetch wrapper with JWT Bearer token in localStorage

Backend (Express 4, TypeScript, Node.js v24)
  ├── Auth Middleware: Validates Bearer JWT; rejects unauthenticated requests with 401
  ├── Relational Engine: SQLite via sql.js (WebAssembly) with persistent disk sync (data/learnsphere.db)
  ├── External APIs: Wikipedia REST, Open Library, Open Trivia DB, Free Dictionary
  ├── Intelligence: QuestionGenerator, AdaptiveDifficulty (EWMA), WeaknessDetector, RevisionScheduler
  └── Test Suite: 37 automated tests across 6 test files running under Vitest
```

---

## 3. Existing Database & Relational Schema

Currently defined in `server/src/db/schema.sql`:
1. `users`: Stores registered students with bcrypt password hashes and timestamps.
2. `student_preferences`: Holds skill level, study goals, preferred difficulty, and JSON-encoded subject lists.
3. `subjects` & `topics`: Hardcoded hierarchical catalogue (Computer Science, Mathematics, Physics, Biology, Chemistry).
4. `learning_resources`: Fixed book/article/wikipedia metadata links tied to topic IDs.
5. `learning_sessions`: Logs active study timers with start/end duration and student notes.
6. `quiz_attempts` & `quiz_answers`: Records assessment submissions, answer keys, scores, and question types.
7. `student_progress`: Tracks mastery score (0-100%) and progress status per topic.
8. `api_cache`: In-memory and persisted multi-tier cache for external API responses.
9. `question_bank`: Pre-curated academic questions (MCQ, True/False, Short Answer).
10. `study_materials`: Curated textbook excerpts and lecture notes.
11. `topic_mastery_history`: Historical snapshots for adaptive difficulty.
12. `student_weaknesses`: Concept-level tracking of repeated incorrect answers.
13. `revision_schedules`: Spaced-repetition schedule table using Ebbinghaus decay intervals.

### Limitations & Schema Deficiencies:
- **No Guest Session Entity**: Every table enforces `user_id TEXT NOT NULL REFERENCES users(id)`. Unauthenticated students cannot persist study history or documents.
- **Fixed Subject/Topic Structure**: Topics require a parent `subject_id` linked to predefined subjects. No dynamic syllabus structure exists (e.g., custom units, chapters, university course codes).
- **No Document Storage Entities**: No tables exist to store uploaded documents, extracted page text, content chunks, or document-to-topic mappings.

---

## 4. Existing Authentication & Session Management

- Uses JWT tokens issued upon `/api/auth/login` or `/api/auth/register`, stored in `localStorage` under `learnsphere_token`.
- Client `ProtectedRoute` redirects any visitor without a token back to `/login`.
- **Transformation Requirement**:
  - Replace mandatory login with a **transparent guest session architecture**.
  - Generate a cryptographic Guest ID (`guest_<uuid>`) stored in cookies/localStorage.
  - Allow guest students to upload syllabi, read generated lessons, take quizzes, and track mastery without seeing a login screen.
  - Provide an optional "Save Progress to Account" migration pathway.

---

## 5. Existing External API Integrations

| Provider | Current Endpoint | Current Purpose | Verification Status |
|---|---|---|---|
| **Wikipedia REST API** | `https://en.wikipedia.org/api/rest_v1/page/summary/{title}` | Summaries & article extracts | Verified (200 OK, 606ms) |
| **Open Library API** | `https://openlibrary.org/subjects/{subject}.json` | Textbook bibliography & covers | Verified (200 OK, 1496ms) |
| **Open Trivia DB** | `https://opentdb.com/api.php?amount=5&category=18&type=multiple` | External quiz retrieval | Verified (200 OK, 1121ms) |
| **Free Dictionary API**| `https://api.dictionaryapi.dev/api/v2/entries/en/{term}` | Vocabulary & definitions | Verified (200 OK, 132ms) |

### Gaps & Ecosystem Expansion:
- APIs are currently queried only for predefined subjects (`computer_science`, `mathematics`).
- No integration with open academic research repositories (**OpenAlex, arXiv, Crossref**).
- No computational / symbolic verification for scientific & mathematical topics (**MathJS, Newton**).
- No unified resource routing engine that dispatches queries based on dynamic syllabus subjects.
- No public domain literature integration (**Gutendex**).

---

## 6. Document Processing & Intelligence (Current vs. Required)

| Capability | Current State | Target State |
|---|---|---|
| **File Ingestion** | None (no upload handlers or multipart support) | Multi-file upload for PDF, TXT, DOCX with size & MIME validation |
| **PDF Extraction** | None | Pure JS extraction (`pdf-parse`) extracting text, headings, pages, and structures |
| **Syllabus Parsing** | None (predefined DB seed) | Extraction of course title, units, chapters, topics, and learning objectives |
| **Document Classification** | None | Auto-classification into Syllabus, Textbook, Lecture Notes, Question Paper, Reference |
| **Document-to-Topic Mapping** | None | Semantic keyword & section matching associating document excerpts with syllabus topics |
| **Question Discovery** | None | Regex & heuristic parser discovering existing exercises, MCQs, and PYQs in uploaded PDFs |

---

## 7. Reusable Components & Foundation

1. **Apple-Inspired Design Tokens**: Cards, Buttons, Tabs, Badges, Progress Bars, Skeletons, and Dark/Light mode theme system.
2. **Scoring & Quiz Interface**: Timer, question jump navigator, answer selection, explanation cards, review states.
3. **Adaptive Difficulty Algorithm**: Exponentially weighted moving average calculation on `quiz_attempts`.
4. **Weakness Detector**: Aggregation of `quiz_answers` grouped by concept with remedial advice.
5. **Revision Scheduler**: Ebbinghaus memory decay logic with high/medium/low urgency tiers.
6. **Recharts Analytics**: Score trends, subject comparisons, and strength/weakness visualizations.

---

## 8. Transformation Roadmap & Phased Execution Plan

```
STAGE A: Existing Architecture Audit (THIS DOCUMENT)
  │
  ▼
STAGE B: Login-Free Student Experience & Guest Sessions
  ├── Create guest session manager (backend middleware + client token handler)
  ├── DB migration: Support guest_session_id across progress & quiz records
  └── Account migration helper: seamless guest-to-registered user upgrade
  │
  ▼
STAGE C: Document-First Home Page
  ├── Replace generic landing with "Learn smarter. Prepare better." portal
  ├── Drag-and-drop file uploader (PDF, TXT, DOCX) + Syllabus paste editor
  └── Immediate transition to learning path generation
  │
  ▼
STAGE D: Modular Document Intelligence Engine
  ├── Multer-based secure file upload with file signature validation
  ├── pdf-extraction.service (text, page numbers, headings, section chunks)
  ├── syllabus-parser.service (hierarchical units, topics, learning objectives)
  └── document-mapping.service (associating lecture notes & books to topics)
  │
  ▼
STAGE E: Personalized Dynamic Learning Path
  ├── Generate custom curriculum tree from uploaded syllabus
  └── Visual units, topics, reading progress, and document badges
  │
  ▼
STAGE F: Source-Grounded Reading & Lesson Workspace
  ├── Clean, distraction-free reading viewer
  ├── Source citations linking directly to document name and page number
  └── Side-by-side comparison between student document and generated summary
  │
  ▼
STAGE G: Public API Ecosystem Expansion & Unified Resource Discovery
  ├── Expand Public APIs: OpenAlex (research), arXiv (preprints), Gutendex (books), MathJS (symbolic math)
  ├── Unified Resource Discovery Service: Subject-aware provider routing & caching
  └── Complete PUBLIC_API_AUDIT.md
  │
  ▼
STAGE H: Three-Tier Question Engine (Extracted + Grounded + External)
  ├── Extract existing questions & answer keys directly from uploaded PDFs
  ├── Generate grounded questions from document content with deterministic fallbacks
  └── Preserve Open Trivia DB and Wikipedia supplementary questions with clear provenance
  │
  ▼
STAGE I: Enhanced Assessment & Quiz Execution
  ├── Short-answer evaluation with normalized comparison & key concept validation
  └── Retry incorrect questions & instant weakness recording
  │
  ▼
STAGE J: Unified Analytics & Intelligence Integration
  ├── Connect adaptive difficulty, weaknesses, and revision scheduling to syllabus topics
  └── Render real metrics on the student dashboard
  │
  ▼
STAGE K: Integrations & API Centre (/settings/integrations)
  ├── Live health checks, latency, status badges, and server-side credential isolation
  └── Key masking & administrative authorization
  │
  ▼
STAGE L - S: Testing, Security Audits, E2E Validation, Reports & Clean Git Commits
```

---

## 9. Conclusion

The existing LearnSphere application has a robust, clean foundation with zero build errors and 37 passing tests. Transforming it into a document-first, syllabus-driven educational platform will elevate it from a static quiz app into a genuine university-grade learning companion.

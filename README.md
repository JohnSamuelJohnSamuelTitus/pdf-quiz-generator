# LearnSphere — CSE279 Academic Project
**Document-First Personalized Learning Platform & Public API Ecosystem Expansion**

> Built for CSE279. Engineered with Apple-standard minimalist design, document-first intelligence, login-free instant access, eight (8) verified public educational APIs, deterministic question generation, and real persisted student progress analytics.

---

## 🚀 Key Highlights & Philosophy

- **Document-First Learning Paradigm**: Students bring their own university course material (PDF, TXT, DOCX). LearnSphere parses syllabus outlines, extracts chapters and learning milestones, maps uploaded documents to curriculum topics, and synthesizes source-grounded lessons citing document name and page provenance.
- **Login-Free Instant Access**: Zero mandatory registration wall. Students open the application, drag and drop a course syllabus or paste topics, and immediately enter an interactive workspace backed by private, isolated guest sessions. One-click account migration is available anytime to persist progress across devices.
- **Apple-Level Minimalist Design**: Crafted with an intentional design system: crisp 1px borders, subtle layered micro-shadows, Inter typography, consistent spacing tokens, and zero generic AI SaaS gradients.
- **Expanded 8-Provider Public API Ecosystem**: Fully integrated and server-cached with eight (8) live public endpoints sourced from the GitHub Public APIs catalog:
  1. **Wikipedia REST API**: Structured theoretical extracts, concept overviews, and thumbnail diagrams.
  2. **Open Library Subjects API**: Published textbooks, bibliographies, authors, and cover art.
  3. **Open Trivia Database**: Categorized academic assessment questions for foundational, moderate, and rigorous levels.
  4. **Free Dictionary API**: Academic vocabulary, phonetic pronunciations, part-of-speech classification, and usage examples.
  5. **OpenAlex Scholarly Knowledge Graph**: Scholarly research papers, open access DOIs, authors, and citations.
  6. **arXiv Preprints API**: STEM technical preprints, atom feeds, and full-text PDF links.
  7. **Project Gutenberg (Gutendex)**: Public-domain historical textbooks, classical references, and download rankings.
  8. **MathJS Computational Engine**: Symbolic algebra, matrix calculations, and numerical formulas evaluated via free API.
- **API & Integrations Centre (`/settings/integrations`)**: Complete visibility into API health with live connection testing, millisecond latency tracking, provider toggle controls, and server-side secret masking.
- **Extracted & Grounded Question Generators**: Discovers existing exercises and answer keys inside uploaded PDFs and generates source-grounded practice quizzes citing verbatim document excerpts.
- **Interactive Performance Analytics (Recharts)**: Dedicated Analytics Hub (`/analytics`) featuring score trend lines, subject comparison bar charts, weakness alerts, and time distribution metrics derived directly from real database attempts.
- **Adaptive Difficulty Engine**: Calculates an exponentially weighted moving average from recent quiz attempts to calibrate topic difficulty dynamically across Foundational, Moderate, and Rigorous levels.
- **Spaced Repetition Revision Scheduler**: Tracks topic mastery decay via an Ebbinghaus memory model and surfaces proactive revision alerts.
- **Relational Storage with ACID Integrity**: 26 structured SQLite schema tables (`sql.js`) with foreign key cascade rules, automated indexes, and optional PostgreSQL/Supabase connectivity.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript 5.3, Tailwind CSS, Lucide Icons, Recharts, React Router v6 |
| **Backend** | Node.js (v22), Express 4, TypeScript, Multer (Memory Storage), `pdf-parse`, `mammoth`, Zod, BCrypt.js, JWT |
| **Database** | Relational SQLite (`sql.js` WASM engine) + Supabase Client adapter (26 tables in `schema.sql`) |
| **Public APIs** | Wikipedia REST, Open Library, Open Trivia DB, Free Dictionary, OpenAlex, arXiv, Gutendex, MathJS |
| **Testing** | Vitest (51 automated unit and integration tests across 7 test suites — 100% passing) |

---

## 🏃 Getting Started

### Prerequisites
- Node.js `v18+` (Tested on Node.js `v22.14.0` on Windows)
- npm `v10+`

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
The application comes preconfigured with default values in `.env` (copied from `.env.example`).
```env
PORT=3001
NODE_ENV=development
JWT_SECRET=learnsphere-super-secure-jwt-secret-cse279-academic-2026
SQLITE_DB_PATH=./data/learnsphere.db

# Optional Supabase Configuration (Leave blank to use built-in SQLite engine)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 3. Seed Database
Initialize the database with academic curricula, topics, sample resources, and demo accounts:
```bash
npm run seed
```

### 4. Run Development Server
Start both the Express API server (`http://localhost:3001`) and the Vite frontend dev server (`http://localhost:5173`) concurrently:
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 👤 Evaluator Quick Demo & Guest Workflow

1. **Guest Student Workflow (No login required)**:
   - Navigate to `http://localhost:5173`.
   - In the hero section, click **"Try Sample: CSE279 Distributed Systems"** (or upload any PDF syllabus/notes).
   - Click **"Analyze Syllabus & Start Learning"**.
   - You will immediately enter the **Project Workspace** (`/project/:id`) with parsed course units, source-grounded lessons, extracted questions, and open research tabs.
2. **Evaluator Registered Demo Account**:
   - For rapid evaluation of authenticated features, click the demo login button on `/login` or use:
   - **Email**: `student@learnsphere.edu`
   - **Password**: `Password123!`
   - **Student Profile**: Alex Morgan (Computer Science & Mathematics Track)

---

## 🧪 Running Automated Tests

Run the complete Vitest test suite covering document intelligence, guest sessions, API failure resilience, and adaptive scoring:
```bash
npm test
```

### Current Test Suite Verification (51/51 Passing):
```
 ✓ tests/progress.test.ts (2 tests)
 ✓ tests/db.test.ts (4 tests)
 ✓ tests/apis.test.ts (5 tests)
 ✓ tests/api-failures.test.ts (10 tests)
 ✓ tests/phase2-intelligence.test.ts (11 tests)
 ✓ tests/document-intelligence.test.ts (14 tests)
 ✓ tests/auth.test.ts (5 tests)

 Test Files  7 passed (7)
 Tests       51 passed (51)
```

### Production Build
To test the complete TypeScript client and server compilation:
```bash
npm run build
```

---

## 📂 Project Structure & Academic Reports

```
c:\projects\ai project
├── client/                     # Frontend Application (React + Vite + Tailwind + Recharts)
│   ├── src/
│   │   ├── api/client.ts       # Typed API client with guest session header injection
│   │   ├── components/
│   │   │   ├── ui/             # Apple-style Design System Components (Card, Button, Tabs, Badge...)
│   │   │   └── layout/         # Navbar, Footer, Layout Shell
│   │   ├── context/            # AuthContext (with guest session auto-generation), Theme, Toast
│   │   ├── pages/              # LandingPage, ProjectWorkspacePage, IntegrationsCentrePage,
│   │   │                       # DashboardPage, QuizHubPage, AnalyticsPage, SettingsPage
│   │   ├── App.tsx             # Declarative Router with Guest-Permissive Route Guards
│   │   └── main.tsx
├── server/                     # Backend API Server (Node + Express + TypeScript)
│   ├── src/
│   │   ├── db/                 # SQL Schema (26 tables), Migrations, Seed Data, DB Engine
│   │   ├── middleware/         # requireSession (JWT + X-Guest-Session), Error Handlers
│   │   ├── routes/             # projects, documents, syllabus, lessons, resources,
│   │   │                       # integrations, auth, quizzes, analytics, sessions...
│   │   ├── services/           # PdfExtraction, SyllabusParser, DocumentMapping,
│   │   │                       # QuestionExtractor, LessonGenerator, ResourceDiscovery,
│   │   │                       # IntegrationsService, AdaptiveDifficulty, Analytics...
│   │   └── index.ts            # Express application entrypoint with CORS & Static fallback
├── shared/
│   └── types.ts                # TypeScript contracts shared across client & server
├── tests/                      # Automated Vitest integration & unit tests (51 tests across 7 suites)
│   ├── document-intelligence.test.ts # Guest sessions, syllabus parsing, PDF extraction, grounded quiz
│   ├── phase2-intelligence.test.ts   # Adaptive difficulty, weakness detection, spaced repetition
│   ├── api-failures.test.ts          # 9 API failure conditions resilience suite
│   ├── apis.test.ts                  # Live verified public educational API tests
│   ├── auth.test.ts                  # User registration, bcrypt hashing, JWT validation
│   ├── db.test.ts                    # SQLite database schema, cascades, and constraints
│   └── progress.test.ts              # Mastery scores, study sessions, and progress persistence
├── data/                       # Local SQLite database file (learnsphere.db)
├── .env.example
├── PRODUCT_TRANSFORMATION_AUDIT.md # Initial Codebase Audit & Gap Analysis
├── PUBLIC_API_AUDIT.md             # 15-API Catalog Audit & Integration Tiers
├── DOCUMENT_INTELLIGENCE_REPORT.md # Document Parsing, PDF Extraction & Grounded Lessons
├── API_INTEGRATIONS_REPORT.md      # 8-API Ecosystem Health & Credential Masking
├── RESOURCE_DISCOVERY_REPORT.md    # OpenAlex, arXiv, Gutendex, MathJS Discovery Engine
├── SECURITY_REVIEW.md              # Cybersecurity, Upload Safety & Session Isolation
├── API_FAILURE_TEST_REPORT.md      # 9-Condition API Resilience & Fault Tolerance Audit
├── TEST_REPORT.md                  # Vitest QA Report (51/51 Tests Passing)
├── FINAL_DEVELOPMENT_REPORT.md     # CSE279 Academic Master Development Report
└── package.json
```

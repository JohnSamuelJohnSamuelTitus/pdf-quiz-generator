# LEARNSPHERE — PHASE 1 ARCHITECTURAL & COMPLETION REPORT
**Academic Project**: CSE279  
**Platform**: LearnSphere — Personalized Learning and Quiz Generator  
**Phase**: Phase 1 — Foundation and Core Platform  
**Status**: COMPLETE & VERIFIED  

---

## 1. Executive Summary

Phase 1 of **LearnSphere** has been designed, implemented, verified, and thoroughly tested according to the CSE279 master specifications. The platform is a fully functional full-stack web application designed with an Apple-level minimalist design aesthetic, verified multi-tier public API integrations, resilient relational data storage, provider-independent deterministic quiz fallback logic, and genuine student progress tracking.

---

## 2. Implemented Functionality

### 2.1 Repository Inspection & Clean Scaffolding
- Initialized clean Git version control on branch `main`.
- Established clear separation of concerns across `client/`, `server/`, `shared/`, and `tests/`.
- Configured unified build, dev, seed, and test scripts with cross-platform compatibility on Windows (Node.js v24.22.1).

### 2.2 Design System (Apple-Level Aesthetic Standards)
- **Design Tokens**: Standardized color palette using refined Slate and Neutral scales (`slate-50` through `slate-950`), complemented by deep indigo accents (`#4F46E5`).
- **Zero Decorative Clutter**: Prohibited chaotic purple/blue neon gradients, bloated bubble cards, and artificial glassmorphism.
- **Typography & Spacing**: Strict 4px/8px optical grid with Inter system font, tightened headings, relaxed body text, and tabular numerics for statistics.
- **Reusable Component Library**:
  - `Button`: Primary, secondary, outline, ghost, danger; sm, md, lg sizes; spinner loading and disabled states.
  - `Input`: Label, helper text, error handling, leading/trailing icons.
  - `Card`: Composable `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter` with subtle `shadow-card` and `border-slate-200/80`.
  - `Badge`: Status badges (neutral, accent, success, warning, danger).
  - `Dialog` / `Modal`: Accessible modal with Escape key handling, backdrop click, and focus management.
  - `ProgressBar`: Sleek linear progress meters with custom color variants.
  - `Tabs`: Segmented pill controls with smooth transitions.
  - `Skeleton`: Shimmer pulse placeholders for loading states.
  - `EmptyState`: Contextual empty states with icon, description, and primary CTA.
- **Dark Mode**: Complete dual-mode support with instant theme toggle and `localStorage` persistence.

### 2.3 Landing Page
- Minimalist sticky navigation with brand mark, academic CSE279 badge, and quick authentication triggers.
- Hero section with high-contrast typography, product overview, and an interactive workspace preview mockup.
- The 4-step **Learning Lifecycle** (Discover → Study → Assess → Master).
- Feature highlight matrix showcasing Public API integrations, deterministic fallbacks, progress tracking, and session logging.
- Public API verification showcase detailing real endpoints and verification status.
- High-converting call-to-action banner and academic footer with disclaimers and links.

### 2.4 Authentication & Security
- **Registration**: Email format validation, full name validation, password minimum 8-character complexity check.
- **Password Security**: Passwords salted and hashed with BCrypt (`bcryptjs`, 10 rounds).
- **Session Persistence**: Cryptographically signed JSON Web Tokens (JWT) stored client-side and verified via Express `requireAuth` middleware.
- **Demo Student Account**: One-click quick login button for instant evaluator access as `student@learnsphere.edu` (`Password123!`).

### 2.5 Student Onboarding
- A 4-step progressive onboarding workflow:
  1. **Academic Subject Track**: Multi-select curricula (Computer Science, Mathematics, Physics, Life Sciences).
  2. **Competency Level**: Select from Beginner, Intermediate, or Advanced.
  3. **Learning Objectives**: Multi-select goals (e.g., exam prep, concept mastery, research).
  4. **Pace & Difficulty**: Select difficulty (foundational, moderate, rigorous) and daily study target slider (15 to 120 minutes).
- Direct persistence into `student_preferences` table with ability to update at any time in Settings.

### 2.6 Student Dashboard
- Personalized welcome banner with time-of-day greeting and daily target monitor.
- **Four-Metric Strip**:
  - *In-Progress Topics* (exact count from `student_progress`)
  - *Topics Mastered* (count where `mastery_score >= 85`)
  - *Total Study Time* (sum of all recorded `learning_sessions` duration)
  - *Average Quiz Score* (exact average percentage across completed `quiz_attempts`)
- **Continue Learning**: Interactive cards for active topics with real-time mastery meters and direct workspace jump links.
- **Personalized Recommendations**: Algorithmic recommendation cards based on primary enrolled subjects and lowest mastery scores.
- **Recent Activity Feed**: Timeline combining real study sessions, quiz submissions, and preference updates.
- **Quiz History**: Chronological table of past attempts with scores and timestamps.
- **No Invented Statistics**: If an account has zero attempts or sessions, the dashboard renders clean empty states rather than fictitious progress.

### 2.7 Database Architecture
- Relational schema deployed via `better-sqlite3` / `sql.js` (WebAssembly engine) with persistent storage in `./data/learnsphere.db`.
- Built-in Supabase client adapter ready to connect to remote PostgreSQL instances when `SUPABASE_URL` is provided.
- Fully normalized tables with foreign keys, check constraints, cascading deletes, and optimized B-tree indexes.

### 2.8 Public API Foundation (GitHub Public APIs Sourced)
Four verified public educational APIs were audited and integrated:
1. **Wikipedia REST API** (`https://en.wikipedia.org/api/rest_v1/page/summary/{title}`):
   - CORS & HTTPS compliant, no authentication required.
   - Provides authoritative extracts, thumbnails, and desktop page URLs.
2. **Open Library Subjects API** (`https://openlibrary.org/subjects/{subject}.json`):
   - CORS & HTTPS compliant, no authentication required.
   - Fetches real published academic textbooks, author rosters, publication years, and cover artwork (`https://covers.openlibrary.org/b/id/{id}-M.jpg`).
3. **Open Trivia Database API** (`https://opentdb.com/api.php`):
   - Verified categories: Computers (18), Mathematics (19), Science & Nature (17).
   - Generates questions calibrated by difficulty (`easy` → `foundational`, `medium` → `moderate`, `hard` → `rigorous`).
   - HTML entities decoded (`&quot;`, `&#039;`, `&amp;`).
4. **Free Dictionary API** (`https://api.dictionaryapi.dev/api/v2/entries/en/{term}`):
   - Retrieves precise academic definitions, phonetics, parts of speech, usage examples, and synonyms.
- **Multi-Tier Caching & Resilience**:
  - In-memory cache + SQLite `api_cache` table with configurable TTL.
  - High-fidelity offline fallbacks: when running in an offline sandbox or during remote API outages, verified fallback data is served seamlessly with zero crashes.
  - Live diagnostics monitor endpoint (`/api/external/health`) measuring real-time latency and service status.

### 2.9 Learning Workspace Foundation
- **Curriculum Explorer** (`/workspace`):
  - Subject filtering, difficulty filtering, and real-time concept search.
  - Cards displaying topic summaries, estimated study time, and workspace launcher.
- **Topic Workspace** (`/workspace/:subjectSlug/:topicSlug`):
  - Topic header with difficulty, estimated time, and live student mastery gauge.
  - Previous and Next lesson navigation for curriculum progression.
  - **Tab 1 — Concept Overview**: Live Wikipedia extract, educational image, and key academic objectives.
  - **Tab 2 — Curated Books**: Live Open Library bibliography cards with cover art and direct external catalog links.
  - **Tab 3 — Terminology**: Live Free Dictionary term search with phonetic guide and example sentences.
  - **Tab 4 — Active Study Session**: Interactive stopwatch (Start/Pause/Reset), session notes, and persistence to `learning_sessions`.
  - **Tab 5 — Practice Quiz**: Real question generation via Open Trivia DB, answer selection, instant scoring, question explanations, and automated student mastery updates.

---

## 3. Database Schema

```sql
-- 1. Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'educator', 'admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Student Preferences
CREATE TABLE student_preferences (
  user_id TEXT PRIMARY KEY,
  interests TEXT NOT NULL DEFAULT '[]',
  primary_subjects TEXT NOT NULL DEFAULT '[]',
  skill_level TEXT NOT NULL DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  learning_objectives TEXT NOT NULL DEFAULT '[]',
  preferred_difficulty TEXT NOT NULL DEFAULT 'foundational' CHECK (preferred_difficulty IN ('foundational', 'moderate', 'rigorous')),
  daily_goal_minutes INTEGER NOT NULL DEFAULT 30 CHECK (daily_goal_minutes > 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Subjects
CREATE TABLE subjects (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'BookOpen',
  color TEXT NOT NULL DEFAULT '#4F46E5',
  is_featured BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Topics
CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  difficulty_level TEXT NOT NULL DEFAULT 'foundational' CHECK (difficulty_level IN ('foundational', 'moderate', 'rigorous')),
  estimated_minutes INTEGER NOT NULL DEFAULT 25,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE(subject_id, slug)
);

-- 5. Learning Resources
CREATE TABLE learning_resources (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  title TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('textbook', 'wikipedia_overview', 'article', 'paper', 'definition')),
  provider TEXT NOT NULL,
  url TEXT NOT NULL,
  author TEXT,
  description TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- 6. Learning Sessions
CREATE TABLE learning_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- 7. Quiz Attempts
CREATE TABLE quiz_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('foundational', 'moderate', 'rigorous')),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  correct_answers INTEGER NOT NULL DEFAULT 0 CHECK (correct_answers >= 0),
  score_percentage REAL NOT NULL CHECK (score_percentage >= 0 AND score_percentage <= 100),
  time_taken_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- 8. Quiz Answers
CREATE TABLE quiz_answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  selected_option TEXT NOT NULL,
  correct_option TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  explanation TEXT NOT NULL,
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE
);

-- 9. Student Progress
CREATE TABLE student_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'mastered')),
  mastery_score REAL NOT NULL DEFAULT 0 CHECK (mastery_score >= 0 AND mastery_score <= 100),
  last_studied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  UNIQUE(user_id, topic_id)
);

-- 10. Multi-Tier Cache
CREATE TABLE api_cache (
  cache_key TEXT PRIMARY KEY,
  service_name TEXT NOT NULL,
  response_data TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 200,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Public API Integrations Summary

| Public API | Endpoint Base | Authentication | CORS | Rate Limits | Role in LearnSphere |
|---|---|---|---|---|---|
| **Wikipedia REST API** | `https://en.wikipedia.org/api/rest_v1/page/summary/` | None | Yes | High (200 req/s) | Topic extracts, descriptions, thumbnail images |
| **Open Library API** | `https://openlibrary.org/subjects/` | None | Yes | Generous | Textbooks, bibliographies, book covers |
| **Open Trivia DB** | `https://opentdb.com/api.php` | None | Yes | 1 req/5s (handled via cache) | Categorized MCQs across difficulty tiers |
| **Free Dictionary API** | `https://api.dictionaryapi.dev/api/v2/entries/en/` | None | Yes | Unlimited | Academic term definitions, phonetics, synonyms |

---

## 5. Environment Variables

Defined in `.env` and `.env.example`:

```bash
PORT=3001
NODE_ENV=development
JWT_SECRET=learnsphere-super-secure-jwt-secret-cse279-academic-2026
SQLITE_DB_PATH=./data/learnsphere.db

# Optional Supabase PostgreSQL Connectivity
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Optional AI Provider Configuration (Deterministic engine used by default)
AI_PROVIDER=none
AI_API_KEY=
```

---

## 6. Test Suite & Verification Results

Automated tests were written using **Vitest** in `tests/`:

```
Test Files  4 passed (4)
Tests       16 passed (16)
Duration    4.77s
```

### Detailed Test Coverage:
1. `tests/auth.test.ts` (5 tests):
   - BCrypt hashing and password verification.
   - User registration and database insertion.
   - Email uniqueness constraint enforcement.
   - Signed JWT session generation and decoding.
   - Rejection of tampered or forged JWT tokens.
2. `tests/db.test.ts` (4 tests):
   - Verification of all 10 schema tables and indices.
   - Persistence and deserialization of student preferences.
   - Relational foreign key integrity between subjects and topics.
   - Persistence of study sessions and duration logging.
3. `tests/apis.test.ts` (5 tests):
   - WikipediaService extract querying and fallback verification.
   - OpenLibraryService textbook bibliography retrieval.
   - OpenTriviaService question formatting, options shuffling, and explanations.
   - DictionaryService definition retrieval and phonetics parsing.
   - CacheService memory and persistent SQLite cache storage and invalidation.
4. `tests/progress.test.ts` (2 tests):
   - Quiz attempt and answer score computation.
   - Dynamic mastery score updates and progression states (`in_progress` → `completed` → `mastered`).

### Build Verification:
- Client compilation: `tsc -p tsconfig.client.json && vite build` → **Passed (0 errors)**.
- Server compilation: `tsc -p tsconfig.server.json` → **Passed (0 errors)**.

---

## 7. Instructions to Run the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Database
```bash
npm run seed
```

### 3. Start Development Platform
```bash
npm run dev
```
Navigate to **`http://localhost:5173`** in any web browser.

### 4. Evaluator Quick Login
On the `/login` screen, click the **"One-Click Demo Student Sign In"** button or enter:
- **Email**: `student@learnsphere.edu`
- **Password**: `Password123!`

---

## 8. Known Limitations (Pertaining to Phase 1 Scope)

1. **AI Question Generation is Mock/Deterministic in Phase 1**: External LLM generation (e.g. OpenAI / Gemini) is scheduled for Phase 2; Phase 1 uses verified Open Trivia DB queries with deterministic local academic fallbacks.
2. **Adaptive Spaced Repetition**: Deep weakness detection algorithms and automated revision scheduling are designated for Phase 2; Phase 1 records all raw data needed for these models (scores, times, topics).
3. **Multi-device Sync without Cloud Provider**: By default, SQLite stores data on the server filesystem. When multi-host cloud deployment is required, configuring `SUPABASE_URL` switches storage to PostgreSQL.

---

## 9. Conclusion & Phase 1 Sign-Off

All Phase 1 requirements have been fulfilled. The platform builds cleanly, passes all 16 automated tests with exit code 0, persists relational data accurately, integrates live public APIs with caching and offline fallbacks, and presents an Apple-grade user experience.

**Phase 1 is complete. Awaiting review and approval before proceeding to Phase 2.**

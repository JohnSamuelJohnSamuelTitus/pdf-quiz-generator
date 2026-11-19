# LearnSphere — Resource Discovery Engine Report
**Academic Module:** CSE279 Personalized Learning Platform  
**Component:** Multi-Provider Academic Discovery Engine  
**Status:** Implemented & Verified  
**Date:** November 2026

---

## 1. Overview & Pedagogical Purpose

While student-uploaded documents serve as the primary source of truth, university coursework is significantly enriched when students have instant access to seminal research papers, recent preprints, and historical source texts. The LearnSphere **Resource Discovery Engine** (`ResourceDiscoveryService`) automatically searches, filters, and presents verified academic materials corresponding to the student's current syllabus topics.

---

## 2. Supported Discovery Providers

### 2.1 OpenAlex Scholarly Knowledge Graph
- **Role**: Universal academic research paper discovery.
- **Coverage**: Over 250M scientific works across all disciplines.
- **Endpoint**: `https://api.openalex.org/works`
- **Fields Extracted**: Title, Primary Author & Affiliation, Publication Year, Open Access PDF/Landing URL, DOI, Abstract Summary.

### 2.2 arXiv Preprints Repository
- **Role**: Cutting-edge technical papers and preprints for STEM disciplines (Computer Science, Mathematics, Physics, Electrical Engineering).
- **Endpoint**: `http://export.arxiv.org/api/query` (Atom 1.0 XML API)
- **Fields Extracted**: ArXiv ID, Article Title, Primary Authors, Publication Date, PDF Direct Download Link, Abstract Summary.

### 2.3 Project Gutenberg (Gutendex API)
- **Role**: Foundational historical literature, philosophy, and classical textbooks.
- **Coverage**: Over 70,000 public-domain books.
- **Endpoint**: `https://gutendex.com/books/`
- **Fields Extracted**: Book ID, Title, Authors, HTML / EPUB Reader Links, Download Popularity Count.

### 2.4 MathJS Computational Engine
- **Role**: Free symbolic and numerical calculation engine.
- **Endpoint**: `https://api.mathjs.org/v4/`
- **Functionality**: Evaluates mathematical formulas, matrix operations, integrals, and unit conversions directly within the workspace.

---

## 3. Query Strategy & Discipline-Aware Routing

Rather than firing redundant queries to all providers simultaneously, the engine inspects the course domain and routes requests intelligently:

```
                          [ Syllabus Topic Query ]
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
       [ Universal Academic ]                    [ Discipline Classifier ]
                 │                                       │
                 ▼                                       ├─ Computer Science, Math, Physics ──► arXiv Preprints
         OpenAlex Works                                  ├─ Literature, History, Philosophy ──► Project Gutenberg
                 │                                       └─ General STEM Formulations       ──► MathJS Engine
                 │                                                       │
                 └───────────────────────┬───────────────────────────────┘
                                         ▼
                         [ Normalize to `ExternalResource` ]
                                         │
                                         ▼
                         [ Persist in `external_resources` ]
```

---

## 4. Database Schema & Persistence

All discovered resources are saved to the `external_resources` table with foreign key reference to `syllabus_topics`:

```sql
CREATE TABLE external_resources (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  author_or_institution TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('research_paper', 'textbook', 'concept_article', 'symbolic_solver', 'definition', 'code_example')),
  summary TEXT,
  publication_date TEXT,
  doi_or_id TEXT,
  metadata TEXT DEFAULT '{}',
  retrieved_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4.1 Caching & Performance Benefits
- **Zero Redundant Traffic**: If resources already exist in `external_resources` for a given topic ID, they are loaded instantly from SQLite (<2ms) without hitting third-party APIs.
- **Manual Re-discovery**: Students can trigger fresh discovery at any time via `POST /api/resources/topic/:topicId/discover`.

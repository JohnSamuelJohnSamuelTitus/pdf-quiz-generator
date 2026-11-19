# LearnSphere — Public API Ecosystem Audit & Selection Matrix

**Document**: `PUBLIC_API_AUDIT.md`  
**Module**: CSE279 Academic Project  
**Discovery Source**: [Public APIs Repository](https://github.com/public-apis/public-apis)  
**Date**: November 15, 2026  
**Auditor**: Lead Educational Technology & Systems Architect  

---

## 1. Executive Summary

LearnSphere integrates genuine educational public APIs to supplement students' uploaded syllabi and course materials. In accordance with CSE279 project guidelines, every candidate API was audited against:
1. Production availability & uptime.
2. Endpoint verification & response format.
3. Authentication requirements (preferring open access or zero-barrier keys).
4. Rate limits & CORS compatibility.
5. Licensing, attribution & educational relevance.

---

## 2. Comprehensive Candidate API Evaluation Matrix

| Provider | Category | Endpoint Tested | Auth Required | Rate Limits | License / Cost | Educational Relevance | Verdict & Integration Tier |
|---|---|---|---|---|---|---|---|
| **Wikipedia REST API** | Knowledgebase | `https://en.wikipedia.org/api/rest_v1/page/summary/{title}` | None | 200 req/s | CC BY-SA 4.0 (Free) | High: Universal concept summaries and thumbnail figures | **TIER 1 (Core — Preserved)** |
| **Open Library API** | Literature | `https://openlibrary.org/subjects/{subject}.json` | None | Fair use | Open Data / CC0 (Free) | High: Verified textbook bibliographies and editions | **TIER 1 (Core — Preserved)** |
| **Open Trivia DB** | Assessment | `https://opentdb.com/api.php?amount={n}&category={c}` | None | 1 req/5s | Creative Commons (Free) | High: Supplementary general knowledge questions | **TIER 1 (Core — Preserved)** |
| **Free Dictionary API**| Language | `https://api.dictionaryapi.dev/api/v2/entries/en/{term}` | None | Unspecified fair use | Open (Free) | High: Precise academic vocabulary and phonetics | **TIER 1 (Core — Preserved)** |
| **OpenAlex API** | Academic Research | `https://api.openalex.org/works?search={topic}&per_page=5` | None (Mailto optional for polite pool) | 100,000 req/day | CC0 Public Domain (Free) | Very High: Over 250M scholarly works, authors, DOIs | **TIER 1 (Core — Implemented)** |
| **arXiv API** | STEM Preprints | `https://export.arxiv.org/api/query?search_query=all:{query}` | None | 1 req/3s | Open Access (Free) | Very High: Computer science, mathematics, and physics research papers | **TIER 1 (Core — Implemented)** |
| **Gutendex (Project Gutenberg)** | Classical Books | `https://gutendex.com/books/?search={topic}` | None | Generous fair use | Public Domain (Free) | High: Classic foundational literature and historical treatises | **TIER 1 (Core — Implemented)** |
| **MathJS API** | Mathematical Computation | `https://api.mathjs.org/v4/?expr={expression}` | None | Fair use | Apache 2.0 (Free) | High: Numerical, matrix, and symbolic arithmetic validation | **TIER 1 (Core — Implemented)** |
| **Crossref API** | Scholarly Metadata | `https://api.crossref.org/works?query={topic}&rows=5` | None (Polite mailto recommended) | 50 req/s | Open metadata (Free) | High: Verified journal articles and DOI resolution | **TIER 2 (High-Value Optional)** |
| **Europe PMC** | Biomedical Research | `https://www.ebi.ac.uk/europepmc/webservices/rest/search` | None | Fair use | Open Access | High: Dedicated to biology, medicine, and biochemistry | **TIER 2 (Subject-Specific: Life Sciences)** |
| **Semantic Scholar** | AI Research | `https://api.semanticscholar.org/graph/v1/paper/search` | API Key recommended (Rate-limited without) | Strict IP throttling | Proprietary Free Tier | Medium: High quality but strict IP rate limits without key | **TIER 3 (Optional / Fallback)** |
| **Judge0 CE** | Remote Code Execution | `https://judge0-ce.p.rapidapi.com` | RapidAPI Key required | Paid above tiny quota | Commercial with free tier | High for CS, but requires API key and external tunnel | **TIER 3 (Simulated / Guarded)** |
| **NASA Open API** | Planetary Science | `https://api.nasa.gov/planetary/apod` | API Key (`DEMO_KEY` has 30 req/hr) | Strict without key | Public domain | Medium: Niche to astronomy and Earth science | **TIER 3 (Subject-Specific: Physics)** |
| **LibreTranslate** | Machine Translation | `https://libretranslate.com/translate` | API Key now required on public instances | Strict paywall on public hub | AGPLv3 (Self-hostable) | Low: Public instance is no longer free without subscription | **REJECTED (Public instance paywalled)** |
| **Newton API** | Symbolic Math | `https://newton.now.sh/api/v2/{operation}/{expression}` | None | Unstable / Frequent 504 Gateway Timeouts | MIT | High relevance, but service endpoint is frequently unreachable | **REJECTED (High service downtime; replaced by MathJS)** |

---

## 3. Selected Integration Architecture

LearnSphere establishes a **Unified Resource Discovery Engine** (`ResourceDiscoveryService`) that dispatches queries based on the student's syllabus subject:

```
                                  Unified Resource Discovery Engine
                                  (`ResourceDiscoveryService`)
                                                │
         ┌──────────────────────────────┬───────┴──────────────────────┬──────────────────────────────┐
         ▼                              ▼                              ▼                              ▼
  Computer Science & Math           Life Sciences                Humanities & Social Sci        General Reference
  ├── OpenAlex (Papers & DOIs)      ├── OpenAlex (Genomics)       ├── Gutendex (Classic Texts)   ├── Wikipedia REST (Summaries)
  ├── arXiv (CS/AI preprints)       ├── Europe PMC (Biomedical)   ├── Open Library (Catalogs)    ├── Free Dictionary (Terms)
  └── MathJS (Symbolic Engine)      └── Open Library (Biology)    └── OpenAlex (Sociology)       └── Open Trivia DB (Quizzes)
```

### Key Architectural Safeguards:
1. **Source Provenance Guarantee**: Every retrieved external resource records `provider`, `title`, `url`, `author_or_institution`, `doi_or_id`, and `retrieved_at`.
2. **Subject-Aware Routing**: Computer Science queries never hit Europe PMC; Biology queries never query MathJS.
3. **Resilient Circuit Breakers & Fallbacks**: Requests enforce a 4000ms timeout. If an external API is down or throttled, the workspace falls back gracefully to in-memory academic records without crashing.
4. **Zero-Leak Credential Isolation**: Administrative integration keys are stored strictly in the database/environment variables and never transmitted to client bundles.

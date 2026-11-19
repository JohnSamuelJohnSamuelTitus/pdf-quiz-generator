-- LearnSphere Database Schema (PostgreSQL / SQLite Compatible)
-- CSE279 Academic Project

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'educator', 'admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Student Preferences Table
CREATE TABLE IF NOT EXISTS student_preferences (
  user_id TEXT PRIMARY KEY,
  interests TEXT NOT NULL DEFAULT '[]', -- JSON string array
  primary_subjects TEXT NOT NULL DEFAULT '[]', -- JSON string array of subject slugs/ids
  skill_level TEXT NOT NULL DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  learning_objectives TEXT NOT NULL DEFAULT '[]', -- JSON string array
  preferred_difficulty TEXT NOT NULL DEFAULT 'foundational' CHECK (preferred_difficulty IN ('foundational', 'moderate', 'rigorous')),
  daily_goal_minutes INTEGER NOT NULL DEFAULT 30 CHECK (daily_goal_minutes > 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
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

CREATE INDEX IF NOT EXISTS idx_subjects_slug ON subjects(slug);

-- 4. Topics Table
CREATE TABLE IF NOT EXISTS topics (
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

CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_slug ON topics(slug);

-- 5. Learning Resources Table
CREATE TABLE IF NOT EXISTS learning_resources (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  title TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('textbook', 'wikipedia_overview', 'article', 'paper', 'definition')),
  provider TEXT NOT NULL, -- 'Wikipedia', 'Open Library', 'Free Dictionary', etc.
  url TEXT NOT NULL,
  author TEXT,
  description TEXT NOT NULL,
  metadata TEXT DEFAULT '{}', -- JSON object for extra details
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_resources_topic_id ON learning_resources(topic_id);

-- 6. Learning Sessions Table
CREATE TABLE IF NOT EXISTS learning_sessions (
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

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_topic_id ON learning_sessions(topic_id);

-- 7. Quiz Attempts Table
CREATE TABLE IF NOT EXISTS quiz_attempts (
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

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_topic_id ON quiz_attempts(topic_id);

-- 8. Quiz Answers Table
CREATE TABLE IF NOT EXISTS quiz_answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  selected_option TEXT NOT NULL,
  correct_option TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  explanation TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt_id ON quiz_answers(attempt_id);

-- 9. Student Progress Table
CREATE TABLE IF NOT EXISTS student_progress (
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

CREATE INDEX IF NOT EXISTS idx_student_progress_user_id ON student_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_topic_id ON student_progress(topic_id);

-- 10. API Multi-Tier Cache Table
CREATE TABLE IF NOT EXISTS api_cache (
  cache_key TEXT PRIMARY KEY,
  service_name TEXT NOT NULL,
  response_data TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 200,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_cache_service ON api_cache(service_name);

-- =========================================================================
-- PHASE 2 TABLES: LEARNING INTELLIGENCE & ADAPTIVE SYSTEMS
-- =========================================================================

-- 11. Question Bank Table (Original Generation Engine + Curated Academic Repositories)
CREATE TABLE IF NOT EXISTS question_bank (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  question_text TEXT NOT NULL,
  options TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('foundational', 'moderate', 'rigorous')),
  source TEXT NOT NULL DEFAULT 'original_engine' CHECK (source IN ('original_engine', 'open_trivia_db', 'academic_repository', 'curated_ai')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qb_topic_diff ON question_bank(topic_id, difficulty);
CREATE INDEX IF NOT EXISTS idx_qb_subject ON question_bank(subject_id);

-- 12. Structured Study Materials Table
CREATE TABLE IF NOT EXISTS study_materials (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  section_title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('explanation', 'key_concept', 'practical_example', 'practice_exercise', 'takeaway')),
  content_body TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source_citation TEXT,
  source_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_materials_topic ON study_materials(topic_id, sort_order);

-- 13. Topic Mastery History Table (for adaptive difficulty & trend tracking)
CREATE TABLE IF NOT EXISTS topic_mastery_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  mastery_score REAL NOT NULL,
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('foundational', 'moderate', 'rigorous')),
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mastery_hist_user ON topic_mastery_history(user_id, topic_id);

-- 14. Student Weaknesses Table (identifies repeated mistakes & fragile concepts)
CREATE TABLE IF NOT EXISTS student_weaknesses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  concept_name TEXT NOT NULL,
  mistake_count INTEGER NOT NULL DEFAULT 1,
  last_missed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_resolved BOOLEAN NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  UNIQUE(user_id, topic_id, concept_name)
);

CREATE INDEX IF NOT EXISTS idx_weaknesses_user ON student_weaknesses(user_id, is_resolved);

-- 15. Revision Schedules Table (spaced-repetition scheduler)
CREATE TABLE IF NOT EXISTS revision_schedules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  scheduled_for DATE NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  reason TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_revision_user ON revision_schedules(user_id, is_completed);

-- =========================================================================
-- DOCUMENT-FIRST ARCHITECTURE & ECOSYSTEM EXPANSION (STAGE B, D, G, K)
-- =========================================================================

-- 16. Guest Sessions Table (Login-Free Immediate Access)
CREATE TABLE IF NOT EXISTS guest_sessions (
  id TEXT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_active ON guest_sessions(last_active_at);

-- 17. Learning Projects Table (User-Uploaded or Pasted Syllabi)
CREATE TABLE IF NOT EXISTS learning_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL, -- registered user ID or guest_session_id
  title TEXT NOT NULL,
  subject_code TEXT,
  target_exam_date TEXT,
  raw_syllabus_text TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'processing')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON learning_projects(user_id, status);

-- 18. Dynamic Syllabus Units Table
CREATE TABLE IF NOT EXISTS syllabus_units (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  unit_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES learning_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_units_project ON syllabus_units(project_id, sort_order);

-- 19. Dynamic Syllabus Topics Table
CREATE TABLE IF NOT EXISTS syllabus_topics (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT,
  estimated_minutes INTEGER DEFAULT 25,
  difficulty_level TEXT DEFAULT 'moderate' CHECK (difficulty_level IN ('foundational', 'moderate', 'rigorous')),
  mastery_score REAL DEFAULT 0,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'mastered')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  subtopics TEXT DEFAULT '[]', -- JSON string array of subtopics
  FOREIGN KEY (unit_id) REFERENCES syllabus_units(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES learning_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_syllabus_topics_unit ON syllabus_topics(unit_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_syllabus_topics_project ON syllabus_topics(project_id);

-- 20. Uploaded Documents Table (PDF, DOCX, TXT)
CREATE TABLE IF NOT EXISTS uploaded_documents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'syllabus' CHECK (document_type IN ('syllabus', 'textbook', 'lecture_notes', 'question_paper', 'answer_key', 'reference', 'other')),
  page_count INTEGER DEFAULT 0,
  raw_text TEXT,
  extracted_metadata TEXT DEFAULT '{}', -- JSON object with headings, TOC, word count
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('uploaded', 'processing', 'processed', 'error')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES learning_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_documents_project ON uploaded_documents(project_id, document_type);
CREATE INDEX IF NOT EXISTS idx_documents_user ON uploaded_documents(user_id);

-- 21. Document Sections Table (Chunks with source provenance & page mapping)
CREATE TABLE IF NOT EXISTS document_sections (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  page_number INTEGER DEFAULT 1,
  section_heading TEXT,
  content_text TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'heading', 'exercise', 'definition', 'formula', 'table')),
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (document_id) REFERENCES uploaded_documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_doc_sections_doc ON document_sections(document_id, page_number);

-- 22. Topic to Document Mappings Table
CREATE TABLE IF NOT EXISTS topic_document_mappings (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  section_id TEXT,
  relevance_score REAL DEFAULT 1.0,
  mapping_type TEXT DEFAULT 'automatic' CHECK (mapping_type IN ('automatic', 'manual')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES syllabus_topics(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES uploaded_documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mappings_topic ON topic_document_mappings(topic_id);

-- 23. Extracted Questions Table (Questions discovered directly from student documents)
CREATE TABLE IF NOT EXISTS extracted_questions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  topic_id TEXT,
  page_number INTEGER,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options TEXT DEFAULT '[]', -- JSON array of strings
  answer_text TEXT,
  is_verified_answer BOOLEAN DEFAULT 0,
  source_reference TEXT,
  difficulty TEXT DEFAULT 'moderate' CHECK (difficulty IN ('foundational', 'moderate', 'rigorous')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES uploaded_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES learning_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_extracted_q_doc ON extracted_questions(document_id);
CREATE INDEX IF NOT EXISTS idx_extracted_q_topic ON extracted_questions(topic_id);

-- 24. External Educational Resources Table (OpenAlex, arXiv, Gutendex, MathJS, Wikipedia, etc.)
CREATE TABLE IF NOT EXISTS external_resources (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'OpenAlex', 'arXiv', 'Crossref', 'Wikipedia', 'Open Library', 'Gutendex', 'MathJS', etc.
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

CREATE INDEX IF NOT EXISTS idx_ext_res_topic ON external_resources(topic_id, provider);

-- 25. Integration Settings & Health Table (API & Integrations Centre)
CREATE TABLE IF NOT EXISTS integration_settings (
  id TEXT PRIMARY KEY,
  provider_id TEXT UNIQUE NOT NULL,
  provider_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'academic',
  is_enabled BOOLEAN NOT NULL DEFAULT 1,
  api_key_masked TEXT,
  api_key_encrypted TEXT,
  base_url TEXT NOT NULL,
  documentation_url TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'none' CHECK (auth_type IN ('none', 'api_key', 'oauth', 'bearer')),
  last_health_check DATETIME,
  health_status TEXT NOT NULL DEFAULT 'not_tested' CHECK (health_status IN ('connected', 'degraded', 'unavailable', 'not_configured', 'not_tested')),
  latency_ms INTEGER DEFAULT 0,
  details TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_integration_provider ON integration_settings(provider_id);

-- 26. Student Topic Notes & Bookmarks Table
CREATE TABLE IF NOT EXISTS topic_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  note_content TEXT NOT NULL,
  is_bookmarked BOOLEAN DEFAULT 0,
  highlight_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_topic_notes_user ON topic_notes(user_id, topic_id);

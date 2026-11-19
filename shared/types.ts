// LearnSphere — Shared Types (CSE279 Phase 1 + Phase 2)

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type DifficultyLevel = 'foundational' | 'moderate' | 'rigorous';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'mastered';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: 'student' | 'educator' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface StudentPreferences {
  userId: string;
  interests: string[];
  primarySubjects: string[];
  skillLevel: SkillLevel;
  learningObjectives: string[];
  preferredDifficulty: DifficultyLevel;
  dailyGoalMinutes: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subject {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  isFeatured: boolean;
  topicCount?: number;
}

export interface Topic {
  id: string;
  subjectId: string;
  slug: string;
  title: string;
  summary: string;
  difficultyLevel: DifficultyLevel;
  estimatedMinutes: number;
  sortOrder: number;
  subjectTitle?: string;
  subjectSlug?: string;
  masteryScore?: number;
  status?: ProgressStatus;
}

export type ResourceType = 'textbook' | 'wikipedia_overview' | 'article' | 'paper' | 'definition';

export interface LearningResource {
  id: string;
  topicId: string;
  title: string;
  resourceType: ResourceType;
  provider: string; // 'Wikipedia', 'Open Library', 'Free Dictionary', 'ArXiv'
  url: string;
  author?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export interface LearningSession {
  id: string;
  userId: string;
  topicId: string;
  topicTitle?: string;
  subjectTitle?: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  notes?: string;
  status: 'active' | 'completed';
}

export interface StudentProgress {
  id: string;
  userId: string;
  topicId: string;
  topicTitle?: string;
  subjectTitle?: string;
  subjectSlug?: string;
  status: ProgressStatus;
  masteryScore: number; // 0 - 100
  lastStudiedAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  topicId: string;
  topicTitle?: string;
  subjectTitle?: string;
  difficulty: DifficultyLevel;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  timeTakenSeconds: number;
  completedAt: string;
  answers?: QuizAnswer[];
}

export interface QuizAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  questionText: string;
  selectedOption: string;
  correctOption: string;
  isCorrect: boolean;
  explanation: string;
  questionType?: QuestionType;
}

export interface QuizQuestion {
  id: string;
  topicId: string;
  subjectId?: string;
  questionType: QuestionType;
  questionText: string;
  options: string[]; // Options for MCQ or ['True', 'False'] for TF, empty for SA
  correctAnswer: string;
  explanation: string;
  difficulty: DifficultyLevel;
  category: string;
  source: 'original_engine' | 'open_trivia_db' | 'academic_repository' | 'curated_ai';
}

export interface QuizGenerationConfig {
  subjectSlug?: string;
  topicSlug?: string;
  difficulty?: DifficultyLevel;
  amount?: number;
  questionTypes?: QuestionType[];
  mode?: 'mixed' | 'external_api' | 'original_engine';
  durationMinutes?: number;
}

// Phase 2: Study Materials
export type MaterialContentType =
  | 'explanation'
  | 'key_concept'
  | 'practical_example'
  | 'practice_exercise'
  | 'takeaway';

export interface StudyMaterial {
  id: string;
  topicId: string;
  sectionTitle: string;
  contentType: MaterialContentType;
  contentBody: string;
  sortOrder: number;
  sourceCitation?: string;
  sourceUrl?: string;
}

// Phase 2: Weakness Detection
export interface WeaknessReport {
  id: string;
  topicId: string;
  topicSlug: string;
  topicTitle: string;
  subjectTitle: string;
  conceptName: string;
  mistakeCount: number;
  lastMissedAt: string;
  isResolved: boolean;
  recommendedAction: string;
}

// Phase 2: Adaptive Difficulty Status
export interface AdaptiveDifficultyStatus {
  topicId: string;
  topicTitle: string;
  currentDifficulty: DifficultyLevel;
  recommendedDifficulty: DifficultyLevel;
  recentAccuracy: number;
  attemptsCount: number;
  reason: string;
}

// Phase 2: Revision Recommendation
export interface RevisionRecommendation {
  id: string;
  topicId: string;
  topicSlug: string;
  topicTitle: string;
  subjectSlug: string;
  subjectTitle: string;
  scheduledFor: string;
  urgency: 'low' | 'medium' | 'high';
  reason: string;
  lastStudiedDaysAgo: number;
  currentMastery: number;
}

// Phase 2: Performance Analytics
export interface AnalyticsData {
  overallAccuracy: number;
  totalQuizzesTaken: number;
  totalQuestionsAnswered: number;
  totalStudyHours: number;
  topicsMasteredCount: number;
  subjectPerformance: Array<{
    subjectTitle: string;
    subjectSlug: string;
    avgScore: number;
    quizzesTaken: number;
    masteryScore: number;
  }>;
  topicAccuracyBreakdown: Array<{
    topicTitle: string;
    topicSlug: string;
    subjectTitle: string;
    accuracy: number;
    masteryScore: number;
    status: ProgressStatus;
    attemptsCount: number;
  }>;
  scoreTrends: Array<{
    attemptId: string;
    topicTitle: string;
    score: number;
    date: string;
  }>;
  weaknesses: WeaknessReport[];
  strengths: Array<{
    topicTitle: string;
    masteryScore: number;
    status: ProgressStatus;
    quizzesCompleted: number;
  }>;
  learningDistribution: Array<{
    day: string;
    minutes: number;
  }>;
}

// Public API Responses
export interface WikipediaSummary {
  title: string;
  displayTitle: string;
  extract: string;
  description?: string;
  thumbnailUrl?: string;
  pageUrl: string;
}

export interface OpenLibraryBook {
  key: string;
  title: string;
  authorNames: string[];
  firstPublishYear?: number;
  coverUrl?: string;
  subject?: string[];
  editionCount?: number;
}

export interface DictionaryDefinition {
  word: string;
  phonetic?: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
  synonyms: string[];
}

export interface ApiHealthStatus {
  service: string;
  status: 'operational' | 'degraded' | 'cached_fallback';
  latencyMs: number;
  lastChecked: string;
  details?: string;
}

export interface DashboardData {
  student: User;
  preferences: StudentPreferences | null;
  enrolledSubjects: Subject[];
  recentActivity: Array<{
    id: string;
    type: 'study' | 'quiz' | 'preference_update';
    title: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
  progressSummary: {
    topicsInProgress: number;
    topicsMastered: number;
    totalStudyMinutes: number;
    averageQuizScore: number;
    totalQuizAttempts: number;
  };
  continueLearning: Array<{
    topicId: string;
    topicSlug: string;
    topicTitle: string;
    subjectSlug: string;
    subjectTitle: string;
    masteryScore: number;
    lastStudiedAt: string;
    estimatedMinutes: number;
  }>;
  recommendedActions: Array<{
    id: string;
    title: string;
    reason: string;
    actionType: 'start_topic' | 'review_quiz' | 'complete_session' | 'revision';
    targetUrl: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  quizHistory: QuizAttempt[];
  adaptiveStatus?: AdaptiveDifficultyStatus[];
  revisionAlerts?: RevisionRecommendation[];
}

// =========================================================================
// DOCUMENT-FIRST PERSONALIZED LEARNING TYPES (STAGES B, C, D, E, F, G, H, K)
// =========================================================================

export type DocumentType =
  | 'syllabus'
  | 'textbook'
  | 'lecture_notes'
  | 'question_paper'
  | 'answer_key'
  | 'reference'
  | 'other';

export interface LearningProject {
  id: string;
  userId: string;
  title: string;
  subjectCode?: string;
  targetExamDate?: string;
  rawSyllabusText?: string;
  status: 'active' | 'archived' | 'processing';
  documentCount?: number;
  topicCount?: number;
  overallMastery?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SyllabusTopic {
  id: string;
  unitId: string;
  projectId: string;
  title: string;
  slug: string;
  summary?: string;
  estimatedMinutes: number;
  difficultyLevel: DifficultyLevel;
  masteryScore: number;
  status: ProgressStatus;
  sortOrder: number;
  subtopics?: string[];
  documentCount?: number;
  questionCount?: number;
  externalResourceCount?: number;
}

export interface ParsedSyllabusTopic {
  title: string;
  slug?: string;
  summary?: string;
  estimatedMinutes?: number;
  difficultyLevel?: DifficultyLevel;
  subtopics: string[];
}

export interface ParsedSyllabusUnit {
  unitNumber: number;
  title: string;
  description?: string;
  topics: ParsedSyllabusTopic[];
}

export interface ParsedSyllabusResult {
  courseTitle: string;
  courseCode?: string;
  units: ParsedSyllabusUnit[];
  totalUnits?: number;
  totalTopics?: number;
  totalSubtopics?: number;
  detectedType?: DocumentType;
  ocrRequired?: boolean;
  ocrMessage?: string;
}

export interface SyllabusUnit {
  id: string;
  projectId: string;
  unitNumber: number;
  title: string;
  description?: string;
  sortOrder: number;
  topics: SyllabusTopic[];
}

export interface UploadedDocument {
  id: string;
  projectId: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  documentType: DocumentType;
  pageCount: number;
  rawText?: string;
  extractedMetadata?: {
    headings?: string[];
    wordCount?: number;
    hasQuestions?: boolean;
    detectedType?: string;
    ocrUsed?: boolean;
  };
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  createdAt: string;
}

export interface DocumentSection {
  id: string;
  documentId: string;
  pageNumber: number;
  sectionHeading?: string;
  contentText: string;
  contentType: 'text' | 'heading' | 'exercise' | 'definition' | 'formula' | 'table';
  sortOrder: number;
}

export interface TopicDocumentMapping {
  id: string;
  topicId: string;
  documentId: string;
  sectionId?: string;
  relevanceScore: number;
  mappingType: 'automatic' | 'manual';
}

export interface ExtractedQuestion {
  id: string;
  documentId: string;
  projectId: string;
  topicId?: string;
  pageNumber?: number;
  questionText: string;
  questionType: QuestionType;
  options: string[];
  answerText?: string;
  isVerifiedAnswer: boolean;
  sourceReference?: string;
  difficulty: DifficultyLevel;
  documentName?: string;
}

export interface ExternalResource {
  id: string;
  topicId: string;
  provider: string; // 'OpenAlex' | 'arXiv' | 'Crossref' | 'Wikipedia' | 'Open Library' | 'Gutendex' | 'MathJS' | 'Europe PMC' | 'Semantic Scholar'
  title: string;
  url: string;
  authorOrInstitution?: string;
  resourceType: 'research_paper' | 'textbook' | 'concept_article' | 'symbolic_solver' | 'definition' | 'code_example';
  summary?: string;
  publicationDate?: string;
  doiOrId?: string;
  metadata?: Record<string, any>;
  retrievedAt?: string;
}

export interface IntegrationSetting {
  id: string;
  providerId: string;
  providerName: string;
  category: 'academic' | 'literature' | 'computation' | 'assessment';
  isEnabled: boolean;
  apiKeyMasked?: string;
  baseUrl: string;
  documentationUrl: string;
  authType: 'none' | 'api_key' | 'oauth' | 'bearer';
  lastHealthCheck?: string;
  healthStatus: 'connected' | 'degraded' | 'unavailable' | 'not_configured' | 'not_tested';
  latencyMs: number;
  details?: string;
}

export interface TopicNote {
  id: string;
  userId: string;
  topicId: string;
  projectId?: string;
  noteContent: string;
  isBookmarked: boolean;
  highlightText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceGroundedLesson {
  topic: SyllabusTopic;
  unitTitle: string;
  projectTitle: string;
  // Student-first pedagogical breakdown (The 7 Tutorial Elements):
  introduction: string; // 1. Simple introduction & context
  explanation: string; // 2. Clear explanation in plain language
  stepByStep: string[]; // 3. Step-by-step breakdown of how it works
  practicalExample: string; // 4. Practical real-world example
  definitions: Array<{ term: string; definition: string; source: string }>; // 5. Important definitions & concepts
  keyPoints: string[]; // 6. Key points to remember for exams
  recap: string; // 7. Short recap summary
  // Source provenance:
  sourceType?: 'uploaded_document' | 'supplementary_verified' | 'curriculum_tutor';
  sourceLabel?: string;
  sections: Array<{
    heading: string;
    content: string;
    sourceType: 'uploaded_document' | 'external_supplementary';
    sourceDocumentName?: string;
    sourcePageNumber?: number;
    externalSourceUrl?: string;
    externalProvider?: string;
  }>;
  keyTakeaways: string[];
  practiceExercises: string[];
  mappedDocuments: Array<{
    documentId: string;
    documentName: string;
    documentType: DocumentType;
    pageRange?: string;
  }>;
}

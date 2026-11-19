import {
  User,
  StudentPreferences,
  Subject,
  Topic,
  LearningSession,
  QuizAttempt,
  QuizQuestion,
  WikipediaSummary,
  OpenLibraryBook,
  DictionaryDefinition,
  ApiHealthStatus,
  DashboardData,
  StudyMaterial,
  WeaknessReport,
  AdaptiveDifficultyStatus,
  RevisionRecommendation,
  AnalyticsData,
  QuestionType,
  DifficultyLevel,
  LearningProject,
  SyllabusUnit,
  SyllabusTopic,
  UploadedDocument,
  DocumentSection,
  ExtractedQuestion,
  ExternalResource,
  IntegrationSetting,
  TopicNote,
  SourceGroundedLesson,
  DocumentType,
  ParsedSyllabusUnit,
  ParsedSyllabusResult,
  ParsedSyllabusTopic
} from '../../../shared/types';

const API_BASE = '/api';

export class ApiError extends Error {
  constructor(public message: string, public status: number, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('learnsphere_token');
  const guestSession = localStorage.getItem('learnsphere_guest_session');

  const headers: Record<string, string> = {
    ...(!options.body || !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (guestSession) {
    headers['X-Guest-Session'] = guestSession;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const returnedGuest = response.headers.get('X-Guest-Session');
  if (returnedGuest && !guestSession) {
    localStorage.setItem('learnsphere_guest_session', returnedGuest);
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      json.error || `Request failed with status ${response.status}`,
      response.status,
      json
    );
  }

  return json;
}

// 1. Auth API
export const authApi = {
  register: (payload: { email: string; password: string; fullName: string }) =>
    request<{ success: boolean; token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ success: boolean; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getMe: () =>
    request<{ success: boolean; user: User; preferences: StudentPreferences | null }>('/auth/me'),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  getGuestSession: () =>
    request<{ success: boolean; guestId: string }>('/auth/guest-session'),

  migrateGuest: (guestSessionId: string) =>
    request<{ success: boolean; message: string; migratedRecords: number }>('/auth/migrate-guest', {
      method: 'POST',
      body: JSON.stringify({ guestSessionId })
    })
};

// 2. Preferences API
export const preferencesApi = {
  get: () =>
    request<{ success: boolean; preferences: StudentPreferences }>('/preferences'),

  update: (payload: Partial<StudentPreferences>) =>
    request<{ success: boolean; preferences: StudentPreferences }>('/preferences', {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
};

// 3. Subjects API
export const subjectsApi = {
  getAll: () =>
    request<{ success: boolean; subjects: Subject[] }>('/subjects'),

  getBySlug: (slug: string) =>
    request<{ success: boolean; subject: Subject; topics: Topic[] }>(`/subjects/${slug}`)
};

// 4. Topics API
export const topicsApi = {
  getBySlug: (subjectSlug: string, topicSlug: string) =>
    request<{
      success: boolean;
      topic: Topic;
      subject: Subject;
      resources: any[];
      adjacentTopics: any[];
    }>(`/topics/${subjectSlug}/${topicSlug}`)
};

// 5. Sessions API
export const sessionsApi = {
  getAll: () =>
    request<{ success: boolean; sessions: LearningSession[] }>('/sessions'),

  start: (topicId: string) =>
    request<{ success: boolean; sessionId: string }>('/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ topicId })
    }),

  complete: (sessionId: string, durationSeconds: number, notes?: string) =>
    request<{ success: boolean }>((`/sessions/${sessionId}/complete`), {
      method: 'POST',
      body: JSON.stringify({ durationSeconds, notes })
    })
};

// 6. Advanced Quizzes API (Phase 1 + Phase 2)
export const quizzesApi = {
  generate: (params: {
    subject: string;
    topic: string;
    difficulty?: DifficultyLevel;
    amount?: number;
    mode?: 'mixed' | 'external_api' | 'original_engine';
    questionTypes?: QuestionType[];
  }) => {
    const qs = new URLSearchParams({
      subject: params.subject,
      topic: params.topic,
      difficulty: params.difficulty || 'moderate',
      amount: String(params.amount || 5),
      mode: params.mode || 'mixed',
      questionTypes: params.questionTypes ? params.questionTypes.join(',') : 'multiple_choice,true_false,short_answer'
    }).toString();
    return request<{ success: boolean; questions: QuizQuestion[]; mode: string }>(`/quizzes/generate?${qs}`);
  },

  submit: (payload: {
    topicId: string;
    difficulty: string;
    answers: Array<{
      questionId: string;
      questionText: string;
      selectedOption: string;
      correctOption: string;
      explanation: string;
      questionType?: QuestionType;
    }>;
    timeTakenSeconds: number;
  }) =>
    request<{
      success: boolean;
      result: {
        attemptId: string;
        scorePercentage: number;
        correctAnswers: number;
        totalQuestions: number;
        timeTakenSeconds: number;
        masteryScore: number;
        status: string;
        answers: any[];
      };
    }>('/quizzes/submit', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getHistory: () =>
    request<{ success: boolean; history: QuizAttempt[] }>('/quizzes/history')
};

// 7. Phase 2: Study Materials API
export const materialsApi = {
  getByTopic: (topicSlug: string) =>
    request<{ success: boolean; materials: StudyMaterial[] }>(`/materials/topic/${topicSlug}`)
};

// 8. Phase 2: Adaptive Difficulty API
export const adaptiveApi = {
  evaluate: (topicSlug: string) =>
    request<{ success: boolean; status: AdaptiveDifficultyStatus }>(`/adaptive/evaluate/${topicSlug}`),

  getProfiles: () =>
    request<{ success: boolean; profiles: AdaptiveDifficultyStatus[] }>('/adaptive/profiles')
};

// 9. Phase 2: Weakness Detector API
export const weaknessesApi = {
  getAll: () =>
    request<{ success: boolean; weaknesses: WeaknessReport[]; strengths: any[] }>('/weaknesses')
};

// 10. Phase 2: Revision Scheduler API
export const revisionApi = {
  getAll: () =>
    request<{ success: boolean; revisions: RevisionRecommendation[] }>('/revision'),

  markDone: (topicId: string) =>
    request<{ success: boolean; message: string }>(`/revision/${topicId}/mark-done`, {
      method: 'POST'
    })
};

// 11. Phase 2: Performance Analytics API
export const analyticsApi = {
  get: () =>
    request<{ success: boolean; analytics: AnalyticsData }>('/analytics')
};

// 12. External Public APIs (Live verified endpoints)
export const externalApi = {
  getWikipediaSummary: (topic: string) =>
    request<{ success: boolean; data: WikipediaSummary }>(`/external/wikipedia/${encodeURIComponent(topic)}`),

  getBooks: (subject: string, limit: number = 8) =>
    request<{ success: boolean; data: OpenLibraryBook[] }>(`/external/books/${encodeURIComponent(subject)}?limit=${limit}`),

  getDefinition: (term: string) =>
    request<{ success: boolean; data: DictionaryDefinition[] }>(`/external/dictionary/${encodeURIComponent(term)}`),

  getHealth: () =>
    request<{ success: boolean; timestamp: string; services: ApiHealthStatus[] }>('/external/health')
};

// 13. Dashboard API
export const dashboardApi = {
  get: () =>
    request<{ success: boolean; dashboard: DashboardData }>('/dashboard')
};

// 14. Document-First: Learning Projects API (Syllabus management)
export const projectsApi = {
  create: (payload: {
    title: string;
    subjectCode?: string;
    targetExamDate?: string;
    rawSyllabusText?: string;
    reviewedUnits?: ParsedSyllabusUnit[];
  }) =>
    request<{ success: boolean; project: LearningProject }>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getAll: () =>
    request<{ success: boolean; projects: LearningProject[] }>('/projects'),

  getById: (id: string) =>
    request<{ success: boolean; project: LearningProject; units: SyllabusUnit[]; documents: UploadedDocument[] }>(`/projects/${id}`),

  update: (id: string, payload: Partial<LearningProject>) =>
    request<{ success: boolean; project: LearningProject }>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/projects/${id}`, {
      method: 'DELETE'
    })
};

// 15. Document-First: Documents Upload & Management API
export const documentsApi = {
  upload: (projectId: string, file: File, documentType: DocumentType = 'syllabus') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    return request<{ success: boolean; document: UploadedDocument; message: string }>(`/projects/${projectId}/documents`, {
      method: 'POST',
      body: formData
    });
  },

  getByProject: (projectId: string) =>
    request<{ success: boolean; documents: UploadedDocument[] }>(`/projects/${projectId}/documents`),

  getSections: (documentId: string) =>
    request<{ success: boolean; document: UploadedDocument; sections: DocumentSection[] }>(`/documents/${documentId}/sections`),

  delete: (documentId: string) =>
    request<{ success: boolean; message: string }>(`/documents/${documentId}`, {
      method: 'DELETE'
    })
};

// 16. Document-First: Syllabus Parser & Mapping API
export const syllabusApi = {
  preview: (payload: { rawText?: string; fallbackTitle?: string; file?: File }) => {
    if (payload.file) {
      const formData = new FormData();
      formData.append('file', payload.file);
      if (payload.fallbackTitle) formData.append('fallbackTitle', payload.fallbackTitle);
      return request<ParsedSyllabusResult & { success: boolean; error?: string }>('/syllabus/preview', {
        method: 'POST',
        body: formData
      });
    } else {
      return request<ParsedSyllabusResult & { success: boolean; error?: string }>('/syllabus/preview', {
        method: 'POST',
        body: JSON.stringify({ rawText: payload.rawText, fallbackTitle: payload.fallbackTitle })
      });
    }
  },

  parse: (projectId: string, rawText?: string) =>
    request<{ success: boolean; units: SyllabusUnit[]; topicCount: number; message: string }>(`/projects/${projectId}/syllabus/parse`, {
      method: 'POST',
      body: JSON.stringify({ rawText })
    }),

  getTree: (projectId: string) =>
    request<{ success: boolean; project: LearningProject; units: SyllabusUnit[] }>(`/projects/${projectId}/syllabus/tree`),

  addUnit: (projectId: string, payload: { title: string; unitNumber?: number; description?: string }) =>
    request<{ success: boolean; unit: any }>(`/projects/${projectId}/syllabus/units`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateUnit: (unitId: string, payload: { title?: string; description?: string }) =>
    request<{ success: boolean; unit: any }>(`/syllabus/units/${unitId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  deleteUnit: (unitId: string) =>
    request<{ success: boolean; message: string }>(`/syllabus/units/${unitId}`, {
      method: 'DELETE'
    }),

  addTopic: (projectId: string, payload: {
    unitId: string;
    title: string;
    summary?: string;
    estimatedMinutes?: number;
    difficultyLevel?: DifficultyLevel;
    subtopics?: string[];
  }) =>
    request<{ success: boolean; topic: SyllabusTopic }>(`/projects/${projectId}/syllabus/topics`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  deleteTopic: (topicId: string) =>
    request<{ success: boolean; message: string }>(`/syllabus/topics/${topicId}`, {
      method: 'DELETE'
    }),

  updateTopic: (topicId: string, updates: Partial<SyllabusTopic>) =>
    request<{ success: boolean; topic: SyllabusTopic }>(`/syllabus/topics/${topicId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),

  mapDocuments: (projectId: string) =>
    request<{ success: boolean; mappingsCount: number; message: string }>(`/projects/${projectId}/syllabus/map-documents`, {
      method: 'POST'
    })
};

// 17. Document-First: Source-Grounded Lessons & Notes API
export const lessonsApi = {
  getGroundedLesson: (topicId: string) =>
    request<{ success: boolean; lesson: SourceGroundedLesson }>(`/lessons/topic/${topicId}`),

  saveNote: (topicId: string, payload: { noteContent: string; isBookmarked?: boolean; highlightText?: string }) =>
    request<{ success: boolean; note: TopicNote }>(`/lessons/topic/${topicId}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getNotes: (topicId: string) =>
    request<{ success: boolean; notes: TopicNote[] }>(`/lessons/topic/${topicId}/notes`)
};

// 18. Document-First: Extracted & Grounded Questions API
export const questionsApi = {
  getExtracted: (projectId: string, topicId?: string) => {
    const url = topicId
      ? `/projects/${projectId}/questions/extracted?topicId=${topicId}`
      : `/projects/${projectId}/questions/extracted`;
    return request<{ success: boolean; questions: ExtractedQuestion[] }>(url);
  },

  generateGrounded: (topicId: string, options?: { amount?: number; difficulty?: DifficultyLevel }) =>
    request<{ success: boolean; questions: QuizQuestion[] }>(`/lessons/topic/${topicId}/generate-questions`, {
      method: 'POST',
      body: JSON.stringify(options || {})
    })
};

// 19. Public API Ecosystem: Resource Discovery API
export const resourcesApi = {
  getForTopic: (topicId: string) =>
    request<{ success: boolean; resources: ExternalResource[] }>(`/resources/topic/${topicId}`),

  discover: (topicId: string, subjectCategory?: string) =>
    request<{ success: boolean; resources: ExternalResource[]; providersUsed: string[] }>(`/resources/topic/${topicId}/discover`, {
      method: 'POST',
      body: JSON.stringify({ subjectCategory })
    }),

  evaluateMathExpression: (expression: string) =>
    request<{ success: boolean; result: string; latencyMs: number; expression: string }>('/resources/math/eval', {
      method: 'POST',
      body: JSON.stringify({ expression })
    })
};

// 20. API & Integrations Centre API (/settings/integrations)
export const integrationsApi = {
  getAll: () =>
    request<{ success: boolean; integrations: IntegrationSetting[] }>('/integrations'),

  testProvider: (providerId: string) =>
    request<{ success: boolean; status: string; latencyMs: number; details: string }>(`/integrations/${providerId}/test`, {
      method: 'POST'
    }),

  update: (providerId: string, payload: { isEnabled?: boolean; apiKey?: string }) =>
    request<{ success: boolean; integration: IntegrationSetting }>(`/integrations/${providerId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
};

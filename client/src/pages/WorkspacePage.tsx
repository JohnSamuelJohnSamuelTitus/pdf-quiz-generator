import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { subjectsApi, topicsApi, externalApi, sessionsApi, quizzesApi, materialsApi, adaptiveApi, revisionApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Subject,
  Topic,
  WikipediaSummary,
  OpenLibraryBook,
  DictionaryDefinition,
  QuizQuestion,
  DifficultyLevel,
  ProgressStatus,
  StudyMaterial,
  AdaptiveDifficultyStatus,
  RevisionRecommendation
} from '../../../shared/types';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import {
  BookOpen,
  Compass,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookMarked,
  Search,
  Filter,
  FileText,
  Layers,
  TrendingUp,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';

export function WorkspacePage() {
  const { subjectSlug, topicSlug } = useParams<{ subjectSlug?: string; topicSlug?: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  // Mode: Explorer (no params) vs Topic Workspace (params provided)
  const isExplorer = !subjectSlug || !topicSlug;

  // Explorer states
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [explorerTopics, setExplorerTopics] = useState<Topic[]>([]);

  // Workspace states
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [adjacentTopics, setAdjacentTopics] = useState<{ id: string; slug: string; title: string; sort_order: number }[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoadingTopic, setIsLoadingTopic] = useState(false);

  // External API integration states
  const [wikiData, setWikiData] = useState<WikipediaSummary | null>(null);
  const [loadingWiki, setLoadingWiki] = useState(false);

  const [books, setBooks] = useState<OpenLibraryBook[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);

  const [definitions, setDefinitions] = useState<DictionaryDefinition[]>([]);
  const [loadingDict, setLoadingDict] = useState(false);
  const [dictSearchWord, setDictSearchWord] = useState('');

  // Study session timer states
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [isCompletingSession, setIsCompletingSession] = useState(false);

  // Quiz states
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<any | null>(null);

  // Phase 2: Study Materials & Intelligence states
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [adaptiveStatus, setAdaptiveStatus] = useState<AdaptiveDifficultyStatus | null>(null);
  const [revisionAlert, setRevisionAlert] = useState<RevisionRecommendation | null>(null);

  // 1. Load subjects on mount
  useEffect(() => {
    subjectsApi.getAll().then(async (res) => {
      if (res.success) {
        setAllSubjects(res.subjects);
        // Load all topics for explorer
        const topicsList: Topic[] = [];
        for (const s of res.subjects) {
          try {
            const subDetail = await subjectsApi.getBySlug(s.slug);
            if (subDetail.success) {
              topicsList.push(...subDetail.topics);
            }
          } catch {}
        }
        setExplorerTopics(topicsList);
      }
    });
  }, []);

  // 2. Load Topic Workspace when slugs change
  useEffect(() => {
    if (!subjectSlug || !topicSlug) return;

    setIsLoadingTopic(true);
    // Reset state for new topic
    setWikiData(null);
    setBooks([]);
    setDefinitions([]);
    setQuizSubmitted(false);
    setQuizResult(null);
    setQuizAnswers({});
    setActiveTab('overview');

    topicsApi
      .getBySlug(subjectSlug, topicSlug)
      .then((res) => {
        if (res.success) {
          setCurrentTopic(res.topic);
          setCurrentSubject(res.subject);
          setAdjacentTopics(res.adjacentTopics);

          // Fetch Wikipedia summary
          setLoadingWiki(true);
          const wikiQuery = res.topic.title.split('&')[0].trim();
          externalApi
            .getWikipediaSummary(wikiQuery)
            .then((wRes) => {
              if (wRes.success) setWikiData(wRes.data);
            })
            .finally(() => setLoadingWiki(false));

          // Fetch Open Library books
          setLoadingBooks(true);
          const bookSubject = subjectSlug === 'computer-science' ? 'computer_science' : subjectSlug;
          externalApi
            .getBooks(bookSubject, 6)
            .then((bRes) => {
              if (bRes.success) setBooks(bRes.data);
            })
            .finally(() => setLoadingBooks(false));

          // Fetch initial Dictionary term
          const firstTerm = res.topic.slug.split('-')[0] || 'algorithm';
          setDictSearchWord(firstTerm);
          setLoadingDict(true);
          externalApi
            .getDefinition(firstTerm)
            .then((dRes) => {
              if (dRes.success) setDefinitions(dRes.data);
            })
            .finally(() => setLoadingDict(false));

          // Phase 2: Fetch structured study materials
          setLoadingMaterials(true);
          materialsApi
            .getByTopic(topicSlug)
            .then((mRes) => {
              if (mRes.success) setStudyMaterials(mRes.materials);
            })
            .catch(() => {})
            .finally(() => setLoadingMaterials(false));

          // Phase 2: Evaluate adaptive difficulty
          adaptiveApi
            .evaluate(topicSlug)
            .then((aRes) => {
              if (aRes.success) setAdaptiveStatus(aRes.status);
            })
            .catch(() => {});

          // Phase 2: Check spaced revision recommendation
          revisionApi
            .getAll()
            .then((rRes) => {
              if (rRes.success && Array.isArray(rRes.revisions)) {
                const found = rRes.revisions.find((r: RevisionRecommendation) => r.topicSlug === topicSlug);
                if (found) setRevisionAlert(found);
              }
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        showToast(err.message || 'Failed to load topic workspace', 'error');
      })
      .finally(() => setIsLoadingTopic(false));
  }, [subjectSlug, topicSlug]);

  // Timer interval
  useEffect(() => {
    let interval: any;
    if (sessionActive) {
      interval = setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionActive]);

  // Session handler: start
  const handleStartSession = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in to track and save study sessions.', 'info');
      return;
    }
    if (!currentTopic) return;

    try {
      const res = await sessionsApi.start(currentTopic.id);
      if (res.success) {
        setActiveSessionId(res.sessionId);
        setSessionActive(true);
        showToast('Study session started. Timer active.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Could not start session', 'error');
    }
  };

  // Session handler: complete
  const handleCompleteSession = async () => {
    if (!activeSessionId) return;
    setIsCompletingSession(true);

    try {
      await sessionsApi.complete(activeSessionId, sessionSeconds, sessionNotes);
      setSessionActive(false);
      setActiveSessionId(null);
      showToast(`Session recorded! ${Math.round(sessionSeconds / 60)} minutes logged to profile.`, 'success');
      // Update local topic mastery slightly
      if (currentTopic) {
        setCurrentTopic({
          ...currentTopic,
          masteryScore: Math.min(100, (currentTopic.masteryScore || 0) + 5),
          status: 'in_progress'
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Could not complete session', 'error');
    } finally {
      setIsCompletingSession(false);
    }
  };

  // Terminology search
  const handleSearchDictionary = (term: string) => {
    if (!term.trim()) return;
    setLoadingDict(true);
    setDictSearchWord(term);
    externalApi
      .getDefinition(term)
      .then((res) => {
        if (res.success) setDefinitions(res.data);
      })
      .finally(() => setLoadingDict(false));
  };

  // Generate Quiz
  const handleLoadQuiz = () => {
    if (!currentSubject || !currentTopic) return;
    setQuizLoading(true);
    quizzesApi
      .generate({
        subject: currentSubject.slug,
        topic: currentTopic.slug,
        difficulty: currentTopic.difficultyLevel,
        amount: 5
      })
      .then((res) => {
        if (res.success) {
          setQuizQuestions(res.questions);
          setQuizAnswers({});
          setQuizSubmitted(false);
          setQuizResult(null);
        }
      })
      .catch((err) => {
        showToast(err.message || 'Failed to generate quiz', 'error');
      })
      .finally(() => setQuizLoading(false));
  };

  // Submit Quiz
  const handleSubmitQuiz = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in to save your quiz score and update your mastery.', 'info');
      return;
    }
    if (!currentTopic || quizQuestions.length === 0) return;

    // Check all questions answered
    const unanswered = quizQuestions.filter((q) => !quizAnswers[q.id]);
    if (unanswered.length > 0) {
      showToast(`Please answer all ${quizQuestions.length} questions before submitting`, 'info');
      return;
    }

    const answersPayload = quizQuestions.map((q) => ({
      questionId: q.id,
      questionText: q.questionText,
      selectedOption: quizAnswers[q.id],
      correctOption: q.correctAnswer,
      explanation: q.explanation
    }));

    setIsSubmittingQuiz(true);
    try {
      const res = await quizzesApi.submit({
        topicId: currentTopic.id,
        difficulty: currentTopic.difficultyLevel,
        answers: answersPayload,
        timeTakenSeconds: 120
      });

      if (res.success) {
        setQuizSubmitted(true);
        setQuizResult(res.result);
        showToast(`Quiz completed with ${res.result.scorePercentage}%! Mastery updated.`, 'success');
        setCurrentTopic({
          ...currentTopic,
          masteryScore: res.result.masteryScore,
          status: res.result.status as ProgressStatus
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit quiz', 'error');
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  // Adjacent navigation helpers
  const currentIndex = adjacentTopics.findIndex((t) => t.slug === topicSlug);
  const prevTopic = currentIndex > 0 ? adjacentTopics[currentIndex - 1] : null;
  const nextTopic = currentIndex >= 0 && currentIndex < adjacentTopics.length - 1 ? adjacentTopics[currentIndex + 1] : null;

  // Format seconds -> mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // =========================================================================
  // VIEW 1: CURRICULUM EXPLORER (When at /workspace)
  // =========================================================================
  if (isExplorer) {
    const filteredTopics = explorerTopics.filter((t) => {
      const matchesSubject = selectedSubjectFilter === 'all' || t.subjectSlug === selectedSubjectFilter;
      const matchesDifficulty = selectedDifficulty === 'all' || t.difficultyLevel === selectedDifficulty;
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSubject && matchesDifficulty && matchesSearch;
    });

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#3D2D21] pb-6">
          <div className="space-y-2">
            <Badge variant="journal">FRONTIER CHAPTERS</Badge>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-wide text-[#F5EBD8]">
              Academic Topics & Expeditions
            </h1>
            <p className="text-xs sm:text-sm text-[#D9C39B] max-w-2xl font-serif">
              Select an expedition topic to enter the study journal with verified Wikipedia references, Open Library textbooks, and challenge quizzes.
            </p>
          </div>
          <Link to="/library">
            <button className="btn-frontier-secondary px-4 py-2.5 rounded-lg text-xs font-serif font-bold transition-all flex items-center gap-2 shadow-sm">
              <BookMarked className="w-4 h-4 text-[#C69B56]" />
              <span>Open Book Library</span>
            </button>
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 rounded-xl border border-[#493522] bg-[#30241B] shadow-leather">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#B18A4C]" />
            <input
              type="text"
              placeholder="Search chapters or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-serif pl-9 pr-3 py-2 rounded-lg border border-[#493522] bg-[#211A15] text-[#F5EBD8] placeholder-[#8B7861] focus:outline-none focus:border-[#B18A4C]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Subject filter */}
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="text-xs font-serif py-2 px-3 rounded-lg border border-[#493522] bg-[#211A15] text-[#F5EBD8] focus:outline-none focus:border-[#B18A4C]"
            >
              <option value="all">All Disciplines</option>
              {allSubjects.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.title}
                </option>
              ))}
            </select>

            {/* Difficulty filter */}
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="text-xs font-serif py-2 px-3 rounded-lg border border-[#493522] bg-[#211A15] text-[#F5EBD8] focus:outline-none focus:border-[#B18A4C]"
            >
              <option value="all">All Difficulties</option>
              <option value="foundational">Foundational</option>
              <option value="moderate">Moderate</option>
              <option value="rigorous">Rigorous</option>
            </select>
          </div>
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTopics.map((topic) => (
            <Card
              key={topic.id}
              className="hover:border-[#B18A4C] hover:shadow-gold-border transition-all flex flex-col justify-between bg-[#281F19] border-[#3D2D21]"
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-serif uppercase tracking-widest text-[#B18A4C] font-bold">
                    {topic.subjectTitle || 'Academic'}
                  </span>
                  <Badge
                    variant={
                      topic.difficultyLevel === 'foundational'
                        ? 'neutral'
                        : topic.difficultyLevel === 'moderate'
                        ? 'journal'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {topic.difficultyLevel}
                  </Badge>
                </div>

                <h3 className="text-sm font-serif font-bold text-[#F5EBD8] leading-snug">
                  {topic.title}
                </h3>

                <p className="text-xs text-[#D9C39B] line-clamp-3 leading-relaxed font-serif">
                  {topic.summary}
                </p>

                <div className="flex items-center gap-3 text-[11px] text-[#8B7861] pt-2 border-t border-[#3D2D21]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#B18A4C]" /> ~{topic.estimatedMinutes}m study
                  </span>
                  <span>•</span>
                  <span>Wikipedia + Open Library</span>
                </div>
              </CardContent>

              <div className="p-4 pt-0">
                <Link to={`/workspace/${topic.subjectSlug}/${topic.slug}`} className="w-full block">
                  <Button size="sm" variant="leather" className="w-full text-xs font-serif font-bold" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Open Chapter Journal
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: TOPIC WORKSPACE (When viewing a specific topic)
  // =========================================================================
  if (isLoadingTopic || !currentTopic) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const workspaceTabs = [
    { id: 'overview', label: 'Concept Overview', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'materials', label: 'Structured Materials', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'books', label: 'Curated Books', icon: <BookMarked className="w-3.5 h-3.5" /> },
    { id: 'dict', label: 'Terminology', icon: <Search className="w-3.5 h-3.5" /> },
    { id: 'session', label: 'Active Study', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'quiz', label: 'Assessment Quiz', icon: <Sparkles className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-150">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <Link
          to="/workspace"
          className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Topics</span>
        </Link>

        {/* Prev / Next Topic navigation */}
        <div className="flex items-center gap-3">
          {prevTopic && (
            <Link
              to={`/workspace/${subjectSlug}/${prevTopic.slug}`}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              ← {prevTopic.title}
            </Link>
          )}
          {prevTopic && nextTopic && <span className="text-slate-300 dark:text-slate-700">•</span>}
          {nextTopic && (
            <Link
              to={`/workspace/${subjectSlug}/${nextTopic.slug}`}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {nextTopic.title} →
            </Link>
          )}
        </div>
      </div>

      {/* Topic Workspace Header Banner */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="accent">{currentSubject?.title}</Badge>
              <Badge variant="neutral" className="capitalize">
                {currentTopic.difficultyLevel}
              </Badge>
              <span className="text-xs text-slate-400">• ~{currentTopic.estimatedMinutes} mins</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {currentTopic.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              {currentTopic.summary}
            </p>

            {/* Phase 2: Adaptive Intelligence Indicators */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {adaptiveStatus && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-700 dark:text-slate-300">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>
                    Adaptive Level:{' '}
                    <strong className="capitalize text-slate-900 dark:text-white">
                      {adaptiveStatus.recommendedDifficulty}
                    </strong>
                  </span>
                  <span className="text-slate-400">
                    ({Math.round(adaptiveStatus.recentAccuracy)}% recent acc)
                  </span>
                </div>
              )}
              {revisionAlert && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/40 text-[11px] text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    Revision Recommended: {revisionAlert.urgency} urgency ({revisionAlert.lastStudiedDaysAgo}d decay)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Student Progress Badge */}
          <div className="sm:text-right shrink-0 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 min-w-[140px]">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
              Topic Mastery
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {Math.round(currentTopic.masteryScore || 0)}%
            </span>
            <div className="w-24 sm:ml-auto pt-1">
              <ProgressBar
                value={currentTopic.masteryScore || 0}
                showPercentage={false}
                color="indigo"
              />
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="pt-2">
          <Tabs tabs={workspaceTabs} activeTab={activeTab} onChange={(id) => {
            setActiveTab(id);
            if (id === 'quiz' && quizQuestions.length === 0) {
              handleLoadQuiz();
            }
          }} />
        </div>
      </div>

      {/* TAB 1: OVERVIEW & WIKIPEDIA EXTRACT */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm">Authoritative Summary</CardTitle>
                  <p className="text-xs text-slate-500">Live extract from Wikipedia REST API</p>
                </div>
                {wikiData?.pageUrl && (
                  <a
                    href={wikiData.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <span>Wikipedia</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {loadingWiki ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                ) : wikiData ? (
                  <div className="space-y-4">
                    {wikiData.thumbnailUrl && (
                      <div className="float-right ml-4 mb-2 p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-subtle max-w-[180px]">
                        <img
                          src={wikiData.thumbnailUrl}
                          alt={wikiData.title}
                          className="w-full h-auto rounded-lg object-contain"
                        />
                      </div>
                    )}
                    <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                      {wikiData.extract}
                    </p>
                    {wikiData.description && (
                      <p className="text-xs text-slate-500 italic">
                        Academic classification: {wikiData.description}
                      </p>
                    )}
                  </div>
                ) : (
                  <p>Overview is ready for this topic.</p>
                )}
              </CardContent>
            </Card>

            {/* Core Concepts Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Key Academic Objectives</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Understand foundational definitions and formal constraints for {currentTopic.title}.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Analyze operational complexity, structural invariants, and edge case behaviors.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Verify theoretical principles with assessment quizzes and textbook references.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar: Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recommended Study Flow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-start"
                  size="sm"
                  variant="outline"
                  leftIcon={<Clock className="w-4 h-4 text-indigo-600" />}
                  onClick={() => setActiveTab('session')}
                >
                  Start Active Study Timer
                </Button>
                <Button
                  className="w-full justify-start"
                  size="sm"
                  variant="outline"
                  leftIcon={<BookMarked className="w-4 h-4 text-amber-600" />}
                  onClick={() => setActiveTab('books')}
                >
                  Browse Open Library Texts
                </Button>
                <Button
                  className="w-full justify-start"
                  size="sm"
                  variant="primary"
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  onClick={() => {
                    setActiveTab('quiz');
                    handleLoadQuiz();
                  }}
                >
                  Take Practice Quiz
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB: STRUCTURED STUDY MATERIALS */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Structured Academic Study Materials
              </h3>
              <p className="text-xs text-slate-500">
                Curated lecture notes, operational examples, and verified academic citations
              </p>
            </div>
            <Badge variant="accent">Curated Curriculum</Badge>
          </div>

          {loadingMaterials ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : studyMaterials.length > 0 ? (
            <div className="space-y-6">
              {studyMaterials.map((mat) => (
                <Card key={mat.id} className="overflow-hidden">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          Section {mat.sortOrder} • {mat.contentType.replace('_', ' ')}
                        </span>
                        <CardTitle className="text-base text-slate-900 dark:text-white">
                          {mat.sectionTitle}
                        </CardTitle>
                      </div>
                      <Badge variant="neutral" size="sm" className="capitalize">
                        {mat.contentType.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {/* Content text */}
                    {mat.contentType === 'practical_example' ? (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-400">
                          <span>Implementation & Operational Trace</span>
                          <span>Source Analysis</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{mat.contentBody}</p>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {mat.contentBody}
                      </p>
                    )}

                    {/* Citations */}
                    {mat.sourceCitation && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="truncate">
                          <strong className="text-slate-700 dark:text-slate-300">Citation:</strong> {mat.sourceCitation}
                        </span>
                        {mat.sourceUrl && (
                          <a
                            href={mat.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 ml-2"
                          >
                            <span>Reference</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FileText className="w-6 h-6 text-indigo-600" />}
              title="Structured Notes in Curation"
              description="Review the live Wikipedia extract and curated textbooks while additional structured notes are cataloged."
              actionLabel="View Concept Overview"
              onAction={() => setActiveTab('overview')}
            />
          )}
        </div>
      )}

      {/* TAB 2: CURATED BOOKS (OPEN LIBRARY API) */}
      {activeTab === 'books' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Curated Bibliography & Reading Materials
              </h3>
              <p className="text-xs text-slate-500">
                Live query from the Open Library API repository
              </p>
            </div>
            <Badge variant="accent">Open Library API</Badge>
          </div>

          {loadingBooks ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : books.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((b) => (
                <Card key={b.key} className="flex gap-4 p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                  {b.coverUrl ? (
                    <img
                      src={b.coverUrl}
                      alt={b.title}
                      className="w-16 h-24 object-cover rounded-md shadow-subtle shrink-0 bg-slate-100"
                    />
                  ) : (
                    <div className="w-16 h-24 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  )}

                  <div className="space-y-1 min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                      {b.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {b.authorNames.join(', ') || 'Academic Authors'}
                    </p>
                    {b.firstPublishYear && (
                      <p className="text-[10px] text-slate-400 font-mono">
                        Published: {b.firstPublishYear}
                      </p>
                    )}
                    <div className="pt-2">
                      <a
                        href={`https://openlibrary.org${b.key}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                      >
                        <span>Open Library</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen className="w-6 h-6 text-slate-400" />}
              title="No books found"
              description="Could not locate related textbooks in Open Library for this subject."
            />
          )}
        </div>
      )}

      {/* TAB 3: ACADEMIC TERMINOLOGY (FREE DICTIONARY API) */}
      {activeTab === 'dict' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Academic Vocabulary & Etymology
              </h3>
              <p className="text-xs text-slate-500">
                Authoritative definitions via Free Dictionary API
              </p>
            </div>

            {/* Quick search input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Lookup term (e.g. algorithm)..."
                defaultValue={dictSearchWord}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchDictionary((e.target as HTMLInputElement).value);
                  }
                }}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <Button size="sm" onClick={() => handleSearchDictionary(dictSearchWord)}>
                Search
              </Button>
            </div>
          </div>

          {loadingDict ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : definitions.length > 0 ? (
            <div className="space-y-4">
              {definitions.map((def, idx) => (
                <Card key={idx}>
                  <CardContent className="p-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                        {def.word}
                      </h4>
                      {def.phonetic && (
                        <span className="text-xs font-mono text-slate-400">{def.phonetic}</span>
                      )}
                      <Badge variant="neutral" size="sm">
                        {def.partOfSpeech}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {def.definition}
                    </p>

                    {def.example && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                        "{def.example}"
                      </p>
                    )}

                    {def.synonyms.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
                        <span className="font-semibold">Synonyms:</span>
                        <span>{def.synonyms.join(', ')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Search className="w-6 h-6 text-slate-400" />}
              title="No definition available"
              description={`Could not find entries for "${dictSearchWord}". Try searching another keyword.`}
            />
          )}
        </div>
      )}

      {/* TAB 4: ACTIVE STUDY SESSION TRACKER */}
      {activeTab === 'session' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="text-center p-8 space-y-6">
            <div className="space-y-1">
              <Badge variant="accent">Study Timer</Badge>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Focused Learning Session
              </h3>
              <p className="text-xs text-slate-500">
                Time spent is persisted to your database profile and counts toward daily targets.
              </p>
            </div>

            {/* Big Stopwatch Display */}
            <div className="text-5xl font-mono font-bold tracking-tight text-slate-900 dark:text-white py-4 tabular-nums">
              {formatTime(sessionSeconds)}
            </div>

            {/* Timer Controls */}
            <div className="flex items-center justify-center gap-3">
              {!sessionActive ? (
                <Button
                  size="md"
                  onClick={handleStartSession}
                  leftIcon={<Play className="w-4 h-4 fill-current" />}
                >
                  Start Session
                </Button>
              ) : (
                <Button
                  size="md"
                  variant="outline"
                  onClick={() => setSessionActive(false)}
                  leftIcon={<Pause className="w-4 h-4" />}
                >
                  Pause
                </Button>
              )}

              <Button
                size="md"
                variant="ghost"
                onClick={() => {
                  setSessionActive(false);
                  setSessionSeconds(0);
                }}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Reset
              </Button>
            </div>

            {/* Session Notes */}
            <div className="text-left space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Session Takeaways & Notes
              </label>
              <textarea
                rows={3}
                placeholder="Log key insights or questions reviewed during this session..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <Button
              className="w-full"
              size="md"
              onClick={handleCompleteSession}
              disabled={sessionSeconds < 5}
              isLoading={isCompletingSession}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Complete & Save Study Session
            </Button>
          </Card>
        </div>
      )}

      {/* TAB 5: PRACTICE QUIZ (OPEN TRIVIA DB INTEGRATED) */}
      {activeTab === 'quiz' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Topic Knowledge Assessment
              </h3>
              <p className="text-xs text-slate-500">
                Provider-independent quiz engine • Verified questions
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={handleLoadQuiz} isLoading={quizLoading}>
              Regenerate Questions
            </Button>
          </div>

          {quizLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : quizQuestions.length > 0 ? (
            <div className="space-y-6">
              {/* Result banner if submitted */}
              {quizSubmitted && quizResult && (
                <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                      Assessment Results
                    </span>
                    <span className="text-lg font-bold text-emerald-900 dark:text-emerald-200 tabular-nums">
                      {quizResult.scorePercentage}%
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    You answered {quizResult.correctAnswers} of {quizResult.totalQuestions} questions correctly.
                    Updated Topic Mastery is now{' '}
                    <span className="font-semibold">{quizResult.masteryScore}%</span>.
                  </p>
                </div>
              )}

              {/* Questions list */}
              {quizQuestions.map((q, idx) => {
                const selected = quizAnswers[q.id];
                return (
                  <Card key={q.id}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Question {idx + 1} of {quizQuestions.length}</span>
                        <Badge variant="neutral" size="sm" className="capitalize">
                          {q.difficulty}
                        </Badge>
                      </div>

                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                        {q.questionText}
                      </h4>

                      {/* Options */}
                      <div className="space-y-2 pt-1">
                        {q.options.map((opt) => {
                          const isOptionSelected = selected === opt;
                          const isCorrect = q.correctAnswer === opt;

                          let optionClass =
                            'p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ';

                          if (quizSubmitted) {
                            if (isCorrect) {
                              optionClass += 'border-emerald-500 bg-emerald-50/80 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 font-semibold';
                            } else if (isOptionSelected && !isCorrect) {
                              optionClass += 'border-rose-500 bg-rose-50/80 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200';
                            } else {
                              optionClass += 'border-slate-200 dark:border-slate-800 opacity-60';
                            }
                          } else {
                            if (isOptionSelected) {
                              optionClass += 'border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white shadow-subtle';
                            } else {
                              optionClass += 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300';
                            }
                          }

                          return (
                            <div
                              key={opt}
                              onClick={() => {
                                if (!quizSubmitted) {
                                  setQuizAnswers({ ...quizAnswers, [q.id]: opt });
                                }
                              }}
                              className={optionClass}
                            >
                              <span>{opt}</span>
                              {quizSubmitted && isCorrect && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              )}
                              {quizSubmitted && isOptionSelected && !isCorrect && (
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation review */}
                      {quizSubmitted && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-xl">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">
                            Explanation:
                          </span>
                          {q.explanation}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {!quizSubmitted && (
                <Button
                  className="w-full"
                  size="md"
                  onClick={handleSubmitQuiz}
                  isLoading={isSubmittingQuiz}
                  disabled={isSubmittingQuiz}
                >
                  Submit Quiz & Update Mastery
                </Button>
              )}
            </div>
          ) : (
            <EmptyState
              icon={<Sparkles className="w-6 h-6 text-indigo-600" />}
              title="Generate a Quiz"
              description="Test your understanding with 5 questions calibrated to this topic."
              actionLabel="Start Quiz"
              onAction={handleLoadQuiz}
            />
          )}
        </div>
      )}
    </div>
  );
}

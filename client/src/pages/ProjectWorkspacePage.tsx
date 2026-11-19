import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import {
  projectsApi,
  documentsApi,
  syllabusApi,
  lessonsApi,
  questionsApi,
  quizzesApi,
  sessionsApi
} from '../api/client';
import {
  LearningProject,
  SyllabusUnit,
  SyllabusTopic,
  UploadedDocument,
  SourceGroundedLesson,
  TopicNote,
  QuizQuestion,
  DocumentType
} from '../../../shared/types';
import {
  BookOpen,
  BookMarked,
  FileText,
  Upload,
  Brain,
  CheckCircle2,
  Clock,
  Award,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  ExternalLink,
  Bookmark,
  Share2,
  Calendar,
  Search,
  Plus,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  GraduationCap,
  AlertCircle,
  Globe,
  Check,
  X,
  ScrollText,
  HelpCircle,
  Flame,
  CheckCircle
} from 'lucide-react';

export function ProjectWorkspacePage() {
  const { projectId, topicId: routeTopicId } = useParams<{ projectId: string; topicId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [project, setProject] = useState<LearningProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [units, setUnits] = useState<SyllabusUnit[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);

  // Workflow mode: 'learn' (RDR2 Frontier Journal) -> 'quiz' (Cinematic Challenge) -> 'results' (Progress Journey)
  const [workflowMode, setWorkflowMode] = useState<'learn' | 'quiz' | 'results'>('learn');

  // Topic Lesson state
  const [lesson, setLesson] = useState<SourceGroundedLesson | null>(null);
  const [isLessonLoading, setIsLessonLoading] = useState(false);

  // Topic Notes state
  const [notes, setNotes] = useState<TopicNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);

  // Topic Quiz & Assessment state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizResultDetails, setQuizResultDetails] = useState<
    Array<{
      questionId: string;
      questionText: string;
      selectedOption: string;
      correctOption: string;
      explanation: string;
      questionType: string;
      isCorrect: boolean;
    }>
  >([]);

  // Study Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Upload Additional Material Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState<DocumentType>('lecture_notes');
  const [isUploading, setIsUploading] = useState(false);

  // Topic search filter
  const [searchFilter, setSearchFilter] = useState('');

  // 1. Initial Project Load
  useEffect(() => {
    if (!projectId) return;
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const res = await projectsApi.getById(projectId);
      if (res.success && res.project) {
        setProject(res.project);
        setUnits(res.units || []);
        setDocuments(res.documents || []);

        let targetId = routeTopicId;
        if (!targetId && res.units && res.units.length > 0 && res.units[0].topics.length > 0) {
          targetId = res.units[0].topics[0].id;
        }
        if (targetId) {
          setActiveTopicId(targetId);
        }
      } else {
        addToast('Curriculum project not found', 'error');
        navigate('/');
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load project details', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Load Topic Details when activeTopicId changes
  useEffect(() => {
    if (!activeTopicId) return;
    loadTopicLesson(activeTopicId);
    loadTopicNotes(activeTopicId);

    setWorkflowMode('learn');
    setCurrentQIndex(0);
    setQuizQuestions([]);
    setSelectedAnswers({});
    setQuizScore(null);
    setQuizResultDetails([]);
  }, [activeTopicId]);

  // 3. Study Session Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const toggleTimer = async () => {
    if (!isTimerRunning) {
      if (activeTopicId && !activeSessionId) {
        try {
          const res = await sessionsApi.start(activeTopicId);
          if (res.success && res.sessionId) {
            setActiveSessionId(res.sessionId);
          }
        } catch {}
      }
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
    }
  };

  const completeTimerSession = async () => {
    setIsTimerRunning(false);
    if (activeSessionId) {
      try {
        await sessionsApi.complete(activeSessionId, timerSeconds, 'Self-directed study on topic');
        addToast(`Logged ${Math.round(timerSeconds / 60)} minutes of study time!`, 'success');
      } catch {}
      setActiveSessionId(null);
    }
    setTimerSeconds(0);
  };

  // 4. Fetch 7-Part Tutor Lesson
  const loadTopicLesson = async (tId: string) => {
    setIsLessonLoading(true);
    try {
      const res = await lessonsApi.getGroundedLesson(tId);
      if (res.success && res.lesson) {
        setLesson(res.lesson);
      } else {
        setLesson(null);
      }
    } catch {
      setLesson(null);
    } finally {
      setIsLessonLoading(false);
    }
  };

  // 5. Fetch Topic Notes
  const loadTopicNotes = async (tId: string) => {
    try {
      const res = await lessonsApi.getNotes(tId);
      if (res.success && res.notes) {
        setNotes(res.notes);
      }
    } catch {}
  };

  const handleSaveNote = async () => {
    if (!activeTopicId || !newNoteText.trim()) return;
    try {
      const res = await lessonsApi.saveNote(activeTopicId, {
        noteContent: newNoteText.trim()
      });
      if (res.success && res.note) {
        setNotes([res.note, ...notes]);
        setNewNoteText('');
        addToast('Study note saved', 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to save note', 'error');
    }
  };

  // Helpers to strictly and reliably evaluate answers without flawed character shortcuts
  const normalizeBoolean = (val: unknown): boolean | null => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') {
      if (val === 1) return true;
      if (val === 0) return false;
      return null;
    }
    if (typeof val === 'string') {
      const s = val.trim().toLowerCase();
      if (s === 'true' || s === 't' || s === '1' || s === 'yes' || s === 'correct') return true;
      if (s === 'false' || s === 'f' || s === '0' || s === 'no' || s === 'incorrect') return false;
      if (s === 'a') return true;
      if (s === 'b') return false;
    }
    return null;
  };

  const cleanOption = (text: unknown): string => {
    if (text === null || text === undefined) return '';
    return String(text)
      .trim()
      .replace(/^[a-dA-D][\)\.:\-]\s*/, '')
      .toLowerCase()
      .trim();
  };

  const evaluateClientAnswer = (chosen: unknown, correct: unknown, type: string = 'multiple_choice'): boolean => {
    if (chosen === null || chosen === undefined || String(chosen).trim() === '') return false;
    if (type === 'true_false') {
      const bChosen = normalizeBoolean(chosen);
      const bCorrect = normalizeBoolean(correct);
      if (bChosen !== null && bCorrect !== null) {
        return bChosen === bCorrect;
      }
      return String(chosen).trim().toLowerCase() === String(correct).trim().toLowerCase();
    }
    if (type === 'short_answer') {
      const normC = String(chosen).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const normK = String(correct).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!normC || !normK) return false;
      return normC === normK || normC.includes(normK) || normK.includes(normC);
    }
    const sChosen = String(chosen).trim().toLowerCase();
    const sCorrect = String(correct).trim().toLowerCase();
    if (sChosen === sCorrect) return true;

    const cChosen = cleanOption(chosen);
    const cCorrect = cleanOption(correct);
    if (cChosen && cCorrect && cChosen === cCorrect) return true;

    if (/^[a-d]$/i.test(sChosen)) {
      const prefix = String(correct).trim().match(/^([A-D])[\)\.:\-]/i);
      if (prefix && prefix[1].toUpperCase() === sChosen.toUpperCase()) return true;
    }
    if (/^[a-d]$/i.test(sCorrect)) {
      const prefix = String(chosen).trim().match(/^([A-D])[\)\.:\-]/i);
      if (prefix && prefix[1].toUpperCase() === sCorrect.toUpperCase()) return true;
    }

    return false;
  };

  // 6. Generate Grounded Topic Quiz
  const handleStartTopicQuiz = async (forceNew?: boolean | React.MouseEvent) => {
    if (!activeTopicId) return;
    const isForce = typeof forceNew === 'boolean' ? forceNew : false;

    if (quizQuestions.length > 0 && !isForce) {
      setWorkflowMode('quiz');
      return;
    }

    setIsGeneratingQuiz(true);
    setSelectedAnswers({});
    setCurrentQIndex(0);
    setQuizScore(null);
    setQuizResultDetails([]);

    try {
      const res = await questionsApi.generateGrounded(activeTopicId);
      if (res.success && res.questions && res.questions.length > 0) {
        setQuizQuestions(res.questions);
        setWorkflowMode('quiz');
      } else {
        addToast('No questions generated for this topic yet.', 'info');
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load practice quiz', 'error');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // 7. Submit Quiz & Calculate Mistake Breakdown
  const handleSubmitQuiz = async () => {
    if (quizQuestions.length === 0 || !activeTopicId) return;

    setIsSubmittingQuiz(true);

    let correctCount = 0;
    const scoredQuestions = quizQuestions.map((q) => {
      const chosen = selectedAnswers[q.id] || '';
      const qType = q.questionType || 'multiple_choice';
      const isCorr = evaluateClientAnswer(chosen, q.correctAnswer, qType);

      if (isCorr) correctCount++;

      let displaySelected = chosen;
      let displayCorrect = q.correctAnswer || 'A';
      if (qType === 'true_false') {
        const bSel = normalizeBoolean(chosen);
        const bCorr = normalizeBoolean(q.correctAnswer);
        if (bSel !== null) displaySelected = bSel ? 'True' : 'False';
        if (bCorr !== null) displayCorrect = bCorr ? 'True' : 'False';
      }

      return {
        questionId: q.id,
        questionText: q.questionText,
        selectedOption: displaySelected,
        correctOption: displayCorrect,
        explanation: q.explanation || 'Verified from syllabus materials.',
        questionType: qType,
        isCorrect: isCorr
      };
    });

    const scorePct = Math.round((correctCount / quizQuestions.length) * 100);
    setQuizScore(scorePct);
    setQuizResultDetails(scoredQuestions);

    try {
      const submitRes = await quizzesApi.submit({
        topicId: activeTopicId,
        difficulty: 'moderate',
        answers: scoredQuestions,
        timeTakenSeconds: 60
      });

      // Synchronize directly with backend evaluated results as authoritative source of truth
      if (submitRes && submitRes.success && submitRes.result) {
        if (Array.isArray(submitRes.result.answers) && submitRes.result.answers.length > 0) {
          setQuizResultDetails(submitRes.result.answers);
        }
        if (typeof submitRes.result.scorePercentage === 'number') {
          setQuizScore(submitRes.result.scorePercentage);
        }
      }

      await syllabusApi.updateTopic(activeTopicId, {
        masteryScore: scorePct,
        status: scorePct >= 70 ? 'mastered' : 'in_progress'
      });

      if (projectId) {
        const treeRes = await syllabusApi.getTree(projectId);
        if (treeRes.success) setUnits(treeRes.units);
      }

      addToast(
        scorePct >= 70
          ? `Challenge passed! Score: ${scorePct}% (${correctCount}/${quizQuestions.length})`
          : `Challenge evaluated! Score: ${scorePct}% • Review your mistakes below`,
        scorePct >= 70 ? 'success' : 'info'
      );
    } catch {
    } finally {
      setIsSubmittingQuiz(false);
      setWorkflowMode('results');
    }
  };

  const handleUploadAdditionalDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !uploadFile) return;

    setIsUploading(true);
    try {
      const res = await documentsApi.upload(projectId, uploadFile, uploadDocType);
      if (res.success && res.document) {
        setDocuments([res.document, ...documents]);
        setIsUploadModalOpen(false);
        setUploadFile(null);
        addToast(`Material "${uploadFile.name}" processed!`, 'success');

        if (activeTopicId) {
          loadTopicLesson(activeTopicId);
        }
      }
    } catch (err: any) {
      addToast(err.message || 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  let activeTopic: SyllabusTopic | null = null;
  for (const u of units) {
    const found = u.topics.find((t) => t.id === activeTopicId);
    if (found) {
      activeTopic = found;
      break;
    }
  }

  const allTopics = units.flatMap((u) => u.topics);
  const currentTopicIndex = allTopics.findIndex((t) => t.id === activeTopicId);
  const prevTopic = currentTopicIndex > 0 ? allTopics[currentTopicIndex - 1] : null;
  const nextTopic = currentTopicIndex >= 0 && currentTopicIndex < allTopics.length - 1 ? allTopics[currentTopicIndex + 1] : null;

  const handleSelectTopic = (targetId: string) => {
    setActiveTopicId(targetId);
    setWorkflowMode('learn');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Skeleton className="h-[600px] rounded-xl lg:col-span-1" />
          <Skeleton className="h-[600px] rounded-xl lg:col-span-3" />
        </div>
      </div>
    );
  }

  if (!project) return null;

  const intro =
    lesson?.introduction ||
    (lesson?.sections && lesson.sections[0] ? lesson.sections[0].content : `Welcome to the comprehensive breakdown of ${activeTopic?.title || 'this topic'}.`);
  const explanation =
    lesson?.explanation ||
    (lesson?.sections && lesson.sections[1] ? lesson.sections[1].content : (lesson?.sections && lesson.sections[0]?.content ? lesson.sections[0].content : ''));
  const stepByStep =
    lesson?.stepByStep && lesson.stepByStep.length > 0
      ? lesson.stepByStep
      : [
          `Step 1: Understand the core principle and problem context of ${activeTopic?.title || 'this topic'}.`,
          `Step 2: Trace the initialization parameters and operational pre-conditions.`,
          `Step 3: Follow the primary transformation or algorithmic state transitions.`,
          `Step 4: Verify boundary conditions, edge cases, and output guarantees.`
        ];
  const practicalExample =
    lesson?.practicalExample ||
    `Real-World Application: In real-world technology and engineering, ${activeTopic?.title || 'this concept'} is implemented to ensure high throughput, predictable response times, and failure containment under high concurrency.`;
  const definitions =
    lesson?.definitions && lesson.definitions.length > 0
      ? lesson.definitions
      : [
          {
            term: activeTopic?.title || 'Core Topic',
            definition: 'Fundamental concept defined in this curricular unit.',
            source: 'Syllabus Outline'
          }
        ];
  const keyPoints =
    lesson?.keyPoints && lesson.keyPoints.length > 0
      ? lesson.keyPoints
      : lesson?.keyTakeaways || [
          `Always identify the primary invariant that ${activeTopic?.title || 'this concept'} maintains.`,
          `Remember best-case vs worst-case complexity bounds for exam questions.`,
          `Watch out for edge-case boundaries (e.g. empty inputs or network partitions).`
        ];
  const recap =
    lesson?.recap ||
    `Quick Recap: ${activeTopic?.title || 'This topic'} provides a reliable, structured approach to managing data and coordinating operations. When you feel ready, take the practice quiz to verify your retention!`;

  return (
    <div className="min-h-screen bg-[#211A15] text-[#F5EBD8] relative pb-16">
      {/* Background ambient frontier warmth */}
      <div className="absolute top-0 right-0 w-[600px] h-[300px] bg-gradient-to-b from-[#B18A4C]/10 to-transparent blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* =========================================================================
            TOP WORKSPACE HEADER (RDR2 FRONTIER LEATHER CASING)
            ========================================================================= */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#281F19]/95 border border-[#493522] shadow-leather backdrop-blur-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-[#D9C39B] font-serif">
              <Link to="/workspace" className="hover:text-[#C69B56] transition-colors">
                Expeditions & Curricula
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-[#B18A4C]" />
              <span className="font-semibold text-[#F5EBD8] truncate max-w-xs">
                {project.title}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-wide text-[#F5EBD8]">
                {project.title}
              </h1>
              {project.subjectCode && (
                <span className="rdr-chapter-badge">{project.subjectCode}</span>
              )}
            </div>
          </div>

          {/* Action Controls & Study Timer */}
          <div className="flex items-center gap-2.5">
            {/* Pocket Watch Timer */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#493522] bg-[#1C1510] text-xs font-mono text-[#D9C39B] shadow-sm">
              <Clock className={`w-3.5 h-3.5 ${isTimerRunning ? 'text-[#C69B56] animate-pulse' : 'text-[#B18A4C]'}`} />
              <span className="font-bold text-[#F5EBD8]">
                {formatTimer(timerSeconds)}
              </span>
              <button
                onClick={toggleTimer}
                className="text-[#B18A4C] hover:text-[#F5EBD8] ml-1 transition-colors"
                title={isTimerRunning ? 'Pause Study Session' : 'Start Study Timer'}
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              {timerSeconds > 0 && (
                <button
                  onClick={completeTimerSession}
                  className="text-[#C69B56] hover:underline text-[11px] font-serif font-bold ml-1"
                >
                  Log
                </button>
              )}
            </div>

            <Link to="/library" target="_blank" rel="noreferrer">
              <button
                className="px-3 py-1.5 rounded-lg text-xs font-serif font-bold bg-[#30241B] border border-[#B18A4C]/60 text-[#D9C39B] hover:bg-[#493522] hover:text-[#F5EBD8] transition-colors flex items-center gap-1.5 shadow-sm"
                title="Open Academic Library to explore textbooks"
              >
                <BookMarked className="w-3.5 h-3.5 text-[#B18A4C]" />
                <span>Textbook Library</span>
              </button>
            </Link>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-serif font-semibold bg-[#30241B] border border-[#493522] hover:border-[#B18A4C] text-[#D9C39B] hover:text-[#F5EBD8] transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-[#B18A4C]" />
              <span>Add Field Notes</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            MAIN WORKSPACE LAYOUT (2 COLUMNS)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* =====================================================================
              LEFT COLUMN: RDR2 FRONTIER JOURNAL SIDEBAR (4 COLS)
              ===================================================================== */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rdr-leather-surface rounded-xl border border-[#4D3B2C] shadow-xl overflow-hidden text-[#E6D4B2]">
              {/* Sidebar Header */}
              <div className="p-4 border-b border-[#4D3B2C] flex items-center justify-between bg-[#2A1F17]">
                <span className="text-xs font-serif font-bold tracking-widest text-[#B18A4C] uppercase flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-[#D4AF37]" />
                  Curriculum Ledger
                </span>
                <span className="text-[11px] font-mono text-[#E6D4B2]/60">
                  {allTopics.length} Topics
                </span>
              </div>

              {/* Filter Search */}
              <div className="p-3 border-b border-[#4D3B2C] bg-[#221913]">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#B18A4C]" />
                  <input
                    type="text"
                    placeholder="Filter ledger entries..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-serif rounded border border-[#4D3B2C] bg-[#1D1510] text-[#E6D4B2] placeholder-[#E6D4B2]/40 focus:outline-none focus:border-[#B18A4C]"
                  />
                </div>
              </div>

              {/* Chapters & Topics List */}
              <div className="p-3 max-h-[640px] overflow-y-auto space-y-4">
                {units.map((unit) => {
                  const filteredTopics = unit.topics.filter((t) =>
                    t.title.toLowerCase().includes(searchFilter.toLowerCase())
                  );
                  if (filteredTopics.length === 0 && searchFilter) return null;

                  return (
                    <div key={unit.id} className="space-y-1.5">
                      <div className="px-2 py-1 text-[11px] font-serif font-bold text-[#D4AF37] tracking-wider uppercase flex items-center justify-between border-b border-[#4D3B2C]/40 pb-1">
                        <span className="truncate">
                          CHAPTER {unit.unitNumber}: {unit.title}
                        </span>
                        <span className="text-[10px] text-[#E6D4B2]/50 font-mono">
                          {filteredTopics.length}
                        </span>
                      </div>

                      <div className="space-y-1 pt-1">
                        {filteredTopics.map((topic) => {
                          const isActive = topic.id === activeTopicId;
                          return (
                            <button
                              key={topic.id}
                              onClick={() => handleSelectTopic(topic.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-serif transition-all flex items-center justify-between gap-2 ${
                                isActive
                                  ? 'bg-[#3D2C20] border-l-4 border-[#D4AF37] text-[#D4AF37] font-bold shadow-md'
                                  : 'text-[#E6D4B2]/80 hover:bg-[#2A1F17] hover:text-[#E6D4B2]'
                              }`}
                            >
                              <span className="truncate flex-1">{topic.title}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {topic.masteryScore > 0 && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#221913] text-[#B18A4C] border border-[#4D3B2C]">
                                    {Math.round(topic.masteryScore)}%
                                  </span>
                                )}
                                {topic.status === 'mastered' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                                ) : (
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      topic.status === 'in_progress' ? 'bg-[#C69B56]' : 'bg-[#4D3B2C]'
                                    }`}
                                  />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Field Notes Journal Box */}
            <div className="rdr-leather-surface rounded-xl border border-[#4D3B2C] p-4 space-y-3 text-[#E6D4B2]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-serif font-bold uppercase tracking-wider text-[#B18A4C] flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Field Notes ({notes.length})
                </span>
                <button
                  onClick={() => setShowNotesDrawer(!showNotesDrawer)}
                  className="text-xs font-serif text-[#D4AF37] hover:underline"
                >
                  {showNotesDrawer ? 'Collapse' : '+ New Note'}
                </button>
              </div>

              {showNotesDrawer && (
                <div className="space-y-2 pt-1">
                  <textarea
                    rows={2}
                    placeholder="Inscribe a key formula, theorem, or edge case..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-serif rounded border border-[#4D3B2C] bg-[#1D1510] text-[#E6D4B2] placeholder-[#E6D4B2]/40 focus:outline-none focus:border-[#B18A4C]"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveNote}
                      disabled={!newNoteText.trim()}
                      className="px-3 py-1 rounded bg-[#B18A4C] text-[#1D1510] font-serif font-bold text-xs hover:bg-[#D4AF37] transition-colors"
                    >
                      Inscribe Note
                    </button>
                  </div>
                </div>
              )}

              {notes.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                  {notes.slice(0, 3).map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded bg-[#1D1510] text-[11px] font-serif text-[#E6D4B2]/90 border border-[#4D3B2C]"
                    >
                      {n.noteContent}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* =====================================================================
              RIGHT COLUMN: DUAL-EXPERIENCE CONTENT AREA (8 COLS)
              ===================================================================== */}
          <div className="lg:col-span-8 space-y-6">
            {activeTopic ? (
              <>
                {/* Active Topic Header / Stage Tabs */}
                <div className="rounded-xl bg-[#281F19] border border-[#493522] p-5 space-y-4 shadow-leather">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rdr-chapter-badge">
                          ENTRY {currentTopicIndex + 1} OF {allTopics.length}
                        </span>
                        {activeTopic.difficultyLevel && (
                          <Badge variant="outline" className="capitalize text-[11px]">
                            {activeTopic.difficultyLevel}
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#F5EBD8] tracking-wide">
                        {activeTopic.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeTopic.masteryScore > 0 && (
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-[#1C1510] text-[#C69B56] border border-[#B18A4C]/40">
                          {Math.round(activeTopic.masteryScore)}% Mastery
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded text-xs font-serif font-bold ${
                        activeTopic.status === 'mastered'
                          ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/40'
                          : 'bg-[#30241B] text-[#D9C39B] border border-[#493522]'
                      }`}>
                        {activeTopic.status === 'mastered' ? 'Mastered 🏆' : 'In Progress'}
                      </span>
                    </div>
                  </div>

                  {/* Subtopics Pill Strip */}
                  {activeTopic.subtopics && activeTopic.subtopics.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#493522]">
                      <span className="text-[11px] font-serif uppercase tracking-wider text-[#D9C39B]/70 mr-1">
                        Subtopics:
                      </span>
                      {activeTopic.subtopics.map((sub, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded text-[11px] bg-[#1C1510] text-[#D9C39B] border border-[#493522] font-serif"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stage Switcher Tabs */}
                  <div className="border-b border-[#493522] flex gap-3 pt-1">
                    <button
                      onClick={() => setWorkflowMode('learn')}
                      className={`pb-2.5 px-3 text-xs font-serif font-bold transition-all flex items-center gap-2 border-b-2 ${
                        workflowMode === 'learn'
                          ? 'border-[#C69B56] text-[#C69B56]'
                          : 'border-transparent text-[#D9C39B]/70 hover:text-[#F5EBD8]'
                      }`}
                    >
                      <ScrollText className="w-3.5 h-3.5" />
                      <span>1. Study Journal</span>
                    </button>

                    <button
                      onClick={handleStartTopicQuiz}
                      disabled={isGeneratingQuiz}
                      className={`pb-2.5 px-3 text-xs font-serif font-bold transition-all flex items-center gap-2 border-b-2 ${
                        workflowMode === 'quiz'
                          ? 'border-[#B18A4C] text-[#C69B56]'
                          : 'border-transparent text-[#D9C39B]/70 hover:text-[#F5EBD8]'
                      }`}
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>2. Challenge Quiz</span>
                      {quizQuestions.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#B18A4C]" />}
                    </button>

                    {quizScore !== null && (
                      <button
                        onClick={() => setWorkflowMode('results')}
                        className={`pb-2.5 px-3 text-xs font-serif font-bold transition-all flex items-center gap-2 border-b-2 ${
                          workflowMode === 'results'
                            ? 'border-emerald-400 text-emerald-400'
                            : 'border-transparent text-[#D9C39B]/70 hover:text-[#F5EBD8]'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>3. Quiz Results ({quizScore}%)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* =========================================================================
                    STAGE 1: LEARN (RDR2 FRONTIER STUDY JOURNAL)
                    ========================================================================= */}
                {workflowMode === 'learn' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {isLessonLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-36 rounded-xl bg-[#281F19]" />
                        <Skeleton className="h-52 rounded-xl bg-[#281F19]" />
                        <Skeleton className="h-36 rounded-xl bg-[#281F19]" />
                      </div>
                    ) : (
                      <div className="rdr-journal-bg rounded-xl border-2 border-[#B18A4C] p-6 sm:p-8 shadow-2xl text-[#33271D] space-y-6">
                        {/* Journal Ribbon Header */}
                        <div className="flex items-center justify-between border-b border-[#C4B18B] pb-3 text-xs font-serif text-[#6B5848]">
                          <span className="flex items-center gap-2">
                            <span className="rdr-stamp">VERIFIED STUDY JOURNAL</span>
                            <span>{activeTopic.title}</span>
                          </span>
                          {lesson?.sourceLabel && (
                            <span className="font-mono text-[10px] text-[#8C7662]">
                              {lesson.sourceLabel}
                            </span>
                          )}
                        </div>

                        {/* 1. Context & Introduction */}
                        <div className="rdr-paper-card rounded-lg p-5 space-y-2">
                          <h3 className="font-serif font-bold text-sm text-[#493522] flex items-center gap-2 uppercase tracking-wide">
                            <Sparkles className="w-4 h-4 text-[#B18A4C]" />
                            § 1. Context & Introduction
                          </h3>
                          <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#33271D]">
                            {intro}
                          </p>
                        </div>

                        {/* 2. Clear Explanation */}
                        <div className="rdr-paper-card rounded-lg p-5 space-y-2">
                          <h3 className="font-serif font-bold text-sm text-[#493522] flex items-center gap-2 uppercase tracking-wide">
                            <BookOpen className="w-4 h-4 text-[#B18A4C]" />
                            § 2. Clear Explanation (In Plain Language)
                          </h3>
                          <div className="text-xs sm:text-sm font-serif leading-relaxed text-[#33271D] whitespace-pre-line">
                            {explanation}
                          </div>
                        </div>

                        <div className="rdr-divider">◈ ─── ❖ ─── ◈</div>

                        {/* 3. Step-by-Step Breakdown */}
                        <div className="rdr-paper-card rounded-lg p-5 space-y-3">
                          <h3 className="font-serif font-bold text-sm text-[#493522] flex items-center gap-2 uppercase tracking-wide">
                            <Layers className="w-4 h-4 text-[#B18A4C]" />
                            § 3. Step-by-Step Mechanical Breakdown
                          </h3>
                          <div className="space-y-2">
                            {stepByStep.map((step, sIdx) => (
                              <div
                                key={sIdx}
                                className="p-3 rounded border border-[#C4B18B] bg-white/80 text-xs font-serif text-[#33271D] leading-relaxed flex items-start gap-3 shadow-xs"
                              >
                                <span className="w-5 h-5 rounded bg-[#30241B] text-[#D4AF37] flex items-center justify-center font-serif text-[11px] font-bold shrink-0 mt-0.5">
                                  {sIdx + 1}
                                </span>
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 4. Practical Real-World Example */}
                        <div className="rdr-paper-card rounded-lg p-5 space-y-2 bg-[#EFE3C7]/90">
                          <h3 className="font-serif font-bold text-sm text-[#493522] flex items-center gap-2 uppercase tracking-wide">
                            <Globe className="w-4 h-4 text-[#B18A4C]" />
                            § 4. Field Implementation & Practical Example
                          </h3>
                          <div className="p-3.5 rounded border border-[#B18A4C] bg-white/70 text-xs font-serif text-[#33271D] leading-relaxed whitespace-pre-line">
                            {practicalExample}
                          </div>
                        </div>

                        {/* 5. Key Definitions & Concepts */}
                        {definitions.length > 0 && (
                          <div className="rdr-paper-card rounded-lg p-5 space-y-3">
                            <h3 className="font-serif font-bold text-sm text-[#493522] flex items-center gap-2 uppercase tracking-wide">
                              <Bookmark className="w-4 h-4 text-[#B18A4C]" />
                              § 5. Canonical Lexicon & Definitions
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {definitions.map((def, i) => (
                                <div
                                  key={i}
                                  className="p-3 rounded border border-[#C4B18B] bg-white/80 space-y-1 shadow-xs"
                                >
                                  <span className="text-xs font-serif font-bold text-[#493522] block">
                                    {def.term}
                                  </span>
                                  <p className="text-[11px] font-serif text-[#33271D] leading-snug">
                                    {def.definition}
                                  </p>
                                  {def.source && (
                                    <span className="text-[10px] font-serif text-[#8C7662] block pt-1">
                                      Citation: {def.source}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 6. Key Points for Exams */}
                        {keyPoints.length > 0 && (
                          <div className="rdr-paper-card rounded-lg p-5 space-y-3">
                            <h3 className="font-serif font-bold text-sm text-[#493522] flex items-center gap-2 uppercase tracking-wide">
                              <Award className="w-4 h-4 text-[#B18A4C]" />
                              § 6. Core Tenets for Examination
                            </h3>
                            <ul className="space-y-2">
                              {keyPoints.map((point, i) => (
                                <li key={i} className="text-xs font-serif text-[#33271D] flex items-start gap-2">
                                  <span className="text-[#B18A4C] shrink-0 font-bold">◈</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 7. Consolidation & Quick Recap */}
                        <div className="rdr-paper-card rounded-lg p-5 space-y-2 border-l-4 border-l-[#B18A4C]">
                          <h3 className="font-serif font-bold text-sm text-[#493522] flex items-center gap-2 uppercase tracking-wide">
                            <CheckCircle2 className="w-4 h-4 text-[#B18A4C]" />
                            § 7. Consolidation & Quick Recap
                          </h3>
                          <p className="text-xs font-serif leading-relaxed text-[#33271D]">
                            {recap}
                          </p>
                        </div>

                        {/* Journal Bottom Navigation Controls */}
                        <div className="pt-4 border-t border-[#C4B18B] flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {prevTopic ? (
                              <button
                                onClick={() => handleSelectTopic(prevTopic.id)}
                                className="px-3.5 py-2 rounded bg-[#30241B] text-[#E6D4B2] font-serif text-xs font-bold hover:bg-[#493522] transition-colors flex items-center gap-1.5"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Previous Entry</span>
                              </button>
                            ) : (
                              <span className="text-xs font-serif text-[#8C7662]">First Entry</span>
                            )}

                            {nextTopic && (
                              <button
                                onClick={() => handleSelectTopic(nextTopic.id)}
                                className="px-3.5 py-2 rounded bg-[#30241B] text-[#E6D4B2] font-serif text-xs font-bold hover:bg-[#493522] transition-colors flex items-center gap-1.5"
                              >
                                <span>Next Entry</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <button
                            onClick={handleStartTopicQuiz}
                            className="btn-frontier-primary px-6 py-2.5 rounded-lg text-xs font-serif font-bold flex items-center gap-2 shadow-gold-glow"
                          >
                            <span>Enter Challenge Quiz</span>
                            <Brain className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* =========================================================================
                    STAGE 2: QUIZ — CINEMATIC CHALLENGE
                    ========================================================================= */}
                {workflowMode === 'quiz' && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    {quizQuestions.length > 0 ? (
                      <div className="p-6 rounded-2xl bg-[#281F19] border border-[#493522] shadow-leather space-y-6">
                        {/* Progress Header */}
                        <div className="flex items-center justify-between border-b border-[#493522] pb-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C69B56]">
                              CHALLENGE {currentQIndex + 1} OF {quizQuestions.length}
                            </span>
                            <h3 className="text-lg font-serif font-bold text-[#F5EBD8]">
                              Topic Assessment: {activeTopic.title}
                            </h3>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#1C1510] text-[#C69B56] border border-[#B18A4C]/40">
                            {Math.round(((currentQIndex + 1) / quizQuestions.length) * 100)}% Complete
                          </span>
                        </div>

                        {/* Active Question Box */}
                        {quizQuestions[currentQIndex] && (
                          <div className="space-y-5">
                            <div className="p-4 rounded-xl bg-[#1C1510] border border-[#493522]">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-[#D9C39B]/60 block mb-1">
                                {quizQuestions[currentQIndex].questionType || 'Question'}
                              </span>
                              <p className="text-sm sm:text-base font-serif font-semibold text-[#F5EBD8] leading-relaxed">
                                {quizQuestions[currentQIndex].questionText}
                              </p>
                            </div>

                            {/* Options List */}
                            {quizQuestions[currentQIndex].questionType === 'true_false' ? (
                              <div className="grid grid-cols-2 gap-4">
                                {(['True', 'False'] as const).map((tf) => {
                                  const qId = quizQuestions[currentQIndex].id;
                                  const isSelected = normalizeBoolean(selectedAnswers[qId]) === (tf === 'True');
                                  return (
                                    <button
                                      key={tf}
                                      type="button"
                                      onClick={() => setSelectedAnswers({ ...selectedAnswers, [qId]: tf })}
                                      className={`p-4 rounded-xl border text-sm font-serif font-bold transition-all flex items-center justify-center gap-2 ${
                                        isSelected
                                          ? 'border-[#B18A4C] bg-gradient-to-r from-[#C69B56] to-[#B18A4C] text-[#1C1510] shadow-gold-glow'
                                          : 'border-[#493522] bg-[#1C1510] text-[#D9C39B] hover:border-[#B18A4C]/50 hover:bg-[#251A13]'
                                      }`}
                                    >
                                      <span>{tf}</span>
                                      {isSelected && <Check className="w-4 h-4 text-[#1C1510] stroke-[3]" />}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : quizQuestions[currentQIndex].questionType === 'short_answer' && (!quizQuestions[currentQIndex].options || quizQuestions[currentQIndex].options.length === 0) ? (
                              <div className="space-y-2">
                                <label className="text-xs font-serif text-[#D9C39B] font-medium">Type your concise answer:</label>
                                <input
                                  type="text"
                                  placeholder="Enter your answer..."
                                  value={selectedAnswers[quizQuestions[currentQIndex].id] || ''}
                                  onChange={(e) => setSelectedAnswers({ ...selectedAnswers, [quizQuestions[currentQIndex].id]: e.target.value })}
                                  className="w-full text-xs font-serif p-3.5 rounded-xl border border-[#493522] bg-[#1C1510] text-[#F5EBD8] focus:outline-none focus:border-[#B18A4C] focus:ring-1 focus:ring-[#B18A4C]"
                                />
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                {(quizQuestions[currentQIndex].options || []).map((opt, oIdx) => {
                                  const qId = quizQuestions[currentQIndex].id;
                                  const isSelected = selectedAnswers[qId] === opt;
                                  return (
                                    <button
                                      key={oIdx}
                                      type="button"
                                      onClick={() => setSelectedAnswers({ ...selectedAnswers, [qId]: opt })}
                                      className={`w-full text-left p-4 rounded-xl text-xs sm:text-sm font-serif font-medium transition-all flex items-center gap-3 border ${
                                        isSelected
                                          ? 'bg-[#30241B] border-[#B18A4C] text-[#F5EBD8] shadow-gold-glow'
                                          : 'bg-[#1C1510] border-[#493522] text-[#D9C39B] hover:border-[#B18A4C]/50 hover:bg-[#251A13]'
                                      }`}
                                    >
                                      <div
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-colors ${
                                          isSelected
                                            ? 'bg-[#B18A4C] text-[#1C1510]'
                                            : 'bg-[#281F19] text-[#D9C39B]/70 border border-[#493522]'
                                        }`}
                                      >
                                        {String.fromCharCode(65 + oIdx)}
                                      </div>
                                      <span className="flex-1">{opt}</span>
                                      {isSelected && <Check className="w-4 h-4 text-[#C69B56] shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Question Navigation Controls */}
                        <div className="pt-4 border-t border-[#493522] flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                            disabled={currentQIndex === 0}
                            className="px-4 py-2 rounded-lg text-xs font-serif font-semibold text-[#D9C39B]/70 hover:text-[#F5EBD8] disabled:opacity-40"
                          >
                            ← Previous Question
                          </button>

                          {currentQIndex < quizQuestions.length - 1 ? (
                            <button
                              type="button"
                              onClick={() => setCurrentQIndex((prev) => prev + 1)}
                              className="btn-frontier-primary px-6 py-2 rounded-lg text-xs font-serif font-bold flex items-center gap-1.5"
                            >
                              <span>Next Question</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSubmitQuiz}
                              disabled={isSubmittingQuiz}
                              className="btn-frontier-primary px-7 py-2.5 rounded-lg text-xs font-serif font-bold flex items-center gap-2 shadow-gold-glow"
                            >
                              {isSubmittingQuiz ? (
                                <span>Evaluating Results...</span>
                              ) : (
                                <>
                                  <span>Submit Challenge</span>
                                  <CheckCircle2 className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center rounded-2xl bg-[#281F19] border border-[#493522] space-y-4">
                        <Brain className="w-12 h-12 text-[#B18A4C] mx-auto animate-pulse" />
                        <h4 className="text-base font-serif font-bold text-[#F5EBD8]">Generating Grounded Quiz...</h4>
                        <p className="text-xs font-serif text-[#D9C39B]/70 max-w-sm mx-auto">
                          Assembling questions based on your syllabus objectives and study material.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* =========================================================================
                    STAGE 3: RESULTS — YOUR PROGRESS JOURNEY
                    ========================================================================= */}
                {workflowMode === 'results' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="p-6 sm:p-8 rounded-2xl bg-[#281F19] border border-[#B18A4C]/40 shadow-leather space-y-6">
                      {/* Score Header */}
                      <div className="text-center space-y-3 pb-6 border-b border-[#493522]">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#C69B56] font-bold">
                          CHALLENGE EVALUATION COMPLETE
                        </span>
                        <div className="w-24 h-24 rounded-full border-4 border-[#B18A4C] bg-[#1C1510] flex flex-col items-center justify-center mx-auto shadow-gold-glow">
                          <span className="text-3xl font-serif font-extrabold text-[#F5EBD8]">{quizScore}%</span>
                          <span className="text-[10px] font-mono text-[#C69B56]">SCORE</span>
                        </div>
                        <h3 className="text-xl font-serif font-bold text-[#F5EBD8]">
                          {quizScore !== null && quizScore >= 70
                            ? 'Concept Mastered!'
                            : 'Good Effort — Review Recommended'}
                        </h3>
                        <p className="text-xs font-serif text-[#D9C39B]/70 max-w-md mx-auto">
                          {quizScore !== null && quizScore >= 70
                            ? `Outstanding retention. Your mastery score has been recorded in your course ledger.`
                            : `Review your mistake breakdowns below to understand where points were lost before attempting again.`}
                        </p>

                        <div className="flex justify-center gap-3 pt-2">
                          <button
                            onClick={() => handleStartTopicQuiz(true)}
                            className="btn-frontier-secondary px-5 py-2 rounded-lg text-xs font-serif font-semibold flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retry Challenge</span>
                          </button>

                          <button
                            onClick={() => setWorkflowMode('learn')}
                            className="px-5 py-2 rounded-lg text-xs font-serif font-bold bg-[#30241B] border border-[#B18A4C] text-[#D9C39B] hover:bg-[#493522] hover:text-[#F5EBD8] flex items-center gap-1.5"
                          >
                            <ScrollText className="w-3.5 h-3.5 text-[#C69B56]" />
                            <span>Revisit Journal Lesson</span>
                          </button>

                          {nextTopic && (
                            <button
                              onClick={() => handleSelectTopic(nextTopic.id)}
                              className="btn-frontier-primary px-5 py-2 rounded-lg text-xs font-serif font-bold flex items-center gap-1.5"
                            >
                              <span>Advance to Next Topic</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Question Mistake Review Ledger */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-serif font-bold text-[#F5EBD8] flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#B18A4C]" />
                          Question Breakdown & Grounded Explanations
                        </h4>

                        <div className="space-y-3">
                          {quizResultDetails.map((item, idx) => (
                            <div
                              key={idx}
                              className={`p-4 rounded-xl border ${
                                item.isCorrect
                                  ? 'bg-emerald-950/20 border-emerald-500/30'
                                  : 'bg-rose-950/20 border-rose-500/30'
                              } space-y-2`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-xs font-serif font-semibold text-[#F5EBD8]">
                                  Q{idx + 1}: {item.questionText}
                                </span>
                                <span
                                  className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded shrink-0 ${
                                    item.isCorrect
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {item.isCorrect ? 'Correct ✓' : 'Incorrect ✕'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                                <div className="p-2 rounded bg-[#1C1510]/60 border border-[#493522]">
                                  <span className="text-[10px] font-serif text-[#D9C39B]/60 block">Your Answer:</span>
                                  <span className={item.isCorrect ? 'text-emerald-300 font-medium' : 'text-rose-300 font-medium'}>
                                    {item.selectedOption || 'None selected'}
                                  </span>
                                </div>
                                <div className="p-2 rounded bg-[#1C1510]/60 border border-[#493522]">
                                  <span className="text-[10px] font-serif text-[#D9C39B]/60 block">Correct Answer:</span>
                                  <span className="text-emerald-300 font-medium">{item.correctOption}</span>
                                </div>
                              </div>

                              <div className="p-2.5 rounded bg-[#1C1510]/80 text-[11px] text-[#D9C39B] font-serif leading-relaxed border border-[#493522]">
                                <span className="font-bold text-[#C69B56] block mb-0.5">Explanation:</span>
                                {item.explanation}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center rounded-2xl bg-[#281F19] border border-[#493522] space-y-3">
                <ScrollText className="w-12 h-12 text-[#B18A4C] mx-auto" />
                <h3 className="text-base font-serif font-bold text-[#F5EBD8]">Select a Topic from the Ledger</h3>
                <p className="text-xs text-[#D9C39B]/70 max-w-sm mx-auto font-serif">
                  Choose a chapter or entry on the left to open the verified study journal.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL: UPLOAD ADDITIONAL MATERIAL
          ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#281F19] border border-[#B18A4C]/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#493522] pb-3">
              <h3 className="text-sm font-serif font-bold text-[#F5EBD8] flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#B18A4C]" />
                Inscribe Study Material or Notes
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-[#D9C39B] hover:text-[#F5EBD8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadAdditionalDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-serif font-semibold text-[#D9C39B] mb-1">
                  Document Classification
                </label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value as DocumentType)}
                  className="w-full px-3 py-2 text-xs font-serif rounded-lg border border-[#493522] bg-[#1C1510] text-[#F5EBD8] focus:outline-none focus:border-[#B18A4C]"
                >
                  <option value="lecture_notes">Lecture Notes / Slide Deck</option>
                  <option value="textbook">Textbook Chapter / Reference</option>
                  <option value="question_paper">Question Paper / Exam Problems</option>
                  <option value="syllabus">Supplementary Syllabus</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-serif font-semibold text-[#D9C39B] mb-1">
                  Choose File (PDF, DOCX, TXT)
                </label>
                <input
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={(e) => e.target.files?.[0] && setUploadFile(e.target.files[0])}
                  className="w-full text-xs font-serif text-[#D9C39B] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-serif file:font-bold file:bg-[#B18A4C] file:text-[#1C1510] cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#493522]">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg text-xs font-serif font-semibold text-[#D9C39B] hover:text-[#F5EBD8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="btn-frontier-primary px-5 py-1.5 rounded-lg text-xs font-serif font-bold"
                >
                  {isUploading ? 'Processing...' : 'Upload & Map'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

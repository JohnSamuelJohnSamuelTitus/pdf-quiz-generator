import React, { useState, useEffect } from 'react';
import { subjectsApi, quizzesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Subject,
  Topic,
  QuizQuestion,
  DifficultyLevel,
  QuestionType
} from '../../../shared/types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Dialog } from '../components/ui/Dialog';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Filter,
  Check
} from 'lucide-react';

export function QuizHubPage() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  // Configuration States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('computer-science');
  const [selectedTopic, setSelectedTopic] = useState<string>('algorithms-data-structures');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('moderate');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [generationMode, setGenerationMode] = useState<'mixed' | 'original_engine' | 'external_api'>('mixed');
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    'multiple_choice',
    'true_false',
    'short_answer'
  ]);

  // Active Quiz States
  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  // Load subjects
  useEffect(() => {
    subjectsApi.getAll().then((res) => {
      if (res.success && res.subjects.length > 0) {
        setSubjects(res.subjects);
      }
    });
  }, []);

  // Load topics when subject changes
  useEffect(() => {
    if (!selectedSubject) return;
    subjectsApi.getBySlug(selectedSubject).then((res) => {
      if (res.success && res.topics.length > 0) {
        setTopics(res.topics);
        setSelectedTopic(res.topics[0].slug);
      }
    });
  }, [selectedSubject]);

  // Timer interval
  useEffect(() => {
    let interval: any;
    if (timerActive && !quizSubmitted) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, quizSubmitted]);

  const toggleType = (t: QuestionType) => {
    if (selectedTypes.includes(t)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((type) => type !== t));
      } else {
        showToast('At least one question type must be selected', 'info');
      }
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  };

  const handleStartQuiz = async () => {
    setIsSubmitting(true);
    try {
      const res = await quizzesApi.generate({
        subject: selectedSubject,
        topic: selectedTopic,
        difficulty: selectedDifficulty,
        amount: questionCount,
        mode: generationMode,
        questionTypes: selectedTypes
      });

      if (res.success && res.questions.length > 0) {
        setQuestions(res.questions);
        setAnswers({});
        setCurrentIdx(0);
        setElapsedSeconds(0);
        setTimerActive(true);
        setQuizSubmitted(false);
        setResult(null);
        setQuizStarted(true);
        showToast(`Generated ${res.questions.length} questions. Good luck!`, 'success');
      } else {
        showToast('Could not generate questions for this configuration', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Quiz generation failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in to record your assessment score.', 'info');
      return;
    }

    setShowSubmitModal(false);
    setIsSubmitting(true);
    setTimerActive(false);

    const answersPayload = questions.map((q) => ({
      questionId: q.id,
      questionText: q.questionText,
      selectedOption: answers[q.id] || '',
      correctOption: q.correctAnswer,
      explanation: q.explanation,
      questionType: q.questionType
    }));

    try {
      const res = await quizzesApi.submit({
        topicId: selectedTopic,
        difficulty: selectedDifficulty,
        answers: answersPayload,
        timeTakenSeconds: elapsedSeconds
      });

      if (res.success) {
        setQuizSubmitted(true);
        setResult(res.result);
        showToast(`Quiz completed with ${res.result.scorePercentage}%!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Submission failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // =========================================================================
  // VIEW A: QUIZ GENERATOR CONFIGURATION (RDR2 FRONTIER CRUCIBLE)
  // =========================================================================
  if (!quizStarted) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-200">
        <div className="space-y-2">
          <Badge variant="accent">Frontier Assessment Engine</Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5EBD8] font-serif">
            Assessment Crucible
          </h1>
          <p className="text-sm font-serif text-[#D9C39B]/80">
            Configure multi-format challenges powered by verified academic question banks and live Open Trivia DB
          </p>
        </div>

        <Card className="border border-[#493522] bg-[#281F19]/95 backdrop-blur-md shadow-leather">
          <CardHeader className="border-b border-[#493522] pb-4">
            <CardTitle className="text-base font-serif font-bold text-[#F5EBD8] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B18A4C]" />
              Frontier Challenge Parameters
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 text-xs p-6">
            {/* Subject & Topic Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-serif font-semibold text-[#D9C39B] uppercase tracking-wider text-[11px]">
                  Academic Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full text-xs font-serif p-3 rounded-xl border border-[#493522] bg-[#1C1510] text-[#F5EBD8] focus:outline-none focus:border-[#B18A4C] transition-colors"
                >
                  {subjects.map((s) => (
                    <option key={s.slug} value={s.slug} className="bg-[#1C1510] text-[#F5EBD8]">
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="font-serif font-semibold text-[#D9C39B] uppercase tracking-wider text-[11px]">
                  Topic Module
                </label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full text-xs font-serif p-3 rounded-xl border border-[#493522] bg-[#1C1510] text-[#F5EBD8] focus:outline-none focus:border-[#B18A4C] transition-colors"
                >
                  {topics.map((t) => (
                    <option key={t.slug} value={t.slug} className="bg-[#1C1510] text-[#F5EBD8]">
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Generation Engine Mode */}
            <div className="space-y-2">
              <label className="font-serif font-semibold text-[#D9C39B] uppercase tracking-wider text-[11px]">
                Question Generation Source
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'mixed',
                    title: 'Mixed Engine (Recommended)',
                    desc: 'Blends verified original questions with Open Trivia DB'
                  },
                  {
                    id: 'original_engine',
                    title: 'Original Academic Engine',
                    desc: 'Deterministic templates & verified concept rules'
                  },
                  {
                    id: 'external_api',
                    title: 'Open Trivia Database API',
                    desc: 'Real public repository API questions'
                  }
                ].map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setGenerationMode(m.id as any)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      generationMode === m.id
                        ? 'border-[#B18A4C] bg-[#30241B] text-[#F5EBD8] font-semibold shadow-gold-glow'
                        : 'border-[#493522] bg-[#1C1510]/80 text-[#D9C39B]/80 hover:border-[#B18A4C]/50'
                    }`}
                  >
                    <span className="text-[#F5EBD8] block font-serif font-medium">{m.title}</span>
                    <p className="text-[11px] font-serif text-[#D9C39B]/70 font-normal mt-1 leading-snug">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Question Types */}
            <div className="space-y-2">
              <label className="font-serif font-semibold text-[#D9C39B] uppercase tracking-wider text-[11px]">
                Included Question Formats
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'multiple_choice', label: 'Multiple Choice (MCQ)' },
                  { id: 'true_false', label: 'True / False (TF)' },
                  { id: 'short_answer', label: 'Short Answer (SA)' }
                ].map((t) => {
                  const isSelected = selectedTypes.includes(t.id as QuestionType);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleType(t.id as QuestionType)}
                      className={`p-3 rounded-xl border text-xs font-serif font-medium text-center transition-all flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'border-[#B18A4C] bg-[#30241B] text-[#F5EBD8] font-bold shadow-gold-glow'
                          : 'border-[#493522] bg-[#1C1510]/80 text-[#D9C39B]/70 hover:border-[#B18A4C]/50'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#C69B56]" />}
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty & Count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-serif font-semibold text-[#D9C39B] uppercase tracking-wider text-[11px]">
                  Target Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['foundational', 'moderate', 'rigorous'] as DifficultyLevel[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDifficulty(d)}
                      className={`p-2.5 rounded-lg border text-xs font-serif font-medium capitalize text-center transition-all ${
                        selectedDifficulty === d
                          ? 'border-[#B18A4C] bg-gradient-to-r from-[#C69B56] to-[#B18A4C] text-[#1C1510] font-bold shadow-gold-glow'
                          : 'border-[#493522] bg-[#1C1510]/80 text-[#D9C39B]/80 hover:border-[#B18A4C]/50'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-serif font-semibold text-[#D9C39B] uppercase tracking-wider text-[11px]">
                  Number of Questions
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setQuestionCount(num)}
                      className={`p-2.5 rounded-lg border text-xs font-serif font-medium text-center transition-all ${
                        questionCount === num
                          ? 'border-[#B18A4C] bg-gradient-to-r from-[#C69B56] to-[#B18A4C] text-[#1C1510] font-bold shadow-gold-glow'
                          : 'border-[#493522] bg-[#1C1510]/80 text-[#D9C39B]/80 hover:border-[#B18A4C]/50'
                      }`}
                    >
                      {num} Questions
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#493522]">
              <Button
                size="lg"
                variant="primary"
                className="w-full font-serif font-bold shadow-gold-glow"
                onClick={handleStartQuiz}
                isLoading={isSubmitting}
                rightIcon={<Sparkles className="w-4 h-4" />}
              >
                Enter Crucible & Begin
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: ACTIVE QUIZ INTERFACE & NAVIGATION (RDR2 LEATHER & PARCHMENT)
  // =========================================================================
  const currentQ = questions[currentIdx];
  const currentAnswer = answers[currentQ?.id] || '';
  const answeredCount = Object.keys(answers).length;
  const progressPct = Math.round(((currentIdx + 1) / questions.length) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in duration-200">
      {/* Quiz Top Navigation Bar */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-[#493522] bg-[#281F19]/95 backdrop-blur-md shadow-leather">
        <div className="flex items-center gap-2">
          <Badge variant="accent">
            Question {currentIdx + 1} of {questions.length}
          </Badge>
          <span className="text-xs font-serif text-[#D9C39B] capitalize">• {currentQ.questionType.replace('_', ' ')}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[#C69B56]">
            <Clock className="w-3.5 h-3.5 text-[#B18A4C]" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setQuizStarted(false)}
            title="Exit Quiz"
            className="text-[#D9C39B] hover:text-[#F5EBD8]"
          >
            Exit
          </Button>
        </div>
      </div>

      {/* Progress Line */}
      <ProgressBar value={progressPct} showPercentage={false} color="amber" />

      {/* Question Jumper Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {questions.map((q, idx) => {
          const isAnswered = Boolean(answers[q.id]);
          const isCurrent = idx === currentIdx;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(idx)}
              className={`w-8 h-8 rounded-xl text-xs font-serif font-bold shrink-0 transition-all ${
                isCurrent
                  ? 'bg-gradient-to-r from-[#C69B56] to-[#B18A4C] text-[#1C1510] shadow-gold-glow ring-2 ring-[#B18A4C]'
                  : isAnswered
                  ? 'border border-[#B18A4C]/50 bg-[#30241B] text-[#D9C39B]'
                  : 'border border-[#493522] bg-[#1C1510] text-[#8B7861] hover:text-[#F5EBD8]'
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Main Question Card */}
      <Card className="border border-[#493522] bg-[#281F19]/95 backdrop-blur-md shadow-leather">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] font-serif font-bold text-[#C69B56] uppercase tracking-wider">
              {currentQ.category} • {currentQ.difficulty}
            </span>
            <h2 className="text-base sm:text-xl font-serif font-bold text-[#F5EBD8] leading-relaxed">
              {currentQ.questionText}
            </h2>
          </div>

          {/* Formats: Multiple Choice */}
          {currentQ.questionType === 'multiple_choice' && (
            <div className="space-y-3">
              {currentQ.options.map((opt) => {
                const isSelected = currentAnswer === opt;
                return (
                  <div
                    key={opt}
                    onClick={() => {
                      if (!quizSubmitted) {
                        setAnswers({ ...answers, [currentQ.id]: opt });
                      }
                    }}
                    className={`p-4 rounded-xl border text-xs font-serif cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-[#B18A4C] bg-[#30241B] font-bold text-[#F5EBD8] shadow-gold-glow'
                        : 'border-[#493522] bg-[#1C1510]/80 hover:border-[#B18A4C]/50 text-[#D9C39B]'
                    }`}
                  >
                    <span>{opt}</span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-[#B18A4C] bg-[#B18A4C] text-[#1C1510]'
                          : 'border-[#493522]'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Formats: True / False */}
          {currentQ.questionType === 'true_false' && (
            <div className="grid grid-cols-2 gap-4">
              {['True', 'False'].map((tf) => {
                const isSelected = currentAnswer === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => {
                      if (!quizSubmitted) {
                        setAnswers({ ...answers, [currentQ.id]: tf });
                      }
                    }}
                    className={`p-4 rounded-xl border text-sm font-serif font-bold transition-all ${
                      isSelected
                        ? 'border-[#B18A4C] bg-gradient-to-r from-[#C69B56] to-[#B18A4C] text-[#1C1510] shadow-gold-glow'
                        : 'border-[#493522] bg-[#1C1510]/80 text-[#D9C39B] hover:border-[#B18A4C]/50'
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
          )}

          {/* Formats: Short Answer */}
          {currentQ.questionType === 'short_answer' && (
            <div className="space-y-2">
              <label className="text-xs font-serif text-[#D9C39B] font-medium">Type your concise answer:</label>
              <input
                type="text"
                placeholder="Enter term or short answer..."
                value={currentAnswer}
                disabled={quizSubmitted}
                onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                className="w-full text-xs font-serif p-3.5 rounded-xl border border-[#493522] bg-[#1C1510] text-[#F5EBD8] focus:outline-none focus:border-[#B18A4C] focus:ring-1 focus:ring-[#B18A4C]"
              />
            </div>
          )}

          {/* If Submitted: Review Explanation */}
          {quizSubmitted && (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 space-y-2 text-xs font-serif">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Correct Answer: {currentQ.correctAnswer}</span>
              </div>
              <p className="text-[#D9C39B] leading-relaxed">
                {currentQ.explanation}
              </p>
            </div>
          )}

          {/* Bottom Question Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-[#493522]">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Previous
            </Button>

            {currentIdx < questions.length - 1 ? (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Next
              </Button>
            ) : !quizSubmitted ? (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setShowSubmitModal(true)}
                rightIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Review & Submit ({answeredCount}/{questions.length})
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setQuizStarted(false)}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Configure New Quiz
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit Confirmation Modal */}
      <Dialog
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Quiz Assessment?"
        description="Verify that you have reviewed all answers before final evaluation."
      >
        <div className="space-y-4 text-xs font-serif">
          <div className="p-4 rounded-xl border border-[#493522] bg-[#1C1510] space-y-2">
            <div className="flex justify-between font-medium">
              <span className="text-[#D9C39B]">Answered Questions:</span>
              <span className="font-semibold text-[#F5EBD8]">
                {answeredCount} of {questions.length}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-[#D9C39B]">Time Elapsed:</span>
              <span className="font-mono text-[#C69B56]">{formatTimer(elapsedSeconds)}</span>
            </div>
          </div>

          {answeredCount < questions.length && (
            <p className="text-amber-400 flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>You have {questions.length - answeredCount} unanswered questions.</span>
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSubmitModal(false)}>
              Keep Answering
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmitQuiz} isLoading={isSubmitting}>
              Confirm Submission
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

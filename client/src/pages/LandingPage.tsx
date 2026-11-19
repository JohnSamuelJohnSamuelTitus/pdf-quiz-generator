import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useToast } from '../context/ToastContext';
import { quizzesApi } from '../api/client';
import { QuizQuestion, DifficultyLevel, QuestionType } from '../../../shared/types';
import {
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Clock,
  BookOpen,
  Check,
  X,
  Layers,
  Award,
  Zap,
  RefreshCw
} from 'lucide-react';

// Sample preloaded lecture texts for seamless in-class demonstration
const DEMO_SAMPLES = [
  {
    title: 'Operating Systems & Virtual Memory',
    filename: 'CS204_Lecture_Virtual_Memory.pdf',
    text: `Operating Systems Lecture: Virtual Memory Architecture and Paging.
Virtual memory is a memory management technique that provides an idealized abstraction of the storage resources available on a machine.
The Translation Lookaside Buffer (TLB) is a high-speed hardware cache used to reduce the time taken to access a user memory location.
Paging is a memory management scheme by which a computer stores and retrieves data from secondary storage for use in main memory.
Page faults occur when a program accesses a page mapped in the virtual address space but not loaded in physical RAM.
Demand paging is an execution architecture where pages are loaded into main memory only when they are referenced by executing threads.
The Least Recently Used (LRU) algorithm replaces the page that has not been referenced for the longest period of time.
Thrashing happens when a process spends more time executing page replacement operations than executing actual instructions.`
  },
  {
    title: 'Cellular Respiration & ATP Synthesis',
    filename: 'BIO101_Cellular_Respiration.pdf',
    text: `Biology Lecture: Cellular Respiration, Glycolysis, and ATP Production.
Cellular respiration is a metabolic pathway that breaks down glucose and produces adenosine triphosphate (ATP).
Glycolysis is the initial enzymatic pathway that converts glucose into pyruvate in the cytoplasm without requiring oxygen.
The Krebs cycle is a series of chemical reactions used by all aerobic organisms to release stored energy through oxidation of acetyl-CoA.
Mitochondria are double-membraned organelles known as the powerhouse of eukaryotic cells where oxidative phosphorylation takes place.
ATP synthase is an essential enzyme that creates the energy storage molecule adenosine triphosphate from ADP and inorganic phosphate.
The electron transport chain is a cluster of proteins that transfer electrons through a membrane to create a proton gradient.`
  },
  {
    title: 'Thermodynamics & Heat Transfer',
    filename: 'PHYS105_Thermodynamics_Summary.pdf',
    text: `Physics Lecture: Principles of Thermodynamics and Heat Transfer.
The First Law of Thermodynamics states that energy cannot be created or destroyed in an isolated system, only transformed from one form to another.
The Second Law of Thermodynamics states that the total entropy of an isolated system always increases over time towards thermodynamic equilibrium.
Entropy is a fundamental thermodynamic quantity representing the degree of disorder or randomness in a physical system.
The Carnot cycle defines an idealized thermodynamic engine cycle that achieves the maximum possible theoretical efficiency.
Heat conduction is the transfer of internal energy by microscopic collisions of particles and movement of electrons within a body.
Absolute zero is the lowest limit of the thermodynamic temperature scale where entropy and particle thermal motion reach a minimum.`
  }
];

export function LandingPage() {
  const { addToast } = useToast();

  // Mode and file upload state
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quiz config state
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('moderate');
  const [questionTypes, setQuestionTypes] = useState<'mixed' | 'mcq' | 'tf'>('mixed');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Generated Quiz state
  const [quizData, setQuizData] = useState<{
    document: { title: string; filename: string; pageCount: number; wordCount: number };
    questions: QuizQuestion[];
  } | null>(null);

  // Active Quiz Interactive state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Listen for Navbar reset event
  useEffect(() => {
    const handleReset = () => {
      handleResetAll();
    };
    window.addEventListener('reset-pdf-quiz', handleReset);
    return () => window.removeEventListener('reset-pdf-quiz', handleReset);
  }, []);

  // Timer while taking quiz
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (quizData && !quizSubmitted && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [quizData, quizSubmitted, startTime]);

  const handleResetAll = () => {
    setQuizData(null);
    setCurrentIdx(0);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setSelectedFile(null);
    setPastedText('');
    setGenerationError(null);
    setIsGenerating(false);
    setStartTime(null);
    setElapsedTime(0);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setGenerationError(null);
    const validExts = ['.pdf', '.txt', '.docx'];
    const isValid = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!isValid) {
      setGenerationError('Please upload a PDF, DOCX, or TXT file.');
      addToast('Please upload a PDF, DOCX, or TXT file.', 'error');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setGenerationError('File exceeds 25MB maximum limit.');
      addToast('File exceeds 25MB maximum limit.', 'error');
      return;
    }
    setSelectedFile(file);
    addToast(`Selected "${file.name}"`, 'info');
  };

  const handleSelectSample = (sample: typeof DEMO_SAMPLES[0]) => {
    setActiveTab('paste');
    setPastedText(sample.text);
    setGenerationError(null);
    addToast(`Loaded demo: "${sample.title}"`, 'info');
  };

  const handleGenerateQuiz = async () => {
    setGenerationError(null);

    if (activeTab === 'upload' && !selectedFile) {
      setGenerationError('Please select or drag a PDF document to generate a quiz.');
      addToast('Please choose a PDF file first.', 'error');
      return;
    }

    if (activeTab === 'paste' && !pastedText.trim()) {
      setGenerationError('Please paste some text or notes to generate a quiz.');
      addToast('Please enter some text first.', 'error');
      return;
    }

    setIsGenerating(true);
    setGenerationStep('Extracting text and analyzing document structure...');

    try {
      const formData = new FormData();
      if (activeTab === 'upload' && selectedFile) {
        formData.append('file', selectedFile);
      } else {
        formData.append('text', pastedText);
      }
      formData.append('amount', String(questionCount));
      formData.append('difficulty', difficulty);

      let typesParam = 'multiple_choice,true_false';
      if (questionTypes === 'mcq') typesParam = 'multiple_choice';
      if (questionTypes === 'tf') typesParam = 'true_false';
      formData.append('questionTypes', typesParam);

      setGenerationStep('Identifying key concepts, definitions, and questions...');

      const res = await quizzesApi.generateFromPdf(formData);

      if (!res.success || !res.questions || res.questions.length === 0) {
        throw new Error('Could not generate questions from this document. Please verify the document text.');
      }

      setGenerationStep('Finalizing interactive quiz...');
      setQuizData(res);
      setCurrentIdx(0);
      setSelectedAnswers({});
      setQuizSubmitted(false);
      setStartTime(Date.now());
      setElapsedTime(0);
      addToast(`Generated ${res.questions.length} questions successfully!`, 'success');

      // Scroll smoothly down to the quiz
      setTimeout(() => {
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('[LandingPage] Quiz Generation error:', err);
      const msg = err.message || 'Failed to generate quiz from document.';
      setGenerationError(msg);
      addToast(msg, 'error');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleSelectOption = (questionId: string, option: string) => {
    if (quizSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleSubmitQuiz = () => {
    if (!quizData) return;
    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < quizData.questions.length) {
      const confirmSubmit = window.confirm(
        `You have only answered ${answeredCount} of ${quizData.questions.length} questions. Submit anyway?`
      );
      if (!confirmSubmit) return;
    }
    setQuizSubmitted(true);
    addToast('Quiz submitted! Review your score and answers below.', 'success');
  };

  // Score Calculation
  const calculateScore = () => {
    if (!quizData) return { correct: 0, total: 0, percentage: 0 };
    let correct = 0;
    quizData.questions.forEach((q) => {
      const userChoice = selectedAnswers[q.id];
      if (userChoice && userChoice.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
        correct++;
      }
    });
    const total = quizData.questions.length;
    const percentage = Math.round((correct / total) * 100);
    return { correct, total, percentage };
  };

  const score = calculateScore();

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-indigo-600 selection:text-white">
      {/* Background ambient dark gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-950/25 via-zinc-950/80 to-zinc-950 pointer-events-none -z-10" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
        {/* =========================================================================
            HEADER & HERO SECTION (Clean, Minimal, High-Contrast)
            ========================================================================= */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-indigo-400 text-xs font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Document Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Upload PDF. <span className="text-indigo-400">Generate Quiz.</span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Upload any class PDF, lecture slides, or textbook chapter to instantly generate multiple choice and true/false questions with answer explanations.
          </p>
        </section>

        {/* =========================================================================
            UPLOAD & QUIZ CONFIGURATION CARD
            ========================================================================= */}
        {!quizData && (
          <Card className="border-zinc-800 bg-zinc-900/90 shadow-2xl">
            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Tab Selector: Upload vs Paste */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                      activeTab === 'upload'
                        ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    Upload Document (PDF / DOCX)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('paste')}
                    className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                      activeTab === 'paste'
                        ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    Paste Text / Notes
                  </button>
                </div>

                <span className="hidden sm:inline-block text-[11px] text-zinc-500 font-medium">
                  Max 25MB • Up to 20 Questions
                </span>
              </div>

              {/* Upload Dropzone */}
              {activeTab === 'upload' ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 ${
                    dragActive
                      ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10'
                      : selectedFile
                      ? 'border-emerald-600/60 bg-emerald-950/10'
                      : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 hover:bg-zinc-950/90'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center justify-center">
                        <FileText className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <div className="space-y-1 text-center">
                        <p className="text-base font-semibold text-white">{selectedFile.name}</p>
                        <p className="text-xs text-zinc-400">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 font-medium underline pt-1"
                      >
                        Remove and select another file
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700 text-zinc-300 flex items-center justify-center">
                        <Upload className="w-6 h-6 stroke-[2]" />
                      </div>
                      <div className="space-y-1 text-center">
                        <p className="text-sm sm:text-base font-medium text-white">
                          Drag and drop your PDF here, or <span className="text-indigo-400 hover:underline">browse files</span>
                        </p>
                        <p className="text-xs text-zinc-500">
                          Supports PDF, DOCX, and TXT files
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste lecture content, notes, or chapter paragraphs here..."
                    rows={6}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>{pastedText.split(/\s+/).filter(Boolean).length} words</span>
                    <span>Min. ~30 words recommended</span>
                  </div>
                </div>
              )}

              {/* Demo Preloaded Buttons for Quick Presentation */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Quick Demo Samples (1-Click in Class):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {DEMO_SAMPLES.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSample(sample)}
                      className="p-3 text-left rounded-xl bg-zinc-950/70 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all text-xs group"
                    >
                      <div className="font-semibold text-white group-hover:text-indigo-300 truncate">
                        {sample.title}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                        {sample.filename}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quiz Settings Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
                {/* 1. Question Count */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-300">Question Count</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[5, 10, 15].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setQuestionCount(cnt)}
                        className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                          questionCount === cnt
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {cnt} Qs
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Difficulty Level */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-300">Difficulty</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['foundational', 'moderate', 'rigorous'] as DifficultyLevel[]).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setDifficulty(diff)}
                        className={`py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                          difficulty === diff
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {diff === 'foundational' ? 'Easy' : diff === 'moderate' ? 'Med' : 'Hard'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Question Format */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-300">Question Types</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'mixed', label: 'Mixed' },
                      { id: 'mcq', label: 'MCQs' },
                      { id: 'tf', label: 'T / F' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setQuestionTypes(type.id as any)}
                        className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                          questionTypes === type.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Error Message if any */}
              {generationError && (
                <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-200 text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{generationError}</span>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <Button
                  onClick={handleGenerateQuiz}
                  isLoading={isGenerating}
                  className="w-full py-3.5 text-base font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 rounded-xl"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span>{isGenerating ? generationStep : 'Generate Quiz from PDF'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* =========================================================================
            ACTIVE INTERACTIVE QUIZ INTERFACE
            ========================================================================= */}
        {quizData && (
          <div className="space-y-6">
            {/* Top Status Bar: Document Metadata & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-white text-sm">
                    {quizData.document.title || quizData.document.filename}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span>{quizData.questions.length} Questions</span>
                  <span>•</span>
                  <span className="capitalize">{difficulty} Difficulty</span>
                  <span>•</span>
                  <span>{quizData.document.wordCount} words analyzed</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-300 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{formatSeconds(elapsedTime)}</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetAll}
                  className="text-xs border-zinc-700 text-zinc-300 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  New PDF
                </Button>
              </div>
            </div>

            {/* Quiz Progress Bar */}
            {!quizSubmitted && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-medium text-zinc-400">
                  <span>
                    Question {currentIdx + 1} of {quizData.questions.length}
                  </span>
                  <span>
                    {Object.keys(selectedAnswers).length} answered
                  </span>
                </div>
                <ProgressBar
                  value={((currentIdx + 1) / quizData.questions.length) * 100}
                  color="indigo"
                  showPercentage={false}
                />
              </div>
            )}

            {/* If NOT Submitted: Current Active Question View */}
            {!quizSubmitted ? (
              <Card className="border-zinc-800 bg-zinc-900 shadow-2xl">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  {/* Question Header */}
                  <div className="flex items-center justify-between">
                    <Badge variant="accent" size="sm">
                      {quizData.questions[currentIdx].questionType === 'true_false'
                        ? 'True / False'
                        : 'Multiple Choice'}
                    </Badge>
                    <span className="text-xs text-zinc-500 font-mono">
                      Q {currentIdx + 1} of {quizData.questions.length}
                    </span>
                  </div>

                  {/* Question Text */}
                  <h2 className="text-lg sm:text-xl font-semibold text-white leading-relaxed">
                    {quizData.questions[currentIdx].questionText}
                  </h2>

                  {/* Options List */}
                  <div className="space-y-3 pt-2">
                    {quizData.questions[currentIdx].options.map((opt, oIdx) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      const isSelected = selectedAnswers[quizData.questions[currentIdx].id] === opt;

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSelectOption(quizData.questions[currentIdx].id, opt)}
                          className={`w-full p-4 text-left rounded-xl border transition-all flex items-start gap-3.5 ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-950/40 text-white font-medium shadow-md shadow-indigo-500/10'
                              : 'border-zinc-800 bg-zinc-950/70 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-200'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="text-sm leading-relaxed">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Question Jumps & Navigation */}
                  <div className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Quick Numbers Bar */}
                    <div className="flex flex-wrap gap-1.5">
                      {quizData.questions.map((q, idx) => {
                        const isAns = !!selectedAnswers[q.id];
                        const isCurr = idx === currentIdx;

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCurrentIdx(idx)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                              isCurr
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : isAns
                                ? 'bg-zinc-800 text-emerald-400 border border-emerald-800/60'
                                : 'bg-zinc-950 text-zinc-500 hover:text-white border border-zinc-800'
                            }`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>

                    {/* Prev / Next / Submit Controls */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={currentIdx === 0}
                        onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                        className="text-xs"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                        Previous
                      </Button>

                      {currentIdx < quizData.questions.length - 1 ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setCurrentIdx((prev) => Math.min(quizData.questions.length - 1, prev + 1))}
                          className="text-xs"
                        >
                          <span>Next</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSubmitQuiz}
                          className="text-xs bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 font-bold"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          <span>Submit Quiz</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* =========================================================================
                 QUIZ SCORE & DETAILED REVIEW SECTION (Post-Submission)
                 ========================================================================= */
              <div className="space-y-6">
                {/* Score Summary Banner */}
                <Card className="border-zinc-800 bg-zinc-900/90 shadow-2xl text-center p-6 sm:p-10">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-indigo-950 border border-indigo-700/60 text-indigo-400 shadow-xl shadow-indigo-500/10">
                      <Award className="w-8 h-8 stroke-[2.2]" />
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                        {score.percentage}%
                      </h2>
                      <p className="text-sm font-medium text-zinc-300">
                        {score.correct} out of {score.total} questions correct
                      </p>
                      <p className="text-xs text-zinc-500 font-mono">
                        Completed in {formatSeconds(elapsedTime)}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedAnswers({});
                          setQuizSubmitted(false);
                          setCurrentIdx(0);
                          setStartTime(Date.now());
                          setElapsedTime(0);
                        }}
                        className="text-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        Retake Quiz
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleResetAll}
                        className="text-xs"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Upload Another PDF
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Detailed Questions & Answers Breakdown */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Detailed Answer Key & Grounded Explanations</span>
                  </h3>

                  {quizData.questions.map((q, idx) => {
                    const userChoice = selectedAnswers[q.id];
                    const isCorrect =
                      userChoice &&
                      userChoice.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();

                    return (
                      <Card
                        key={q.id}
                        className={`border ${
                          isCorrect ? 'border-emerald-800/60 bg-zinc-900/90' : 'border-rose-800/60 bg-zinc-900/90'
                        }`}
                      >
                        <CardContent className="p-5 sm:p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-zinc-400">
                              Question #{idx + 1}
                            </span>
                            {isCorrect ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
                                <Check className="w-3 h-3" /> Correct
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-800/60">
                                <X className="w-3 h-3" /> Incorrect
                              </span>
                            )}
                          </div>

                          <p className="text-sm sm:text-base font-medium text-white leading-relaxed">
                            {q.questionText}
                          </p>

                          {/* Options view */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {q.options.map((opt, oIdx) => {
                              const isThisCorrect =
                                opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
                              const isThisSelected = userChoice === opt;

                              let cardStyle = 'border-zinc-800 bg-zinc-950/50 text-zinc-400';
                              if (isThisCorrect) {
                                cardStyle = 'border-emerald-600 bg-emerald-950/40 text-emerald-200 font-semibold';
                              } else if (isThisSelected && !isThisCorrect) {
                                cardStyle = 'border-rose-600 bg-rose-950/40 text-rose-200 font-semibold';
                              }

                              return (
                                <div
                                  key={oIdx}
                                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${cardStyle}`}
                                >
                                  <span>{opt}</span>
                                  {isThisCorrect && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                                  {isThisSelected && !isThisCorrect && <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                                </div>
                              );
                            })}
                          </div>

                          {/* Grounded Explanation Box */}
                          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-300 space-y-1">
                            <span className="font-semibold text-indigo-400 block">
                              Source Explanation:
                            </span>
                            <p className="leading-relaxed text-zinc-300">
                              {q.explanation}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

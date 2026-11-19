import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { projectsApi, documentsApi, syllabusApi } from '../api/client';
import {
  LearningProject,
  ParsedSyllabusResult,
  ParsedSyllabusUnit,
  ParsedSyllabusTopic
} from '../../../shared/types';
import {
  Upload,
  FileText,
  BookOpen,
  Brain,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Database,
  ShieldCheck,
  Layers,
  GraduationCap,
  Activity,
  FolderOpen,
  Calendar,
  Compass,
  Search,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  X,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  Award,
  Zap,
  Flame,
  Bookmark,
  ScrollText
} from 'lucide-react';

const SAMPLE_SYLLABI = [
  {
    label: 'CSE279 Distributed Systems',
    code: 'CSE279',
    text: `Course: CSE279 Distributed Systems & Consensus
Instructor: Dept. of Computer Science

Unit 1: Foundations of Distributed Consensus
- Introduction to Distributed Systems and Network Models
  * Synchronous vs Asynchronous Network Models
  * Network Partitions and Latency Bounds
- Byzantine Fault Tolerance and Safety vs Liveness
  * FLP Impossibility Result
  * Quorum Intersection Properties
- Paxos and Raft Consensus Protocols
  * Leader Election Algorithms
  * Log Compaction and State Machine Replication

Unit 2: Distributed Data Storage & Replication
- CAP Theorem and ACID vs BASE Consistency
  * PACELC Model
  * Eventual Consistency Guarantees
- Consistent Hashing and Dynamo-style Key-Value Stores
  * Virtual Nodes and Rebalancing
  * Vector Clocks and Conflict Resolution
- Two-Phase Commit and Distributed Transactions
  * Prepared State and Coordinator Failure Modes

Unit 3: Peer-to-Peer Networks and Fault Recovery
- Chord Distributed Hash Table and Gossip Protocols
  * Finger Tables and O(log N) Routing
  * Epidemic Dissemination
- Failure Detectors and Heartbeat Mechanisms
  * Phi Accrual Failure Detector`
  },
  {
    label: 'Operating Systems & Concurrency',
    code: 'CS204',
    text: `Course: Operating Systems & Virtualization
Course Code: CS204

Unit 1: Process Management & Concurrency
- Process Lifecycle, PCB, and Context Switching
  * State Transitions (Ready, Running, Blocked)
  * CPU Scheduling (Round Robin, Multilevel Feedback)
- Multithreading Models and Kernel vs User Threads
  * Many-to-One vs One-to-One Thread Mapping
- Mutual Exclusion, Semaphores, and Deadlock Prevention
  * Peterson's Algorithm
  * Banker's Resource Allocation Algorithm

Unit 2: Memory Management & Paging
- Virtual Memory Architecture and Translation Lookaside Buffer
  * Page Table Walks and Multi-level Paging
- Demand Paging and Page Replacement Algorithms
  * FIFO, LRU, and Second-Chance Clock
- Segmentation and Protection Rings
  * Hardware Memory Protection and Page Faults

Unit 3: File Systems & Storage I/O
- File Allocation Methods and Inode Structure
  * Direct, Indirect, and Double Indirect Pointers
- Disk Scheduling Algorithms (SCAN, C-LOOK)`
  },
  {
    label: 'Data Structures & Algorithms',
    code: 'CS102',
    text: `Course: Advanced Data Structures & Algorithm Design
Course Code: CS102

Unit 1: Balanced Trees & Priority Queues
- Red-Black Trees and AVL Rotations
  * Left and Right Single Rotations
  * Double Rotations and Invariant Maintenance
- B-Trees and Multiway Indexing
  * Node Splitting and Merging
  * B+ Tree Range Queries
- Binary Heaps and Fibonacci Heaps
  * Amortized Decreased-Key Complexity

Unit 2: Graph Algorithms & Network Flow
- Dijkstra's Shortest Path and Bellman-Ford
  * Priority Queue Optimization
  * Negative Cycle Detection
- Minimum Spanning Trees (Kruskal and Prim)
  * Disjoint-Set Union-Find with Path Compression
- Ford-Fulkerson Algorithm and Max-Flow Min-Cut
  * Edmonds-Karp Implementation

Unit 3: Dynamic Programming & Complexity
- Memoization vs Tabulation Paradigms
  * Optimal Substructure and Overlapping Subproblems
- NP-Completeness and Polynomial Reductions
  * 3-SAT to Vertex Cover Reduction`
  }
];

export function LandingPage() {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [title, setTitle] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [targetExamDate, setTargetExamDate] = useState('');
  const [syllabusText, setSyllabusText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Analysis & Staged Feedback State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStage, setAnalyzingStage] = useState('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [ocrWarning, setOcrWarning] = useState<string | null>(null);

  // Interactive Review Modal State (Frontier Journal)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<ParsedSyllabusResult | null>(null);
  const [expandedUnitIdx, setExpandedUnitIdx] = useState<number | null>(0);
  const [newSubtopicInputs, setNewSubtopicInputs] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  const [recentProjects, setRecentProjects] = useState<LearningProject[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadConsoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRecentProjects();
  }, []);

  const loadRecentProjects = async () => {
    try {
      const res = await projectsApi.getAll();
      if (res.success && res.projects) {
        setRecentProjects(res.projects);
      }
    } catch {}
  };

  const scrollToUpload = () => {
    uploadConsoleRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileSelected = (file: File) => {
    setAnalysisError(null);
    setOcrWarning(null);

    const validExtensions = ['.pdf', '.txt', '.docx'];
    const isVal = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!isVal) {
      setAnalysisError('Invalid file format. Please upload a PDF, TXT, or DOCX document.');
      addToast('Please upload a PDF, TXT, or DOCX document.', 'error');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setAnalysisError('Document exceeds maximum 25MB limit.');
      addToast('Document exceeds maximum 25MB limit.', 'error');
      return;
    }
    setSelectedFile(file);
    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleSelectSample = (sample: typeof SAMPLE_SYLLABI[0]) => {
    setActiveTab('paste');
    setTitle(sample.label);
    setSubjectCode(sample.code);
    setSyllabusText(sample.text);
    setAnalysisError(null);
    setOcrWarning(null);
    addToast(`Sample syllabus loaded for "${sample.label}"`, 'info');
  };

  /**
   * Stage 1: Analyze & Preview Syllabus
   */
  const handleAnalyzeSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnalysisError(null);
    setOcrWarning(null);

    if (activeTab === 'upload' && !selectedFile) {
      setAnalysisError('Please choose or drag-and-drop a syllabus document.');
      addToast('Please choose a document to upload.', 'error');
      return;
    }

    if (activeTab === 'paste' && !syllabusText.trim()) {
      setAnalysisError('Please paste your university syllabus text.');
      addToast('Please paste your syllabus text.', 'error');
      return;
    }

    setIsAnalyzing(true);
    setAnalyzingStage('Reading and extracting syllabus text buffer...');

    try {
      const formData = new FormData();
      if (activeTab === 'upload' && selectedFile) {
        formData.append('file', selectedFile);
      } else {
        formData.append('text', syllabusText);
      }
      if (title.trim()) formData.append('courseTitle', title.trim());
      if (subjectCode.trim()) formData.append('courseCode', subjectCode.trim());

      setAnalyzingStage('Classifying Units and detecting academic hierarchy...');

      const res = await syllabusApi.preview({
        file: activeTab === 'upload' ? selectedFile || undefined : undefined,
        rawText: activeTab === 'paste' ? syllabusText : undefined,
        fallbackTitle: title.trim() || undefined
      });

      if (!res.success || !res.units || res.units.length === 0) {
        throw new Error(res.error || 'Could not detect structured units or topics from the syllabus.');
      }

      setAnalyzingStage('Assembling topic ledger...');

      if (res.ocrRequired) {
        setOcrWarning(
          res.ocrMessage || 'Notice: Scanned document detected with limited selectable text. We extracted all readable characters.'
        );
      }

      setPreviewData(res);
      setIsAnalyzing(false);
      setAnalyzingStage('');
      setIsPreviewOpen(true);
    } catch (err: any) {
      console.error('[LandingPage] Syllabus analysis error:', err);
      setAnalysisError(err.message || 'Failed to process syllabus. Please verify document contents.');
      addToast(err.message || 'Failed to analyze syllabus.', 'error');
      setIsAnalyzing(false);
      setAnalyzingStage('');
    }
  };

  /**
   * Stage 2: Confirm & Create Workspace
   */
  const handleConfirmCurriculum = async () => {
    if (!previewData || previewData.units.length === 0) {
      addToast('Curriculum must contain at least one unit.', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const finalTitle = previewData.courseTitle || title.trim() || 'Personalized Curriculum';
      const finalCode = previewData.courseCode || subjectCode.trim() || undefined;

      const projectRes = await projectsApi.create({
        title: finalTitle,
        subjectCode: finalCode,
        targetExamDate: targetExamDate || undefined,
        rawSyllabusText: activeTab === 'paste' ? syllabusText : undefined,
        reviewedUnits: previewData.units
      });

      if (!projectRes.success || !projectRes.project) {
        throw new Error('Project initialization failed');
      }

      const projectId = projectRes.project.id;

      if (activeTab === 'upload' && selectedFile) {
        try {
          await documentsApi.upload(projectId, selectedFile, 'syllabus');
        } catch (uploadErr) {
          console.warn('[LandingPage] Document attachment warning:', uploadErr);
        }
      }

      addToast('Personalized learning space generated successfully!', 'success');
      setIsPreviewOpen(false);
      navigate(`/project/${projectId}`);
    } catch (err: any) {
      console.error('[LandingPage] Project creation error:', err);
      addToast(err.message || 'Failed to create learning space. Please try again.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Review Modal Helper Mutations
  const handleUpdateUnitTitle = (uIdx: number, newTitle: string) => {
    if (!previewData) return;
    const updatedUnits = [...previewData.units];
    updatedUnits[uIdx].title = newTitle;
    setPreviewData({ ...previewData, units: updatedUnits });
  };

  const handleDeleteUnit = (uIdx: number) => {
    if (!previewData) return;
    const updatedUnits = previewData.units.filter((_, idx) => idx !== uIdx);
    setPreviewData({ ...previewData, units: updatedUnits });
  };

  const handleAddUnit = () => {
    if (!previewData) return;
    const nextNum = previewData.units.length + 1;
    const newUnit: ParsedSyllabusUnit = {
      unitNumber: nextNum,
      title: `Unit ${nextNum}: New Module`,
      description: 'Study module covering new course concepts.',
      topics: [
        {
          title: 'Core Concepts & Principles',
          slug: `unit-${nextNum}-core`,
          summary: 'Foundational introduction to key principles and techniques.',
          estimatedMinutes: 25,
          difficultyLevel: 'foundational',
          subtopics: ['Overview & Definitions', 'Standard Methods']
        }
      ]
    };
    setPreviewData({ ...previewData, units: [...previewData.units, newUnit] });
    setExpandedUnitIdx(previewData.units.length);
  };

  const handleUpdateTopic = (
    uIdx: number,
    tIdx: number,
    field: keyof ParsedSyllabusTopic,
    val: any
  ) => {
    if (!previewData) return;
    const updatedUnits = [...previewData.units];
    const topic = { ...updatedUnits[uIdx].topics[tIdx], [field]: val };
    updatedUnits[uIdx].topics[tIdx] = topic;
    setPreviewData({ ...previewData, units: updatedUnits });
  };

  const handleDeleteTopic = (uIdx: number, tIdx: number) => {
    if (!previewData) return;
    const updatedUnits = [...previewData.units];
    updatedUnits[uIdx].topics = updatedUnits[uIdx].topics.filter((_, idx) => idx !== tIdx);
    setPreviewData({ ...previewData, units: updatedUnits });
  };

  const handleAddTopic = (uIdx: number) => {
    if (!previewData) return;
    const updatedUnits = [...previewData.units];
    const newTopic: ParsedSyllabusTopic = {
      title: 'New Study Topic',
      slug: 'new-study-topic',
      summary: 'In-depth analytical study of key topic concepts and applications.',
      estimatedMinutes: 25,
      difficultyLevel: 'moderate',
      subtopics: ['Key Concept Definitions', 'Problem-Solving Examples']
    };
    updatedUnits[uIdx].topics.push(newTopic);
    setPreviewData({ ...previewData, units: updatedUnits });
  };

  const handleAddSubtopic = (uIdx: number, tIdx: number) => {
    const key = `${uIdx}-${tIdx}`;
    const text = (newSubtopicInputs[key] || '').trim();
    if (!text || !previewData) return;

    const updatedUnits = [...previewData.units];
    const topic = updatedUnits[uIdx].topics[tIdx];
    topic.subtopics = [...(topic.subtopics || []), text];
    setPreviewData({ ...previewData, units: updatedUnits });
    setNewSubtopicInputs({ ...newSubtopicInputs, [key]: '' });
  };

  const handleDeleteSubtopic = (uIdx: number, tIdx: number, sIdx: number) => {
    if (!previewData) return;
    const updatedUnits = [...previewData.units];
    const topic = updatedUnits[uIdx].topics[tIdx];
    topic.subtopics = (topic.subtopics || []).filter((_, idx) => idx !== sIdx);
    setPreviewData({ ...previewData, units: updatedUnits });
  };

  const totalTopicsCount = previewData?.units.reduce((acc, u) => acc + u.topics.length, 0) || 0;
  const totalSubtopicsCount =
    previewData?.units.reduce(
      (acc, u) => acc + u.topics.reduce((tAcc, t) => tAcc + (t.subtopics?.length || 0), 0),
      0
    ) || 0;

  return (
    <div className="min-h-screen bg-[#211A15] text-[#F5EBD8] relative overflow-hidden selection:bg-[#B18A4C] selection:text-[#211A15]">
      {/* =========================================================================
          HERO SECTION — CINEMATIC RED DEAD REDEMPTION 2 FRONTIER EXPERIENCE
          ========================================================================= */}
      <section className="relative pt-10 pb-20 lg:pt-16 lg:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Large Cinematic Western Landscape Hero Background */}
        <div className="absolute inset-x-4 top-4 bottom-12 rounded-3xl overflow-hidden border border-[#493522] shadow-2xl -z-10">
          <img
            src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=80"
            alt="Cinematic Western Frontier Mountain Landscape at Sunset"
            className="w-full h-full object-cover object-center brightness-[0.38] contrast-[1.15] filter"
            loading="eager"
          />
          {/* Rich Vignette and Leather Gradient Overlay for Impeccable Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#211A15] via-[#211A15]/80 to-[#211A15]/60" />
          <div className="absolute inset-0 rdr-vignette" />
        </div>

        <div className="text-center space-y-6 max-w-4xl mx-auto pt-8 sm:pt-14 relative z-10">
          {/* Frontier Stamp Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#30241B]/90 border border-[#B18A4C]/50 shadow-leather">
            <span className="w-2 h-2 rounded-full bg-[#C69B56] animate-pulse" />
            <span className="text-xs uppercase font-serif tracking-widest text-[#D9C39B] font-semibold">
              The Academic Frontier • Every Chapter Is A Journey
            </span>
          </div>

          {/* Hero Heading: EXACT USER SPECIFICATION */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-extrabold tracking-tight leading-[1.08] text-[#F5EBD8] drop-shadow-lg">
            <span className="block">YOUR KNOWLEDGE.</span>
            <span className="block text-[#C69B56] drop-shadow-[0_2px_15px_rgba(198,155,86,0.3)]">
              YOUR JOURNEY. YOUR FRONTIER.
            </span>
          </h1>

          {/* Supporting Text: EXACT USER SPECIFICATION */}
          <p className="text-base sm:text-lg lg:text-xl text-[#D9C39B] max-w-2xl mx-auto leading-relaxed font-serif">
            Every great journey begins with a single step. Turn your syllabus into a learning journey, explore every topic and build your knowledge one chapter at a time.
          </p>

          {/* Composed CTA Buttons: EXACT USER SPECIFICATION */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={scrollToUpload}
              className="btn-frontier-primary px-8 py-3.5 rounded-xl text-sm font-serif font-bold flex items-center gap-2 tracking-wider shadow-gold-glow"
            >
              <span>BEGIN YOUR JOURNEY</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>

            <Link to="/workspace">
              <button className="btn-frontier-secondary px-7 py-3.5 rounded-xl text-sm font-serif font-semibold flex items-center gap-2 border border-[#B18A4C]/60 hover:border-[#C69B56]">
                <Compass className="w-4 h-4 text-[#C69B56]" />
                <span>EXPLORE LEARNSPHERE</span>
              </button>
            </Link>
          </div>

          {/* Metrics Strip */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-[#8B7861] font-serif">
            <span className="flex items-center gap-1.5 text-[#D9C39B]">
              <Check className="w-3.5 h-3.5 text-[#C69B56]" /> Zero Mandatory Registration
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-[#D9C39B]">
              <Check className="w-3.5 h-3.5 text-[#C69B56]" /> 8 Free Public Educational APIs
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-[#D9C39B]">
              <Check className="w-3.5 h-3.5 text-[#86EFAC]" /> 100% Grounded in Your Syllabus
            </span>
          </div>
        </div>

        {/* =========================================================================
            SECTION 6: SYLLABUS UPLOAD — START YOUR JOURNEY
            Aged-paper upload panel framed by dark leather surroundings
            ========================================================================= */}
        <div ref={uploadConsoleRef} className="mt-14 sm:mt-20 max-w-3xl mx-auto relative z-10">
          <div className="rounded-2xl bg-[#30241B] border-2 border-[#493522] shadow-2xl p-6 sm:p-8 relative overflow-hidden">
            {/* Top Gold Trim */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#B18A4C] to-transparent" />

            {/* Header: Exact User Specification */}
            <div className="text-center space-y-1.5 mb-6 border-b border-[#493522] pb-5">
              <span className="rdr-chapter-badge">EXPEDITION DISPATCH</span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#F5EBD8] tracking-wide mt-2">
                START A NEW CHAPTER
              </h2>
              <p className="text-xs sm:text-sm text-[#D9C39B] font-serif max-w-lg mx-auto">
                Bring your syllabus. We&apos;ll help you explore every topic.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center justify-between border-b border-[#493522] pb-4 mb-5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('upload');
                    setAnalysisError(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-serif font-bold transition-all ${
                    activeTab === 'upload'
                      ? 'bg-[#493522] text-[#C69B56] border border-[#B18A4C] shadow-sm'
                      : 'text-[#8B7861] hover:text-[#F5EBD8] hover:bg-[#3D2D21]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Syllabus Document</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('paste');
                    setAnalysisError(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-serif font-bold transition-all ${
                    activeTab === 'paste'
                      ? 'bg-[#493522] text-[#C69B56] border border-[#B18A4C] shadow-sm'
                      : 'text-[#8B7861] hover:text-[#F5EBD8] hover:bg-[#3D2D21]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste Syllabus Text</span>
                </button>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-[#B18A4C] font-serif">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Private Guest Session</span>
              </span>
            </div>

            <form onSubmit={handleAnalyzeSyllabus} className="space-y-5">
              {/* Optional Course Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-serif font-semibold text-[#D9C39B] mb-1">
                    Course Title <span className="text-[#8B7861] font-normal">(Auto-detected if left empty)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Distributed Systems & Consensus"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-serif rounded-lg border border-[#493522] bg-[#211A15] text-[#F5EBD8] placeholder-[#8B7861] focus:outline-none focus:border-[#B18A4C] focus:ring-1 focus:ring-[#B18A4C] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-serif font-semibold text-[#D9C39B] mb-1">
                    Target Exam Date <span className="text-[#8B7861] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={targetExamDate}
                    onChange={(e) => setTargetExamDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-serif rounded-lg border border-[#493522] bg-[#211A15] text-[#F5EBD8] placeholder-[#8B7861] focus:outline-none focus:border-[#B18A4C] focus:ring-1 focus:ring-[#B18A4C] transition-all"
                  />
                </div>
              </div>

              {/* TAB 1: UPLOAD DRAG & DROP ZONE (Aged-Paper Aesthetic) */}
              {activeTab === 'upload' && (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-[#B18A4C] bg-[#D9C39B]/20 shadow-gold-glow'
                      : selectedFile
                      ? 'border-[#B18A4C] bg-[#F0E4C9]/95 text-[#30251B]'
                      : 'border-[#B18A4C]/50 hover:border-[#B18A4C] bg-[#F0E4C9]/90 text-[#30251B] hover:bg-[#F0E4C9]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.docx"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                  />

                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-xl bg-[#30241B] border border-[#B18A4C] flex items-center justify-center mx-auto text-[#C69B56] shadow-sm">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-serif font-bold text-[#30251B]">{selectedFile.name}</h4>
                      <p className="text-xs text-[#493522] font-mono">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to transcribe into chapters
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="text-xs font-serif text-[#B18A4C] hover:underline pt-1 inline-block font-semibold"
                      >
                        Change Document
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-[#30241B] border border-[#493522] flex items-center justify-center mx-auto text-[#C69B56]">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-serif font-bold text-[#30251B]">
                          Drag & drop your syllabus PDF here, or click to browse
                        </p>
                        <p className="text-xs text-[#493522] mt-1 font-serif">
                          Supports searchable PDF, TXT, DOCX up to 25MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PASTE SYLLABUS TEXT */}
              {activeTab === 'paste' && (
                <div className="space-y-2">
                  <textarea
                    rows={8}
                    placeholder="Paste your course outline, unit descriptions, or syllabus contents here...
e.g.:
Chapter I: Distributed Consensus & Network Models
- Introduction to Asynchronous Consensus
- Paxos and Raft State Machine Replication
- Byzantine Agreement"
                    value={syllabusText}
                    onChange={(e) => setSyllabusText(e.target.value)}
                    className="w-full p-4 text-xs rounded-xl border border-[#CBB184] bg-[#F0E4C9] text-[#30251B] placeholder-[#8B7861] focus:outline-none focus:border-[#B18A4C] focus:ring-1 focus:ring-[#B18A4C] font-mono leading-relaxed resize-y"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#8B7861] font-serif">
                    <span>Preserves chapters, units, topics, and academic hierarchy</span>
                    <span>{syllabusText.length} characters</span>
                  </div>
                </div>
              )}

              {/* Error & Warning Displays */}
              {analysisError && (
                <div className="p-3.5 rounded-xl border border-[#A63A31] bg-[#3B1A17] text-[#FCA5A5] text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#FCA5A5] mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <span className="font-serif font-bold block">Analysis Failed</span>
                    <p className="text-[11px] leading-relaxed text-[#FCA5A5]/90 font-serif">{analysisError}</p>
                  </div>
                  <button onClick={() => setAnalysisError(null)} className="text-[#FCA5A5] hover:text-white">
                    ✕
                  </button>
                </div>
              )}

              {ocrWarning && (
                <div className="p-3.5 rounded-xl border border-[#61451F] bg-[#3D2B15] text-[#FDE047] text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#FDE047] mt-0.5" />
                  <p className="text-[11px] leading-relaxed font-serif">{ocrWarning}</p>
                </div>
              )}

              {/* Sample Curricula Quick Pills */}
              <div className="pt-2">
                <span className="text-[11px] font-serif font-semibold text-[#D9C39B] uppercase tracking-wider block mb-2">
                  Or explore with a sample university curriculum:
                </span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_SYLLABI.map((sample) => (
                    <button
                      key={sample.code}
                      type="button"
                      onClick={() => handleSelectSample(sample)}
                      className="px-3 py-1.5 rounded-lg text-xs font-serif font-medium bg-[#211A15] text-[#D9C39B] border border-[#493522] hover:border-[#B18A4C] hover:text-[#F5EBD8] transition-colors"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Submit Button */}
              <div className="pt-4 border-t border-[#493522] flex items-center justify-between">
                <span className="text-xs text-[#8B7861] flex items-center gap-1.5 font-serif">
                  <Sparkles className="w-3.5 h-3.5 text-[#B18A4C]" />
                  <span>The Frontier Journal review modal lets you inspect every chapter before committing</span>
                </span>

                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="btn-frontier-primary px-6 py-2.5 rounded-xl text-xs font-serif font-bold flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#211A15] border-t-transparent rounded-full animate-spin" />
                      <span>{analyzingStage || 'Analyzing Syllabus...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Analyze & Preview Syllabus</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: SYLLABUS REVIEW MODAL — RDR2 FRONTIER JOURNAL AESTHETIC
          ========================================================================= */}
      {isPreviewOpen && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[92vh] rdr-paper-card rounded-xl border-2 border-[#B18A4C] shadow-2xl flex flex-col overflow-hidden text-[#33271D]">
            {/* Modal Header: Dark Leather Surface */}
            <div className="p-4 sm:p-5 rdr-leather-surface flex items-center justify-between border-b border-[#4D3B2C]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rdr-chapter-badge">JOURNAL LEDGER</span>
                  <h2 className="text-base sm:text-lg font-serif font-bold text-[#E6D4B2] tracking-wide">
                    Curriculum Review & Chapter Verification
                  </h2>
                </div>
                <p className="text-xs text-[#E6D4B2]/70 font-serif">
                  Inspect the extracted chapters and topics before inscribing them into your learning ledger.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 rounded-lg text-[#E6D4B2]/70 hover:text-white hover:bg-[#30241B] transition-colors"
                aria-label="Close review"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Warm Aged Parchment */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 rdr-journal-bg">
              {/* Course Title & Code Ledger Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg border border-[#C4B18B] bg-[#F1E6D0]/90 shadow-sm">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-serif font-bold uppercase tracking-wider text-[#493522] mb-1">
                    Course / Subject Title
                  </label>
                  <input
                    type="text"
                    value={previewData.courseTitle}
                    onChange={(e) => setPreviewData({ ...previewData, courseTitle: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-serif font-semibold rounded border border-[#C4B18B] bg-white text-[#33271D] focus:outline-none focus:border-[#B18A4C]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-serif font-bold uppercase tracking-wider text-[#493522] mb-1">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CSE279"
                    value={previewData.courseCode || ''}
                    onChange={(e) => setPreviewData({ ...previewData, courseCode: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-serif font-semibold rounded border border-[#C4B18B] bg-white text-[#33271D] focus:outline-none focus:border-[#B18A4C]"
                  />
                </div>
              </div>

              {/* Stats Summary Strip */}
              <div className="flex items-center justify-between text-xs font-serif text-[#6B5848] border-b border-[#C4B18B]/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#33271D]">
                    {previewData.units.length} Chapters / Units
                  </span>
                  <span>•</span>
                  <span>{totalTopicsCount} Topics</span>
                  <span>•</span>
                  <span>{totalSubtopicsCount} Subtopics</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddUnit}
                  className="px-2.5 py-1 rounded bg-[#30241B] text-[#B18A4C] text-[11px] font-serif font-bold hover:bg-[#493522] border border-[#B18A4C]/50 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Chapter</span>
                </button>
              </div>

              {/* Chapters & Topics List */}
              <div className="space-y-4">
                {previewData.units.map((unit, uIdx) => {
                  const isExpanded = expandedUnitIdx === uIdx;
                  return (
                    <div
                      key={unit.unitNumber || uIdx}
                      className="rounded-lg border border-[#C4B18B] bg-[#F1E6D0] overflow-hidden shadow-sm"
                    >
                      {/* Unit Header */}
                      <div className="p-3.5 bg-[#E6D4B2] border-b border-[#C4B18B] flex items-center justify-between gap-3">
                        <div
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                          onClick={() => setExpandedUnitIdx(isExpanded ? null : uIdx)}
                        >
                          <span className="font-serif font-bold text-xs text-[#B18A4C] tracking-wider uppercase">
                            CHAPTER {unit.unitNumber}:
                          </span>
                          <input
                            type="text"
                            value={unit.title}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleUpdateUnitTitle(uIdx, e.target.value)}
                            className="px-2 py-0.5 text-xs font-serif font-bold bg-white/70 border border-[#C4B18B] rounded text-[#33271D] flex-1 focus:bg-white"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-serif text-[#6B5848]">
                            {unit.topics.length} topics
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteUnit(uIdx)}
                            className="p-1 text-rose-700 hover:text-rose-900"
                            title="Delete Chapter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedUnitIdx(isExpanded ? null : uIdx)}
                            className="p-1 text-[#493522]"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Topics Under Unit */}
                      {isExpanded && (
                        <div className="p-3 space-y-3 bg-[#F1E6D0]/50">
                          {unit.topics.map((topic, tIdx) => (
                            <div
                              key={tIdx}
                              className="p-3 rounded border border-[#C4B18B]/80 bg-white/80 space-y-2 shadow-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="text-[#B18A4C] font-serif font-bold text-[11px]">
                                    § {uIdx + 1}.{tIdx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={topic.title}
                                    onChange={(e) =>
                                      handleUpdateTopic(uIdx, tIdx, 'title', e.target.value)
                                    }
                                    className="px-2 py-0.5 text-xs font-serif font-semibold text-[#33271D] border border-transparent hover:border-[#C4B18B] focus:border-[#B18A4C] rounded flex-1"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTopic(uIdx, tIdx)}
                                  className="text-rose-600 hover:text-rose-800 p-1"
                                  title="Delete Topic"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Subtopics Pills & Add Input */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[10px] font-serif uppercase tracking-wider text-[#6B5848]">
                                  Subtopics:
                                </span>
                                {(topic.subtopics || []).map((sub, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E6D4B2] border border-[#C4B18B] text-[10px] font-serif font-medium text-[#33271D]"
                                  >
                                    <span>{sub}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSubtopic(uIdx, tIdx, sIdx)}
                                      className="text-[#6B5848] hover:text-rose-700 ml-0.5"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))}
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="text"
                                    placeholder="+ Subtopic..."
                                    value={newSubtopicInputs[`${uIdx}-${tIdx}`] || ''}
                                    onChange={(e) =>
                                      setNewSubtopicInputs({
                                        ...newSubtopicInputs,
                                        [`${uIdx}-${tIdx}`]: e.target.value
                                      })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddSubtopic(uIdx, tIdx);
                                      }
                                    }}
                                    className="px-1.5 py-0.5 text-[10px] font-serif rounded border border-[#C4B18B] bg-white w-24 focus:w-36 transition-all"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => handleAddTopic(uIdx)}
                            className="w-full py-1.5 text-center text-xs font-serif text-[#B18A4C] hover:text-[#493522] border border-dashed border-[#C4B18B] rounded hover:bg-[#E6D4B2]/40 transition-colors"
                          >
                            + Add Topic to Chapter {unit.unitNumber}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer: Dark Leather Surface */}
            <div className="p-4 sm:p-5 rdr-leather-surface border-t border-[#4D3B2C] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 rounded text-xs font-serif text-[#E6D4B2] hover:text-white"
              >
                Back to Editor
              </button>

              <button
                type="button"
                onClick={handleConfirmCurriculum}
                disabled={isCreating || previewData.units.length === 0}
                className="px-6 py-2.5 rounded bg-gradient-to-r from-[#B18A4C] to-[#D4AF37] text-[#1D1510] font-serif font-bold text-xs uppercase tracking-wider hover:brightness-110 shadow-lg flex items-center gap-2"
              >
                {isCreating ? (
                  <span>Generating Workspace...</span>
                ) : (
                  <>
                    <span>Confirm & Inscribe Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTIONS BELOW HERO: THE 5-STAGE EXPEDITION (EXACT USER SPECIFICATION)
          ========================================================================= */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#3D2D21]">
        <div className="text-center space-y-3 mb-14">
          <Badge variant="journal">THE EXPEDITION BLUEPRINT</Badge>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#F5EBD8] tracking-wide">
            How LearnSphere Works
          </h2>
          <p className="text-sm text-[#D9C39B] max-w-xl mx-auto font-serif">
            From raw university syllabus to structured chapters, grounded lessons, and verified academic mastery.
          </p>
        </div>

        {/* 5 Distinct Editorial Frontier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Section 1: Your journey begins here */}
          <div className="rounded-2xl bg-[#281F19] border border-[#493522] overflow-hidden shadow-leather group hover:border-[#B18A4C]/60 transition-all flex flex-col justify-between">
            <div className="h-44 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80"
                alt="Vintage open journal and ink"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-[0.6] contrast-[1.1]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#281F19] via-transparent to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="rdr-chapter-badge">CHAPTER I</span>
              </div>
            </div>
            <div className="p-6 space-y-2 flex-1">
              <h3 className="text-lg font-serif font-bold text-[#F5EBD8]">
                Your journey begins here
              </h3>
              <p className="text-xs text-[#D9C39B] leading-relaxed font-serif">
                Bring your syllabus in searchable PDF, TXT, DOCX, or paste raw course text directly. Zero mandatory sign-up or friction—your study session begins the moment you upload.
              </p>
            </div>
          </div>

          {/* Section 2: Explore every chapter */}
          <div className="rounded-2xl bg-[#281F19] border border-[#493522] overflow-hidden shadow-leather group hover:border-[#B18A4C]/60 transition-all flex flex-col justify-between">
            <div className="h-44 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1507842229450-7080e729a6b6?auto=format&fit=crop&w=800&q=80"
                alt="Historic frontier library and archive"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-[0.6] contrast-[1.1]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#281F19] via-transparent to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="rdr-chapter-badge">CHAPTER II</span>
              </div>
            </div>
            <div className="p-6 space-y-2 flex-1">
              <h3 className="text-lg font-serif font-bold text-[#F5EBD8]">
                Explore every chapter
              </h3>
              <p className="text-xs text-[#D9C39B] leading-relaxed font-serif">
                LearnSphere analyzes your syllabus into clean academic units, topics, and subtopics. Inspect the extracted outline in the Frontier Journal and refine chapters to match your exact exam goals.
              </p>
            </div>
          </div>

          {/* Section 3: Learn through understanding */}
          <div className="rounded-2xl bg-[#281F19] border border-[#493522] overflow-hidden shadow-leather group hover:border-[#B18A4C]/60 transition-all flex flex-col justify-between">
            <div className="h-44 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1475483768296-6163e08872a1?auto=format&fit=crop&w=800&q=80"
                alt="Campfire in the mountain pine forests at twilight"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-[0.6] contrast-[1.1]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#281F19] via-transparent to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="rdr-chapter-badge">CHAPTER III</span>
              </div>
            </div>
            <div className="p-6 space-y-2 flex-1">
              <h3 className="text-lg font-serif font-bold text-[#F5EBD8]">
                Learn through understanding
              </h3>
              <p className="text-xs text-[#D9C39B] leading-relaxed font-serif">
                Open your digital study journal for 7-part pedagogical tutor lessons. Learn with step-by-step intuitive breakdowns, practical examples, clear terminology, and concrete analogies.
              </p>
            </div>
          </div>

          {/* Section 4: Test your knowledge */}
          <div className="rounded-2xl bg-[#281F19] border border-[#493522] overflow-hidden shadow-leather group hover:border-[#B18A4C]/60 transition-all flex flex-col justify-between">
            <div className="h-44 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80"
                alt="Vast rocky mountain peak challenge"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-[0.6] contrast-[1.1]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#281F19] via-transparent to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="rdr-chapter-badge">CHAPTER IV</span>
              </div>
            </div>
            <div className="p-6 space-y-2 flex-1">
              <h3 className="text-lg font-serif font-bold text-[#F5EBD8]">
                Test your knowledge
              </h3>
              <p className="text-xs text-[#D9C39B] leading-relaxed font-serif">
                Enter the challenge crucible. Attempt adaptive multi-format quizzes powered by verified academic question templates and live Open Trivia DB integrations with instant feedback.
              </p>
            </div>
          </div>

          {/* Section 5: Track your progress */}
          <div className="rounded-2xl bg-[#281F19] border border-[#493522] overflow-hidden shadow-leather group hover:border-[#B18A4C]/60 transition-all flex flex-col justify-between md:col-span-2 lg:col-span-2">
            <div className="h-44 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1200&q=80"
                alt="Open American western plains at golden hour"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-[0.6] contrast-[1.1]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#281F19] via-transparent to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="rdr-chapter-badge">CHAPTER V</span>
              </div>
            </div>
            <div className="p-6 space-y-2 flex-1">
              <h3 className="text-lg font-serif font-bold text-[#F5EBD8]">
                Track your progress
              </h3>
              <p className="text-xs text-[#D9C39B] leading-relaxed font-serif">
                Inspect your progress ledger. Identify recurring academic vulnerabilities, review comprehensive solution explanations, track study duration via the pocket watch timer, and unlock mastery seals as you conquer every topic.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION: RECENT LEARNING JOURNEYS (If any exist)
          ========================================================================= */}
      {recentProjects.length > 0 && (
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#3D2D21]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-serif font-bold text-[#F5EBD8]">Your Inscribed Learning Expeditions</h3>
              <p className="text-xs text-[#8B7861] font-serif">Resume your personal syllabus study journals</p>
            </div>
            <Link to="/workspace">
              <Button size="sm" variant="outline">
                View All Expeditions
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProjects.slice(0, 3).map((proj) => (
              <Link
                key={proj.id}
                to={`/project/${proj.id}`}
                className="p-5 rounded-xl bg-[#281F19] border border-[#3D2D21] hover:border-[#B18A4C] transition-all flex flex-col justify-between group shadow-leather"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-serif uppercase tracking-widest text-[#B18A4C] font-bold">
                      {proj.subjectCode || 'EXPEDITION'}
                    </span>
                    <span className="text-[10px] text-[#8B7861] font-mono">
                      {new Date(proj.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-sm font-serif font-bold text-[#F5EBD8] group-hover:text-[#C69B56] transition-colors line-clamp-1">
                    {proj.title}
                  </h4>
                </div>
                <div className="pt-3 mt-4 border-t border-[#3D2D21] flex items-center justify-between text-xs text-[#C69B56] font-serif font-semibold">
                  <span>Open Study Journal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

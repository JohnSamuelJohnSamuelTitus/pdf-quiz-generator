import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { externalApi } from '../api/client';
import { OpenLibraryBook } from '../../../shared/types';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import {
  BookOpen,
  BookMarked,
  Search,
  ExternalLink,
  GraduationCap,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2
} from 'lucide-react';

interface SubjectOption {
  id: string;
  label: string;
  queryKey: string;
}

const SUBJECT_OPTIONS: SubjectOption[] = [
  { id: 'all', label: 'All Curated', queryKey: 'all' },
  { id: 'cs', label: 'Computer Science', queryKey: 'computer_science' },
  { id: 'algo', label: 'Algorithms & DS', queryKey: 'algorithms' },
  { id: 'os', label: 'Operating Systems', queryKey: 'operating_systems' },
  { id: 'ai', label: 'Artificial Intelligence', queryKey: 'artificial_intelligence' },
  { id: 'db', label: 'Database Systems', queryKey: 'databases' },
  { id: 'math', label: 'Mathematics', queryKey: 'mathematics' },
  { id: 'physics', label: 'Physics', queryKey: 'physics' },
  { id: 'literature', label: 'Literature & Classics', queryKey: 'literature' }
];

export function LibraryPage() {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<OpenLibraryBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch books when selected subject changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const activeOption = SUBJECT_OPTIONS.find((s) => s.id === selectedSubject);
    const queryKey = activeOption ? activeOption.queryKey : 'all';

    externalApi
      .getBooks(queryKey, 16)
      .then((res) => {
        if (isMounted && res.success && Array.isArray(res.data)) {
          setBooks(res.data);
        }
      })
      .catch((err) => {
        console.warn('[LibraryPage] Error loading books:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSubject]);

  // Client-side filtering by search query
  const filteredBooks = books.filter((book) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (book.title || '').toLowerCase().includes(q);
    const authorMatch = (book.authorNames || []).some((a) => a.toLowerCase().includes(q));
    const subjectMatch = (book.subject || []).some((s) => s.toLowerCase().includes(q));
    return titleMatch || authorMatch || subjectMatch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-200">
      {/* 1. Header & Hero */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">
            <BookMarked className="w-3 h-3 mr-1" />
            Open Academic Library
          </Badge>
          <span className="text-[11px] text-slate-400 font-mono">
            • Live repository via Open Library & Internet Archive
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5EBD8] font-serif">
              Academic Library & Textbooks
            </h1>
            <p className="text-xs sm:text-sm font-serif text-[#D9C39B]/80 max-w-2xl mt-1 leading-relaxed">
              Explore foundational university textbooks, open-access curriculum references, and classic literature.
              Read previews or check complete bibliographies directly on Open Library.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/">
              <Button size="sm" variant="outline" leftIcon={<GraduationCap className="w-3.5 h-3.5" />}>
                Upload Syllabus
              </Button>
            </Link>
            <Link to="/workspace">
              <Button size="sm" variant="primary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                My Courses
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Educational Context Banner */}
      <div className="p-4 rounded-2xl border border-[#493522] bg-[#281F19]/95 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-serif text-[#D9C39B] shadow-leather">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#30241B] border border-[#B18A4C]/60 text-[#C69B56] flex items-center justify-center shrink-0 shadow-gold-glow">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-[#F5EBD8]">
              Syllabus-Grounded Learning:
            </span>{' '}
            LearnSphere pairs your course syllabus with these textbooks to generate step-by-step lessons and quizzes.
          </div>
        </div>
        <a
          href="https://openlibrary.org"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-[#C69B56] hover:text-[#F5EBD8] transition-colors shrink-0"
        >
          <span>Open Library Repository</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* 3. Search and Subject Filter Controls */}
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative w-full max-w-lg">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#D9C39B]/70" />
          <input
            type="text"
            placeholder="Search by textbook title, author, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-serif pl-10 pr-9 py-2.5 rounded-xl border border-[#493522] bg-[#1C1510] text-[#F5EBD8] placeholder-[#D9C39B]/40 focus:outline-none focus:border-[#B18A4C] transition-all shadow-subtle"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-[#D9C39B] hover:text-[#F5EBD8] text-xs font-serif"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Subject Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-serif font-semibold text-[#D9C39B] uppercase tracking-wider mr-1">
            Subject:
          </span>
          {SUBJECT_OPTIONS.map((opt) => {
            const isSelected = selectedSubject === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedSubject(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-serif font-medium transition-all border ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#C69B56] to-[#B18A4C] text-[#1C1510] font-bold border-transparent shadow-gold-glow'
                    : 'bg-[#281F19] text-[#D9C39B] border-[#493522] hover:border-[#B18A4C]/50 hover:text-[#F5EBD8]'
                  }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Book Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="p-4 rounded-2xl border border-[#493522] bg-[#281F19]/95 space-y-3"
            >
              <div className="flex gap-3">
                <Skeleton className="w-20 h-28 rounded-lg shrink-0 bg-[#1C1510]" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full bg-[#1C1510]" />
                  <Skeleton className="h-3 w-3/4 bg-[#1C1510]" />
                  <Skeleton className="h-3 w-1/2 bg-[#1C1510]" />
                </div>
              </div>
              <Skeleton className="h-8 w-full rounded-lg bg-[#1C1510]" />
            </div>
          ))}
        </div>
      ) : filteredBooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredBooks.map((book, idx) => (
            <Card
              key={book.key || idx}
              className="flex flex-col justify-between border border-[#493522] bg-[#281F19]/95 backdrop-blur-md hover:border-[#B18A4C]/50 transition-all p-4 shadow-leather group"
            >
              <div className="space-y-3">
                <div className="flex gap-3.5 items-start">
                  {/* Book Cover Image */}
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-20 h-28 object-cover rounded-md shadow-lg shrink-0 bg-[#1C1510] border border-[#493522] group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-20 h-28 rounded-md bg-[#1C1510] border border-[#493522] flex flex-col items-center justify-center p-2 text-center text-[#D9C39B] shrink-0">
                      <BookOpen className="w-6 h-6 mb-1 text-[#B18A4C]" />
                      <span className="text-[9px] line-clamp-2 font-serif font-medium text-[#F5EBD8]">
                        {book.title}
                      </span>
                    </div>
                  )}

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="text-xs font-serif font-semibold text-[#F5EBD8] leading-snug line-clamp-2 group-hover:text-[#C69B56] transition-colors">
                      {book.title}
                    </h3>

                    <p className="text-[11px] font-serif text-[#D9C39B]/70 line-clamp-1">
                      {(book.authorNames || []).join(', ') || 'Academic Faculty & Authors'}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-[#D9C39B]/70 font-mono">
                      {book.firstPublishYear && (
                        <span className="flex items-center gap-0.5 text-[#C69B56]">
                          <Calendar className="w-2.5 h-2.5" />
                          {book.firstPublishYear}
                        </span>
                      )}
                      {book.editionCount && (
                        <span>• {book.editionCount} editions</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subject Tags */}
                {book.subject && book.subject.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-2 border-t border-[#493522]">
                    {book.subject.slice(0, 3).map((sub, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-[#1C1510] text-[#D9C39B] border border-[#493522] font-serif font-medium truncate max-w-[140px]"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-3 border-t border-[#493522] flex items-center justify-between gap-2">
                <a
                  href={`https://openlibrary.org${book.key}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-serif font-medium border border-[#493522] bg-[#1C1510] text-[#D9C39B] hover:text-[#F5EBD8] hover:border-[#B18A4C] transition-colors"
                >
                  <span>Open in Open Library</span>
                  <ExternalLink className="w-3 h-3 text-[#C69B56]" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-slate-400" />}
          title="No books match your search"
          description={`No textbooks found matching "${searchQuery}" under ${SUBJECT_OPTIONS.find((s) => s.id === selectedSubject)?.label || 'this subject'
            }.`}
          actionLabel="Clear Search Filter"
          onAction={() => setSearchQuery('')}
        />
      )}
    </div>
  );
}

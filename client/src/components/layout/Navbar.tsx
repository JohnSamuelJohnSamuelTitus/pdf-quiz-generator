import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FileQuestion, Sparkles, PlusCircle } from 'lucide-react';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNewQuiz = () => {
    if (location.pathname !== '/') {
      navigate('/');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // If there's an active quiz, trigger reset via custom event or reload if needed
      window.dispatchEvent(new CustomEvent('reset-pdf-quiz'));
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md transition-all shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" onClick={handleNewQuiz} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <FileQuestion className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-sans font-bold text-lg tracking-tight text-white group-hover:text-indigo-400 transition-colors">
              QuizAI
            </span>
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
              PDF Quiz Generator
            </span>
          </div>
        </Link>

        {/* Clean minimal actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Class Demo Ready</span>
          </div>

          <button
            onClick={handleNewQuiz}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Upload PDF</span>
          </button>
        </div>
      </div>
    </header>
  );
}

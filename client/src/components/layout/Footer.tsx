import React from 'react';
import { FileQuestion, CheckCircle2, Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 text-xs text-zinc-400 py-8 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-zinc-300">
          <FileQuestion className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-white">QuizAI</span>
          <span className="text-zinc-600">•</span>
          <span>Automated PDF Quiz Generator for Classroom Demonstrations</span>
        </div>

        <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Instant Question Generation</span>
          </div>
          <span className="text-zinc-700">•</span>
          <div className="flex items-center gap-1.5 text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Document Grounded Explanations</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

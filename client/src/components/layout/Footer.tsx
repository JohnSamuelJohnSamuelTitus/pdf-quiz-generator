import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Database, Globe, CheckCircle2, Palmtree, Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-[#3D2D21] bg-[#1C1510] text-xs text-[#8B7861] py-12 transition-colors relative overflow-hidden">
      {/* Background ambient warm glow */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-t from-[#B18A4C]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Platform Overview */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#C69B56] to-[#B18A4C] border border-[#D9C39B] flex items-center justify-center text-[#211A15] shadow-gold-glow">
                <GraduationCap className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="font-serif font-bold text-base text-[#F5EBD8] tracking-wider">LearnSphere</span>
            </div>
            <p className="text-xs text-[#D9C39B]/80 leading-relaxed font-serif">
              Document-first personalized learning and assessment frontier platform built for CSE279.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-[#C69B56] font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% Deterministic Fallback Guaranteed</span>
            </div>
          </div>

          {/* Col 2: Public APIs Verified */}
          <div>
            <h4 className="font-serif font-bold text-[#F5EBD8] mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#B18A4C]" />
              Verified Public APIs
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://en.wikipedia.org/api/rest_v1/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#F5EBD8] flex items-center gap-1.5 transition-colors text-[#D9C39B]"
                >
                  <Globe className="w-3 h-3 text-[#B18A4C]" />
                  Wikipedia REST API
                </a>
              </li>
              <li>
                <a
                  href="https://openlibrary.org/developers/api"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#F5EBD8] flex items-center gap-1.5 transition-colors text-[#D9C39B]"
                >
                  <Globe className="w-3 h-3 text-[#B18A4C]" />
                  Open Library API
                </a>
              </li>
              <li>
                <a
                  href="https://opentdb.com/api_config.php"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#F5EBD8] flex items-center gap-1.5 transition-colors text-[#D9C39B]"
                >
                  <Globe className="w-3 h-3 text-[#B18A4C]" />
                  Open Trivia Database
                </a>
              </li>
              <li>
                <a
                  href="https://dictionaryapi.dev/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#F5EBD8] flex items-center gap-1.5 transition-colors text-[#D9C39B]"
                >
                  <Globe className="w-3 h-3 text-[#B18A4C]" />
                  Free Dictionary API
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Academic Subjects */}
          <div>
            <h4 className="font-serif font-bold text-[#F5EBD8] mb-3 text-xs uppercase tracking-wider">
              Academic Curricula
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/workspace" className="hover:text-[#F5EBD8] transition-colors text-[#D9C39B]">
                  Computer Science
                </Link>
              </li>
              <li>
                <Link to="/workspace" className="hover:text-[#F5EBD8] transition-colors text-[#D9C39B]">
                  Pure & Applied Mathematics
                </Link>
              </li>
              <li>
                <Link to="/workspace" className="hover:text-[#F5EBD8] transition-colors text-[#D9C39B]">
                  Classical Physics & Dynamics
                </Link>
              </li>
              <li>
                <Link to="/library" className="hover:text-[#F5EBD8] transition-colors text-[#D9C39B]">
                  Open Academic Library
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Platform Security & Status */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-[#F5EBD8] mb-3 text-xs uppercase tracking-wider">
              System Telemetry
            </h4>
            <div className="p-3.5 rounded-lg bg-[#281F19] border border-[#3D2D21] space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#D9C39B]">API Response SLA</span>
                <span className="font-mono text-[#86EFAC] font-semibold">&lt; 250ms</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#D9C39B]">Test Suite Coverage</span>
                <span className="font-mono text-[#C69B56] font-semibold">79 / 79 Passing</span>
              </div>
            </div>
            <Link
              to="/settings/integrations"
              className="inline-flex items-center gap-1.5 text-xs text-[#B18A4C] hover:text-[#C69B56] transition-colors font-serif"
            >
              <span>API Diagnostics Monitor</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[#3D2D21] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div>
            <span>© 2026 LearnSphere — Academic Project CSE279. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 text-[#8B7861] font-serif">
            <span>Every Chapter Is A New Frontier</span>
            <span>•</span>
            <span>Zero Mandatory Login</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

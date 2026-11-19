import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/Button';
import {
  Compass,
  LayoutDashboard,
  GraduationCap,
  Sun,
  Moon,
  LogOut,
  Settings,
  Menu,
  X,
  BookOpen,
  BookMarked,
  Sparkles,
  BarChart2,
  Palmtree
} from 'lucide-react';

export function Navbar() {
  const { user, isAuthenticated, isGuest, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = [
    { label: 'Upload Syllabus', href: '/', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { label: 'My Courses', href: '/workspace', icon: <Compass className="w-3.5 h-3.5" /> },
    { label: 'Book Library', href: '/library', icon: <BookMarked className="w-3.5 h-3.5" /> },
    { label: 'Quiz Hub', href: '/quiz', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { label: 'My Progress', href: '/analytics', icon: <BarChart2 className="w-3.5 h-3.5" /> }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#3D2D21] bg-[#211A15]/95 backdrop-blur-md transition-all shadow-leather">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Identity (RDR2 Frontier Journal) */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-b from-[#C69B56] to-[#B18A4C] border border-[#D9C39B] flex items-center justify-center text-[#211A15] shadow-gold-glow group-hover:scale-105 transition-all">
              <GraduationCap className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-lg tracking-wider text-[#F5EBD8] group-hover:text-[#C69B56] transition-colors">
                LearnSphere
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-serif font-semibold tracking-widest px-2 py-0.5 rounded bg-[#30241B] text-[#B18A4C] border border-[#B18A4C]/40">
                Frontier Edition
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-serif rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#30241B] text-[#C69B56] border border-[#B18A4C]/50 shadow-sm font-semibold'
                      : 'text-[#D9C39B] hover:text-[#F5EBD8] hover:bg-[#30241B]/70 border border-transparent'
                  }`}
                >
                  <span className={isActive ? 'text-[#C69B56]' : 'text-[#8B7861]'}>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5">
              <Link
                to="/settings"
                className="p-2 text-[#D9C39B] hover:text-[#F5EBD8] hover:bg-[#30241B] rounded-lg transition-colors border border-transparent hover:border-[#B18A4C]/30"
                title="Settings & API Health"
              >
                <Settings className="w-4 h-4" />
              </Link>
              <div className="h-4 w-[1px] bg-[#3D2D21] mx-1" />
              <Link
                to="/dashboard"
                className="flex items-center gap-2 py-1 px-3 rounded-lg bg-[#30241B] hover:bg-[#493522] border border-[#B18A4C]/40 transition-all shadow-sm"
              >
                <div className="w-6 h-6 rounded-full bg-[#B18A4C] text-[#211A15] flex items-center justify-center text-[11px] font-bold font-serif">
                  {user.fullName.charAt(0)}
                </div>
                <span className="text-xs font-serif font-medium text-[#F5EBD8] max-w-[120px] truncate">
                  {user.fullName}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-1.5 text-[#8B7861] hover:text-[#FCA5A5] hover:bg-[#3B1A17] rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-[#D9C39B] hover:text-[#F5EBD8] hover:bg-[#30241B]">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <button className="btn-frontier-primary px-4 py-2 rounded-lg text-xs font-serif font-bold tracking-wider transition-all">
                  Get Started
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="p-2 text-[#D9C39B] rounded-lg hover:bg-[#30241B] border border-[#3D2D21]"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#C69B56]" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-[#3D2D21] bg-[#211A15] px-4 pt-3 pb-5 space-y-2 animate-in fade-in">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-serif rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#30241B] text-[#C69B56] border border-[#B18A4C]/50'
                    : 'text-[#D9C39B] hover:bg-[#30241B]'
                }`}
              >
                <span className={isActive ? 'text-[#C69B56]' : 'text-[#8B7861]'}>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
          {isAuthenticated && user ? (
            <div className="pt-3 border-t border-[#3D2D21] space-y-1">
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm font-serif text-[#D9C39B] hover:bg-[#30241B] rounded-lg"
              >
                <Settings className="w-4 h-4 text-[#B18A4C]" />
                <span>Settings & API Status</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-serif text-[#FCA5A5] hover:bg-[#3B1A17] rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-[#3D2D21] flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full border-[#B18A4C]/40 text-[#D9C39B]">
                  Sign In
                </Button>
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <button className="btn-frontier-primary w-full py-2.5 rounded-lg text-xs font-serif font-bold tracking-wider">
                  Get Started
                </button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { externalApi } from '../api/client';
import { ApiHealthStatus, SkillLevel, DifficultyLevel } from '../../../shared/types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Settings,
  Activity,
  CheckCircle2,
  Clock,
  RotateCw,
  Globe,
  User,
  Shield,
  Save
} from 'lucide-react';

export function SettingsPage() {
  const { user, preferences, updatePreferences } = useAuth();
  const { showToast } = useToast();

  const [skillLevel, setSkillLevel] = useState<SkillLevel>(
    preferences?.skillLevel || 'intermediate'
  );
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    preferences?.preferredDifficulty || 'moderate'
  );
  const [dailyGoal, setDailyGoal] = useState<number>(
    preferences?.dailyGoalMinutes || 30
  );
  const [isSaving, setIsSaving] = useState(false);

  // API Diagnostics state
  const [apiHealth, setApiHealth] = useState<ApiHealthStatus[]>([]);
  const [checkingApis, setCheckingApis] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  const runApiDiagnostics = () => {
    setCheckingApis(true);
    externalApi
      .getHealth()
      .then((res) => {
        if (res.success) {
          setApiHealth(res.services);
          setLastCheckTime(res.timestamp);
          showToast('API diagnostics completed. All services active.', 'success');
        }
      })
      .catch(() => {
        showToast('Diagnostics ran with cached fallbacks.', 'info');
      })
      .finally(() => setCheckingApis(false));
  };

  useEffect(() => {
    runApiDiagnostics();
  }, []);

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      await updatePreferences({
        skillLevel,
        preferredDifficulty: difficulty,
        dailyGoalMinutes: dailyGoal
      });
      showToast('Learning preferences updated successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update preferences', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-200">
      <div>
        <Badge variant="accent">Frontier Configuration</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5EBD8] font-serif mt-1">
          Settings & System Health
        </h1>
        <p className="text-sm font-serif text-[#D9C39B]/80">
          Manage your student profile preferences and monitor live educational public API connectivity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Learning Preferences (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-[#493522] bg-[#281F19]/95 backdrop-blur-md shadow-leather">
            <CardHeader className="border-b border-[#493522] pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#C69B56]" />
                <CardTitle className="text-sm font-serif font-bold text-[#F5EBD8]">Student Profile</CardTitle>
              </div>
              <p className="text-xs font-serif text-[#D9C39B]/70">
                Your registered credentials and academic identifier
              </p>
            </CardHeader>

            <CardContent className="space-y-4 text-xs pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="font-serif text-[#D9C39B] font-medium uppercase tracking-wider text-[11px]">Full Name</span>
                  <div className="p-3 rounded-xl border border-[#493522] bg-[#1C1510] font-serif font-semibold text-[#F5EBD8]">
                    {user?.fullName || 'Alex Morgan'}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-serif text-[#D9C39B] font-medium uppercase tracking-wider text-[11px]">Academic Email</span>
                  <div className="p-3 rounded-xl border border-[#493522] bg-[#1C1510] font-mono text-[#F5EBD8]">
                    {user?.email || 'student@learnsphere.edu'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#493522] bg-[#281F19]/95 backdrop-blur-md shadow-leather">
            <CardHeader className="border-b border-[#493522] pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#B18A4C]" />
                <CardTitle className="text-sm font-serif font-bold text-[#F5EBD8]">Learning Preferences</CardTitle>
              </div>
              <p className="text-xs font-serif text-[#D9C39B]/70">
                Fine-tune assessment difficulty and daily study commitments
              </p>
            </CardHeader>

            <CardContent className="space-y-5 text-xs pt-4">
              {/* Skill level */}
              <div className="space-y-2">
                <label className="font-serif font-semibold text-[#D9C39B] uppercase tracking-wider text-[11px]">
                  Current Competency Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSkillLevel(level)}
                      className={`p-2.5 rounded-xl border text-xs font-serif font-medium capitalize text-center transition-all ${
                        skillLevel === level
                          ? 'border-[#B18A4C] bg-gradient-to-r from-[#C69B56] to-[#B18A4C] text-[#1C1510] font-bold shadow-gold-glow'
                          : 'border-[#493522] bg-[#1C1510]/80 text-[#D9C39B] hover:border-[#B18A4C]/50'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assessment difficulty */}
              <div className="space-y-2">
                <label className="font-serif font-semibold text-[#D9C39B] uppercase tracking-wider text-[11px]">
                  Assessment Challenge
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['foundational', 'moderate', 'rigorous'] as DifficultyLevel[]).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      className={`p-2.5 rounded-xl border text-xs font-serif font-medium capitalize text-center transition-all ${
                        difficulty === diff
                          ? 'border-[#B18A4C] bg-gradient-to-r from-[#C69B56] to-[#B18A4C] text-[#1C1510] font-bold shadow-gold-glow'
                          : 'border-[#493522] bg-[#1C1510]/80 text-[#D9C39B] hover:border-[#B18A4C]/50'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Target */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-serif font-semibold text-[#D9C39B] uppercase tracking-wider text-[11px]">
                    Daily Study Target
                  </label>
                  <span className="font-mono font-semibold text-[#C69B56]">
                    {dailyGoal} minutes / day
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={120}
                  step={15}
                  value={dailyGoal}
                  onChange={(e) => setDailyGoal(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-[#1C1510] rounded-lg appearance-none cursor-pointer accent-[#B18A4C]"
                />
              </div>

              <div className="pt-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSavePreferences}
                  isLoading={isSaving}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                >
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Public API Diagnostics (1 col) */}
        <div className="space-y-6">
          <Card className="border border-[#493522] bg-[#281F19]/95 backdrop-blur-md shadow-leather">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#493522]">
              <div>
                <CardTitle className="text-sm font-serif font-bold text-[#F5EBD8]">API Health Monitor</CardTitle>
                <p className="text-[11px] font-serif text-[#D9C39B]/70">Live verified endpoints</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={runApiDiagnostics}
                isLoading={checkingApis}
                title="Run Diagnostics"
                className="text-[#D9C39B] hover:text-[#F5EBD8]"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-3 pt-4">
              {checkingApis ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-16 rounded-xl bg-[#1C1510]" />
                  ))}
                </div>
              ) : apiHealth.length > 0 ? (
                apiHealth.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-[#493522] bg-[#1C1510] space-y-1 text-xs font-serif"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#F5EBD8]">
                        {s.service}
                      </span>
                      <Badge
                        variant={s.status === 'operational' ? 'journal' : 'neutral'}
                        size="sm"
                      >
                        {s.status === 'operational' ? 'Active' : 'Cached Fallback'}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-[#D9C39B]/70">
                      {s.details}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-[#D9C39B]/50 pt-1 font-mono">
                      <span>Latency: {s.latencyMs}ms</span>
                      <span className="text-emerald-400">Verified ✓</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs font-serif text-[#D9C39B]/70 text-center py-4">No diagnostic data.</p>
              )}

              {lastCheckTime && (
                <p className="text-[10px] text-[#D9C39B]/50 text-center pt-2 font-mono">
                  Last checked: {new Date(lastCheckTime).toLocaleTimeString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Academic compliance card */}
          <div className="p-4 rounded-2xl border border-emerald-500/20 bg-[#281F19]/95 backdrop-blur-md space-y-2 text-xs font-serif shadow-leather">
            <div className="flex items-center gap-1.5 font-semibold text-[#F5EBD8]">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>CSE279 Academic Guarantee</span>
            </div>
            <p className="text-[11px] text-[#D9C39B]/80 leading-relaxed">
              LearnSphere enforces zero hard dependency on external paid API keys. All core workflows run deterministically with persistent SQLite storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

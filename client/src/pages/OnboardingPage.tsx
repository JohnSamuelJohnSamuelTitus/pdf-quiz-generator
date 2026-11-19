import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { subjectsApi } from '../api/client';
import { Subject, SkillLevel, DifficultyLevel } from '../../../shared/types';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  Check,
  BookOpen,
  Target,
  Sparkles,
  Clock,
  Layers
} from 'lucide-react';

export function OnboardingPage() {
  const { preferences, updatePreferences } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    preferences?.primarySubjects || ['computer-science']
  );
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(
    preferences?.skillLevel || 'intermediate'
  );
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>(
    preferences?.learningObjectives || ['Master core concepts']
  );
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    preferences?.preferredDifficulty || 'moderate'
  );
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(
    preferences?.dailyGoalMinutes || 30
  );

  useEffect(() => {
    subjectsApi.getAll().then((res) => {
      if (res.success) setAvailableSubjects(res.subjects);
    });
  }, []);

  const objectiveOptions = [
    'Master core computational concepts',
    'Prepare for technical exams & interviews',
    'Deep academic research & literature review',
    'Quick daily spaced-repetition revision',
    'Supplement university coursework'
  ];

  const toggleSubject = (slug: string) => {
    if (selectedSubjects.includes(slug)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter((s) => s !== slug));
      } else {
        showToast('Please select at least one primary subject', 'info');
      }
    } else {
      setSelectedSubjects([...selectedSubjects, slug]);
    }
  };

  const toggleObjective = (obj: string) => {
    if (selectedObjectives.includes(obj)) {
      setSelectedObjectives(selectedObjectives.filter((o) => o !== obj));
    } else {
      setSelectedObjectives([...selectedObjectives, obj]);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await updatePreferences({
        primarySubjects: selectedSubjects,
        interests: selectedSubjects,
        skillLevel,
        learningObjectives: selectedObjectives,
        preferredDifficulty: difficulty,
        dailyGoalMinutes
      });
      showToast('Learning profile initialized successfully!', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      showToast(err.message || 'Failed to save preferences', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-2">
          <span>Step {step} of 4</span>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-6 h-1 rounded-full transition-colors ${
                  i <= step ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Step 1: Subject Selection */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <Badge variant="accent">Step 1 • Academic Curricula</Badge>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Which subjects would you like to study?
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select one or more academic tracks. We will tailor your workspace and quizzes accordingly.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {availableSubjects.map((s) => {
                    const isSelected = selectedSubjects.includes(s.slug);
                    return (
                      <div
                        key={s.slug}
                        onClick={() => toggleSubject(s.slug)}
                        className={`p-4 rounded-xl border text-left cursor-pointer transition-all select-none ${
                          isSelected
                            ? 'border-slate-900 bg-slate-50/80 dark:border-white dark:bg-slate-800/80 shadow-subtle'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">
                            {s.title}
                          </span>
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${
                              isSelected
                                ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900'
                                : 'border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                          {s.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Skill Level */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <Badge variant="accent">Step 2 • Current Competency</Badge>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    What is your current academic level?
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This calibrates question complexity and explanation depth.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {[
                    {
                      id: 'beginner',
                      title: 'Foundational / Beginner',
                      desc: 'New to the subject. Focused on core definitions, basic mechanisms, and fundamental formulas.'
                    },
                    {
                      id: 'intermediate',
                      title: 'Intermediate / Undergraduate',
                      desc: 'Familiar with core concepts. Ready for multi-step reasoning, asymptotic analysis, and problem solving.'
                    },
                    {
                      id: 'advanced',
                      title: 'Advanced / Rigorous',
                      desc: 'Strong theoretical grasp. Ready for graduate-level proofs, edge cases, and in-depth academic literature.'
                    }
                  ].map((level) => {
                    const isSelected = skillLevel === level.id;
                    return (
                      <div
                        key={level.id}
                        onClick={() => setSkillLevel(level.id as SkillLevel)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-slate-900 bg-slate-50/80 dark:border-white dark:bg-slate-800/80 shadow-subtle'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-sm text-slate-900 dark:text-white">
                              {level.title}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {level.desc}
                            </p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 ml-4 ${
                              isSelected
                                ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900'
                                : 'border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Learning Objectives */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <Badge variant="accent">Step 3 • Objectives</Badge>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    What are your primary study goals?
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select all that apply to help us prioritize recommendations on your dashboard.
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  {objectiveOptions.map((obj) => {
                    const isSelected = selectedObjectives.includes(obj);
                    return (
                      <div
                        key={obj}
                        onClick={() => toggleObjective(obj)}
                        className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition-all ${
                          isSelected
                            ? 'border-slate-900 bg-slate-50/80 dark:border-white dark:bg-slate-800/80 font-medium text-slate-900 dark:text-white shadow-subtle'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <span>{obj}</span>
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 ${
                            isSelected
                              ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900'
                              : 'border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Difficulty & Daily Target */}
            {step === 4 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <Badge variant="accent">Step 4 • Pace & Difficulty</Badge>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Set your study target and preferred challenge
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    You can adjust these settings at any time in your student dashboard.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-900 dark:text-white">
                      Preferred Assessment Difficulty
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['foundational', 'moderate', 'rigorous'] as DifficultyLevel[]).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDifficulty(d)}
                          className={`p-3 rounded-xl border text-xs font-medium capitalize text-center transition-all ${
                            difficulty === d
                              ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 shadow-subtle'
                              : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-semibold text-slate-900 dark:text-white">
                        Daily Learning Commitment
                      </label>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                        {dailyGoalMinutes} minutes / day
                      </span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={120}
                      step={15}
                      value={dailyGoalMinutes}
                      onChange={(e) => setDailyGoalMinutes(parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-white"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>15m (Light)</span>
                      <span>30m (Recommended)</span>
                      <span>60m (Intensive)</span>
                      <span>120m (Exam prep)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800/80">
              {step > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(step - 1)}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <Button
                  size="sm"
                  onClick={() => setStep(step + 1)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleFinish}
                  isLoading={isSubmitting}
                  rightIcon={<Check className="w-4 h-4" />}
                >
                  Complete Onboarding
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

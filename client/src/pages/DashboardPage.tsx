import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, revisionApi, weaknessesApi } from '../api/client';
import { DashboardData, RevisionRecommendation, WeaknessReport } from '../../../shared/types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  TrendingUp,
  Sparkles,
  PlayCircle,
  HelpCircle,
  Calendar,
  Compass,
  BarChart2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<RevisionRecommendation[]>([]);
  const [weaknesses, setWeaknesses] = useState<WeaknessReport[]>([]);

  useEffect(() => {
    dashboardApi
      .get()
      .then((res) => {
        if (res.success) {
          setData(res.dashboard);
        } else {
          setError('Failed to load dashboard data');
        }
      })
      .catch((err) => {
        setError(err.message || 'Error fetching dashboard');
      })
      .finally(() => setLoading(false));

    // Phase 2: Fetch active revision recommendations
    revisionApi
      .getAll()
      .then((res) => {
        if (res.success) setRevisions(res.revisions);
      })
      .catch(() => {});

    // Phase 2: Fetch student weaknesses
    weaknessesApi
      .getAll()
      .then((res) => {
        if (res.success) setWeaknesses(res.weaknesses);
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <EmptyState
          icon={<HelpCircle className="w-6 h-6 text-rose-500" />}
          title="Dashboard unavailable"
          description={error || 'Could not load your student dashboard. Please ensure you are logged in.'}
          actionLabel="Try Again"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  const { student, preferences, enrolledSubjects, progressSummary, continueLearning, recommendedActions, recentActivity, quizHistory } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      {/* 1. Welcome Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Welcome back, {student.fullName}
            </h1>
            <Badge variant="neutral" size="sm">
              {preferences?.skillLevel || 'Student'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Academic Track • Daily Target:{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {preferences?.dailyGoalMinutes || 30} minutes
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/quiz">
            <Button size="sm" variant="outline" leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-500" />}>
              Quiz Generator
            </Button>
          </Link>
          <Link to="/analytics">
            <Button size="sm" variant="outline" leftIcon={<BarChart2 className="w-3.5 h-3.5 text-slate-500" />}>
              Analytics
            </Button>
          </Link>
          <Link to="/workspace">
            <Button size="sm" variant="outline" leftIcon={<Compass className="w-3.5 h-3.5" />}>
              Explore Topics
            </Button>
          </Link>
          {continueLearning.length > 0 && (
            <Link to={`/workspace/${continueLearning[0].subjectSlug}/${continueLearning[0].topicSlug}`}>
              <Button size="sm" leftIcon={<PlayCircle className="w-3.5 h-3.5" />}>
                Resume Study
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Phase 2: Spaced Repetition Revision Alerts */}
      {revisions.length > 0 && (
        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
              <h3 className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200">
                Spaced Revision Recommended ({revisions.length} topic{revisions.length > 1 ? 's' : ''} decaying)
              </h3>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-400">
              Ebbinghaus memory decay algorithm
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {revisions.slice(0, 3).map((rev) => (
              <div
                key={rev.topicSlug}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/70 dark:border-amber-900/40 flex items-center justify-between gap-2"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={rev.urgency === 'high' ? 'warning' : 'neutral'}
                      size="sm"
                    >
                      {rev.urgency}
                    </Badge>
                    <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {rev.topicTitle}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Studied {rev.lastStudiedDaysAgo}d ago • {Math.round(rev.currentMastery)}% current strength
                  </p>
                </div>
                <Link to={`/workspace/${rev.subjectSlug}/${rev.topicSlug}`}>
                  <Button size="sm" variant="secondary" className="shrink-0 text-xs">
                    Revise
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Key Metrics Strip (Real Database Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                In-Progress Topics
              </span>
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                {progressSummary.topicsInProgress}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Topics Mastered
              </span>
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                {progressSummary.topicsMastered}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Study Time
              </span>
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                {progressSummary.totalStudyMinutes}{' '}
                <span className="text-xs font-normal text-slate-400">mins</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Average Quiz Score
              </span>
              <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                {progressSummary.averageQuizScore}%
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Dashboard Layout: Left (2 cols) & Right (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 spans): Continue Learning & Recommended Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Continue Learning */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm">Continue Learning</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pick up where you left off in your enrolled subjects
                </p>
              </div>
              <Link to="/workspace" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                View All
              </Link>
            </CardHeader>

            <CardContent className="space-y-3">
              {continueLearning.length > 0 ? (
                continueLearning.map((item) => (
                  <div
                    key={item.topicId}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {item.subjectTitle}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-xs text-slate-400">~{item.estimatedMinutes}m</span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {item.topicTitle}
                      </h4>
                      <div className="w-36 pt-1">
                        <ProgressBar value={item.masteryScore} showPercentage color="indigo" />
                      </div>
                    </div>

                    <Link
                      to={`/workspace/${item.subjectSlug}/${item.topicSlug}`}
                      className="shrink-0"
                    >
                      <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        Open Workspace
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<BookOpen className="w-5 h-5 text-slate-400" />}
                  title="No active topics yet"
                  description="Choose a topic in your subjects to begin your first interactive study session."
                  actionLabel="Browse Curricula"
                  onAction={() => window.location.assign('/workspace')}
                />
              )}
            </CardContent>
          </Card>

          {/* Recommended Next Actions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-sm">Personalized Recommendations</CardTitle>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Actionable steps generated from your current academic progress
              </p>
            </CardHeader>

            <CardContent className="space-y-3">
              {recommendedActions.length > 0 ? (
                recommendedActions.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={rec.priority === 'high' ? 'accent' : 'neutral'}
                          size="sm"
                        >
                          {rec.priority === 'high' ? 'High Priority' : 'Recommended'}
                        </Badge>
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                          {rec.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{rec.reason}</p>
                    </div>

                    <Link to={rec.targetUrl} className="shrink-0">
                      <Button size="sm" variant="secondary">
                        Action
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  You are all caught up! Explore new subjects to receive further recommendations.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Enrolled Subjects Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Enrolled Academic Subjects</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Subjects currently active in your personalized curriculum
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {enrolledSubjects.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                        {s.title}
                      </h4>
                      <p className="text-[11px] text-slate-400">{s.topicCount || 4} topics available</p>
                    </div>
                    <Link to={`/workspace`}>
                      <Button variant="ghost" size="sm">
                        Explore
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Recent Activity & Quiz History */}
        <div className="space-y-6">
          {/* Recent Activity Feed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Recent Activity</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real student actions recorded in LearnSphere
              </p>
            </CardHeader>

            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
                  {recentActivity.map((act) => (
                    <div key={act.id} className="relative flex items-start gap-3 pl-1">
                      <div className="w-5 h-5 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0 z-10">
                        {act.type === 'study' ? (
                          <Clock className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                          {act.title}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(act.timestamp).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No recent activity yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Quiz History Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm">Past Quiz Attempts</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Verified assessment scores from database
                </p>
              </div>
              <Link to="/analytics" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                Analytics
              </Link>
            </CardHeader>

            <CardContent className="space-y-2.5">
              {quizHistory.length > 0 ? (
                quizHistory.map((q) => (
                  <div
                    key={q.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {q.topicTitle || 'Quiz Assessment'}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {q.difficulty} • {q.correctAnswers}/{q.totalQuestions} correct
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-semibold tabular-nums ${
                          q.scorePercentage >= 80
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : q.scorePercentage >= 50
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {Math.round(q.scorePercentage)}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No quiz attempts recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

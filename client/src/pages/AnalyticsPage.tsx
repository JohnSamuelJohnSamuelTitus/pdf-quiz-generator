import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/client';
import { AnalyticsData } from '../../../shared/types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import {
  BarChart3,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Link } from 'react-router-dom';

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analyticsApi
      .get()
      .then((res) => {
        if (res.success) setData(res.analytics);
        else setError('Failed to retrieve analytics data');
      })
      .catch((err) => setError(err.message || 'Error fetching analytics'))
      .finally(() => setLoading(false));
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <EmptyState
          icon={<BarChart3 className="w-6 h-6 text-slate-400" />}
          title="Analytics unavailable"
          description={error || 'Could not load analytics metrics. Please ensure you have completed at least one quiz.'}
          actionLabel="Go to Workspace"
          onAction={() => window.location.assign('/workspace')}
        />
      </div>
    );
  }

  const {
    overallAccuracy,
    totalQuizzesTaken,
    totalQuestionsAnswered,
    totalStudyHours,
    topicsMasteredCount,
    subjectPerformance,
    topicAccuracyBreakdown,
    scoreTrends,
    weaknesses,
    strengths,
    learningDistribution
  } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#493522]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="accent">Learning Intelligence</Badge>
            <span className="text-xs text-[#D9C39B]/70 font-mono">• Persisted DB Telemetry</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5EBD8] font-serif">
            Performance & Mastery Intelligence
          </h1>
          <p className="text-sm font-serif text-[#D9C39B]/80">
            Real performance telemetry, difficulty trajectory, and adaptive weakness detection
          </p>
        </div>

        <Link to="/quiz">
          <Button size="sm" variant="primary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Open Assessment Crucible
          </Button>
        </Link>
      </div>

      {/* 1. Core Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-[#493522] bg-[#281F19]/95 backdrop-blur-md shadow-leather hover:border-[#B18A4C]/50 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-serif text-xs font-medium text-[#D9C39B] uppercase tracking-wider text-[11px]">
                Overall Accuracy
              </span>
              <div className="text-3xl font-serif font-extrabold tracking-tight text-[#F5EBD8] tabular-nums">
                {overallAccuracy}%
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#30241B] border border-[#493522] flex items-center justify-center text-[#C69B56] shadow-gold-glow">
              <TrendingUp className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#493522] bg-[#281F19]/95 backdrop-blur-md shadow-leather hover:border-[#B18A4C]/50 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-serif text-xs font-medium text-[#D9C39B] uppercase tracking-wider text-[11px]">
                Quizzes Completed
              </span>
              <div className="text-3xl font-serif font-extrabold tracking-tight text-[#F5EBD8] tabular-nums">
                {totalQuizzesTaken}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#30241B] border border-[#493522] flex items-center justify-center text-[#B18A4C] shadow-gold-glow">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#493522] bg-[#281F19]/95 backdrop-blur-md shadow-leather hover:border-[#B18A4C]/50 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-serif text-xs font-medium text-[#D9C39B] uppercase tracking-wider text-[11px]">
                Questions Answered
              </span>
              <div className="text-3xl font-serif font-extrabold tracking-tight text-[#F5EBD8] tabular-nums">
                {totalQuestionsAnswered}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#30241B] border border-[#493522] flex items-center justify-center text-[#D9C39B] shadow-sm">
              <BookOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#493522] bg-[#281F19]/95 backdrop-blur-md shadow-leather hover:border-[#B18A4C]/50 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="font-serif text-xs font-medium text-[#D9C39B] uppercase tracking-wider text-[11px]">
                Topics Mastered
              </span>
              <div className="text-3xl font-serif font-extrabold tracking-tight text-[#F5EBD8] tabular-nums">
                {topicsMasteredCount}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#30241B] border border-[#493522] flex items-center justify-center text-[#C69B56] shadow-gold-glow">
              <Award className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Charts Section: Score Trends & Subject Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Trend Line Chart */}
        <Card className="border border-[#493522] bg-[#281F19]/95 backdrop-blur-md shadow-leather">
          <CardHeader className="border-b border-[#493522] pb-3">
            <CardTitle className="text-sm font-serif font-bold text-[#F5EBD8]">Score Progression Over Time</CardTitle>
            <p className="text-xs font-serif text-[#D9C39B]/70">Historical assessment percentage trajectory</p>
          </CardHeader>
          <CardContent className="pt-4">
            {scoreTrends.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreTrends} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#493522" opacity={0.6} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#D9C39B' }} stroke="#493522" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#D9C39B' }} stroke="#493522" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1C1510',
                        borderColor: '#B18A4C',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#F5EBD8',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
                      }}
                      formatter={(value: any) => [`${value}%`, 'Score']}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#C69B56"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#1C1510', stroke: '#C69B56', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#B18A4C' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs font-serif text-[#D9C39B]/70 text-center py-16">
                Complete at least one quiz to view your score trend line.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Subject-Wise Performance Bar Chart */}
        <Card className="border border-[#493522] bg-[#281F19]/95 backdrop-blur-md shadow-leather">
          <CardHeader className="border-b border-[#493522] pb-3">
            <CardTitle className="text-sm font-serif font-bold text-[#F5EBD8]">Subject-Wise Performance</CardTitle>
            <p className="text-xs font-serif text-[#D9C39B]/70">Average accuracy percentage by academic discipline</p>
          </CardHeader>
          <CardContent className="pt-4">
            {subjectPerformance.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectPerformance} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#493522" opacity={0.6} />
                    <XAxis dataKey="subjectTitle" tick={{ fontSize: 10, fill: '#D9C39B' }} stroke="#493522" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#D9C39B' }} stroke="#493522" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1C1510',
                        borderColor: '#B18A4C',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#F5EBD8'
                      }}
                      formatter={(val: any) => [`${val}%`, 'Avg Score']}
                    />
                    <Bar dataKey="avgScore" fill="#B18A4C" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs font-serif text-[#D9C39B]/70 text-center py-16">No subject activity recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. Weaknesses & Strengths Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identified Weaknesses */}
        <Card className="border border-[#493522] bg-[#281F19]/95 backdrop-blur-md shadow-leather">
          <CardHeader className="border-b border-[#493522] pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <CardTitle className="text-sm font-serif font-bold text-[#F5EBD8]">Detected Academic Vulnerabilities</CardTitle>
            </div>
            <p className="text-xs font-serif text-[#D9C39B]/70">Concepts with repeated mistakes requiring immediate revision</p>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {weaknesses.length > 0 ? (
              weaknesses.map((w) => (
                <div
                  key={w.id}
                  className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/20 space-y-2 text-xs font-serif"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-200">
                      {w.topicTitle}
                    </span>
                    <Badge variant="danger" size="sm">
                      Missed {w.mistakeCount}x
                    </Badge>
                  </div>
                  <p className="text-[11px] text-rose-300 font-medium">
                    Concept: {w.conceptName}
                  </p>
                  <p className="text-[11px] text-[#D9C39B] leading-relaxed">
                    {w.recommendedAction}
                  </p>
                  <div className="pt-1">
                    <Link
                      to={`/workspace/computer-science/${w.topicSlug}?tab=quiz`}
                      className="text-[11px] text-[#C69B56] font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Practice Remedial Challenge</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs font-serif text-[#D9C39B]/70">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p>No critical repeated mistakes identified. Excellent comprehension across all units!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Demonstrated Strengths & Mastery */}
        <Card className="border border-[#493522] bg-[#281F19]/95 backdrop-blur-md shadow-leather">
          <CardHeader className="border-b border-[#493522] pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#C69B56]" />
              <CardTitle className="text-sm font-serif font-bold text-[#F5EBD8]">Demonstrated Mastery & Strengths</CardTitle>
            </div>
            <p className="text-xs font-serif text-[#D9C39B]/70">Topics with mastery scores of 80% or above</p>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {strengths.length > 0 ? (
              strengths.map((s, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-[#B18A4C]/30 bg-[#30241B]/50 flex items-center justify-between text-xs font-serif"
                >
                  <div>
                    <h4 className="font-semibold text-[#F5EBD8]">
                      {s.topicTitle}
                    </h4>
                    <p className="text-[11px] text-[#D9C39B]/70">
                      Completed {s.quizzesCompleted} assessment challenge(s)
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="font-bold text-[#C69B56] text-base tabular-nums">
                      {s.masteryScore}%
                    </span>
                    <Badge variant="journal" size="sm">
                      Mastered
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs font-serif text-[#D9C39B]/70 text-center py-10">
                Mastery badges unlock at 80% accuracy. Continue practicing topics to achieve mastery!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Topic-Level Accuracy Breakdown Table */}
      <Card className="border border-[#493522] bg-[#281F19]/95 backdrop-blur-md shadow-leather">
        <CardHeader className="border-b border-[#493522] pb-3">
          <CardTitle className="text-sm font-serif font-bold text-[#F5EBD8]">Curriculum Topic Accuracy Breakdown</CardTitle>
          <p className="text-xs font-serif text-[#D9C39B]/70">Comprehensive view across all active curriculum modules</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-serif text-[#D9C39B]">
              <thead className="border-b border-[#493522] text-[11px] uppercase font-semibold text-[#D9C39B]/70">
                <tr>
                  <th className="pb-3">Topic</th>
                  <th className="pb-3">Subject</th>
                  <th className="pb-3">Attempts</th>
                  <th className="pb-3">Accuracy</th>
                  <th className="pb-3">Mastery</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#493522]/50">
                {topicAccuracyBreakdown.map((t, idx) => (
                  <tr key={idx} className="hover:bg-[#30241B]/40 transition-colors">
                    <td className="py-3.5 font-semibold text-[#F5EBD8]">
                      {t.topicTitle}
                    </td>
                    <td className="py-3.5 text-[#D9C39B]/70">{t.subjectTitle}</td>
                    <td className="py-3.5 tabular-nums text-[#D9C39B]">{t.attemptsCount}</td>
                    <td className="py-3.5 font-medium tabular-nums text-[#C69B56]">{t.accuracy}%</td>
                    <td className="py-3.5 font-medium tabular-nums text-[#F5EBD8]">{t.masteryScore}%</td>
                    <td className="py-3.5">
                      <Badge
                        variant={
                          t.status === 'mastered'
                            ? 'journal'
                            : t.status === 'completed'
                              ? 'accent'
                              : 'neutral'
                        }
                        size="sm"
                        className="capitalize"
                      >
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3.5 text-right">
                      <Link to={`/workspace`}>
                        <Button variant="ghost" size="sm" className="text-[#D9C39B] hover:text-[#F5EBD8]">
                          Study
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

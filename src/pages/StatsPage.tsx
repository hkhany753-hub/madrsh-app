import { useEffect, useState, useCallback } from 'react';
import { Clock, FileText, CheckCircle, XCircle, MinusCircle, TrendingUp, BarChart3, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, StatCard, LoadingSpinner, EmptyState } from '@/components/ui';
import { Button } from '@/components/Form';
import { BarChart, LineChart, DonutChart } from '@/components/Charts';
import { toPersianDigits, formatDuration, todayISODate, getStartOfWeek, getStartOfJalaliMonth, dateToISODate, getJalaliMonthDays, jalaliToGregorian, getCurrentJalaliDate, jalaliMonthNames } from '@/lib/jalali';
import { getSubjectColor, SUBJECTS } from '@/lib/constants';
import { loadStudyProfile, streamAIResponse } from '@/lib/ai-service';
import type { AIStudyProfile, AITaskType } from '@/lib/ai-types';
import type { Activity } from '@/lib/types';

type Period = 'day' | 'week' | 'month';

export function StatsPage() {
  const [period, setPeriod] = useState<Period>('week');
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const today = todayISODate();
      const weekStart = dateToISODate(getStartOfWeek());
      const monthStart = dateToISODate(getStartOfJalaliMonth());

      let startDate: string;
      if (period === 'day') {
        startDate = today;
      } else if (period === 'week') {
        startDate = weekStart;
      } else {
        startDate = monthStart;
      }

      const { data } = await supabase
        .from('activities')
        .select('*')
        .gte('activity_date', startDate)
        .order('activity_date', { ascending: true });

      setActivities((data as Activity[]) || []);
      setLoading(false);
    }
    loadData();
  }, [period]);

  const totalMinutes = activities.reduce((s, a) => s + a.duration_minutes, 0);
  const totalTests = activities.reduce((s, a) => s + a.test_count, 0);
  const totalCorrect = activities.reduce((s, a) => s + a.correct, 0);
  const totalWrong = activities.reduce((s, a) => s + a.wrong, 0);
  const totalBlank = activities.reduce((s, a) => s + a.blank, 0);
  const totalAnswered = totalCorrect + totalWrong;
  const responseRate = totalTests > 0 ? Math.round((totalAnswered / totalTests) * 100) : 0;
  const avgMinutes = activities.length > 0 ? Math.round(totalMinutes / activities.length) : 0;
  const avgTests = activities.length > 0 ? Math.round(totalTests / activities.length) : 0;

  // Group by day for chart
  const dayMap = new Map<string, { minutes: number; tests: number }>();
  activities.forEach((a) => {
    const existing = dayMap.get(a.activity_date) || { minutes: 0, tests: 0 };
    existing.minutes += a.duration_minutes;
    existing.tests += a.test_count;
    dayMap.set(a.activity_date, existing);
  });

  const chartData = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => {
      const d = new Date(date);
      const [, , jd] = (() => {
        const [y, m, day] = date.split('-').map(Number);
        return [y, m, day];
      })();
      return {
        label: toPersianDigits(jd),
        value: period === 'day' ? vals.tests : vals.minutes,
      };
    });

  // Subject breakdown
  const subjectMap = new Map<string, number>();
  activities.forEach((a) => {
    subjectMap.set(a.subject, (subjectMap.get(a.subject) || 0) + a.duration_minutes);
  });
  const subjectData = Array.from(subjectMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([subject, minutes]) => {
      const c = getSubjectColor(subject);
      return { label: subject, value: minutes, color: c.dot };
    });

  const periods: { key: Period; label: string }[] = [
    { key: 'day', label: 'روزانه' },
    { key: 'week', label: 'هفتگی' },
    { key: 'month', label: 'ماهانه' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">آمار فعالیت</h1>
        <p className="text-sm text-zinc-400 mt-1">تحلیل عملکرد مطالعه و تست شما</p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl w-fit">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold interactive ${
              period === p.key ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {activities.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={<BarChart3 size={28} />}
            title="داده‌ای برای نمایش وجود ندارد"
            description="فعالیت‌های خود را ثبت کنید تا آمار شما نمایش داده شود"
          />
        </Card>
      ) : (
        <>
          {/* Main stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Clock size={24} />} label="کل مطالعه" value={formatDuration(totalMinutes)} color="text-primary" />
            <StatCard icon={<FileText size={24} />} label="کل تست" value={toPersianDigits(totalTests)} color="text-emerald-400" />
            <StatCard icon={<TrendingUp size={24} />} label="درصد پاسخگویی" value={`${toPersianDigits(responseRate)}٪`} color="text-amber-400" />
            <StatCard icon={<Clock size={24} />} label="میانگین مطالعه" value={formatDuration(avgMinutes)} color="text-cyan-400" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">نمودار مطالعه روزانه</h3>
                <Clock size={18} className="text-primary" />
              </div>
              {chartData.length > 0 ? (
                <LineChart data={chartData} color="#3b82f6" height={200} />
              ) : (
                <p className="text-sm text-zinc-500 text-center py-12">داده‌ای موجود نیست</p>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">توزیع تست‌ها</h3>
                <FileText size={18} className="text-emerald-400" />
              </div>
              <DonutChart
                segments={[
                  { label: 'درست', value: totalCorrect, color: 'bg-emerald-500' },
                  { label: 'غلط', value: totalWrong, color: 'bg-red-500' },
                  { label: 'نزده', value: totalBlank, color: 'bg-zinc-500' },
                ]}
                size={160}
              />
            </Card>
          </div>

          {/* Test breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-xs text-zinc-400">پاسخ‌های درست</p>
                <p className="text-xl font-bold text-white">{toPersianDigits(totalCorrect)}</p>
              </div>
            </Card>
            <Card className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
                <XCircle size={24} />
              </div>
              <div>
                <p className="text-xs text-zinc-400">پاسخ‌های غلط</p>
                <p className="text-xl font-bold text-white">{toPersianDigits(totalWrong)}</p>
              </div>
            </Card>
            <Card className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-zinc-500/10 text-zinc-400">
                <MinusCircle size={24} />
              </div>
              <div>
                <p className="text-xs text-zinc-400">نزده</p>
                <p className="text-xl font-bold text-white">{toPersianDigits(totalBlank)}</p>
              </div>
            </Card>
          </div>

          {/* Subject breakdown */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">مطالعه به تفکیک درس</h3>
              <BarChart3 size={18} className="text-primary" />
            </div>
            <div className="space-y-3">
              {subjectData.map((s) => {
                const max = subjectData[0]?.value || 1;
                const pct = (s.value / max) * 100;
                return (
                  <div key={s.label}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                        <span className="text-zinc-300">{s.label}</span>
                      </div>
                      <span className="text-zinc-400 text-xs">{formatDuration(s.value)}</span>
                    </div>
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${s.color} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* AI Auto-Analysis */}
          <StatsAIAnalysis
            activities={activities}
            totalMinutes={totalMinutes}
            totalTests={totalTests}
            totalCorrect={totalCorrect}
            totalWrong={totalWrong}
            totalBlank={totalBlank}
            subjectData={subjectData}
            period={period}
          />
        </>
      )}
    </div>
  );
}

// === AI Auto-Analysis Component for Stats Page ===
function StatsAIAnalysis({
  activities,
  totalMinutes,
  totalTests,
  totalCorrect,
  totalWrong,
  totalBlank,
  subjectData,
  period,
}: {
  activities: Activity[];
  totalMinutes: number;
  totalTests: number;
  totalCorrect: number;
  totalWrong: number;
  totalBlank: number;
  subjectData: Array<{ label: string; value: number; color: string }>;
  period: string;
}) {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studyProfile, setStudyProfile] = useState<AIStudyProfile | null>(null);

  useEffect(() => {
    loadStudyProfile().then(setStudyProfile);
  }, []);

  const generateAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAnalysis('');

    const periodLabel = period === 'day' ? 'امروز' : period === 'week' ? 'این هفته' : 'این ماه';
    const responseRate = totalTests > 0 ? Math.round(((totalCorrect + totalWrong) / totalTests) * 100) : 0;
    const accuracy = (totalCorrect + totalWrong) > 0 ? Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100) : 0;

    const statsSummary = `تحلیل آمار ${periodLabel}:
- مجموع زمان مطالعه: ${totalMinutes} دقیقه
- مجموع تست: ${totalTests}
- پاسخ درست: ${totalCorrect}، غلط: ${totalWrong}، نزده: ${totalBlank}
- درصد پاسخگویی: ${responseRate}٪
- درصد دقت: ${accuracy}٪
- تعداد فعالیت ثبت‌شده: ${activities.length}
- درس‌های مطالعه‌شده: ${subjectData.map((s) => `${s.label} (${s.value} دقیقه)`).join('، ')}

لطفاً این آمار را به‌صورت کامل تحلیل کن و بگو:
۱. چه چیزی خوب است (نقاط قوت)
۲. چه چیزی بد است یا نیاز به بهبود دارد (نقاط ضعف)
۳. چه چیزی توصیه می‌شود (پیشنهادهای عملی و مشخص)`;

    const tempId = crypto.randomUUID();
    await streamAIResponse(
      tempId,
      [{ role: 'user', content: statsSummary }],
      'stats-analysis' as AITaskType,
      studyProfile,
      {
        total_minutes: totalMinutes,
        total_tests: totalTests,
        avg_percentage: accuracy,
        subjects_studied: subjectData.map((s) => s.label),
        streak: 0,
        week_minutes: totalMinutes,
      },
      {
        onToken: (token) => setAnalysis((prev) => prev + token),
        onDone: () => setLoading(false),
        onError: (err) => {
          setError(err);
          setLoading(false);
        },
      },
    );
  }, [activities.length, totalMinutes, totalTests, totalCorrect, totalWrong, totalBlank, subjectData, period, studyProfile]);

  return (
    <Card className="p-5 border border-primary-20 bg-primary-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary-10">
            <Sparkles size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">تحلیل هوشمند آمار</h3>
            <p className="text-xs text-zinc-400">تحلیل خودکار توسط MADRSH AI</p>
          </div>
        </div>
        {!loading && (
          <Button size="sm" variant="secondary" onClick={generateAnalysis}>
            <RefreshCw size={14} />
            {analysis ? 'تحلیل مجدد' : 'تحلیل کن'}
          </Button>
        )}
      </div>

      {loading && !analysis && (
        <div className="flex items-center gap-3 py-6">
          <Loader2 size={20} className="animate-spin text-primary" />
          <span className="text-sm text-zinc-400">در حال تحلیل آمار...</span>
        </div>
      )}

      {loading && analysis && (
        <div className="flex items-center gap-2 mb-2">
          <Loader2 size={14} className="animate-spin text-primary" />
          <span className="text-xs text-zinc-500">در حال دریافت...</span>
        </div>
      )}

      {analysis && (
        <div className="text-sm text-zinc-200 whitespace-pre-wrap break-words leading-relaxed">
          {analysis}
          {loading && (
            <span className="inline-block w-1.5 h-4 bg-primary ml-1 animate-pulse" />
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!analysis && !loading && !error && (
        <p className="text-sm text-zinc-400 py-2">
          با کلیک روی «تحلیل کن»، هوش مصنوعی آمار شما را بررسی می‌کند و نقاط قوت، ضعف و توصیه‌ها را ارائه می‌دهد.
        </p>
      )}
    </Card>
  );
}

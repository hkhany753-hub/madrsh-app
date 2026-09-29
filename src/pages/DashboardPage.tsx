import { useCallback, useEffect, useState } from 'react';
import { Clock, FileText, Target, TrendingUp, TrendingDown, CheckCircle, Circle, BookOpen, Flame, Zap, ArrowLeft, Timer, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, StatCard, LoadingSpinner, EmptyState, ProgressBar } from '@/components/ui';
import { BarChart, RingProgress } from '@/components/Charts';
import { ThemeCardBackground, useCurrentTheme } from '@/components/ThemeCardBackground';
import { formatJalaliDate, formatDuration, toPersianDigits, getStartOfWeek, todayISODate, dateToISODate, relativeTime } from '@/lib/jalali';
import { getSubjectColor } from '@/lib/constants';
import type { Activity, Task } from '@/lib/types';
import type { PageKey } from '@/components/Layout';

function getMotivationalMessage(streak: number, goalPct: number, todayMinutes: number): { text: string; icon: typeof Flame } {
  if (todayMinutes === 0) {
    return { text: 'بریم شروع کنیم! همین الان اولین فعالیت امروز رو ثبت کن', icon: Zap };
  }
  if (goalPct >= 100) {
    return { text: 'عالی! امروز هدف روزانه‌ات رو کامل کردی', icon: Flame };
  }
  if (goalPct >= 75) {
    return { text: 'خیلی نزدیکی! یک کم دیگه و هدف امروز تموم میشه', icon: Target };
  }
  if (goalPct >= 50) {
    return { text: 'نصف راه رو اومدی، ادامه بده', icon: TrendingUp };
  }
  if (streak >= 7) {
    return { text: `${toPersianDigits(streak)} روز پیوسته مطالعه! این قدرت رو حفظ کن`, icon: Flame };
  }
  if (streak >= 3) {
    return { text: `${toPersianDigits(streak)} روز پیوسته! داری عالی پیش میری`, icon: TrendingUp };
  }
  return { text: 'هر دقیقه مطالعه مهمه، ادامه بده', icon: BookOpen };
}

function calculateStreak(activities: Activity[]): number {
  if (activities.length === 0) return 0;
  const dates = new Set(activities.map((a) => a.activity_date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = dateToISODate(d);
    if (dates.has(iso)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export function DashboardPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const { profile } = useAuth();
  const [currentTheme] = useCurrentTheme();
  const [loading, setLoading] = useState(true);
  const [todayActivities, setTodayActivities] = useState<Activity[]>([]);
  const [weekActivities, setWeekActivities] = useState<Activity[]>([]);
  const [lastWeekActivities, setLastWeekActivities] = useState<Activity[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [weekChart, setWeekChart] = useState<{ label: string; value: number }[]>([]);

  const loadData = useCallback(async () => {
    const today = todayISODate();
    const weekStart = getStartOfWeek();
    const weekStartISO = weekStart.toISOString().split('T')[0];
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekStartISO = lastWeekStart.toISOString().split('T')[0];

    const [todayRes, weekRes, lastWeekRes, allRes, recentRes, tasksRes] = await Promise.all([
      supabase.from('activities').select('*').eq('activity_date', today).order('created_at', { ascending: false }),
      supabase.from('activities').select('*').gte('activity_date', weekStartISO).order('activity_date', { ascending: true }),
      supabase.from('activities').select('*').gte('activity_date', lastWeekStartISO).lt('activity_date', weekStartISO),
      supabase.from('activities').select('activity_date, duration_minutes, test_count').order('activity_date', { ascending: false }).limit(365),
      supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('tasks').select('*').eq('task_date', today).order('created_at', { ascending: false }),
    ]);

    setTodayActivities((todayRes.data as Activity[]) || []);
    setWeekActivities((weekRes.data as Activity[]) || []);
    setLastWeekActivities((lastWeekRes.data as Activity[]) || []);
    setAllActivities((allRes.data as Activity[]) || []);
    setRecentActivities((recentRes.data as Activity[]) || []);
    setTodayTasks((tasksRes.data as Task[]) || []);

    const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
    const todayDate = new Date();
    const jsDay = todayDate.getDay();
    const diff = jsDay === 6 ? 0 : jsDay + 1;
    const weekDays: { label: string; value: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(todayDate.getDate() - diff + i);
      const iso = d.toISOString().split('T')[0];
      const dayActivities = (weekRes.data as Activity[]) || [];
      const total = dayActivities.filter((a) => a.activity_date === iso).reduce((sum, a) => sum + a.duration_minutes, 0);
      weekDays.push({ label: dayNames[i], value: total });
    }
    setWeekChart(weekDays);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-activities')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, () => loadData())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activities' }, () => loadData())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'activities' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  const todayMinutes = todayActivities.reduce((s, a) => s + a.duration_minutes, 0);
  const todayTests = todayActivities.reduce((s, a) => s + a.test_count, 0);
  const weekMinutes = weekActivities.reduce((s, a) => s + a.duration_minutes, 0);
  const weekTests = weekActivities.reduce((s, a) => s + a.test_count, 0);
  const lastWeekMinutes = lastWeekActivities.reduce((s, a) => s + a.duration_minutes, 0);
  const lastWeekTests = lastWeekActivities.reduce((s, a) => s + a.test_count, 0);
  const completedTasks = todayTasks.filter((t) => t.completed).length;
  const taskPct = todayTasks.length > 0 ? (completedTasks / todayTasks.length) * 100 : 0;
  const streak = calculateStreak(allActivities);

  const dailyGoal = 480;
  const goalPct = Math.min(100, (todayMinutes / dailyGoal) * 100);
  const weekDiff = weekMinutes - lastWeekMinutes;
  const weekDiffPct = lastWeekMinutes > 0 ? Math.round(((weekMinutes - lastWeekMinutes) / lastWeekMinutes) * 100) : 0;

  const motivational = getMotivationalMessage(streak, goalPct, todayMinutes);
  const MotivIcon = motivational.icon;

  return (
    <div className="space-y-6">
      {/* ===== Daily Goal Progress Card — at the very top of dashboard ===== */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Theme-specific background */}
        <ThemeCardBackground theme={currentTheme} />

        {/* Content */}
        <div className="relative flex items-center justify-between p-6 sm:p-8 min-h-[200px] gap-4">
          {/* Right side (RTL): text info */}
          <div className="flex-1 text-right space-y-2">
            <div className="flex items-center gap-2 justify-end">
              <h2 className="text-lg sm:text-xl font-bold text-white">پیشرفت هدف روزانه</h2>
              <Target size={20} className="text-amber-300" />
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              {formatDuration(todayMinutes)}
            </p>
            <p className="text-sm text-zinc-200">
              از {formatDuration(dailyGoal)} مطالعه امروز
            </p>
            <p className="text-xs text-zinc-300">
              {goalPct < 100
                ? `${formatDuration(Math.max(0, dailyGoal - todayMinutes))} باقی‌مانده تا هدف`
                : 'هدف امروز کامل شد!'}
            </p>
            <button
              onClick={() => onNavigate('log-activity')}
              className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white rounded-xl text-sm font-semibold border border-white/20 transition-base"
            >
              <Target size={18} />
              ثبت فعالیت
            </button>
          </div>

          {/* Left side (RTL): ring progress */}
          <div className="shrink-0 relative">
            <RingProgress value={todayMinutes} max={dailyGoal} size={120} label={formatDuration(dailyGoal)} />
            {goalPct >= 100 && (
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                <CheckCircle size={16} className="text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            سلام، {profile?.display_name || 'کاربر'}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">{formatJalaliDate(new Date())}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('today-tasks')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-2 border border-border text-zinc-200 rounded-xl text-sm font-semibold interactive"
          >
            <Timer size={18} />
            تایمر
          </button>
          <button
            onClick={() => onNavigate('log-activity')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold shadow-primary interactive"
          >
            <Target size={18} />
            ثبت فعالیت
          </button>
        </div>
      </div>

      {/* Motivational message + Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2 bg-primary-5 border-primary-20">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary-10">
              <MotivIcon size={24} className="text-primary" />
            </div>
            <p className="text-sm font-medium text-zinc-200">{motivational.text}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Flame size={28} className="text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{toPersianDigits(streak)}</p>
            <p className="text-xs text-zinc-400">روز پیوسته مطالعه</p>
          </div>
        </Card>
      </div>

      {/* MADRSH AI Widget */}
      <button
        onClick={() => onNavigate('ai')}
        className="group glass rounded-xl p-5 interactive text-right w-full bg-primary-5 border-primary-20"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary-10 group-hover:scale-110 transition-transform duration-300">
            <Sparkles size={28} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white mb-1">MADRSH AI</h3>
            <p className="text-sm text-zinc-400">
              {todayMinutes > 0
                ? `امروز ${formatDuration(todayMinutes)} مطالعه ثبت کرده‌ای. تحلیل عملکردت رو ببین!`
                : 'دستیار هوشمند مطالعه — برنامه بساز، تحلیل بگیر، مبحث یاد بگیر'}
            </p>
          </div>
          <div className="flex items-center gap-1 text-primary text-sm font-semibold">
            <span className="hidden sm:inline">شروع</span>
            <ArrowLeft size={18} />
          </div>
        </div>
      </button>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Clock size={24} />} label="مطالعه امروز" value={formatDuration(todayMinutes)} color="text-primary" />
        <StatCard icon={<Clock size={24} />} label="مطالعه این هفته" value={formatDuration(weekMinutes)} color="text-cyan-400" />
        <StatCard icon={<FileText size={24} />} label="تست امروز" value={toPersianDigits(todayTests)} color="text-emerald-400" />
        <StatCard icon={<FileText size={24} />} label="تست این هفته" value={toPersianDigits(weekTests)} color="text-amber-400" />
      </div>

      {/* Weekly chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm text-zinc-400">نمودار مطالعه این هفته</h3>
          {lastWeekMinutes > 0 && (
            <div className={`flex items-center gap-1 text-xs ${weekDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {weekDiff >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {weekDiff >= 0 ? '+' : ''}{toPersianDigits(weekDiffPct)}٪ نسبت به هفته قبل
            </div>
          )}
        </div>
        <BarChart data={weekChart} color="bg-primary" height={180} unit="دقیقه" />
      </Card>

      {/* Today tasks + Recent activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today tasks */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">کارهای امروز</h3>
            <button onClick={() => onNavigate('today-tasks')} className="text-xs text-primary hover:text-primary flex items-center gap-1">
              مشاهده همه <ArrowLeft size={12} />
            </button>
          </div>
          {todayTasks.length === 0 ? (
            <EmptyState icon={<CheckCircle size={28} />} title="کاری برای امروز ثبت نشده" description="کارهای امروز خود را اضافه کنید" />
          ) : (
            <>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                  <span>{toPersianDigits(completedTasks)} از {toPersianDigits(todayTasks.length)} انجام شده</span>
                  <span>{toPersianDigits(Math.round(taskPct))}٪</span>
                </div>
                <ProgressBar value={completedTasks} max={todayTasks.length} color="bg-emerald-500" />
              </div>
              <div className="space-y-2">
                {todayTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center gap-3 py-2">
                    {task.completed ? (
                      <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                    ) : (
                      <Circle size={18} className="text-zinc-600 shrink-0" />
                    )}
                    <span className={`text-sm ${task.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Recent activities */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">فعالیت‌های اخیر</h3>
            <button onClick={() => onNavigate('stats')} className="text-xs text-primary hover:text-primary flex items-center gap-1">
              مشاهده همه <ArrowLeft size={12} />
            </button>
          </div>
          {recentActivities.length === 0 ? (
            <EmptyState icon={<BookOpen size={28} />} title="فعالیتی ثبت نشده" description="اولین فعالیت مطالعه خود را ثبت کنید" />
          ) : (
            <div className="space-y-2">
              {recentActivities.map((act) => {
                const c = getSubjectColor(act.subject);
                return (
                  <div key={act.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg interactive">
                    <div className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{act.subject}</p>
                      <p className="text-xs text-zinc-500">
                        {act.activity_type} • {formatDuration(act.duration_minutes)}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-500 shrink-0">{relativeTime(new Date(act.created_at))}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

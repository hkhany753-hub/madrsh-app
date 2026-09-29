import { useEffect, useState } from 'react';
import { Trophy, Clock, FileText, Activity as ActivityIcon, Medal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, LoadingSpinner, EmptyState } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { toPersianDigits, formatDuration, todayISODate, getStartOfWeek, getStartOfJalaliMonth, dateToISODate } from '@/lib/jalali';
import { LEADERBOARD_PERIODS, type LeaderboardPeriod } from '@/lib/constants';
import type { LeaderboardEntry } from '@/lib/types';

type Metric = 'minutes' | 'tests' | 'activities';

export function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const [metric, setMetric] = useState<Metric>('minutes');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      let startDate: string;
      if (period === 'today') {
        startDate = todayISODate();
      } else if (period === 'week') {
        startDate = dateToISODate(getStartOfWeek());
      } else if (period === 'month') {
        startDate = dateToISODate(getStartOfJalaliMonth());
      } else {
        startDate = '2000-01-01';
      }

      const { data: activities } = await supabase
        .from('activities')
        .select(`
          user_id,
          duration_minutes,
          test_count,
          subject
        `)
        .gte('activity_date', startDate);

      if (!activities || activities.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Aggregate by user
      const userMap = new Map<string, { minutes: number; tests: number; activities: number }>();
      activities.forEach((a: { user_id: string; duration_minutes: number; test_count: number; subject: string }) => {
        const existing = userMap.get(a.user_id) || { minutes: 0, tests: 0, activities: 0 };
        existing.minutes += a.duration_minutes;
        existing.tests += a.test_count;
        existing.activities += 1;
        userMap.set(a.user_id, existing);
      });

      const userIds = Array.from(userMap.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map<string, { display_name: string; username: string; avatar_url: string | null }>();
      (profiles || []).forEach((p: { id: string; display_name: string; username: string; avatar_url: string | null }) => {
        profileMap.set(p.id, { display_name: p.display_name, username: p.username, avatar_url: p.avatar_url });
      });

      const result: LeaderboardEntry[] = userIds.map((uid) => {
        const stats = userMap.get(uid)!;
        const profile = profileMap.get(uid);
        return {
          user_id: uid,
          display_name: profile?.display_name || 'کاربر',
          username: profile?.username || 'user',
          avatar_url: profile?.avatar_url || null,
          total_minutes: stats.minutes,
          total_tests: stats.tests,
          total_activities: stats.activities,
        };
      });

      // Sort by selected metric
      result.sort((a, b) => {
        if (metric === 'minutes') return b.total_minutes - a.total_minutes;
        if (metric === 'tests') return b.total_tests - a.total_tests;
        return b.total_activities - a.total_activities;
      });

      setEntries(result);
      setLoading(false);
    }
    loadData();
  }, [period, metric]);

  const metrics: { key: Metric; label: string; icon: typeof Clock }[] = [
    { key: 'minutes', label: 'ساعت مطالعه', icon: Clock },
    { key: 'tests', label: 'تست', icon: FileText },
    { key: 'activities', label: 'فعالیت', icon: ActivityIcon },
  ];

  function getValue(entry: LeaderboardEntry): string {
    if (metric === 'minutes') return formatDuration(entry.total_minutes);
    if (metric === 'tests') return `${toPersianDigits(entry.total_tests)} تست`;
    return `${toPersianDigits(entry.total_activities)} فعالیت`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">برترین‌ها</h1>
        <p className="text-sm text-zinc-400 mt-1">رتبه‌بندی کاربران بر اساس فعالیت</p>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl w-fit flex-wrap">
        {LEADERBOARD_PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold interactive ${
              period === p.key ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Metric selector */}
      <div className="flex gap-2 flex-wrap">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium interactive border ${
                metric === m.key
                  ? 'bg-primary-10 text-primary border-primary-20'
                  : 'bg-surface text-zinc-400 border-border hover:text-white'
              }`}
            >
              <Icon size={18} />
              {m.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size={32} />
        </div>
      ) : entries.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={<Trophy size={28} />}
            title="داده‌ای موجود نیست"
            description="هنوز فعالیتی برای این دوره ثبت نشده است"
          />
        </Card>
      ) : (
        <>
          {/* Top 3 podium */}
          {entries.length >= 3 && (
            <div className="grid grid-cols-3 gap-3">
              {/* 2nd place */}
              <div className="flex flex-col items-center pt-8">
                <div className="relative">
                  <Avatar url={entries[1].avatar_url} name={entries[1].display_name} size={56} />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-zinc-400 flex items-center justify-center text-xs font-bold text-white">۲</div>
                </div>
                <p className="text-sm font-bold text-white mt-2 text-center truncate w-full">{entries[1].display_name}</p>
                <p className="text-xs text-zinc-400">{getValue(entries[1])}</p>
                <div className="w-full mt-3 h-20 bg-surface border border-border rounded-xl flex items-center justify-center">
                  <Medal size={28} className="text-zinc-400" />
                </div>
              </div>
              {/* 1st place */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <Avatar url={entries[0].avatar_url} name={entries[0].display_name} size={72} className="ring-2 ring-amber-500/40" />
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-sm font-bold text-white">۱</div>
                </div>
                <p className="text-sm font-bold text-white mt-2 text-center truncate w-full">{entries[0].display_name}</p>
                <p className="text-xs text-amber-400">{getValue(entries[0])}</p>
                <div className="w-full mt-3 h-28 bg-gradient-to-b from-amber-500/10 to-surface border border-amber-500/20 rounded-xl flex items-center justify-center">
                  <Trophy size={36} className="text-amber-400" />
                </div>
              </div>
              {/* 3rd place */}
              <div className="flex flex-col items-center pt-12">
                <div className="relative">
                  <Avatar url={entries[2].avatar_url} name={entries[2].display_name} size={48} />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold text-white">۳</div>
                </div>
                <p className="text-sm font-bold text-white mt-2 text-center truncate w-full">{entries[2].display_name}</p>
                <p className="text-xs text-zinc-400">{getValue(entries[2])}</p>
                <div className="w-full mt-3 h-16 bg-surface border border-border rounded-xl flex items-center justify-center">
                  <Medal size={24} className="text-orange-600" />
                </div>
              </div>
            </div>
          )}

          {/* Full ranking */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-4">رتبه‌بندی کامل</h3>
            <div className="space-y-2">
              {entries.map((entry, i) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 p-3 rounded-xl interactive ${
                    i === 0 ? 'bg-amber-500/5 border border-amber-500/20' : ''
                  }`}
                >
                  <span className={`w-8 text-center font-bold ${i < 3 ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {toPersianDigits(i + 1)}
                  </span>
                  <Avatar url={entry.avatar_url} name={entry.display_name} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{entry.display_name}</p>
                    <p className="text-xs text-zinc-500">@{entry.username}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-sm font-bold text-white">{getValue(entry)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

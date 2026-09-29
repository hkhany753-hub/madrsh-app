import { useEffect, useState } from 'react';
import { Clock, FileText, Target, TrendingUp, BookOpen, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, StatCard, LoadingSpinner, EmptyState } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { BarChart } from '@/components/Charts';
import { toPersianDigits, formatDuration, formatJalaliDate, relativeTime, getStartOfWeek, dateToISODate } from '@/lib/jalali';
import { getSubjectColor } from '@/lib/constants';
import type { Activity, Task } from '@/lib/types';
import type { PageKey } from '@/components/Layout';

export function ProfilePage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    async function loadData() {
      const [actRes, taskRes] = await Promise.all([
        supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(5),
      ]);
      setActivities((actRes.data as Activity[]) || []);
      setTasks((taskRes.data as Task[]) || []);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  const totalMinutes = activities.reduce((s, a) => s + a.duration_minutes, 0);
  const totalTests = activities.reduce((s, a) => s + a.test_count, 0);
  const totalCorrect = activities.reduce((s, a) => s + a.correct, 0);

  // Subject distribution
  const subjectMap = new Map<string, number>();
  activities.forEach((a) => {
    subjectMap.set(a.subject, (subjectMap.get(a.subject) || 0) + a.duration_minutes);
  });
  const subjectChart = Array.from(subjectMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([subject, min]) => {
      const jDate = new Date();
      const [, , jd] = [jDate.getFullYear(), jDate.getMonth() + 1, jDate.getDate()];
      return { label: subject.slice(0, 6), value: min };
    });

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <Avatar url={profile?.avatar_url} name={profile?.display_name} size={100} className="ring-2 ring-primary/20" />
          <div className="flex-1 text-center sm:text-right">
            <h1 className="text-2xl font-bold text-white">{profile?.display_name || 'کاربر'}</h1>
            <p className="text-sm text-zinc-400 mt-1">@{profile?.username}</p>
            {profile?.study_goal && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-10 text-primary text-sm">
                <Target size={16} />
                {profile.study_goal}
              </div>
            )}
            <p className="text-xs text-zinc-500 mt-3">
              عضو از {formatJalaliDate(new Date(profile?.created_at || Date.now()))}
            </p>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="px-4 py-2.5 bg-surface-2 text-zinc-200 rounded-xl text-sm font-semibold interactive"
          >
            ویرایش پروفایل
          </button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Clock size={24} />} label="کل مطالعه" value={formatDuration(totalMinutes)} color="text-primary" />
        <StatCard icon={<FileText size={24} />} label="کل تست" value={toPersianDigits(totalTests)} color="text-emerald-400" />
        <StatCard icon={<TrendingUp size={24} />} label="پاسخ‌های درست" value={toPersianDigits(totalCorrect)} color="text-amber-400" />
        <StatCard icon={<BookOpen size={24} />} label="فعالیت‌ها" value={toPersianDigits(activities.length)} color="text-cyan-400" />
      </div>

      {/* Subject chart */}
      {subjectChart.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">مطالعه به تفکیک درس</h3>
          <BarChart data={subjectChart} color="bg-primary" height={180} />
        </Card>
      )}

      {/* Recent activities */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">فعالیت‌های اخیر</h3>
        {activities.length === 0 ? (
          <EmptyState icon={<BookOpen size={28} />} title="فعالیتی ثبت نشده" />
        ) : (
          <div className="space-y-2">
            {activities.map((act) => {
              const c = getSubjectColor(act.subject);
              return (
                <div key={act.id} className="flex items-center gap-3 p-3 rounded-lg interactive">
                  <div className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{act.subject}</p>
                    <p className="text-xs text-zinc-500">{act.activity_type} • {relativeTime(new Date(act.created_at))}</p>
                  </div>
                  <span className="text-xs text-zinc-400 shrink-0">{formatDuration(act.duration_minutes)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Recent tasks */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">کارهای اخیر</h3>
        {tasks.length === 0 ? (
          <EmptyState icon={<Calendar size={28} />} title="کاری ثبت نشده" />
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg interactive">
                <div className={`w-2 h-2 rounded-full ${task.completed ? 'bg-emerald-500' : 'bg-zinc-600'} shrink-0`} />
                <p className={`text-sm flex-1 ${task.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                  {task.title}
                </p>
                <span className="text-xs text-zinc-500">{relativeTime(new Date(task.created_at))}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

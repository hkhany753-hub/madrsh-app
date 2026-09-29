import { useEffect, useState } from 'react';
import { Search as SearchIcon, BookOpen, FileText, Users, DoorOpen, Activity as ActivityIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, EmptyState } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { formatStoredDate, formatDuration, toPersianDigits, relativeTime } from '@/lib/jalali';
import { getSubjectColor, SUBJECTS } from '@/lib/constants';
import type { Activity, Exam, Profile, StudyRoom } from '@/lib/types';
import type { PageKey } from '@/components/Layout';

export function SearchPage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    subjects: string[];
    activities: Activity[];
    exams: Exam[];
    users: Profile[];
    rooms: StudyRoom[];
  }>({ subjects: [], activities: [], exams: [], users: [], rooms: [] });
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ subjects: [], activities: [], exams: [], users: [], rooms: [] });
      setSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearched(true);
      const q = query.trim();

      // Search subjects
      const matchedSubjects = SUBJECTS.filter((s) => s.includes(q));

      // Search activities
      let activities: Activity[] = [];
      if (user) {
        const { data: actData } = await supabase
          .from('activities')
          .select('*')
          .or(`subject.ilike.%${q}%,topic.ilike.%${q}%,notes.ilike.%${q}%`)
          .limit(10);
        activities = (actData as Activity[]) || [];
      }

      // Search exams
      let exams: Exam[] = [];
      if (user) {
        const { data: examData } = await supabase
          .from('exams')
          .select('*')
          .ilike('subject', `%${q}%`)
          .limit(10);
        exams = (examData as Exam[]) || [];
      }

      // Search users
      const { data: userData } = await supabase
        .from('profiles')
        .select('*')
        .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
        .limit(10);
      const users = (userData as Profile[]) || [];

      // Search rooms
      const { data: roomData } = await supabase
        .from('study_rooms')
        .select('*')
        .ilike('name', `%${q}%`)
        .limit(10);
      const rooms = (roomData as StudyRoom[]) || [];

      setResults({ subjects: matchedSubjects, activities, exams, users, rooms });
    }, 300);

    return () => clearTimeout(timer);
  }, [query, user]);

  const hasResults =
    results.subjects.length > 0 ||
    results.activities.length > 0 ||
    results.exams.length > 0 ||
    results.users.length > 0 ||
    results.rooms.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">جستجو</h1>
        <p className="text-sm text-zinc-400 mt-1">در درس‌ها، فعالیت‌ها، آزمون‌ها، کاربران و اتاق‌ها جستجو کنید</p>
      </div>

      <div className="relative">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
          <SearchIcon size={20} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجو..."
          autoFocus
          className="w-full pr-10 pl-4 py-4 bg-surface border border-border rounded-xl text-white text-base placeholder:text-zinc-500 focus:border-primary focus:outline-none transition-base"
        />
      </div>

      {!searched && !hasResults && (
        <Card className="p-5">
          <EmptyState
            icon={<SearchIcon size={28} />}
            title="جستجو کنید"
            description="حداقل ۲ حرف تایپ کنید تا نتایج نمایش داده شوند"
          />
        </Card>
      )}

      {searched && !hasResults && (
        <Card className="p-5">
          <EmptyState
            icon={<SearchIcon size={28} />}
            title="نتیجه‌ای یافت نشده"
            description={`برای «${query}» چیزی پیدا نشد`}
          />
        </Card>
      )}

      {hasResults && (
        <div className="space-y-4">
          {/* Subjects */}
          {results.subjects.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <BookOpen size={18} className="text-primary" />
                دروس
              </h3>
              <div className="flex flex-wrap gap-2">
                {results.subjects.map((s) => {
                  const c = getSubjectColor(s);
                  return (
                    <button
                      key={s}
                      onClick={() => onNavigate('log-activity')}
                      className={`px-3 py-2 rounded-xl text-sm ${c.bg} ${c.text} border ${c.border} interactive`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Activities */}
          {results.activities.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <ActivityIcon size={18} className="text-emerald-400" />
                فعالیت‌ها
              </h3>
              <div className="space-y-2">
                {results.activities.map((act) => {
                  const c = getSubjectColor(act.subject);
                  return (
                    <button
                      key={act.id}
                      onClick={() => onNavigate('log-activity')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl interactive text-right"
                    >
                      <div className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{act.subject}</p>
                        <p className="text-xs text-zinc-500">{act.activity_type} • {formatStoredDate(act.activity_date)}</p>
                      </div>
                      <span className="text-xs text-zinc-400">{formatDuration(act.duration_minutes)}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Exams */}
          {results.exams.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <FileText size={18} className="text-amber-400" />
                آزمون‌ها
              </h3>
              <div className="space-y-2">
                {results.exams.map((exam) => {
                  const c = getSubjectColor(exam.subject);
                  return (
                    <button
                      key={exam.id}
                      onClick={() => onNavigate('exam')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl interactive text-right"
                    >
                      <div className={`p-1.5 rounded-lg ${c.bg} ${c.text}`}>
                        <FileText size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{exam.subject}</p>
                        <p className="text-xs text-zinc-500">{toPersianDigits(exam.question_count)} سؤال • {relativeTime(new Date(exam.created_at))}</p>
                      </div>
                      <span className={`text-xs ${exam.status === 'completed' ? 'text-emerald-400' : 'text-primary'}`}>
                        {exam.status === 'completed' ? 'تکمیل شده' : 'در حال انجام'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Users */}
          {results.users.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Users size={18} className="text-cyan-400" />
                کاربران
              </h3>
              <div className="space-y-2">
                {results.users.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onNavigate('chat')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl interactive text-right"
                  >
                    <Avatar url={p.avatar_url} name={p.display_name} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{p.display_name}</p>
                      <p className="text-xs text-zinc-500">@{p.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Rooms */}
          {results.rooms.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <DoorOpen size={18} className="text-indigo-400" />
                اتاق‌های مطالعه
              </h3>
              <div className="space-y-2">
                {results.rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => onNavigate('study-room')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl interactive text-right"
                  >
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <DoorOpen size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{room.name}</p>
                      {room.description && <p className="text-xs text-zinc-500 truncate">{room.description}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

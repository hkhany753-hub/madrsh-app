import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Users, Plus, DoorOpen, LogOut, Play, Pause, Clock,
  Trophy, Compass, Home, Lock, Globe, Calendar, Target,
  Timer, TrendingUp, Award, Flame, BookOpen, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, LoadingSpinner, EmptyState, ProgressBar } from '@/components/ui';
import { Button, Input, TextArea, Select } from '@/components/Form';
import { Modal } from '@/components/Modal';
import { Avatar } from '@/components/Avatar';
import { toPersianDigits } from '@/lib/jalali';
import { SUBJECTS, getSubjectColor } from '@/lib/constants';
import type { StudyRoom, RoomMember, Profile, StudyStats } from '@/lib/types';
import {
  fetchRooms, createRoom as createRoomSvc, joinRoom as joinRoomSvc,
  leaveRoom as leaveRoomSvc, fetchRoomMembers, startStudying, stopStudying,
  fetchUserStats, fetchLeaderboard, fetchTopRooms,
  type RoomWithCounts, type LeaderboardUser, type TimeFilter, type RoomTab, type CreateRoomData,
} from '@/lib/study-room-service';

type MemberWithProfile = RoomMember & { profile: Profile };

function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${toPersianDigits(h.toString().padStart(2, '0'))}:${toPersianDigits(m.toString().padStart(2, '0'))}:${toPersianDigits(s.toString().padStart(2, '0'))}`;
}

function formatSecondsShort(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h === 0 && m === 0) return `${toPersianDigits(total)} ثانیه`;
  if (h === 0) return `${toPersianDigits(m)} دقیقه`;
  if (m === 0) return `${toPersianDigits(h)} ساعت`;
  return `${toPersianDigits(h)}س ${toPersianDigits(m)}د`;
}

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: 'day', label: 'روز' },
  { key: 'week', label: 'هفته' },
  { key: 'month', label: 'ماه' },
];

const ROOM_TABS: { key: RoomTab; label: string; icon: typeof Trophy }[] = [
  { key: 'top', label: 'برترین', icon: Trophy },
  { key: 'explore', label: 'کاوش', icon: Compass },
  { key: 'mine', label: 'اتاق‌های من', icon: Home },
];

const CAPACITY_OPTIONS = ['۵', '۱۰', '۱۵', '۲۰', '۳۰', '۵۰'];
const DURATION_OPTIONS = ['۱۵', '۲۵', '۵۰', '۹۰', '۱۲۰'];

function parseFaNumber(s: string): number {
  return parseInt(s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))), 10);
}

export function StudyRoomPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<RoomTab>('top');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('day');
  const [rooms, setRooms] = useState<RoomWithCounts[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [topRooms, setTopRooms] = useState<{ room: StudyRoom; total_seconds: number; member_count: number; studying_count: number }[]>([]);
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<StudyRoom | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [isStudying, setIsStudying] = useState(false);
  const [studySeconds, setStudySeconds] = useState(0);
  const [myMember, setMyMember] = useState<RoomMember | null>(null);
  const [creating, setCreating] = useState(false);
  const [showRoomInfo, setShowRoomInfo] = useState<RoomWithCounts | null>(null);

  // Create room form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSubject, setFormSubject] = useState<string>(SUBJECTS[0]);
  const [formIsPrivate, setFormIsPrivate] = useState(false);
  const [formCapacity, setFormCapacity] = useState(CAPACITY_OPTIONS[1]);
  const [formDuration, setFormDuration] = useState(DURATION_OPTIONS[2]);
  const [formGoal, setFormGoal] = useState('');

  const myMemberRef = useRef<RoomMember | null>(null);
  myMemberRef.current = myMember;

  // Load rooms
  const loadRooms = useCallback(async () => {
    if (!user) return;
    const data = await fetchRooms(activeTab, user.id);
    setRooms(data);
    setLoading(false);
  }, [activeTab, user]);

  // Load leaderboard
  const loadLeaderboard = useCallback(async () => {
    const data = await fetchLeaderboard(timeFilter);
    setLeaderboard(data);
  }, [timeFilter]);

  // Load top rooms
  const loadTopRooms = useCallback(async () => {
    const data = await fetchTopRooms(timeFilter);
    setTopRooms(data);
  }, [timeFilter]);

  // Load user stats
  const loadStats = useCallback(async () => {
    if (!user) return;
    const data = await fetchUserStats(user.id);
    setStats(data);
  }, [user]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    loadLeaderboard();
    loadTopRooms();
  }, [loadLeaderboard, loadTopRooms]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Realtime for rooms list
  useEffect(() => {
    const channel = supabase
      .channel('study-rooms-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_rooms' }, () => loadRooms())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members' }, () => {
        loadRooms();
        loadLeaderboard();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_sessions' }, () => {
        loadLeaderboard();
        loadTopRooms();
        loadStats();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadRooms, loadLeaderboard, loadTopRooms, loadStats]);

  // Load members for active room
  const loadMembers = useCallback(async (roomId: string) => {
    const data = await fetchRoomMembers(roomId);
    setMembers(data);
    const me = data.find((m) => m.user_id === user?.id);
    if (me) {
      setMyMember(me);
      setIsStudying(me.is_studying);
      if (me.is_studying && me.study_started_at) {
        const elapsed = Math.floor((Date.now() - new Date(me.study_started_at).getTime()) / 1000);
        setStudySeconds(elapsed);
      } else {
        setStudySeconds(0);
      }
    }
  }, [user]);

  // Realtime for active room
  useEffect(() => {
    if (!activeRoom) return;
    const channel = supabase
      .channel(`room-${activeRoom.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${activeRoom.id}` },
        () => loadMembers(activeRoom.id),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeRoom, loadMembers]);

  // Study timer tick
  useEffect(() => {
    if (!isStudying) return;
    const interval = setInterval(() => {
      setStudySeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isStudying]);

  // Auto-stop study when leaving room or unmounting
  useEffect(() => {
    return () => {
      const m = myMemberRef.current;
      if (m && m.is_studying) {
        stopStudying(m.id, m);
      }
    };
  }, []);

  // Warn before page unload if studying
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (myMemberRef.current?.is_studying) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  async function handleCreateRoom() {
    if (!formName.trim() || !user) return;
    setCreating(true);
    const data: CreateRoomData = {
      name: formName.trim(),
      description: formDesc.trim(),
      subject: formSubject,
      is_private: formIsPrivate,
      capacity: parseFaNumber(formCapacity),
      session_duration: parseFaNumber(formDuration),
      study_goal: formGoal.trim(),
    };
    const room = await createRoomSvc(data);
    setCreating(false);
    if (room) {
      setModalOpen(false);
      setFormName('');
      setFormDesc('');
      setFormGoal('');
      await joinRoomSvc(room.id, user.id);
      setActiveRoom(room);
      loadMembers(room.id);
      loadRooms();
    }
  }

  async function handleJoinRoom(room: StudyRoom) {
    if (!user) return;
    await joinRoomSvc(room.id, user.id);
    setActiveRoom(room);
    loadMembers(room.id);
    loadRooms();
  }

  async function handleLeaveRoom() {
    if (myMember) {
      if (myMember.is_studying) {
        await stopStudying(myMember.id, myMember);
      }
      await leaveRoomSvc(myMember.id);
    }
    setActiveRoom(null);
    setMembers([]);
    setIsStudying(false);
    setStudySeconds(0);
    setMyMember(null);
    loadRooms();
    loadStats();
  }

  async function handleToggleStudy() {
    if (!myMember) return;
    if (isStudying) {
      await stopStudying(myMember.id, myMember);
      setIsStudying(false);
      setStudySeconds(0);
      loadMembers(activeRoom!.id);
      loadStats();
    } else {
      await startStudying(myMember.id);
      setIsStudying(true);
      setStudySeconds(0);
      loadMembers(activeRoom!.id);
    }
  }

  const sessionProgress = useMemo(() => {
    if (!activeRoom) return 0;
    const target = activeRoom.session_duration * 60;
    if (target === 0) return 0;
    return Math.min(100, (studySeconds / target) * 100);
  }, [studySeconds, activeRoom]);

  // ===== ACTIVE ROOM VIEW =====
  if (activeRoom) {
    const studyingMembers = members.filter((m) => m.is_studying);
    const subjectColor = getSubjectColor(activeRoom.subject);

    return (
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <DoorOpen size={22} className="text-primary shrink-0" />
              <h1 className="text-xl font-bold text-white truncate">{activeRoom.name}</h1>
              {activeRoom.is_private && (
                <Lock size={16} className="text-zinc-500 shrink-0" />
              )}
            </div>
            {activeRoom.description && <p className="text-sm text-zinc-400 mt-1">{activeRoom.description}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ${subjectColor.bg} ${subjectColor.text} ${subjectColor.border} border`}>
                <BookOpen size={12} />
                {activeRoom.subject || 'عمومی'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-surface-2 text-zinc-400 border border-border">
                <Target size={12} />
                {activeRoom.study_goal || '—'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-surface-2 text-zinc-400 border border-border">
                <Timer size={12} />
                هدف: {toPersianDigits(activeRoom.session_duration)} دقیقه
              </span>
            </div>
          </div>
          <Button variant="danger" onClick={handleLeaveRoom}>
            <LogOut size={18} />
            خروج از اتاق
          </Button>
        </div>

        {/* Study timer card */}
        <Card className="p-6 sm:p-8 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-2.5 h-2.5 rounded-full ${isStudying ? 'bg-emerald-500 pulse-live' : 'bg-zinc-600'}`} />
            <span className="text-sm text-zinc-400">{isStudying ? 'در حال مطالعه' : 'متوقف'}</span>
          </div>
          <div className={`text-4xl sm:text-6xl font-bold tabular-nums mb-6 ${isStudying ? 'text-emerald-400' : 'text-zinc-300'}`}>
            {formatSeconds(studySeconds)}
          </div>

          {/* Progress toward session goal */}
          <div className="w-full max-w-sm mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500">پیشرفت جلسه</span>
              <span className="text-xs text-zinc-400">{toPersianDigits(Math.round(sessionProgress))}٪</span>
            </div>
            <ProgressBar value={studySeconds} max={activeRoom.session_duration * 60} color="bg-emerald-500" />
          </div>

          <Button onClick={handleToggleStudy} variant={isStudying ? 'secondary' : 'primary'} size="lg">
            {isStudying ? <Pause size={20} /> : <Play size={20} />}
            {isStudying ? 'توقف مطالعه' : 'شروع مطالعه'}
          </Button>
        </Card>

        {/* My stats in this room */}
        {myMember && (
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-primary-10 text-primary">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-xs text-zinc-500">مجموع مطالعه شما در این اتاق</p>
                <p className="text-lg font-bold text-white">{formatSecondsShort(myMember.total_study_seconds)}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Members */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">اعضای اتاق ({toPersianDigits(members.length)})</h3>
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <Flame size={12} />
              {toPersianDigits(studyingMembers.length)} نفر در حال مطالعه
            </span>
          </div>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-2">
                <div className="relative shrink-0">
                  <Avatar url={m.profile?.avatar_url} name={m.profile?.display_name} size={36} />
                  {m.is_studying && (
                    <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-surface-2" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {m.profile?.display_name || 'کاربر'}
                    {m.user_id === user?.id && <span className="text-xs text-primary mr-2">(شما)</span>}
                  </p>
                  <p className="text-xs text-zinc-500">@{m.profile?.username}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {m.total_study_seconds > 0 && (
                    <span className="text-xs text-zinc-400 tabular-nums hidden sm:inline">
                      {formatSecondsShort(m.total_study_seconds)}
                    </span>
                  )}
                  {m.is_studying ? (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-live" />
                      آنلاین
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">آفلاین</span>
                  )}
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-center text-sm text-zinc-500 py-6">هنوز عضوی در این اتاق نیست</p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // ===== MAIN LIST VIEW =====
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">اتاق مطالعه</h1>
          <p className="text-sm text-zinc-400 mt-1">با دوستان خود بصورت آنلاین مطالعه کنید و رقابت کنید</p>
        </div>
        <div className="flex items-center gap-3">
          {profile && (
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-2 rounded-xl border border-border">
              <Avatar url={profile.avatar_url} name={profile.display_name} size={28} />
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-white">{profile.display_name}</p>
                <p className="text-[10px] text-zinc-500">رتبه {stats ? toPersianDigits(stats.rank) : '—'}</p>
              </div>
            </div>
          )}
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={18} />
            ساخت اتاق
          </Button>
        </div>
      </div>

      {/* User stats summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatMini icon={<Clock size={16} />} label="امروز" value={formatSecondsShort(stats.today_seconds)} color="text-emerald-400" />
          <StatMini icon={<Calendar size={16} />} label="این هفته" value={formatSecondsShort(stats.week_seconds)} color="text-sky-400" />
          <StatMini icon={<Calendar size={16} />} label="این ماه" value={formatSecondsShort(stats.month_seconds)} color="text-violet-400" />
          <StatMini icon={<TrendingUp size={16} />} label="مجموع" value={formatSecondsShort(stats.total_seconds)} color="text-primary" />
          <StatMini icon={<CheckCircle2 size={16} />} label="جلسات" value={toPersianDigits(stats.session_count)} color="text-amber-400" />
          <StatMini icon={<Award size={16} />} label="رتبه" value={toPersianDigits(stats.rank)} color="text-rose-400" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-xl border border-border w-fit">
        {ROOM_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-base ${
                activeTab === tab.key
                  ? 'bg-primary text-white shadow-primary'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Time filter */}
      <div className="flex items-center gap-1 p-1 bg-surface-2 rounded-xl border border-border w-fit">
        {TIME_FILTERS.map((tf) => (
          <button
            key={tf.key}
            onClick={() => setTimeFilter(tf.key)}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-medium transition-base ${
              timeFilter === tf.key
                ? 'bg-surface text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Leaderboard section — shows for 'top' tab */}
      {activeTab === 'top' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            رتبه‌بندی کاربران
          </h2>
          {leaderboard.length === 0 ? (
            <Card className="p-5">
              <EmptyState
                icon={<Trophy size={28} />}
                title="هنوز داده‌ای وجود ندارد"
                description="با مطالعه در اتاق‌ها، در رتبه‌بندی ظاهر شوید"
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 10).map((u, i) => (
                <LeaderboardRow key={u.user_id} rank={i + 1} user={u} isMe={u.user_id === user?.id} />
              ))}
            </div>
          )}

          {/* Top rooms */}
          {topRooms.length > 0 && (
            <>
              <h2 className="text-sm font-bold text-white flex items-center gap-2 pt-2">
                <DoorOpen size={18} className="text-primary" />
                اتاق‌های فعال
              </h2>
              <div className="space-y-2">
                {topRooms.slice(0, 5).map(({ room, total_seconds, member_count, studying_count }) => (
                  <Card key={room.id} hover className="p-4 cursor-pointer" >
                    <div onClick={() => handleJoinRoom(room)}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-primary-10 text-primary shrink-0">
                            <DoorOpen size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{room.name}</p>
                            <p className="text-xs text-zinc-500 truncate">{room.subject || 'عمومی'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 text-xs text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            {toPersianDigits(member_count)}
                          </span>
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Flame size={12} />
                            {formatSecondsShort(total_seconds)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Room grid — for explore and mine tabs */}
      {activeTab !== 'top' && (
        <>
          {rooms.length === 0 ? (
            <Card className="p-5">
              <EmptyState
                icon={<Users size={28} />}
                title={activeTab === 'mine' ? 'در هیچ اتاقی عضو نیستید' : 'اتاقی وجود ندارد'}
                description={activeTab === 'mine' ? 'از تب کاوش اتاق‌ها را پیدا کنید یا اتاق جدید بسازید' : 'اولین اتاق مطالعه را بسازید'}
                action={
                  <Button onClick={() => setModalOpen(true)}>
                    <Plus size={18} />
                    ساخت اتاق
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => {
                const subjectColor = getSubjectColor(room.subject);
                const isFull = room.member_count >= room.capacity;
                return (
                  <Card key={room.id} hover className="p-5 cursor-pointer">
                    <div onClick={() => setShowRoomInfo(room)}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-primary-10 text-primary shrink-0">
                          <DoorOpen size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-white truncate">{room.name}</h3>
                            {room.is_private && <Lock size={12} className="text-zinc-500 shrink-0" />}
                          </div>
                          {room.description && <p className="text-xs text-zinc-500 truncate">{room.description}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] ${subjectColor.bg} ${subjectColor.text} ${subjectColor.border} border`}>
                          <BookOpen size={10} />
                          {room.subject || 'عمومی'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-surface-2 text-zinc-400 border border-border">
                          <Timer size={10} />
                          {toPersianDigits(room.session_duration)} دقیقه
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {toPersianDigits(room.member_count)}/{toPersianDigits(room.capacity)} عضو
                        </span>
                        {room.studying_count > 0 ? (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-live" />
                            {toPersianDigits(room.studying_count)} در حال مطالعه
                          </span>
                        ) : (
                          <span className="text-zinc-600">غیرفعال</span>
                        )}
                      </div>
                      {isFull && (
                        <p className="text-xs text-rose-400 mt-2">اتاق پر است</p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create room modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="اتاق مطالعه جدید" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">نام اتاق</label>
            <Input value={formName} onChange={setFormName} placeholder="مثلاً: مطالعه ریاضی کنکور" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">توضیحات (اختیاری)</label>
            <TextArea value={formDesc} onChange={setFormDesc} placeholder="توضیحات اتاق..." rows={2} />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">موضوع مطالعه</label>
            <Select value={formSubject} onChange={setFormSubject} options={[...SUBJECTS]} placeholder="انتخاب موضوع" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">ظرفیت اتاق</label>
              <Select value={formCapacity} onChange={setFormCapacity} options={CAPACITY_OPTIONS} />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">مدت جلسه (دقیقه)</label>
              <Select value={formDuration} onChange={setFormDuration} options={DURATION_OPTIONS} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">هدف مطالعه (اختیاری)</label>
            <Input value={formGoal} onChange={setFormGoal} placeholder="مثلاً: فصل دوم ریاضی" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">نوع اتاق</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFormIsPrivate(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-base ${
                  !formIsPrivate ? 'bg-primary-10 text-primary border-primary-20' : 'bg-surface-2 text-zinc-400 border-border'
                }`}
              >
                <Globe size={16} />
                عمومی
              </button>
              <button
                onClick={() => setFormIsPrivate(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-base ${
                  formIsPrivate ? 'bg-primary-10 text-primary border-primary-20' : 'bg-surface-2 text-zinc-400 border-border'
                }`}
              >
                <Lock size={16} />
                خصوصی
              </button>
            </div>
          </div>
          <Button fullWidth size="lg" onClick={handleCreateRoom} disabled={!formName.trim() || creating}>
            {creating ? 'در حال ساخت...' : 'ساخت اتاق'}
          </Button>
        </div>
      </Modal>

      {/* Room info / join modal */}
      {showRoomInfo && (
        <Modal open={!!showRoomInfo} onClose={() => setShowRoomInfo(null)} title={showRoomInfo.name} maxWidth="max-w-md">
          <div className="space-y-4">
            {showRoomInfo.description && <p className="text-sm text-zinc-400">{showRoomInfo.description}</p>}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ${getSubjectColor(showRoomInfo.subject).bg} ${getSubjectColor(showRoomInfo.subject).text} ${getSubjectColor(showRoomInfo.subject).border} border`}>
                <BookOpen size={12} />
                {showRoomInfo.subject || 'عمومی'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-surface-2 text-zinc-400 border border-border">
                <Timer size={12} />
                {toPersianDigits(showRoomInfo.session_duration)} دقیقه
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-surface-2 text-zinc-400 border border-border">
                <Users size={12} />
                {toPersianDigits(showRoomInfo.member_count)}/{toPersianDigits(showRoomInfo.capacity)} عضو
              </span>
              {showRoomInfo.is_private && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-surface-2 text-zinc-400 border border-border">
                  <Lock size={12} />
                  خصوصی
                </span>
              )}
            </div>
            {showRoomInfo.study_goal && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-2">
                <Target size={16} className="text-primary shrink-0" />
                <p className="text-sm text-zinc-300">{showRoomInfo.study_goal}</p>
              </div>
            )}
            {showRoomInfo.creator_profile && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-2">
                <Avatar url={showRoomInfo.creator_profile.avatar_url} name={showRoomInfo.creator_profile.display_name} size={28} />
                <p className="text-xs text-zinc-400">ساخته‌شده توسط <span className="text-white font-semibold">{showRoomInfo.creator_profile.display_name}</span></p>
              </div>
            )}
            <Button
              fullWidth
              size="lg"
              onClick={() => {
                handleJoinRoom(showRoomInfo);
                setShowRoomInfo(null);
              }}
              disabled={showRoomInfo.member_count >= showRoomInfo.capacity}
            >
              {showRoomInfo.member_count >= showRoomInfo.capacity ? 'اتاق پر است' : 'ورود به اتاق'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatMini({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card className="p-3 sm:p-4">
      <div className={`mb-1.5 ${color}`}>{icon}</div>
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-white truncate">{value}</p>
    </Card>
  );
}

function LeaderboardRow({ rank, user, isMe }: { rank: number; user: LeaderboardUser; isMe: boolean }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  return (
    <Card className={`p-3 ${isMe ? 'border-primary-20' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 text-center shrink-0">
          {medal ? (
            <span className="text-lg">{medal}</span>
          ) : (
            <span className="text-sm font-bold text-zinc-500">{toPersianDigits(rank)}</span>
          )}
        </div>
        <div className="relative shrink-0">
          <Avatar url={user.avatar_url} name={user.display_name} size={36} />
          {user.is_online && (
            <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-surface" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">
            {user.display_name}
            {isMe && <span className="text-xs text-primary mr-2">(شما)</span>}
          </p>
          <p className="text-xs text-zinc-500 truncate">
            @{user.username}
            {user.is_online && user.current_subject && ` · ${user.current_subject}`}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {user.is_online && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-live" />
              آنلاین
            </span>
          )}
          <div className="text-left">
            <p className="text-sm font-bold text-white tabular-nums">{formatSecondsShort(user.total_seconds)}</p>
            <p className="text-[10px] text-zinc-500">{toPersianDigits(user.session_count)} جلسه</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

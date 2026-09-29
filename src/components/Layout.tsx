import { useState, useEffect, type ReactNode } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Calendar,
  Trophy,
  Wrench,
  FileText,
  BarChart3,
  Users,
  MessageSquare,
  Search,
  User as UserIcon,
  Settings,
  CheckSquare,
  ListTodo,
  Heart,
  GraduationCap,
  Menu,
  X,
  Bell,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/Avatar';
import { formatJalaliDate, formatTimeWithSeconds, toPersianDigits } from '@/lib/jalali';

export type PageKey =
  | 'dashboard'
  | 'log-activity'
  | 'calendar'
  | 'today-tasks'
  | 'leaderboard'
  | 'tools'
  | 'exam'
  | 'stats'
  | 'study-room'
  | 'chat'
  | 'ai'
  | 'search'
  | 'profile'
  | 'settings'
  | 'support';

interface NavItem {
  key: PageKey;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'داشبورد', icon: <LayoutDashboard size={20} /> },
  { key: 'log-activity', label: 'ثبت فعالیت', icon: <PlusCircle size={20} /> },
  { key: 'calendar', label: 'کارهای امروز', icon: <ListTodo size={20} /> },
  { key: 'today-tasks', label: 'کارهای امروز', icon: <CheckSquare size={20} /> },
  { key: 'leaderboard', label: 'برترین‌ها', icon: <Trophy size={20} /> },
  { key: 'tools', label: 'ابزارها', icon: <Wrench size={20} /> },
  { key: 'exam', label: 'آزمون', icon: <FileText size={20} /> },
  { key: 'stats', label: 'آمار فعالیت', icon: <BarChart3 size={20} /> },
  { key: 'study-room', label: 'اتاق مطالعه', icon: <Users size={20} /> },
  { key: 'chat', label: 'گفت‌وگو', icon: <MessageSquare size={20} /> },
  { key: 'search', label: 'جستجو', icon: <Search size={20} /> },
  { key: 'profile', label: 'پروفایل', icon: <UserIcon size={20} /> },
  { key: 'settings', label: 'تنظیمات', icon: <Settings size={20} /> },
  { key: 'support', label: 'حمایت از MADRSH', icon: <Heart size={20} /> },
];

interface LayoutProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const currentItem = NAV_ITEMS.find((item) => item.key === currentPage);

  function handleNav(page: PageKey) {
    onNavigate(page);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen relative z-10">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-72 glass-strong border-l border-border z-40 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-10 border border-primary-20">
              <GraduationCap size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">MADRSH</h1>
              <p className="text-[11px] text-zinc-500">مدیریت مطالعه و کنکور</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium interactive ${
                currentPage === item.key
                  ? 'bg-primary-10 text-primary border border-primary-20'
                  : 'text-zinc-400 hover:text-white border border-transparent'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => handleNav('profile')}
            className="w-full flex items-center gap-3 p-3 rounded-xl interactive text-zinc-400 hover:text-white"
          >
            <Avatar url={profile?.avatar_url} name={profile?.display_name} size={36} />
            <div className="flex-1 text-right min-w-0">
              <p className="text-sm font-semibold text-white truncate">{profile?.display_name || 'کاربر'}</p>
              <p className="text-xs text-zinc-500 truncate">@{profile?.username}</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pr-72">
        {/* Header */}
        <header className="sticky top-0 z-20 glass-strong border-b border-border">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg interactive text-zinc-400 hover:text-white"
              >
                <Menu size={22} />
              </button>
              <div>
                <h2 className="text-base font-bold text-white">{currentItem?.label}</h2>
                <p className="text-xs text-zinc-500 hidden sm:block">{formatJalaliDate(currentTime)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface-2 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-primary timer-pulse" />
                <span className="text-sm text-zinc-300 tabular-nums">{formatTimeWithSeconds(currentTime)}</span>
              </div>
              <button
                onClick={() => handleNav('search')}
                className="p-2 rounded-lg interactive text-zinc-400 hover:text-white"
              >
                <Search size={20} />
              </button>
              <button
                onClick={() => handleNav('ai')}
                className="p-2 rounded-lg interactive text-zinc-400 hover:text-primary relative"
                title="MADRSH AI"
              >
                <Sparkles size={20} />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
              </button>
              <button
                onClick={() => handleNav('settings')}
                className="p-2 rounded-lg interactive text-zinc-400 hover:text-white relative"
              >
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
              </button>
              <button
                onClick={() => handleNav('profile')}
                className="lg:hidden"
              >
                <Avatar url={profile?.avatar_url} name={profile?.display_name} size={32} />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8 max-w-7xl mx-auto fade-in" key={currentPage}>
          {children}
        </main>
      </div>

      {/* Mobile close button */}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface text-white lg:hidden"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}

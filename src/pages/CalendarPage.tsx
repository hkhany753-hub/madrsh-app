import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Target,
  Plus,
  Check,
  Circle,
  Clock,
  Calendar as CalIcon,
  Calendar,
  ListTodo,
  Eye,
  EyeOff,
  AlertCircle,
  Zap,
  Search,
  ArrowUpDown,
  CheckCircle2,
  Timer,
  Link2,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, LoadingSpinner, EmptyState, ProgressBar } from '@/components/ui';
import { Button, Select } from '@/components/Form';
import { TaskFormModal, type TaskFormData } from '@/components/TaskFormModal';
import {
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
  getWeekStartISO,
  getMonthStartISO,
  getMonthEndISO,
  autoRescheduleOverdue,
  formatDeadline,
  getDaysUntilDeadline,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from '@/lib/task-service';
import type { Task } from '@/lib/types';
import {
  toPersianDigits,
  formatDuration,
  todayISODate,
  dateToISODate,
  getCurrentJalaliDate,
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliMonthDays,
  getJalaliDayOfWeek,
  formatJalaliMonthYear,
  jalaliDayNames,
  isoDateToDate,
  formatStoredDate,
} from '@/lib/jalali';

type ViewMode = 'daily' | 'weekly' | 'monthly';
type SortBy = 'date' | 'priority' | 'deadline' | 'duration' | 'status';

interface CalendarCell {
  isoDate: string;
  jy: number;
  jm: number;
  jd: number;
  dayName: string;
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
  tasks: Task[];
}

export function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [loading, setLoading] = useState(true);
  const [allMonthTasks, setAllMonthTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayISODate());
  const [currentJy, setCurrentJy] = useState(0);
  const [currentJm, setCurrentJm] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDailyInWeek, setShowDailyInWeek] = useState(true);
  const [showWeeklyInMonth, setShowWeeklyInMonth] = useState(true);
  const [showDailyInMonth, setShowDailyInMonth] = useState(true);
  const [showCalendarGrid, setShowCalendarGrid] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('priority');
  const [showCompleted, setShowCompleted] = useState(false);

  const [todayJy, todayJm, todayJd] = getCurrentJalaliDate();

  useEffect(() => {
    setCurrentJy(todayJy);
    setCurrentJm(todayJm);
  }, [todayJy, todayJm]);

  // Load ALL tasks for the entire month (for calendar grid + list views)
  const loadMonthTasks = useCallback(async () => {
    if (currentJy === 0) return;
    const monthStart = getMonthStartISO(currentJy, currentJm);
    const monthEnd = getMonthEndISO(currentJy, currentJm);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .gte('task_date', monthStart)
      .lte('task_date', monthEnd)
      .order('task_date', { ascending: true })
      .order('smart_priority', { ascending: false });
    setAllMonthTasks((data as Task[]) || []);
  }, [currentJy, currentJm]);

  useEffect(() => {
    loadMonthTasks();
  }, [loadMonthTasks]);

  // Filter tasks for the current view
  const tasks = useMemo(() => {
    let loaded: Task[] = [];

    if (viewMode === 'daily') {
      loaded = allMonthTasks.filter((t) => t.task_date === selectedDate);
    } else if (viewMode === 'weekly') {
      const weekStart = getWeekStartISO(isoDateToDate(selectedDate));
      const weekEnd = new Date(isoDateToDate(weekStart));
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndISO = dateToISODate(weekEnd);

      const weeklyTasks = allMonthTasks.filter(
        (t) => t.task_level === 'weekly' && t.task_date >= weekStart && t.task_date <= weekEndISO,
      );
      const dailyTasks = showDailyInWeek
        ? allMonthTasks.filter(
            (t) => t.task_level === 'daily' && t.task_date >= weekStart && t.task_date <= weekEndISO,
          )
        : [];
      loaded = [...weeklyTasks, ...dailyTasks];
    } else if (viewMode === 'monthly') {
      const monthlyTasks = allMonthTasks.filter((t) => t.task_level === 'monthly');
      const weeklyTasks = showWeeklyInMonth
        ? allMonthTasks.filter((t) => t.task_level === 'weekly')
        : [];
      const dailyTasks = showDailyInMonth
        ? allMonthTasks.filter((t) => t.task_level === 'daily')
        : [];
      loaded = [...monthlyTasks, ...weeklyTasks, ...dailyTasks];
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      loaded = loaded.filter(
        (t) => t.title.toLowerCase().includes(term) || t.description?.toLowerCase().includes(term),
      );
    }

    if (!showCompleted) {
      loaded = loaded.filter((t) => !t.completed);
    }

    if (sortBy === 'priority') {
      loaded.sort((a, b) => (b.smart_priority || 0) - (a.smart_priority || 0));
    } else if (sortBy === 'deadline') {
      loaded.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
    } else if (sortBy === 'duration') {
      loaded.sort((a, b) => (b.estimated_minutes || 0) - (a.estimated_minutes || 0));
    } else if (sortBy === 'status') {
      const order: Record<string, number> = { 'عقب‌افتاده': 0, 'انجام نشده': 1, 'در حال انجام': 2, 'انجام شده': 3 };
      loaded.sort((a, b) => (order[a.status] || 0) - (order[b.status] || 0));
    } else {
      loaded.sort((a, b) => a.task_date.localeCompare(b.task_date));
    }

    return loaded;
  }, [viewMode, selectedDate, allMonthTasks, showDailyInWeek, showWeeklyInMonth, showDailyInMonth, searchTerm, sortBy, showCompleted]);

  useEffect(() => {
    setLoading(allMonthTasks.length === 0 && currentJy === 0);
  }, [allMonthTasks, currentJy]);

  // Navigation
  function prevPeriod() {
    if (viewMode === 'daily') {
      const d = isoDateToDate(selectedDate);
      d.setDate(d.getDate() - 1);
      const newDate = dateToISODate(d);
      setSelectedDate(newDate);
      const [jy, jm] = gregorianToJalali(d);
      if (jm !== currentJm || jy !== currentJy) {
        setCurrentJy(jy);
        setCurrentJm(jm);
      }
    } else if (viewMode === 'weekly') {
      const d = isoDateToDate(selectedDate);
      d.setDate(d.getDate() - 7);
      const newDate = dateToISODate(d);
      setSelectedDate(newDate);
      const [jy, jm] = gregorianToJalali(d);
      if (jm !== currentJm || jy !== currentJy) {
        setCurrentJy(jy);
        setCurrentJm(jm);
      }
    } else {
      if (currentJm === 1) {
        setCurrentJy(currentJy - 1);
        setCurrentJm(12);
      } else {
        setCurrentJm(currentJm - 1);
      }
    }
  }

  function nextPeriod() {
    if (viewMode === 'daily') {
      const d = isoDateToDate(selectedDate);
      d.setDate(d.getDate() + 1);
      const newDate = dateToISODate(d);
      setSelectedDate(newDate);
      const [jy, jm] = gregorianToJalali(d);
      if (jm !== currentJm || jy !== currentJy) {
        setCurrentJy(jy);
        setCurrentJm(jm);
      }
    } else if (viewMode === 'weekly') {
      const d = isoDateToDate(selectedDate);
      d.setDate(d.getDate() + 7);
      const newDate = dateToISODate(d);
      setSelectedDate(newDate);
      const [jy, jm] = gregorianToJalali(d);
      if (jm !== currentJm || jy !== currentJy) {
        setCurrentJy(jy);
        setCurrentJm(jm);
      }
    } else {
      if (currentJm === 12) {
        setCurrentJy(currentJy + 1);
        setCurrentJm(1);
      } else {
        setCurrentJm(currentJm + 1);
      }
    }
  }

  function goToday() {
    setSelectedDate(todayISODate());
    setCurrentJy(todayJy);
    setCurrentJm(todayJm);
  }

  // Save task
  const handleSave = useCallback(async (data: TaskFormData) => {
    if (data.id) {
      await updateTask(data.id, data);
    } else {
      await createTask(data);
    }
    loadMonthTasks();
  }, [loadMonthTasks]);

  const handleToggle = useCallback(async (task: Task) => {
    await toggleTaskComplete(task.id, !task.completed);
    loadMonthTasks();
  }, [loadMonthTasks]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteTask(id);
    loadMonthTasks();
  }, [loadMonthTasks]);

  const handleAutoReschedule = useCallback(async () => {
    await autoRescheduleOverdue();
    loadMonthTasks();
  }, [loadMonthTasks]);

  // Stats
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const overdueCount = tasks.filter((t) => {
    if (t.completed) return false;
    const days = getDaysUntilDeadline(t.deadline);
    return days !== null && days < 0;
  }).length;

  // Period label
  const periodLabel = useMemo(() => {
    if (viewMode === 'daily') {
      return formatStoredDate(selectedDate);
    } else if (viewMode === 'weekly') {
      const weekStart = getWeekStartISO(isoDateToDate(selectedDate));
      const weekEnd = new Date(isoDateToDate(weekStart));
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${formatStoredDate(weekStart)} - ${formatStoredDate(dateToISODate(weekEnd))}`;
    } else {
      return currentJy > 0 ? formatJalaliMonthYear(currentJy, currentJm) : '';
    }
  }, [viewMode, selectedDate, currentJy, currentJm]);

  // Build calendar grid for monthly view
  const calendarCells = useMemo((): CalendarCell[] => {
    if (currentJy === 0) return [];
    const days = getJalaliMonthDays(currentJy, currentJm);
    const cells: CalendarCell[] = [];

    // First day of month
    const firstDate = jalaliToGregorian(currentJy, currentJm, 1);
    const firstDayOfWeek = getJalaliDayOfWeek(firstDate);

    // Previous month days (leading)
    const prevJm = currentJm === 1 ? 12 : currentJm - 1;
    const prevJy = currentJm === 1 ? currentJy - 1 : currentJy;
    const prevMonthDays = getJalaliMonthDays(prevJy, prevJm);

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const jd = prevMonthDays - i;
      const date = jalaliToGregorian(prevJy, prevJm, jd);
      const iso = dateToISODate(date);
      cells.push({
        isoDate: iso,
        jy: prevJy,
        jm: prevJm,
        jd,
        dayName: jalaliDayNames[getJalaliDayOfWeek(date)],
        isToday: jd === todayJd && prevJm === todayJm && prevJy === todayJy,
        isSelected: iso === selectedDate,
        isCurrentMonth: false,
        tasks: [],
      });
    }

    // Current month days
    for (let d = 1; d <= days; d++) {
      const date = jalaliToGregorian(currentJy, currentJm, d);
      const iso = dateToISODate(date);
      const dayTasks = allMonthTasks.filter((t) => t.task_date === iso);
      cells.push({
        isoDate: iso,
        jy: currentJy,
        jm: currentJm,
        jd: d,
        dayName: jalaliDayNames[getJalaliDayOfWeek(date)],
        isToday: d === todayJd && currentJm === todayJm && currentJy === todayJy,
        isSelected: iso === selectedDate,
        isCurrentMonth: true,
        tasks: dayTasks,
      });
    }

    // Next month days (trailing) to fill the grid
    const nextJm = currentJm === 12 ? 1 : currentJm + 1;
    const nextJy = currentJm === 12 ? currentJy + 1 : currentJy;
    const remaining = 42 - cells.length; // 6 rows × 7 cols
    for (let d = 1; d <= remaining; d++) {
      const date = jalaliToGregorian(nextJy, nextJm, d);
      const iso = dateToISODate(date);
      cells.push({
        isoDate: iso,
        jy: nextJy,
        jm: nextJm,
        jd: d,
        dayName: jalaliDayNames[getJalaliDayOfWeek(date)],
        isToday: d === todayJd && nextJm === todayJm && nextJy === todayJy,
        isSelected: iso === selectedDate,
        isCurrentMonth: false,
        tasks: [],
      });
    }

    return cells;
  }, [currentJy, currentJm, allMonthTasks, selectedDate, todayJd, todayJm, todayJy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">تقویم و کارها</h1>
          <p className="text-sm text-zinc-400 mt-1">مدیریت هوشمند کارهای روزانه، هفتگی و ماهانه</p>
        </div>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <Button variant="secondary" size="sm" onClick={handleAutoReschedule}>
              <Zap size={16} className="text-amber-400" />
              جابه‌جایی خودکار ({toPersianDigits(overdueCount)})
            </Button>
          )}
          <Button onClick={() => { setEditingTask(null); setFormOpen(true); }}>
            <Plus size={18} />
            کار جدید
          </Button>
        </div>
      </div>

      {/* View mode tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl w-fit">
          {([
            { key: 'daily', label: 'روزانه', icon: <ListTodo size={16} /> },
            { key: 'weekly', label: 'هفتگی', icon: <CalIcon size={16} /> },
            { key: 'monthly', label: 'ماهانه', icon: <Calendar size={16} /> },
          ] as const).map((v) => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold interactive ${
                viewMode === v.key ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {v.icon}
              {v.label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={goToday}>
            <Target size={16} />
            امروز
          </Button>
          <Button variant="secondary" size="sm" onClick={prevPeriod}>
            <ChevronRight size={18} />
          </Button>
          <span className="text-sm font-bold text-white min-w-[140px] text-center">
            {periodLabel}
          </span>
          <Button variant="secondary" size="sm" onClick={nextPeriod}>
            <ChevronLeft size={18} />
          </Button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی کار..."
            className="w-full pr-10 pl-4 py-2.5 bg-surface-2 border border-border rounded-xl text-white text-sm placeholder:text-zinc-500 focus:border-primary focus:outline-none transition-base"
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown size={16} className="text-zinc-500" />
          <div className="w-36">
            <Select
              value={sortBy === 'date' ? 'تاریخ' : sortBy === 'priority' ? 'اولویت' : sortBy === 'deadline' ? 'مهلت' : sortBy === 'duration' ? 'مدت' : 'وضعیت'}
              onChange={(v) => {
                const map: Record<string, SortBy> = { 'تاریخ': 'date', 'اولویت': 'priority', 'مهلت': 'deadline', 'مدت': 'duration', 'وضعیت': 'status' };
                setSortBy(map[v] || 'priority');
              }}
              options={['اولویت', 'تاریخ', 'مهلت', 'مدت', 'وضعیت']}
            />
          </div>
        </div>
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm interactive border ${
            showCompleted
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-surface-2 text-zinc-400 border-border'
          }`}
        >
          {showCompleted ? <Eye size={16} /> : <EyeOff size={16} />}
          انجام‌شده‌ها
        </button>
        {viewMode === 'weekly' && (
          <button
            onClick={() => setShowDailyInWeek(!showDailyInWeek)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm interactive border ${
              showDailyInWeek
                ? 'bg-primary-10 text-primary border-primary-20'
                : 'bg-surface-2 text-zinc-400 border-border'
            }`}
          >
            {showDailyInWeek ? <Eye size={16} /> : <EyeOff size={16} />}
            کارهای روزانه
          </button>
        )}
        {viewMode === 'monthly' && (
          <>
            <button
              onClick={() => setShowCalendarGrid(!showCalendarGrid)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm interactive border ${
                showCalendarGrid
                  ? 'bg-primary-10 text-primary border-primary-20'
                  : 'bg-surface-2 text-zinc-400 border-border'
              }`
              }
            >
              {showCalendarGrid ? <Eye size={16} /> : <EyeOff size={16} />}
              تقویم
            </button>
            <button
              onClick={() => setShowDailyInMonth(!showDailyInMonth)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm interactive border ${
                showDailyInMonth
                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                  : 'bg-surface-2 text-zinc-400 border-border'
              }`}
            >
              {showDailyInMonth ? <Eye size={16} /> : <EyeOff size={16} />}
              روزانه
            </button>
            <button
              onClick={() => setShowWeeklyInMonth(!showWeeklyInMonth)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm interactive border ${
                showWeeklyInMonth
                  ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                  : 'bg-surface-2 text-zinc-400 border-border'
              }`}
            >
              {showWeeklyInMonth ? <Eye size={16} /> : <EyeOff size={16} />}
              هفتگی
            </button>
          </>
        )}
      </div>

      {/* Progress */}
      {totalCount > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">پیشرفت</h3>
            <span className="text-sm text-zinc-400">
              {toPersianDigits(completedCount)} از {toPersianDigits(totalCount)} ({toPersianDigits(totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0)}٪)
            </span>
          </div>
          <ProgressBar value={completedCount} max={totalCount} color="bg-emerald-500" height="h-3" />
        </Card>
      )}

      {/* Monthly calendar grid */}
      {viewMode === 'monthly' && currentJy > 0 && showCalendarGrid && (
        <Card className="p-4 overflow-x-auto">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2 min-w-[640px]">
            {jalaliDayNames.map((name) => (
              <div key={name} className="text-center text-xs font-bold text-zinc-400 py-2">
                {name}
              </div>
            ))}
          </div>
          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1.5 min-w-[640px]">
            {calendarCells.map((cell) => {
              const cellTasks = showDailyInMonth ? cell.tasks.filter((t) => t.task_level === 'daily') : [];
              const hasTasks = cellTasks.length > 0;
              const completedTasks = cellTasks.filter((t) => t.completed).length;

              return (
                <button
                  key={`${cell.jy}-${cell.jm}-${cell.jd}`}
                  onClick={() => {
                    setSelectedDate(cell.isoDate);
                    if (cell.jm !== currentJm || cell.jy !== currentJy) {
                      setCurrentJy(cell.jy);
                      setCurrentJm(cell.jm);
                    }
                  }}
                  className={`aspect-square rounded-xl p-2 border text-right interactive flex flex-col min-h-[80px] ${
                    cell.isSelected
                      ? 'bg-primary-10 border-primary/50'
                      : cell.isToday
                      ? 'bg-primary-5 border-primary/20'
                      : cell.isCurrentMonth
                      ? hasTasks
                        ? 'bg-surface-2 border-border'
                        : 'bg-surface border-border'
                      : 'bg-transparent border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-bold ${
                        !cell.isCurrentMonth
                          ? 'text-zinc-700'
                          : cell.isToday
                          ? 'text-primary'
                          : cell.isSelected
                          ? 'text-primary'
                          : 'text-zinc-300'
                      }`}
                    >
                      {toPersianDigits(cell.jd)}
                    </span>
                    {cell.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                  {/* Task indicators */}
                  {hasTasks && cell.isCurrentMonth && (
                    <div className="mt-auto space-y-0.5">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                        <ListTodo size={9} />
                        <span>{toPersianDigits(cellTasks.length)}</span>
                        {completedTasks > 0 && (
                          <span className="text-emerald-400">
                            ({toPersianDigits(completedTasks)})
                          </span>
                        )}
                      </div>
                      <div className="flex gap-0.5">
                        {cellTasks.slice(0, 5).map((t) => (
                          <div
                            key={t.id}
                            className={`w-1.5 h-1.5 rounded-full ${
                              t.completed ? 'bg-emerald-500' : t.smart_priority >= 70 ? 'bg-red-500' : 'bg-primary'
                            }`}
                          />
                        ))}
                        {cellTasks.length > 5 && (
                          <span className="text-[9px] text-zinc-500">+</span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Tasks list for selected day (monthly view) or current view */}
      {viewMode === 'monthly' && currentJy > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-primary" />
            <h3 className="text-sm font-bold text-white">
              کارهای {formatStoredDate(selectedDate)}
            </h3>
          </div>
          <TaskList
            tasks={tasks.filter((t) => t.task_date === selectedDate || t.task_level === 'monthly' || t.task_level === 'weekly')}
            loading={loading}
            onToggle={handleToggle}
            onEdit={(task) => { setEditingTask(task); setFormOpen(true); }}
            onDelete={handleDelete}
            onAdd={() => { setEditingTask(null); setFormOpen(true); }}
          />
        </div>
      )}

      {/* Tasks list for daily and weekly views */}
      {viewMode !== 'monthly' && (
        <TaskList
          tasks={tasks}
          loading={loading}
          onToggle={handleToggle}
          onEdit={(task) => { setEditingTask(task); setFormOpen(true); }}
          onDelete={handleDelete}
          onAdd={() => { setEditingTask(null); setFormOpen(true); }}
        />
      )}

      {/* Task form modal */}
      <TaskFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingTask(null); }}
        onSave={handleSave}
        editingTask={editingTask}
        existingTasks={tasks}
        defaultDate={selectedDate}
        defaultLevel={viewMode}
      />
    </div>
  );
}

// === Task List ===
function TaskList({
  tasks,
  loading,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
}: {
  tasks: Task[];
  loading: boolean;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="p-5">
        <EmptyState
          icon={<ListTodo size={28} />}
          title="کاری ثبت نشده"
          description="کار جدید اضافه کنید و پیشرفت خود را دنبال کنید"
          action={
            <Button onClick={onAdd}>
              <Plus size={18} />
              افزودن کار
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onToggle={() => onToggle(task)}
          onEdit={() => onEdit(task)}
          onDelete={() => onDelete(task.id)}
        />
      ))}
    </div>
  );
}

// === Task Card ===
function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const daysLeft = getDaysUntilDeadline(task.deadline);
  const isOverdue = daysLeft !== null && daysLeft < 0 && !task.completed;
  const priorityClass = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS['عادی'];
  const statusClass = STATUS_COLORS[task.status] || STATUS_COLORS['انجام نشده'];

  const levelBadge = {
    daily: { label: 'روزانه', color: 'text-sky-400 bg-sky-500/10' },
    weekly: { label: 'هفتگی', color: 'text-violet-400 bg-violet-500/10' },
    monthly: { label: 'ماهانه', color: 'text-amber-400 bg-amber-500/10' },
  }[task.task_level] || { label: 'روزانه', color: 'text-sky-400 bg-sky-500/10' };

  return (
    <Card className={`p-4 group interactive border ${isOverdue ? 'border-red-500/30 bg-red-500/5' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`shrink-0 mt-0.5 transition-base ${
            task.completed ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'
          }`}
        >
          {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className={`text-sm font-bold ${task.completed ? 'text-zinc-500 line-through' : 'text-white'}`}>
              {task.title}
            </p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${levelBadge.color}`}>
              {levelBadge.label}
            </span>
            {task.smart_priority >= 70 && !task.completed && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-500/10 text-red-400">
                <Zap size={10} />
                فوری
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-zinc-400 mb-2 line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap text-xs text-zinc-500">
            {task.estimated_minutes > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                {formatDuration(task.estimated_minutes)}
              </span>
            )}
            {task.start_time && (
              <span className="inline-flex items-center gap-1">
                <Timer size={12} />
                {toPersianDigits(task.start_time)}
                {task.end_time && ` - ${toPersianDigits(task.end_time)}`}
              </span>
            )}
            {task.deadline && (
              <span className={`inline-flex items-center gap-1 ${isOverdue ? 'text-red-400' : daysLeft !== null && daysLeft <= 3 ? 'text-amber-400' : ''}`}>
                <AlertCircle size={12} />
                {formatDeadline(task.deadline)}
              </span>
            )}
            {task.quantity > 0 && (
              <span className="inline-flex items-center gap-1">
                <ListTodo size={12} />
                {toPersianDigits(task.quantity)} {task.quantity_type}
              </span>
            )}
            {task.depends_on && (
              <span className="inline-flex items-center gap-1 text-violet-400">
                <Link2 size={12} />
                وابسته
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${priorityClass}`}>
              {task.priority}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
              {task.status}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-surface-2 text-zinc-400">
              {task.task_type}
            </span>
            {task.difficulty === 'سخت' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-500/10 text-orange-400">
                {task.difficulty}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onDelete}
          className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-surface opacity-0 group-hover:opacity-100 interactive shrink-0"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </Card>
  );
}

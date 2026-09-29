import { supabase } from '@/lib/supabase';
import type { Task } from '@/lib/types';
import { todayISODate, dateToISODate, getStartOfWeek, getStartOfJalaliMonth, getCurrentJalaliDate, jalaliToGregorian, getJalaliMonthDays } from '@/lib/jalali';

export const TASK_TYPES = ['مطالعه', 'تست', 'مرور', 'کلاس', 'تمرین', 'شخصی', 'آزمون', 'خلاصه‌نویسی'] as const;
export const PRIORITIES = ['خیلی مهم', 'مهم', 'عادی', 'کم‌اهمیت'] as const;
export const DIFFICULTIES = ['آسان', 'متوسط', 'سخت'] as const;
export const STATUSES = ['انجام نشده', 'در حال انجام', 'انجام شده', 'عقب‌افتاده'] as const;
export const RECURRENCES = ['یک‌بار', 'روزانه', 'هفتگی', 'سفارشی'] as const;
export const TASK_LEVELS = ['daily', 'weekly', 'monthly'] as const;

export const TASK_TYPE_ICONS: Record<string, string> = {
  'مطالعه': 'book',
  'تست': 'file',
  'مرور': 'refresh',
  'کلاس': 'users',
  'تمرین': 'pen',
  'شخصی': 'user',
  'آزمون': 'clipboard',
  'خلاصه‌نویسی': 'note',
};

export const PRIORITY_COLORS: Record<string, string> = {
  'خیلی مهم': 'text-red-400 bg-red-500/10 border-red-500/20',
  'مهم': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'عادی': 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  'کم‌اهمیت': 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
};

export const STATUS_COLORS: Record<string, string> = {
  'انجام نشده': 'text-zinc-400 bg-zinc-500/10',
  'در حال انجام': 'text-amber-400 bg-amber-500/10',
  'انجام شده': 'text-emerald-400 bg-emerald-500/10',
  'عقب‌افتاده': 'text-red-400 bg-red-500/10',
};

const PRIORITY_WEIGHT: Record<string, number> = {
  'خیلی مهم': 4,
  'مهم': 3,
  'عادی': 2,
  'کم‌اهمیت': 1,
};

const DIFFICULTY_WEIGHT: Record<string, number> = {
  'سخت': 3,
  'متوسط': 2,
  'آسان': 1,
};

export function calculateSmartPriority(task: Partial<Task>): number {
  let score = 0;

  // Priority weight (0-40)
  score += (PRIORITY_WEIGHT[task.priority || 'عادی'] || 2) * 10;

  // Deadline urgency (0-30)
  if (task.deadline) {
    const today = new Date(todayISODate());
    const dl = new Date(task.deadline);
    const daysLeft = Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) score += 30;
    else if (daysLeft <= 1) score += 25;
    else if (daysLeft <= 3) score += 20;
    else if (daysLeft <= 7) score += 12;
    else if (daysLeft <= 14) score += 6;
    else score += 2;
  }

  // Difficulty weight (0-15)
  score += (DIFFICULTY_WEIGHT[task.difficulty || 'متوسط'] || 2) * 5;

  // Estimated time weight (0-15) — longer tasks need earlier start
  const mins = task.estimated_minutes || 0;
  if (mins >= 180) score += 15;
  else if (mins >= 120) score += 12;
  else if (mins >= 60) score += 8;
  else if (mins >= 30) score += 4;

  return score;
}

export function getDaysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null;
  const today = new Date(todayISODate());
  const dl = new Date(deadline);
  return Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDeadline(deadline: string | null): string {
  const days = getDaysUntilDeadline(deadline);
  if (days === null) return '';
  if (days < 0) return `${Math.abs(days)} روز گذشته`;
  if (days === 0) return 'امروز';
  if (days === 1) return 'فردا';
  return `${days} روز مانده`;
}

export interface TaskFilter {
  level?: 'daily' | 'weekly' | 'monthly' | 'all';
  startDate?: string;
  endDate?: string;
  showCompleted?: boolean;
  searchTerm?: string;
  sortBy?: 'date' | 'priority' | 'deadline' | 'duration' | 'status';
}

export async function loadTasks(filter: TaskFilter = {}): Promise<Task[]> {
  let query = supabase.from('tasks').select('*');

  if (filter.level && filter.level !== 'all') {
    query = query.eq('task_level', filter.level);
  }

  if (filter.startDate) {
    query = query.gte('task_date', filter.startDate);
  }
  if (filter.endDate) {
    query = query.lte('task_date', filter.endDate);
  }

  if (!filter.showCompleted) {
    query = query.eq('completed', false);
  }

  const { data, error } = await query.order('task_date', { ascending: true });

  if (error) return [];

  let tasks = (data as Task[]) || [];

  // Update overdue status
  const today = todayISODate();
  tasks = tasks.map((t) => {
    if (!t.completed && t.deadline && t.deadline < today && t.status !== 'انجام شده') {
      return { ...t, status: 'عقب‌افتاده' as string };
    }
    return t;
  });

  // Search filter
  if (filter.searchTerm) {
    const term = filter.searchTerm.toLowerCase();
    tasks = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term),
    );
  }

  // Sort
  if (filter.sortBy === 'priority') {
    tasks.sort((a, b) => (b.smart_priority || 0) - (a.smart_priority || 0));
  } else if (filter.sortBy === 'deadline') {
    tasks.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  } else if (filter.sortBy === 'duration') {
    tasks.sort((a, b) => (b.estimated_minutes || 0) - (a.estimated_minutes || 0));
  } else if (filter.sortBy === 'status') {
    const order: Record<string, number> = { 'عقب‌افتاده': 0, 'انجام نشده': 1, 'در حال انجام': 2, 'انجام شده': 3 };
    tasks.sort((a, b) => (order[a.status] || 0) - (order[b.status] || 0));
  }

  return tasks;
}

export async function loadTasksForDate(date: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('task_date', date)
    .eq('task_level', 'daily')
    .order('completed', { ascending: true })
    .order('smart_priority', { ascending: false });

  if (error) return [];
  return (data as Task[]) || [];
}

export async function loadTasksForWeek(weekStart: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('task_level', 'weekly')
    .eq('task_date', weekStart)
    .order('completed', { ascending: true })
    .order('smart_priority', { ascending: false });

  if (error) return [];
  return (data as Task[]) || [];
}

export async function loadTasksForMonth(monthStart: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('task_level', 'monthly')
    .eq('task_date', monthStart)
    .order('completed', { ascending: true })
    .order('smart_priority', { ascending: false });

  if (error) return [];
  return (data as Task[]) || [];
}

export async function createTask(task: Partial<Task>): Promise<Task | null> {
  const smartPriority = calculateSmartPriority(task);
  const status = task.status || 'انجام نشده';

  const insertData = {
    title: task.title || '',
    description: task.description || '',
    task_type: task.task_type || 'مطالعه',
    task_level: task.task_level || 'daily',
    task_date: task.task_date || todayISODate(),
    start_time: task.start_time || '',
    end_time: task.end_time || '',
    estimated_minutes: task.estimated_minutes || 0,
    priority: task.priority || 'عادی',
    deadline: task.deadline || null,
    difficulty: task.difficulty || 'متوسط',
    quantity: task.quantity || 0,
    quantity_type: task.quantity_type || '',
    status,
    recurrence: task.recurrence || 'یک‌بار',
    recurrence_config: task.recurrence_config || {},
    depends_on: task.depends_on || null,
    parent_task_id: task.parent_task_id || null,
    smart_priority: smartPriority,
    notes: task.notes || '',
    completed: false,
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert(insertData)
    .select()
    .single();

  if (error) return null;
  return data as Task;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const updateData: Record<string, unknown> = { ...updates };
  if (updates.priority || updates.deadline || updates.difficulty || updates.estimated_minutes) {
    const existing = await loadTaskById(id);
    if (existing) {
      updateData.smart_priority = calculateSmartPriority({ ...existing, ...updates });
    }
  }

  if (updates.completed !== undefined) {
    updateData.completed_at = updates.completed ? new Date().toISOString() : null;
    if (updates.completed) {
      updateData.status = 'انجام شده';
    } else {
      updateData.status = updates.status || 'انجام نشده';
    }
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return null;
  return data as Task;
}

export async function loadTaskById(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  return (data as Task) || null;
}

export async function deleteTask(id: string): Promise<boolean> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  return !error;
}

export async function toggleTaskComplete(id: string, completed: boolean): Promise<Task | null> {
  return updateTask(id, { completed });
}

export async function loadSubtasks(parentId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('parent_task_id', parentId)
    .order('task_date', { ascending: true });
  if (error) return [];
  return (data as Task[]) || [];
}

// Get the ISO date for the start of a Jalali week (Saturday) containing a given date
export function getWeekStartISO(date: Date): string {
  const jsDay = date.getDay();
  const diff = jsDay === 6 ? 0 : jsDay + 1;
  const start = new Date(date);
  start.setDate(date.getDate() - diff);
  return dateToISODate(start);
}

// Get the ISO date for the start of a Jalali month
export function getMonthStartISO(jy: number, jm: number): string {
  return dateToISODate(jalaliToGregorian(jy, jm, 1));
}

// Get the ISO date for the end of a Jalali month
export function getMonthEndISO(jy: number, jm: number): string {
  const days = getJalaliMonthDays(jy, jm);
  return dateToISODate(jalaliToGregorian(jy, jm, days));
}

// Auto-reschedule: move overdue incomplete tasks to today
export async function autoRescheduleOverdue(): Promise<number> {
  const today = todayISODate();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('completed', false)
    .eq('task_level', 'daily')
    .lt('task_date', today);

  if (error || !data || data.length === 0) return 0;

  const updates = (data as Task[]).map((t) =>
    supabase.from('tasks').update({ task_date: today, status: 'عقب‌افتاده' }).eq('id', t.id),
  );

  await Promise.all(updates);
  return data.length;
}

// Suggest best time slot for a task based on existing tasks
export function suggestTimeSlot(
  existingTasks: Task[],
  estimatedMinutes: number,
): { start: string; end: string } | null {
  const slots: Array<{ start: number; end: number }> = [];
  for (let h = 7; h <= 22; h++) {
    slots.push({ start: h * 60, end: (h + 1) * 60 });
  }

  const busySlots = existingTasks
    .filter((t) => t.start_time && t.end_time)
    .map((t) => {
      const [sh, sm] = t.start_time.split(':').map(Number);
      const [eh, em] = t.end_time.split(':').map(Number);
      return { start: sh * 60 + sm, end: eh * 60 + em };
    });

  for (const slot of slots) {
    const slotEnd = slot.start + estimatedMinutes;
    if (slotEnd > slot.end) continue;
    const conflict = busySlots.some((b) => slot.start < b.end && slotEnd > b.start);
    if (!conflict) {
      const fmt = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      };
      return { start: fmt(slot.start), end: fmt(slotEnd) };
    }
  }

  return null;
}

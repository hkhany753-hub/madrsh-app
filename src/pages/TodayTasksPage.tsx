import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Check, Circle, CheckSquare, Zap, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, LoadingSpinner, EmptyState, ProgressBar } from '@/components/ui';
import { Button } from '@/components/Form';
import { TaskFormModal, type TaskFormData } from '@/components/TaskFormModal';
import {
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
  autoRescheduleOverdue,
  formatDeadline,
  getDaysUntilDeadline,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from '@/lib/task-service';
import type { Task } from '@/lib/types';
import {
  toPersianDigits,
  todayISODate,
  formatStoredDate,
  dateToISODate,
  getStartOfWeek,
  getCurrentJalaliDate,
  jalaliToGregorian,
  getJalaliMonthDays,
} from '@/lib/jalali';

type Tab = 'today' | 'week' | 'month';

export function TodayTasksPage() {
  const [tab, setTab] = useState<Tab>('today');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  async function loadTasks() {
    setLoading(true);
    const today = todayISODate();

    let query = supabase.from('tasks').select('*');
    if (tab === 'today') {
      query = query.eq('task_date', today);
    } else if (tab === 'week') {
      const weekStart = dateToISODate(getStartOfWeek());
      query = query.gte('task_date', weekStart);
    } else {
      const [jy, jm] = getCurrentJalaliDate();
      const monthStart = dateToISODate(jalaliToGregorian(jy, jm, 1));
      const monthEnd = dateToISODate(jalaliToGregorian(jy, jm, getJalaliMonthDays(jy, jm)));
      query = query.gte('task_date', monthStart).lte('task_date', monthEnd);
    }

    const { data } = await query.order('completed', { ascending: true }).order('smart_priority', { ascending: false });
    setTasks((data as Task[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTasks();
  }, [tab]);

  const handleSave = useCallback(async (data: TaskFormData) => {
    if (data.id) {
      await updateTask(data.id, data);
    } else {
      await createTask(data);
    }
    loadTasks();
  }, []);

  const handleToggle = useCallback(async (task: Task) => {
    await toggleTaskComplete(task.id, !task.completed);
    loadTasks();
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deleteTask(id);
    loadTasks();
  }, []);

  const handleAutoReschedule = useCallback(async () => {
    await autoRescheduleOverdue();
    loadTasks();
  }, []);

  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const overdueCount = tasks.filter((t) => {
    if (t.completed) return false;
    const days = getDaysUntilDeadline(t.deadline);
    return days !== null && days < 0;
  }).length;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'today', label: 'امروز' },
    { key: 'week', label: 'این هفته' },
    { key: 'month', label: 'این ماه' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">کارهای امروز</h1>
          <p className="text-sm text-zinc-400 mt-1">برنامه روزانه، هفتگی و ماهانه خود را مدیریت کنید</p>
        </div>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <Button variant="secondary" size="sm" onClick={handleAutoReschedule}>
              <Zap size={16} className="text-amber-400" />
              جابه‌جایی ({toPersianDigits(overdueCount)})
            </Button>
          )}
          <Button onClick={() => { setEditingTask(null); setFormOpen(true); }}>
            <Plus size={18} />
            کار جدید
          </Button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold interactive ${
              tab === t.key ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {total > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">پیشرفت</h3>
            <span className="text-sm text-zinc-400">
              {toPersianDigits(completed)} از {toPersianDigits(total)} ({toPersianDigits(pct)}٪)
            </span>
          </div>
          <ProgressBar value={completed} max={total} color="bg-emerald-500" height="h-3" />
        </Card>
      )}

      <Card className="p-5">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size={28} />
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<CheckSquare size={28} />}
            title="کاری ثبت نشده"
            description="کارهای خود را اضافه کنید و پیشرفت خود را دنبال کنید"
            action={
              <Button onClick={() => { setEditingTask(null); setFormOpen(true); }}>
                <Plus size={18} />
                افزودن کار
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const daysLeft = getDaysUntilDeadline(task.deadline);
              const isOverdue = daysLeft !== null && daysLeft < 0 && !task.completed;
              const priorityClass = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS['عادی'];
              const statusClass = STATUS_COLORS[task.status] || STATUS_COLORS['انجام نشده'];

              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 rounded-xl bg-surface-2 interactive border group ${
                    isOverdue ? 'border-red-500/30' : 'border-transparent'
                  }`}
                >
                  <button
                    onClick={() => handleToggle(task)}
                    className={`shrink-0 transition-base ${
                      task.completed ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    {task.completed ? <Check size={22} /> : <Circle size={22} />}
                  </button>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => { setEditingTask(task); setFormOpen(true); }}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${task.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                        {task.title}
                      </p>
                      {task.smart_priority >= 70 && !task.completed && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-500/10 text-red-400">
                          <Zap size={10} />
                          فوری
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 flex-wrap">
                      <span>{formatStoredDate(task.task_date)}</span>
                      {task.estimated_minutes > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} />
                          {toPersianDigits(task.estimated_minutes)} دقیقه
                        </span>
                      )}
                      {task.deadline && (
                        <span className={`inline-flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}>
                          <AlertCircle size={12} />
                          {formatDeadline(task.deadline)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${priorityClass}`}>
                        {task.priority}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
                        {task.status}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-surface text-zinc-400">
                        {task.task_type}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-surface opacity-0 group-hover:opacity-100 interactive shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <TaskFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingTask(null); }}
        onSave={handleSave}
        editingTask={editingTask}
        existingTasks={tasks}
        defaultDate={todayISODate()}
        defaultLevel="daily"
      />
    </div>
  );
}

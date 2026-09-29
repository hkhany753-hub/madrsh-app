import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Link2, Zap } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button, Input, Select, TextArea } from '@/components/Form';
import {
  TASK_TYPES,
  PRIORITIES,
  DIFFICULTIES,
  STATUSES,
  RECURRENCES,
  TASK_LEVELS,
  calculateSmartPriority,
  suggestTimeSlot,
  deleteTask,
} from '@/lib/task-service';
import type { Task } from '@/lib/types';
import { todayISODate } from '@/lib/jalali';

export interface TaskFormData {
  id?: string;
  title: string;
  description: string;
  task_type: string;
  task_level: 'daily' | 'weekly' | 'monthly';
  task_date: string;
  start_time: string;
  end_time: string;
  estimated_minutes: number;
  priority: string;
  deadline: string | null;
  difficulty: string;
  quantity: number;
  quantity_type: string;
  status: string;
  recurrence: string;
  notes: string;
  depends_on: string | null;
  parent_task_id: string | null;
}

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: TaskFormData) => Promise<void>;
  editingTask?: Task | null;
  existingTasks?: Task[];
  defaultDate?: string;
  defaultLevel?: 'daily' | 'weekly' | 'monthly';
}

const LEVEL_LABELS: Record<string, string> = {
  daily: 'روزانه',
  weekly: 'هفتگی',
  monthly: 'ماهانه',
};

const QUANTITY_TYPES = ['صفحه', 'تست', 'بخش', 'فصل', 'مبحث', 'تمرین'];

export function TaskFormModal({
  open,
  onClose,
  onSave,
  editingTask,
  existingTasks = [],
  defaultDate,
  defaultLevel = 'daily',
}: TaskFormModalProps) {
  const [form, setForm] = useState<TaskFormData>({
    title: '',
    description: '',
    task_type: 'مطالعه',
    task_level: defaultLevel,
    task_date: defaultDate || todayISODate(),
    start_time: '',
    end_time: '',
    estimated_minutes: 0,
    priority: 'عادی',
    deadline: null,
    difficulty: 'متوسط',
    quantity: 0,
    quantity_type: '',
    status: 'انجام نشده',
    recurrence: 'یک‌بار',
    notes: '',
    depends_on: null,
    parent_task_id: null,
  });

  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [smartScore, setSmartScore] = useState(0);

  useEffect(() => {
    if (editingTask) {
      setForm({
        id: editingTask.id,
        title: editingTask.title,
        description: editingTask.description || '',
        task_type: editingTask.task_type || 'مطالعه',
        task_level: editingTask.task_level || 'daily',
        task_date: editingTask.task_date,
        start_time: editingTask.start_time || '',
        end_time: editingTask.end_time || '',
        estimated_minutes: editingTask.estimated_minutes || 0,
        priority: editingTask.priority || 'عادی',
        deadline: editingTask.deadline,
        difficulty: editingTask.difficulty || 'متوسط',
        quantity: editingTask.quantity || 0,
        quantity_type: editingTask.quantity_type || '',
        status: editingTask.status || 'انجام نشده',
        recurrence: editingTask.recurrence || 'یک‌بار',
        notes: editingTask.notes || '',
        depends_on: editingTask.depends_on,
        parent_task_id: editingTask.parent_task_id,
      });
      setShowAdvanced(true);
    } else {
      setForm({
        title: '',
        description: '',
        task_type: 'مطالعه',
        task_level: defaultLevel,
        task_date: defaultDate || todayISODate(),
        start_time: '',
        end_time: '',
        estimated_minutes: 0,
        priority: 'عادی',
        deadline: null,
        difficulty: 'متوسط',
        quantity: 0,
        quantity_type: '',
        status: 'انجام نشده',
        recurrence: 'یک‌بار',
        notes: '',
        depends_on: null,
        parent_task_id: null,
      });
      setShowAdvanced(false);
    }
  }, [editingTask, open, defaultDate, defaultLevel]);

  useEffect(() => {
    setSmartScore(
      calculateSmartPriority({
        priority: form.priority,
        deadline: form.deadline,
        difficulty: form.difficulty,
        estimated_minutes: form.estimated_minutes,
      }),
    );
  }, [form.priority, form.deadline, form.difficulty, form.estimated_minutes]);

  function update<K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function autoSuggestTime() {
    const suggestion = suggestTimeSlot(existingTasks, form.estimated_minutes || 60);
    if (suggestion) {
      update('start_time', suggestion.start);
      update('end_time', suggestion.end);
    }
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  }

  const priorityColor =
    smartScore >= 70 ? 'text-red-400' : smartScore >= 50 ? 'text-amber-400' : smartScore >= 30 ? 'text-sky-400' : 'text-zinc-400';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingTask ? 'ویرایش کار' : 'کار جدید'}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pl-1">
        {/* Title */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">عنوان کار *</label>
          <Input
            value={form.title}
            onChange={(v) => update('title', v)}
            placeholder="مثلاً: مطالعه فصل ۳ ریاضی"
          />
        </div>

        {/* Level + Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">سطح کار</label>
            <div className="flex gap-1 p-1 bg-surface-2 border border-border rounded-xl">
              {TASK_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => update('task_level', lvl)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold interactive ${
                    form.task_level === lvl ? 'bg-primary text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {LEVEL_LABELS[lvl]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">نوع کار</label>
            <Select
              value={form.task_type}
              onChange={(v) => update('task_type', v)}
              options={[...TASK_TYPES]}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">توضیحات</label>
          <TextArea
            value={form.description}
            onChange={(v) => update('description', v)}
            placeholder="توضیحات بیشتر..."
            rows={2}
          />
        </div>

        {/* Date + Deadline */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">تاریخ انجام</label>
            <input
              type="date"
              value={form.task_date}
              onChange={(e) => update('task_date', e.target.value)}
              className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-white text-sm focus:border-primary focus:outline-none transition-base"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">مهلت (Deadline)</label>
            <input
              type="date"
              value={form.deadline || ''}
              onChange={(e) => update('deadline', e.target.value || null)}
              className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-white text-sm focus:border-primary focus:outline-none transition-base"
            />
          </div>
        </div>

        {/* Priority + Difficulty */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">اولویت</label>
            <Select
              value={form.priority}
              onChange={(v) => update('priority', v)}
              options={[...PRIORITIES]}
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">سطح سختی</label>
            <Select
              value={form.difficulty}
              onChange={(v) => update('difficulty', v)}
              options={[...DIFFICULTIES]}
            />
          </div>
        </div>

        {/* Time + Duration */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">شروع</label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => update('start_time', e.target.value)}
              className="w-full px-3 py-3 bg-surface-2 border border-border rounded-xl text-white text-sm focus:border-primary focus:outline-none transition-base"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">پایان</label>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => update('end_time', e.target.value)}
              className="w-full px-3 py-3 bg-surface-2 border border-border rounded-xl text-white text-sm focus:border-primary focus:outline-none transition-base"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">مدت (دقیقه)</label>
            <Input
              type="number"
              value={form.estimated_minutes}
              onChange={(v) => update('estimated_minutes', parseInt(v) || 0)}
              min={0}
              max={600}
            />
          </div>
        </div>

        {/* Auto-suggest time */}
        <button
          onClick={autoSuggestTime}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-10 text-primary text-xs interactive"
        >
          <Zap size={14} />
          پیشنهاد زمان خودکار
        </button>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full text-right text-sm text-zinc-400 hover:text-white interactive py-1"
        >
          {showAdvanced ? 'بستن تنظیمات پیشرفته' : 'تنظیمات پیشرفته...'}
        </button>

        {showAdvanced && (
          <div className="space-y-4 pt-2 border-t border-border">
            {/* Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">تعداد</label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(v) => update('quantity', parseInt(v) || 0)}
                  min={0}
                  max={999}
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">واحد</label>
                <Select
                  value={form.quantity_type}
                  onChange={(v) => update('quantity_type', v)}
                  options={QUANTITY_TYPES}
                  placeholder="انتخاب واحد"
                />
              </div>
            </div>

            {/* Status + Recurrence */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">وضعیت</label>
                <Select
                  value={form.status}
                  onChange={(v) => update('status', v)}
                  options={[...STATUSES]}
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">تکرار</label>
                <Select
                  value={form.recurrence}
                  onChange={(v) => update('recurrence', v)}
                  options={[...RECURRENCES]}
                />
              </div>
            </div>

            {/* Dependency */}
            {existingTasks.length > 0 && (
              <div>
                <label className="block text-sm text-zinc-400 mb-2">وابسته به کار دیگر</label>
                <Select
                  value={
                    form.depends_on
                      ? existingTasks.find((t) => t.id === form.depends_on)?.title || ''
                      : ''
                  }
                  onChange={(v) => {
                    const found = existingTasks.find((t) => t.title === v);
                    update('depends_on', found?.id || null);
                  }}
                  options={['', ...existingTasks.map((t) => t.title)]}
                  placeholder="بدون وابستگی"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">یادداشت</label>
              <TextArea
                value={form.notes}
                onChange={(v) => update('notes', v)}
                placeholder="یادداشت‌های اضافی..."
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Smart Priority Indicator */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2">
          <div className="flex items-center gap-2">
            <Zap size={16} className={priorityColor} />
            <span className="text-sm text-zinc-400">اولویت هوشمند</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-surface rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${priorityColor.replace('text', 'bg')}`}
                style={{ width: `${Math.min(smartScore, 100)}%` }}
              />
            </div>
            <span className={`text-sm font-bold ${priorityColor}`}>{smartScore}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button fullWidth size="lg" onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? <Loader2 size={20} className="animate-spin" /> : editingTask ? 'ذخیره تغییرات' : 'ایجاد کار'}
          </Button>
          {editingTask && (
            <Button
              variant="danger"
              size="lg"
              onClick={async () => {
                if (editingTask) {
                  await deleteTask(editingTask.id);
                  onClose();
                }
              }}
            >
              <Trash2 size={18} />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

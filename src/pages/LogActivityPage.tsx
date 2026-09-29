import { useEffect, useState } from 'react';
import { Plus, Clock, Trash2, Edit2, Check, X, BookOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, StatCard, LoadingSpinner, EmptyState } from '@/components/ui';
import { Button, Input, Select, TextArea } from '@/components/Form';
import { Modal } from '@/components/Modal';
import { SUBJECTS, ACTIVITY_TYPES, getSubjectColor } from '@/lib/constants';
import { formatDuration, toPersianDigits, formatStoredDate, todayISODate } from '@/lib/jalali';
import type { Activity } from '@/lib/types';

export function LogActivityPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [activityType, setActivityType] = useState<string>(ACTIVITY_TYPES[0]);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [testCount, setTestCount] = useState('');
  const [correct, setCorrect] = useState('');
  const [wrong, setWrong] = useState('');
  const [blank, setBlank] = useState('');
  const [date, setDate] = useState(todayISODate());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function loadActivities() {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .order('activity_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);
    setActivities((data as Activity[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadActivities();
  }, []);

  function resetForm() {
    setSubject('');
    setTopic('');
    setActivityType(ACTIVITY_TYPES[0]);
    setHours('');
    setMinutes('');
    setTestCount('');
    setCorrect('');
    setWrong('');
    setBlank('');
    setDate(todayISODate());
    setNotes('');
    setEditId(null);
    setError(null);
    setSuccess(false);
  }

  function openEdit(act: Activity) {
    setEditId(act.id);
    setSubject(act.subject);
    setTopic(act.topic);
    setActivityType(act.activity_type);
    const h = Math.floor(act.duration_minutes / 60);
    const m = act.duration_minutes % 60;
    setHours(h > 0 ? String(h) : '');
    setMinutes(m > 0 ? String(m) : '');
    setTestCount(String(act.test_count));
    setCorrect(String(act.correct));
    setWrong(String(act.wrong));
    setBlank(String(act.blank));
    setDate(act.activity_date);
    setNotes(act.notes);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!subject) {
      setError('درس را انتخاب کنید');
      return;
    }

    const duration = (parseInt(hours || '0') * 60) + parseInt(minutes || '0');
    if (duration === 0 && !testCount) {
      setError('مدت مطالعه یا تعداد تست را وارد کنید');
      return;
    }

    setSaving(true);

    const payload = {
      subject,
      topic,
      activity_type: activityType,
      duration_minutes: duration,
      test_count: parseInt(testCount || '0'),
      correct: parseInt(correct || '0'),
      wrong: parseInt(wrong || '0'),
      blank: parseInt(blank || '0'),
      activity_date: date,
      notes,
    };

    if (editId) {
      await supabase.from('activities').update(payload).eq('id', editId);
    } else {
      await supabase.from('activities').insert(payload);
    }

    setSaving(false);
    setSuccess(true);
    setTimeout(() => {
      setModalOpen(false);
      resetForm();
      loadActivities();
    }, 800);
  }

  async function handleDelete(id: string) {
    await supabase.from('activities').delete().eq('id', id);
    loadActivities();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  const totalMinutes = activities.reduce((s, a) => s + a.duration_minutes, 0);
  const totalTests = activities.reduce((s, a) => s + a.test_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">ثبت فعالیت</h1>
          <p className="text-sm text-zinc-400 mt-1">فعالیت‌های مطالعه خود را ثبت کنید</p>
        </div>
        <Button onClick={() => { resetForm(); setModalOpen(true); }}>
          <Plus size={18} />
          فعالیت جدید
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={<Clock size={24} />}
          label="کل مطالعه"
          value={formatDuration(totalMinutes)}
          color="text-primary"
        />
        <StatCard
          icon={<BookOpen size={24} />}
          label="کل تست‌ها"
          value={toPersianDigits(totalTests)}
          color="text-emerald-400"
        />
      </div>

      {/* Activities list */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">فعالیت‌های اخیر</h3>
        {activities.length === 0 ? (
          <EmptyState
            icon={<Plus size={28} />}
            title="فعالیتی ثبت نشده"
            description="اولین فعالیت مطالعه خود را ثبت کنید"
            action={
              <Button onClick={() => { resetForm(); setModalOpen(true); }}>
                <Plus size={18} />
                ثبت اولین فعالیت
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {activities.map((act) => {
              const c = getSubjectColor(act.subject);
              return (
                <div
                  key={act.id}
                  className="flex items-start gap-3 p-4 rounded-xl bg-surface-2 interactive border border-transparent"
                >
                  <div className={`w-1.5 h-12 rounded-full ${c.dot} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${c.text}`}>{act.subject}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-md ${c.bg} ${c.text}`}>{act.activity_type}</span>
                      <span className="text-xs text-zinc-500">{formatStoredDate(act.activity_date)}</span>
                    </div>
                    {act.topic && <p className="text-sm text-zinc-300 mt-1">مبحث: {act.topic}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                      {act.duration_minutes > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock size={14} /> {formatDuration(act.duration_minutes)}
                        </span>
                      )}
                      {act.test_count > 0 && (
                        <span className="flex items-center gap-1">
                          <BookOpen size={14} /> {toPersianDigits(act.test_count)} تست
                          {act.correct + act.wrong + act.blank > 0 && (
                            <span className="text-zinc-500">
                              ({toPersianDigits(act.correct)} درست، {toPersianDigits(act.wrong)} غلط، {toPersianDigits(act.blank)} نزده)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    {act.notes && <p className="text-sm text-zinc-400 mt-2">{act.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(act)}
                      className="p-2 rounded-lg interactive text-zinc-400 hover:text-primary"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(act.id)}
                      className="p-2 rounded-lg interactive text-zinc-400 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title={editId ? 'ویرایش فعالیت' : 'ثبت فعالیت جدید'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">درس</label>
            <Select value={subject} onChange={setSubject} options={SUBJECTS} placeholder="درس را انتخاب کنید" />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">مبحث</label>
            <Input value={topic} onChange={setTopic} placeholder="مثلاً: حد، مشتق، تابع" />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">نوع فعالیت</label>
            <Select value={activityType} onChange={setActivityType} options={ACTIVITY_TYPES} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">ساعت</label>
              <Input type="number" value={hours} onChange={setHours} placeholder="0" min={0} max={24} />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">دقیقه</label>
              <Input type="number" value={minutes} onChange={setMinutes} placeholder="0" min={0} max={59} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">تست</label>
              <Input type="number" value={testCount} onChange={setTestCount} placeholder="0" min={0} />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">درست</label>
              <Input type="number" value={correct} onChange={setCorrect} placeholder="0" min={0} />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">غلط</label>
              <Input type="number" value={wrong} onChange={setWrong} placeholder="0" min={0} />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">نزده</label>
              <Input type="number" value={blank} onChange={setBlank} placeholder="0" min={0} />
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">تاریخ</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-white text-sm focus:border-primary focus:outline-none transition-base"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">توضیحات</label>
            <TextArea value={notes} onChange={setNotes} placeholder="یادداشت‌های خود را اینجا بنویسید..." />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400 flex items-center gap-2">
              <Check size={18} />
              فعالیت با موفقیت ثبت شد
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" fullWidth size="lg" disabled={saving}>
              {saving ? 'در حال ذخیره...' : editId ? 'به‌روزرسانی' : 'ثبت فعالیت'}
            </Button>
            <Button variant="secondary" onClick={() => { setModalOpen(false); resetForm(); }}>
              <X size={18} />
              انصراف
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

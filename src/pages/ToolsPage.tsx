import { useEffect, useState, useRef } from 'react';
import { Timer as TimerIcon, Calculator as CalcIcon, Percent, BarChart3, StickyNote, Play, Pause, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui';
import { Button, Input } from '@/components/Form';
import { toPersianDigits } from '@/lib/jalali';
import type { Note } from '@/lib/types';

type Tool = 'stopwatch' | 'pomodoro' | 'calculator' | 'test-percent' | 'average' | 'notes' | 'timer';

const TOOLS: { key: Tool; label: string; icon: typeof TimerIcon; color: string }[] = [
  { key: 'stopwatch', label: 'کرنومتر', icon: TimerIcon, color: 'text-primary' },
  { key: 'pomodoro', label: 'پومودورو', icon: TimerIcon, color: 'text-emerald-400' },
  { key: 'timer', label: 'تایمر', icon: TimerIcon, color: 'text-amber-400' },
  { key: 'calculator', label: 'ماشین حساب', icon: CalcIcon, color: 'text-cyan-400' },
  { key: 'test-percent', label: 'درصد تست', icon: Percent, color: 'text-rose-400' },
  { key: 'average', label: 'میانگین', icon: BarChart3, color: 'text-indigo-400' },
  { key: 'notes', label: 'یادداشت', icon: StickyNote, color: 'text-orange-400' },
];

export function ToolsPage() {
  const [active, setActive] = useState<Tool>('stopwatch');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">ابزارها</h1>
        <p className="text-sm text-zinc-400 mt-1">ابزارهای کاربردی برای مطالعه</p>
      </div>

      {/* Tool tabs */}
      <div className="flex gap-2 flex-wrap">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.key}
              onClick={() => setActive(tool.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-base border ${
                active === tool.key
                  ? 'bg-primary-10 text-primary border-primary-20'
                  : 'bg-surface text-zinc-400 border-border hover:text-white'
              }`}
            >
              <Icon size={18} className={active === tool.key ? tool.color : ''} />
              {tool.label}
            </button>
          );
        })}
      </div>

      {active === 'stopwatch' && <Stopwatch />}
      {active === 'pomodoro' && <Pomodoro />}
      {active === 'timer' && <CountdownTimer />}
      {active === 'calculator' && <Calculator />}
      {active === 'test-percent' && <TestPercent />}
      {active === 'average' && <AverageCalc />}
      {active === 'notes' && <NotesTool />}
    </div>
  );
}

function Stopwatch() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return (
    <Card className="p-8 flex flex-col items-center">
      <div className="text-6xl font-bold tabular-nums text-white mb-8">
        {toPersianDigits(h.toString().padStart(2, '0'))}:{toPersianDigits(m.toString().padStart(2, '0'))}:{toPersianDigits(s.toString().padStart(2, '0'))}
      </div>
      <div className="flex gap-3">
        <Button onClick={() => setRunning(!running)} variant={running ? 'secondary' : 'primary'} size="lg">
          {running ? <Pause size={20} /> : <Play size={20} />}
          {running ? 'توقف' : 'شروع'}
        </Button>
        <Button variant="secondary" size="lg" onClick={() => { setRunning(false); setSeconds(0); }}>
          <RotateCcw size={20} />
          صفر
        </Button>
      </div>
    </Card>
  );
}

function Pomodoro() {
  const [workMin, setWorkMin] = useState('25');
  const [breakMin, setBreakMin] = useState('5');
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (mode === 'work') {
            setMode('break');
            setCycles((c) => c + 1);
            return parseInt(breakMin) * 60;
          } else {
            setMode('work');
            return parseInt(workMin) * 60;
          }
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running, mode, workMin, breakMin]);

  function reset() {
    setRunning(false);
    setMode('work');
    setTimeLeft(parseInt(workMin) * 60);
    setCycles(0);
  }

  function updateWork(v: string) {
    setWorkMin(v);
    if (!running && mode === 'work') setTimeLeft(parseInt(v || '25') * 60);
  }
  function updateBreak(v: string) {
    setBreakMin(v);
    if (!running && mode === 'break') setTimeLeft(parseInt(v || '5') * 60);
  }

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;

  return (
    <Card className="p-8 flex flex-col items-center">
      <div className={`px-4 py-1.5 rounded-full text-sm font-semibold mb-6 ${mode === 'work' ? 'bg-primary-10 text-primary' : 'bg-emerald-500/10 text-emerald-400'}`}>
        {mode === 'work' ? 'زمان مطالعه' : 'استراحت'} • {toPersianDigits(cycles)} سیکل
      </div>
      <div className={`text-7xl font-bold tabular-nums mb-8 ${mode === 'work' ? 'text-primary' : 'text-emerald-400'}`}>
        {toPersianDigits(m.toString().padStart(2, '0'))}:{toPersianDigits(s.toString().padStart(2, '0'))}
      </div>
      <div className="flex gap-3 mb-6">
        <Button onClick={() => setRunning(!running)} variant={running ? 'secondary' : 'primary'} size="lg">
          {running ? <Pause size={20} /> : <Play size={20} />}
          {running ? 'توقف' : 'شروع'}
        </Button>
        <Button variant="secondary" size="lg" onClick={reset}>
          <RotateCcw size={20} />
          صفر
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
        <div>
          <label className="block text-sm text-zinc-400 mb-2">مطالعه (دقیقه)</label>
          <Input type="number" value={workMin} onChange={updateWork} min={1} max={120} />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-2">استراحت (دقیقه)</label>
          <Input type="number" value={breakMin} onChange={updateBreak} min={1} max={60} />
        </div>
      </div>
    </Card>
  );
}

function CountdownTimer() {
  const [inputMin, setInputMin] = useState('10');
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  function start() {
    setTimeLeft(parseInt(inputMin || '0') * 60);
    setRunning(true);
  }

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;

  return (
    <Card className="p-8 flex flex-col items-center">
      <div className={`text-7xl font-bold tabular-nums mb-8 ${timeLeft < 60 && timeLeft > 0 ? 'text-red-400 timer-pulse' : 'text-amber-400'}`}>
        {toPersianDigits(m.toString().padStart(2, '0'))}:{toPersianDigits(s.toString().padStart(2, '0'))}
      </div>
      <div className="flex gap-3 mb-6">
        <Button onClick={() => setRunning(!running)} variant={running ? 'secondary' : 'primary'} size="lg" disabled={timeLeft === 0 && !running}>
          {running ? <Pause size={20} /> : <Play size={20} />}
          {running ? 'توقف' : 'شروع'}
        </Button>
        <Button variant="secondary" size="lg" onClick={() => { setRunning(false); setTimeLeft(0); }}>
          <RotateCcw size={20} />
          صفر
        </Button>
      </div>
      <div className="w-full max-w-xs">
        <label className="block text-sm text-zinc-400 mb-2">دقیقه</label>
        <Input type="number" value={inputMin} onChange={setInputMin} placeholder="10" min={1} max={999} />
      </div>
    </Card>
  );
}

function Calculator() {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  function inputDigit(d: string) {
    if (waiting) { setDisplay(d); setWaiting(false); }
    else setDisplay(display === '0' ? d : display + d);
  }

  function inputDot() {
    if (waiting) { setDisplay('0.'); setWaiting(false); return; }
    if (!display.includes('.')) setDisplay(display + '.');
  }

  function clear() {
    setDisplay('0'); setPrev(null); setOp(null); setWaiting(false);
  }

  function doOp(nextOp: string) {
    const current = parseFloat(display);
    if (prev === null) {
      setPrev(current);
    } else if (op) {
      const result = compute(prev, current, op);
      setPrev(result);
      setDisplay(String(result));
    }
    setOp(nextOp);
    setWaiting(true);
  }

  function compute(a: number, b: number, op: string): number {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 0;
      case '%': return a % b;
      default: return b;
    }
  }

  function equals() {
    if (op && prev !== null) {
      const current = parseFloat(display);
      const result = compute(prev, current, op);
      setDisplay(String(result));
      setPrev(null); setOp(null); setWaiting(true);
    }
  }

  const btn = "p-4 rounded-xl text-lg font-bold interactive active:scale-95 ";
  const numBtn = btn + "bg-surface-2 text-white";
  const opBtn = btn + "bg-primary-10 text-primary";
  const eqBtn = btn + "bg-primary text-white";
  const clearBtn = btn + "bg-red-600/10 text-red-400";

  return (
    <Card className="p-6 max-w-sm mx-auto">
      <div className="bg-bg rounded-xl p-5 mb-4 text-left">
        <div className="text-3xl font-bold text-white tabular-nums break-all">{toPersianDigits(display)}</div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <button className={clearBtn} onClick={clear}>AC</button>
        <button className={opBtn} onClick={() => doOp('÷')}>÷</button>
        <button className={opBtn} onClick={() => doOp('×')}>×</button>
        <button className={opBtn} onClick={() => doOp('-')}>−</button>

        <button className={numBtn} onClick={() => inputDigit('7')}>۷</button>
        <button className={numBtn} onClick={() => inputDigit('8')}>۸</button>
        <button className={numBtn} onClick={() => inputDigit('9')}>۹</button>
        <button className={opBtn} onClick={() => doOp('+')}>+</button>

        <button className={numBtn} onClick={() => inputDigit('4')}>۴</button>
        <button className={numBtn} onClick={() => inputDigit('5')}>۵</button>
        <button className={numBtn} onClick={() => inputDigit('6')}>۶</button>
        <button className={opBtn} onClick={() => doOp('%')}>٪</button>

        <button className={numBtn} onClick={() => inputDigit('1')}>۱</button>
        <button className={numBtn} onClick={() => inputDigit('2')}>۲</button>
        <button className={numBtn} onClick={() => inputDigit('3')}>۳</button>
        <button className={eqBtn} onClick={equals} style={{ gridRow: 'span 2' }}>=</button>

        <button className={numBtn} onClick={() => inputDigit('0')} style={{ gridColumn: 'span 2' }}>۰</button>
        <button className={numBtn} onClick={inputDot}>.</button>
      </div>
    </Card>
  );
}

function TestPercent() {
  const [total, setTotal] = useState('');
  const [correct, setCorrect] = useState('');
  const [wrong, setWrong] = useState('');
  const [blank, setBlank] = useState('');

  const t = parseInt(total || '0');
  const c = parseInt(correct || '0');
  const w = parseInt(wrong || '0');
  const b = parseInt(blank || '0');
  const answered = c + w;
  const rawPct = t > 0 ? Math.round((c / t) * 100) : 0;
  const konkurPct = t > 0 ? Math.round(((c - w / 3) / t) * 100) : 0;
  const responseRate = t > 0 ? Math.round((answered / t) * 100) : 0;

  return (
    <Card className="p-6 max-w-md mx-auto space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-2">کل سؤالات</label>
          <Input type="number" value={total} onChange={setTotal} placeholder="0" min={0} />
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

      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
        <div className="text-center p-3 rounded-xl bg-surface-2">
          <p className="text-xs text-zinc-400">درصد خام</p>
          <p className="text-2xl font-bold text-emerald-400">{toPersianDigits(rawPct)}٪</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-surface-2">
          <p className="text-xs text-zinc-400">درصد کنکور</p>
          <p className="text-2xl font-bold text-primary">{toPersianDigits(konkurPct)}٪</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-surface-2">
          <p className="text-xs text-zinc-400">پاسخگویی</p>
          <p className="text-2xl font-bold text-amber-400">{toPersianDigits(responseRate)}٪</p>
        </div>
      </div>
      <p className="text-xs text-zinc-500 text-center">درصد کنکور با کسر یک‌سوم نمره غلط محاسبه می‌شود</p>
    </Card>
  );
}

function AverageCalc() {
  const [values, setValues] = useState<string[]>(['', '', '']);

  function updateValue(i: number, v: string) {
    const next = [...values];
    next[i] = v;
    setValues(next);
  }
  function addValue() { setValues([...values, '']); }
  function removeValue(i: number) {
    if (values.length > 2) setValues(values.filter((_, idx) => idx !== i));
  }

  const nums = values.map((v) => parseFloat(v) || 0);
  const sum = nums.reduce((a, b) => a + b, 0);
  const avg = nums.length > 0 ? Math.round((sum / nums.length) * 100) / 100 : 0;

  return (
    <Card className="p-6 max-w-md mx-auto space-y-4">
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <Input type="number" value={v} onChange={(val) => updateValue(i, val)} placeholder={`عدد ${toPersianDigits(i + 1)}`} />
            {values.length > 2 && (
              <button
                onClick={() => removeValue(i)}
                className="p-3 rounded-xl bg-surface-2 text-zinc-400 hover:text-red-400 interactive"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
      </div>
      <Button variant="secondary" onClick={addValue} fullWidth>
        <Plus size={18} />
        افزودن عدد
      </Button>
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
        <div className="text-center p-3 rounded-xl bg-surface-2">
          <p className="text-xs text-zinc-400">مجموع</p>
          <p className="text-2xl font-bold text-white">{toPersianDigits(sum)}</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-surface-2">
          <p className="text-xs text-zinc-400">میانگین</p>
          <p className="text-2xl font-bold text-primary">{toPersianDigits(avg)}</p>
        </div>
      </div>
    </Card>
  );
}

function NotesTool() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadNotes() {
    const { data } = await supabase.from('notes').select('*').order('updated_at', { ascending: false });
    setNotes((data as Note[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadNotes(); }, []);

  async function saveNote() {
    if (!title.trim() && !content.trim()) return;
    if (editingId) {
      await supabase.from('notes').update({ title, content }).eq('id', editingId);
    } else {
      await supabase.from('notes').insert({ title, content });
    }
    setTitle(''); setContent(''); setEditingId(null);
    loadNotes();
  }

  function editNote(note: Note) {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
  }

  async function deleteNote(id: string) {
    await supabase.from('notes').delete().eq('id', id);
    loadNotes();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">{editingId ? 'ویرایش یادداشت' : 'یادداشت جدید'}</h3>
        <Input value={title} onChange={setTitle} placeholder="عنوان..." />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="یادداشت خود را بنویسید..."
          rows={8}
          className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl text-white text-sm placeholder:text-zinc-500 focus:border-primary focus:outline-none transition-base resize-none"
        />
        <div className="flex gap-2">
          <Button onClick={saveNote} fullWidth disabled={!title.trim() && !content.trim()}>
            {editingId ? 'به‌روزرسانی' : 'ذخیره'}
          </Button>
          {editingId && (
            <Button variant="secondary" onClick={() => { setTitle(''); setContent(''); setEditingId(null); }}>
              انصراف
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">یادداشت‌ها</h3>
        {loading ? (
          <p className="text-sm text-zinc-500 text-center py-8">در حال بارگذاری...</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">یادداشتی وجود ندارد</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {notes.map((note) => (
              <div key={note.id} className="p-3 rounded-xl bg-surface-2 group">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-white">{note.title || 'بدون عنوان'}</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-base">
                    <button onClick={() => editNote(note)} className="p-1.5 rounded-lg text-zinc-400 hover:text-primary">
                      <RotateCcw size={14} />
                    </button>
                    <button onClick={() => deleteNote(note.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {note.content && <p className="text-xs text-zinc-400 mt-1 whitespace-pre-wrap line-clamp-3">{note.content}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

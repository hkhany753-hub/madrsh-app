import { useEffect, useState, useRef } from 'react';
import { FileText, Plus, Play, Clock, CheckCircle, XCircle, MinusCircle, Trash2, Trophy, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, StatCard, LoadingSpinner, EmptyState, ProgressBar } from '@/components/ui';
import { Button, Input, Select } from '@/components/Form';
import { Modal } from '@/components/Modal';
import { toPersianDigits, formatDuration } from '@/lib/jalali';
import { SUBJECTS, getSubjectColor } from '@/lib/constants';
import type { Exam, ExamAnswer, ExamResult } from '@/lib/types';

type Phase = 'list' | 'config' | 'running' | 'result';

export function ExamPage() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('list');
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  // Config state
  const [subject, setSubject] = useState('');
  const [questionCount, setQuestionCount] = useState('20');
  const [timeLimit, setTimeLimit] = useState('30');

  // Running state
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<ExamAnswer[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadExams() {
    const { data } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
    setExams((data as Exam[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadExams();
  }, []);

  async function startExam() {
    if (!subject || !questionCount) return;
    const qCount = parseInt(questionCount);
    const tLimit = parseInt(timeLimit);

    const { data } = await supabase
      .from('exams')
      .insert({
        subject,
        question_count: qCount,
        time_limit_minutes: tLimit,
        status: 'running',
        started_at: new Date().toISOString(),
        answers: Array.from({ length: qCount }, () => ({ answer: null })),
      })
      .select()
      .single();

    if (data) {
      setActiveExam(data as Exam);
      setAnswers(Array.from({ length: qCount }, () => ({ answer: null })));
      setCurrentQ(0);
      setTimeLeft(tLimit * 60);
      setResult(null);
      setPhase('running');
    }
  }

  // Timer
  useEffect(() => {
    if (phase !== 'running') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          finishExam();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  function setAnswer(qIndex: number, answer: 'correct' | 'wrong' | 'blank') {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = { answer };
      return next;
    });
  }

  async function finishExam() {
    if (!activeExam) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const correct = answers.filter((a) => a.answer === 'correct').length;
    const wrong = answers.filter((a) => a.answer === 'wrong').length;
    const blank = answers.filter((a) => a.answer === 'blank' || a.answer === null).length;
    const total = activeExam.question_count;
    const percentage = total > 0 ? Math.round(((correct - wrong / 3) / total) * 100) : 0;

    const examResult: ExamResult = { correct, wrong, blank, percentage, total };

    await supabase
      .from('exams')
      .update({
        status: 'completed',
        answers: answers,
        result: examResult,
        completed_at: new Date().toISOString(),
      })
      .eq('id', activeExam.id);

    setResult(examResult);
    setPhase('result');
    loadExams();
  }

  function newExam() {
    setSubject('');
    setQuestionCount('20');
    setTimeLimit('30');
    setActiveExam(null);
    setAnswers([]);
    setResult(null);
    setPhase('config');
  }

  async function deleteExam(id: string) {
    await supabase.from('exams').delete().eq('id', id);
    loadExams();
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const answeredCount = answers.filter((a) => a.answer === 'correct' || a.answer === 'wrong').length;

  // ===== RESULT PHASE =====
  if (phase === 'result' && result) {
    const c = getSubjectColor(activeExam?.subject || '');
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <Trophy size={40} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">نتیجه آزمون</h1>
          <p className="text-sm text-zinc-400 mt-1">{activeExam?.subject}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<CheckCircle size={24} />} label="درست" value={toPersianDigits(result.correct)} color="text-emerald-400" />
          <StatCard icon={<XCircle size={24} />} label="غلط" value={toPersianDigits(result.wrong)} color="text-red-400" />
          <StatCard icon={<MinusCircle size={24} />} label="نزده" value={toPersianDigits(result.blank)} color="text-zinc-400" />
          <StatCard icon={<Trophy size={24} />} label="درصد" value={`${toPersianDigits(result.percentage)}٪`} color="text-amber-400" />
        </div>

        <Card className="p-6">
          <h3 className="text-sm font-bold text-white mb-4">تحلیل پاسخ‌ها</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-emerald-400">پاسخ‌های درست</span>
                <span className="text-zinc-400">{toPersianDigits(result.correct)} از {toPersianDigits(result.total)}</span>
              </div>
              <ProgressBar value={result.correct} max={result.total} color="bg-emerald-500" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-red-400">پاسخ‌های غلط</span>
                <span className="text-zinc-400">{toPersianDigits(result.wrong)} از {toPersianDigits(result.total)}</span>
              </div>
              <ProgressBar value={result.wrong} max={result.total} color="bg-red-500" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400">نزده</span>
                <span className="text-zinc-400">{toPersianDigits(result.blank)} از {toPersianDigits(result.total)}</span>
              </div>
              <ProgressBar value={result.blank} max={result.total} color="bg-zinc-600" />
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button onClick={newExam} fullWidth size="lg">
            <Plus size={20} />
            آزمون جدید
          </Button>
          <Button variant="secondary" onClick={() => setPhase('list')} fullWidth size="lg">
            بازگشت به لیست
          </Button>
        </div>
      </div>
    );
  }

  // ===== RUNNING PHASE =====
  if (phase === 'running' && activeExam) {
    const c = getSubjectColor(activeExam.subject);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{activeExam.subject}</h1>
            <p className="text-sm text-zinc-400 mt-1">آزمون در حال انجام</p>
          </div>
          <div className={`text-3xl font-bold tabular-nums ${timeLeft < 60 ? 'text-red-400 timer-pulse' : 'text-white'}`}>
            {toPersianDigits(minutes.toString().padStart(2, '0'))}:{toPersianDigits(seconds.toString().padStart(2, '0'))}
          </div>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-zinc-400">پیشرفت</span>
            <span className="text-zinc-300">{toPersianDigits(answeredCount)} از {toPersianDigits(activeExam.question_count)} پاسخ داده شده</span>
          </div>
          <ProgressBar value={answeredCount} max={activeExam.question_count} color="bg-primary" />
        </Card>

        <Card className="p-6">
          <div className="text-center mb-6">
            <span className="text-sm text-zinc-400">سؤال</span>
            <span className="text-3xl font-bold text-primary mr-2">{toPersianDigits(currentQ + 1)}</span>
            <span className="text-sm text-zinc-500">از {toPersianDigits(activeExam.question_count)}</span>
          </div>

          <div className="flex justify-center gap-3 mb-6">
            <button
              onClick={() => setAnswer(currentQ, 'correct')}
              className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border interactive ${
                answers[currentQ]?.answer === 'correct'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-surface-2 border-border text-zinc-400'
              }`}
            >
              <CheckCircle size={28} />
              <span className="text-sm font-semibold">درست</span>
            </button>
            <button
              onClick={() => setAnswer(currentQ, 'wrong')}
              className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border interactive ${
                answers[currentQ]?.answer === 'wrong'
                  ? 'bg-red-500/20 border-red-500 text-red-400'
                  : 'bg-surface-2 border-border text-zinc-400'
              }`}
            >
              <XCircle size={28} />
              <span className="text-sm font-semibold">غلط</span>
            </button>
            <button
              onClick={() => setAnswer(currentQ, 'blank')}
              className={`flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border interactive ${
                answers[currentQ]?.answer === 'blank'
                  ? 'bg-zinc-500/20 border-zinc-500 text-zinc-300'
                  : 'bg-surface-2 border-border text-zinc-400'
              }`}
            >
              <MinusCircle size={28} />
              <span className="text-sm font-semibold">نزده</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
              disabled={currentQ === 0}
            >
              سؤال قبل
            </Button>
            {currentQ < activeExam.question_count - 1 ? (
              <Button onClick={() => setCurrentQ((q) => q + 1)}>
                سؤال بعد
              </Button>
            ) : (
              <Button variant="danger" onClick={finishExam}>
                پایان آزمون
              </Button>
            )}
          </div>
        </Card>

        {/* Question grid */}
        <Card className="p-4">
          <h3 className="text-sm font-bold text-white mb-3">پاسخ‌نامه</h3>
          <div className="grid grid-cols-10 gap-2">
            {Array.from({ length: activeExam.question_count }).map((_, i) => {
              const ans = answers[i]?.answer;
              return (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`aspect-square rounded-lg text-xs font-bold interactive flex items-center justify-center ${
                    i === currentQ
                      ? 'ring-2 ring-primary'
                      : ''
                  } ${
                    ans === 'correct'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : ans === 'wrong'
                      ? 'bg-red-500/20 text-red-400'
                      : ans === 'blank'
                      ? 'bg-zinc-500/20 text-zinc-300'
                      : 'bg-surface-2 text-zinc-500'
                  }`}
                >
                  {toPersianDigits(i + 1)}
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  // ===== CONFIG PHASE =====
  if (phase === 'config') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">آزمون جدید</h1>
          <p className="text-sm text-zinc-400 mt-1">تنظیمات آزمون خود را وارد کنید</p>
        </div>

        <Card className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">درس</label>
            <Select value={subject} onChange={setSubject} options={SUBJECTS} placeholder="درس را انتخاب کنید" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">تعداد سؤال</label>
              <Input type="number" value={questionCount} onChange={setQuestionCount} placeholder="20" min={1} max={200} />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">زمان (دقیقه)</label>
              <Input type="number" value={timeLimit} onChange={setTimeLimit} placeholder="30" min={1} max={300} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={startExam} fullWidth size="lg" disabled={!subject}>
              <Play size={20} />
              شروع آزمون
            </Button>
            <Button variant="secondary" onClick={() => setPhase('list')}>
              انصراف
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ===== LIST PHASE =====
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">آزمون</h1>
          <p className="text-sm text-zinc-400 mt-1">آزمون‌های شبیه‌سازی شده بسازید و اجرا کنید</p>
        </div>
        <Button onClick={newExam}>
          <Plus size={18} />
          آزمون جدید
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size={32} />
        </div>
      ) : exams.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={<FileText size={28} />}
            title="آزمونی وجود ندارد"
            description="اولین آزمون خود را بسازید"
            action={
              <Button onClick={newExam}>
                <Plus size={18} />
                ساخت آزمون
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {exams.map((exam) => {
            const c = getSubjectColor(exam.subject);
            const r = exam.result as ExamResult;
            const isCompleted = exam.status === 'completed';
            return (
              <Card key={exam.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${c.bg} ${c.text}`}>
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${c.text}`}>{exam.subject}</p>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                      <span>{toPersianDigits(exam.question_count)} سؤال</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {toPersianDigits(exam.time_limit_minutes)} دقیقه
                      </span>
                      {isCompleted && r && (
                        <span className="text-amber-400">{toPersianDigits(r.percentage)}٪</span>
                      )}
                    </div>
                  </div>
                  {isCompleted && r ? (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-400">{toPersianDigits(r.correct)} درست</span>
                      <span className="text-red-400">{toPersianDigits(r.wrong)} غلط</span>
                      <span className="text-zinc-400">{toPersianDigits(r.blank)} نزده</span>
                    </div>
                  ) : (
                    <span className="text-xs text-primary px-2 py-1 bg-primary-10 rounded-md">در حال انجام</span>
                  )}
                  <button
                    onClick={() => deleteExam(exam.id)}
                    className="p-2 rounded-lg interactive text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

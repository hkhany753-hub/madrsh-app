import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Sparkles,
  Calendar,
  BarChart3,
  BookOpen,
  Target,
  Search,
  Settings2,
  Plus,
  Trash2,
  MessageSquare,
  Loader2,
  Copy,
  RefreshCw,
  Check,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, LoadingSpinner, EmptyState } from '@/components/ui';
import { Button, Input, Select, TextArea } from '@/components/Form';
import { Modal } from '@/components/Modal';
import { AIChatInput } from '@/components/AIChatInput';
import { formatJalaliDate, relativeTime, toPersianDigits } from '@/lib/jalali';
import { SUBJECTS } from '@/lib/constants';
import {
  createConversation,
  loadConversations,
  loadMessages,
  saveMessage,
  deleteConversation,
  loadStudyProfile,
  saveStudyProfile,
  loadPerformanceData,
  streamAIResponse,
} from '@/lib/ai-service';
import type { AIConversation, AIMessage, AIStudyProfile, AITaskType, PerformanceData } from '@/lib/ai-types';

const QUICK_ACTIONS: Array<{ id: AITaskType; label: string; icon: typeof Calendar; color: string; desc: string }> = [
  { id: 'study-planner', label: 'ساخت برنامه مطالعه', icon: Calendar, color: 'text-sky-400', desc: 'برنامه هفتگی شخصی‌سازی‌شده' },
  { id: 'performance-analysis', label: 'تحلیل عملکرد', icon: BarChart3, color: 'text-emerald-400', desc: 'بررسی پیشرفت و نقاط ضعف' },
  { id: 'tutor', label: 'توضیح یک مبحث', icon: BookOpen, color: 'text-amber-400', desc: 'آموزش مفهوم با مثال' },
  { id: 'test-generator', label: 'ساخت تست', icon: FileText, color: 'text-rose-400', desc: 'تست تمرینی سفارشی' },
  { id: 'weakness-finder', label: 'پیدا کردن نقاط ضعف', icon: Search, color: 'text-cyan-400', desc: 'تحلیل مباحث مشکل‌دار' },
  { id: 'goal-setting', label: 'تعیین هدف', icon: Target, color: 'text-violet-400', desc: 'هدف‌گذاری واقع‌بینانه' },
];

import { FileText } from 'lucide-react';

const EXPLANATION_LEVELS = ['خیلی ساده', 'کنکوری', 'پیشرفته'] as const;
const GRADES = ['دوازدهم', 'یازدهم', 'دهم', 'فارغ‌التحصیل'] as const;
const FIELDS = ['ریاضی', 'تجربی', 'انسانی', 'هنر', 'زبان'] as const;

export function AIPage() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConv, setActiveConv] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [studyProfile, setStudyProfile] = useState<AIStudyProfile | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<AIMessage[]>([]);
  const streamingRef = useRef(false);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Load conversations and profile on mount
  const initialize = useCallback(async () => {
    const [convs, prof, perf] = await Promise.all([
      loadConversations(),
      loadStudyProfile(),
      loadPerformanceData(),
    ]);
    setConversations(convs);
    setStudyProfile(prof);
    setPerformanceData(perf);
    setLoading(false);
  }, []);

  useEffect(() => { initialize(); }, [initialize]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Open conversation
  const openConversation = useCallback(async (conv: AIConversation) => {
    setActiveConv(conv);
    setLoadingMessages(true);
    setError(null);
    const msgs = await loadMessages(conv.id);
    setMessages(msgs);
    setLoadingMessages(false);
  }, []);

  // Start new conversation with a task type
  const startNewConversation = useCallback(async (taskType: AITaskType) => {
    setError(null);
    const conv = await createConversation(taskType, '');
    if (!conv) {
      setError('ساخت مکالمه جدید ناموفق بود');
      return;
    }
    setConversations((prev) => [conv, ...prev]);
    setActiveConv(conv);
    setMessages([]);

    // Send initial prompt based on task type
    const initialPrompts: Record<AITaskType, string> = {
      'chat': '',
      'study-planner': 'می‌خوام یک برنامه مطالعه هفتگی بسازم. اطلاعاتم رو پرسیدی تا برام برنامه بچینی.',
      'performance-analysis': 'عملکرد اخیرم رو تحلیل کن و بگو کجاها خوبم و کجاها باید بهبود پیدا کنم.',
      'tutor': 'یه مبحث رو برام توضیح بده. اول بپرس چه درسی و چه مبحثی.',
      'test-generator': 'برام تست بساز. اول بپرس چه درسی، چند سؤال و چه سختی.',
      'weakness-finder': 'نقاط ضعفم رو پیدا کن و پیشنهاد بده چطور بهبود پیدا کنم.',
      'goal-setting': 'می‌خوام هدف‌گذاری کنم. کمکم کن هدف واقع‌بینانه تعیین کنم.',
    };

    const initialPrompt = initialPrompts[taskType];
    if (initialPrompt) {
      await sendMessage(initialPrompt, conv);
    }
  }, [studyProfile, performanceData]);

  // Send message with streaming
  const sendMessage = useCallback(async (text: string, conv?: AIConversation) => {
    const activeConversation = conv || activeConv;
    if (!activeConversation || streamingRef.current) return;

    streamingRef.current = true;
    setStreaming(true);
    setError(null);

    // Save user message
    const userMsg = await saveMessage(activeConversation.id, 'user', text);
    if (userMsg) {
      setMessages((prev) => [...prev, userMsg]);
    }

    // Build message history for API
    const history = [...messagesRef.current, { role: 'user', content: text }]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    setStreamingContent('');

    await streamAIResponse(
      activeConversation.id,
      history,
      activeConversation.task_type as AITaskType,
      studyProfile,
      performanceData,
      {
        onToken: (token) => {
          setStreamingContent((prev) => prev + token);
        },
        onDone: async (fullContent) => {
          const assistantMsg = await saveMessage(
            activeConversation.id,
            'assistant',
            fullContent,
          );
          if (assistantMsg) {
            setMessages((prev) => [...prev, assistantMsg]);
          }
          setStreamingContent('');
          setStreaming(false);
          streamingRef.current = false;

          // Update conversation title if it's the first message
          if (!activeConversation.title) {
            const title = text.slice(0, 40);
            await supabase
              .from('ai_conversations')
              .update({ title })
              .eq('id', activeConversation.id);
            setConversations((prev) =>
              prev.map((c) =>
                c.id === activeConversation.id ? { ...c, title } : c,
              ),
            );
          }
        },
        onError: (err) => {
          setError(err);
          setStreamingContent('');
          setStreaming(false);
          streamingRef.current = false;
        },
      },
    );
  }, [activeConv, studyProfile, performanceData]);

  // Regenerate last response
  const regenerate = useCallback(async () => {
    if (!activeConv || streamingRef.current) return;
    const userMessages = messagesRef.current.filter((m) => m.role === 'user');
    if (userMessages.length === 0) return;
    const lastUserMsg = userMessages[userMessages.length - 1];

    // Remove last assistant message
    const assistantMessages = messagesRef.current.filter((m) => m.role === 'assistant');
    if (assistantMessages.length > 0) {
      const lastAssistant = assistantMessages[assistantMessages.length - 1];
      await supabase.from('ai_messages').delete().eq('id', lastAssistant.id);
      setMessages((prev) => prev.filter((m) => m.id !== lastAssistant.id));
    }

    await sendMessage(lastUserMsg.content);
  }, [activeConv, sendMessage]);

  // Delete conversation
  const handleDelete = useCallback(async (convId: string) => {
    await deleteConversation(convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConv?.id === convId) {
      setActiveConv(null);
      setMessages([]);
    }
  }, [activeConv]);

  // Copy message
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyMessage = useCallback((msg: AIMessage) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Start plain chat
  const startChat = useCallback(() => {
    startNewConversation('chat');
  }, [startNewConversation]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)]">
      {/* Conversations sidebar */}
      <div className={`${activeConv ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-72 shrink-0`}>
        <Card className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary-10">
                <Sparkles size={18} className="text-primary" />
              </div>
              <h2 className="text-sm font-bold text-white">MADRSH AI</h2>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg interactive text-zinc-400 hover:text-primary"
            >
              <Settings2 size={16} />
            </button>
          </div>

          <div className="p-3">
            <Button fullWidth size="sm" onClick={startChat} disabled={streaming}>
              <Plus size={16} />
              مکالمه جدید
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`group w-full flex items-center gap-2 p-3 rounded-xl cursor-pointer interactive ${
                  activeConv?.id === conv.id
                    ? 'bg-primary-10 border border-primary-20'
                    : 'border border-transparent hover:bg-surface-2'
                }`}
              >
                <MessageSquare size={16} className="text-zinc-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {conv.title || 'مکالمه جدید'}
                  </p>
                  <p className="text-[10px] text-zinc-500">{relativeTime(new Date(conv.updated_at))}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-zinc-500 hover:text-red-400 transition-base"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="text-center text-sm text-zinc-500 py-8">مکالمه‌ای موجود نیست</p>
            )}
          </div>
        </Card>
      </div>

      {/* Main AI area */}
      <div className={`${activeConv ? 'flex' : 'hidden lg:flex'} flex-col flex-1`}>
        <Card className="flex flex-col flex-1 overflow-hidden">
          {activeConv ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <button
                  onClick={() => setActiveConv(null)}
                  className="lg:hidden p-1.5 rounded-lg interactive text-zinc-400"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="p-2 rounded-xl bg-primary-10">
                  <Sparkles size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    {activeConv.title || 'مکالمه جدید'}
                  </h3>
                  <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {streaming ? 'در حال پاسخ...' : 'آماده'}
                  </p>
                </div>
                {studyProfile && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface-2 rounded-lg">
                    <Zap size={14} className="text-primary" />
                    <span className="text-xs text-zinc-300">پروفایل فعال</span>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner size={28} />
                  </div>
                ) : messages.length === 0 && !streaming ? (
                  <div className="flex items-center justify-center h-full">
                    <EmptyState
                      icon={<Sparkles size={28} />}
                      title="مکالمه را شروع کنید"
                      description="پیام خود را بنویسید یا یکی از پیشنهادهای سریع را انتخاب کنید"
                    />
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        profileName={profile?.display_name}
                        onCopy={copyMessage}
                        copied={copiedId === msg.id}
                      />
                    ))}

                    {/* Streaming bubble */}
                    {streaming && streamingContent && (
                      <div className="flex gap-3 message-in">
                        <div className="p-2 rounded-xl bg-primary-10 shrink-0 mt-1">
                          <Sparkles size={20} className="text-primary" />
                        </div>
                        <div className="max-w-[80%]">
                          <div className="rounded-2xl bg-surface-2 text-zinc-200 rounded-tr-sm px-4 py-3">
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {streamingContent}
                              <span className="inline-block w-1.5 h-4 bg-primary ml-1 animate-pulse" />
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Loading indicator before stream starts */}
                    {streaming && !streamingContent && (
                      <div className="flex gap-3 message-in">
                        <div className="p-2 rounded-xl bg-primary-10 shrink-0 mt-1">
                          <Sparkles size={20} className="text-primary" />
                        </div>
                        <div className="bg-surface-2 rounded-2xl rounded-tr-sm px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                        {error}
                      </div>
                    )}

                    {/* Action bar */}
                    {!streaming && messages.length > 0 && (
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={regenerate}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 text-zinc-400 hover:text-white text-xs interactive"
                        >
                          <RefreshCw size={14} />
                          بازتولید
                        </button>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input — isolated component to prevent re-render */}
              <AIChatInput
                onSend={(text) => sendMessage(text)}
                disabled={streaming}
                placeholder="پیام خود را بنویسید..."
              />
            </>
          ) : (
            /* Welcome screen */
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6 lg:p-10">
                {/* Hero */}
                <div className="text-center mb-10">
                  <div className="inline-flex p-4 rounded-2xl bg-primary-10 border border-primary-20 mb-5 glow-pulse">
                    <Sparkles size={36} className="text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-3">
                    سلام {profile?.display_name || '👋'}
                  </h1>
                  <p className="text-base text-zinc-400">
                    امروز آماده‌ای برنامه‌ات رو بهتر کنیم؟
                  </p>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => startNewConversation(action.id)}
                        className="group glass rounded-2xl p-5 interactive text-right fade-in"
                      >
                        <div className={`inline-flex p-3 rounded-xl bg-surface-2 ${action.color} mb-3 group-hover:scale-110 transition-transform duration-300`}>
                          <Icon size={22} />
                        </div>
                        <h3 className="text-sm font-bold text-white mb-1">{action.label}</h3>
                        <p className="text-xs text-zinc-400">{action.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Profile setup prompt */}
                {!studyProfile && (
                  <div className="mt-8 glass rounded-2xl p-5 border border-primary-20 bg-primary-5">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-primary-10 shrink-0">
                        <Target size={22} className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-white mb-1">پروفایل تحصیلی خود را تکمیل کنید</h3>
                        <p className="text-xs text-zinc-400 mb-3">
                          برای دریافت پیشنهادهای شخصی‌سازی‌شده، اطلاعات تحصیلی خود را وارد کنید
                        </p>
                        <Button size="sm" onClick={() => setShowProfileSetup(true)}>
                          تکمیل پروفایل
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance summary */}
                {performanceData && performanceData.total_minutes > 0 && (
                  <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatChip label="مجموع مطالعه" value={`${toPersianDigits(Math.floor(performanceData.total_minutes / 60))} ساعت`} />
                    <StatChip label="مجموع تست" value={toPersianDigits(performanceData.total_tests)} />
                    <StatChip label="میانگین درصد" value={`${toPersianDigits(performanceData.avg_percentage)}٪`} />
                    <StatChip label="زنجیره" value={`${toPersianDigits(performanceData.streak)} روز`} />
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Settings modal */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="تنظیمات MADRSH AI" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2">
            <div>
              <p className="text-sm font-semibold text-white">پروفایل تحصیلی</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {studyProfile ? `پایه: ${studyProfile.grade || 'نامشخص'} • رشته: ${studyProfile.field || 'نامشخص'}` : 'تنظیم نشده'}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => { setShowSettings(false); setShowProfileSetup(true); }}>
              {studyProfile ? 'ویرایش' : 'ایجاد'}
            </Button>
          </div>

          <div className="p-3 rounded-xl bg-surface-2">
            <p className="text-sm font-semibold text-white mb-1">حالت توضیح</p>
            <p className="text-xs text-zinc-400 mb-3">سطح توضیح پیش‌فرض برای آموزش مباحث</p>
            <Select
              value={studyProfile?.explanation_level || 'کنکوری'}
              onChange={async (v) => {
                const updated = await saveStudyProfile({ explanation_level: v });
                if (updated) setStudyProfile(updated);
              }}
              options={[...EXPLANATION_LEVELS]}
            />
          </div>

          <div className="p-3 rounded-xl bg-surface-2">
            <p className="text-xs text-zinc-400">تمام مکالمه‌ها در حساب شما ذخیره می‌شوند و فقط شما به آن‌ها دسترسی دارید.</p>
          </div>
        </div>
      </Modal>

      {/* Study profile setup modal */}
      <StudyProfileModal
        open={showProfileSetup}
        onClose={() => setShowProfileSetup(false)}
        existing={studyProfile}
        onSaved={(p) => { setStudyProfile(p); setShowProfileSetup(false); }}
      />
    </div>
  );
}

// === Message bubble ===
function MessageBubble({
  msg,
  profileName,
  onCopy,
  copied,
}: {
  msg: AIMessage;
  profileName?: string;
  onCopy: (msg: AIMessage) => void;
  copied: boolean;
}) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 message-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`p-2 rounded-xl shrink-0 mt-1 ${isUser ? 'bg-surface-2' : 'bg-primary-10'}`}>
        {isUser ? (
          <div className="w-5 h-5 rounded-full bg-primary-20 flex items-center justify-center text-[10px] text-primary font-bold">
            {(profileName || 'ک')[0]}
          </div>
        ) : (
          <Sparkles size={20} className="text-primary" />
        )}
      </div>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-primary text-white rounded-tl-sm'
              : 'bg-surface-2 text-zinc-200 rounded-tr-sm'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
        </div>
        <div className={`flex items-center gap-2 px-2 mt-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-zinc-500">{relativeTime(new Date(msg.created_at))}</span>
          {!isUser && (
            <button
              onClick={() => onCopy(msg)}
              className="text-[10px] text-zinc-500 hover:text-primary flex items-center gap-1 transition-base"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'کپی شد' : 'کپی'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// === Stat chip ===
function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-3 text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-zinc-400 mt-0.5">{label}</p>
    </div>
  );
}

// === Study profile modal ===
function StudyProfileModal({
  open,
  onClose,
  existing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  existing: AIStudyProfile | null;
  onSaved: (p: AIStudyProfile) => void;
}) {
  const [grade, setGrade] = useState(existing?.grade || '');
  const [field, setField] = useState(existing?.field || '');
  const [goal, setGoal] = useState(existing?.goal || '');
  const [targetDate, setTargetDate] = useState(existing?.target_date || '');
  const [dailyHours, setDailyHours] = useState(String(existing?.daily_study_hours || 4));
  const [strengths, setStrengths] = useState((existing?.strengths || []).join('، '));
  const [weaknesses, setWeaknesses] = useState((existing?.weaknesses || []).join('، '));
  const [backlog, setBacklog] = useState((existing?.backlog_topics || []).join('، '));
  const [testCount, setTestCount] = useState(String(existing?.daily_test_count || 0));
  const [reviewTime, setReviewTime] = useState(String(existing?.review_time_minutes || 30));
  const [explanationLevel, setExplanationLevel] = useState(existing?.explanation_level || 'کنکوری');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const profile = await saveStudyProfile({
      grade,
      field,
      goal,
      target_date: targetDate || null,
      daily_study_hours: parseInt(dailyHours) || 4,
      strengths: strengths.split('،').map((s) => s.trim()).filter(Boolean),
      weaknesses: weaknesses.split('،').map((s) => s.trim()).filter(Boolean),
      backlog_topics: backlog.split('،').map((s) => s.trim()).filter(Boolean),
      daily_test_count: parseInt(testCount) || 0,
      review_time_minutes: parseInt(reviewTime) || 30,
      explanation_level: explanationLevel,
    });
    setSaving(false);
    if (profile) onSaved(profile);
  }

  return (
    <Modal open={open} onClose={onClose} title="پروفایل تحصیلی" maxWidth="max-w-lg">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">پایه</label>
            <Select value={grade} onChange={setGrade} options={[...GRADES]} placeholder="انتخاب پایه" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">رشته</label>
            <Select value={field} onChange={setField} options={[...FIELDS]} placeholder="انتخاب رشته" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">هدف</label>
          <Input value={goal} onChange={setGoal} placeholder="مثلاً: قبولی در کنکور ۱۴۰۴" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">تاریخ هدف</label>
            <Input type="date" value={targetDate} onChange={setTargetDate} />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">ساعت مطالعه روزانه</label>
            <Input type="number" value={dailyHours} onChange={setDailyHours} min={1} max={16} />
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">نقاط قوت (با ویرگول جدا کنید)</label>
          <TextArea value={strengths} onChange={setStrengths} placeholder="مثلاً: ریاضی، منطق" rows={2} />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">نقاط ضعف (با ویرگول جدا کنید)</label>
          <TextArea value={weaknesses} onChange={setWeaknesses} placeholder="مثلاً: عربی، اقتصاد" rows={2} />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">مباحث عقب‌افتاده (با ویرگول جدا کنید)</label>
          <TextArea value={backlog} onChange={setBacklog} placeholder="مثلاً: تابع، مثلثات" rows={2} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">تست روزانه</label>
            <Input type="number" value={testCount} onChange={setTestCount} min={0} max={200} />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">زمان مرور (دقیقه)</label>
            <Input type="number" value={reviewTime} onChange={setReviewTime} min={0} max={120} />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">سطح توضیح</label>
            <Select value={explanationLevel} onChange={setExplanationLevel} options={[...EXPLANATION_LEVELS]} />
          </div>
        </div>

        <Button fullWidth size="lg" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={20} className="animate-spin" /> : 'ذخیره پروفایل'}
        </Button>
      </div>
    </Modal>
  );
}

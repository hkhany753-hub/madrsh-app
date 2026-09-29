import { supabase } from '@/lib/supabase';
import type {
  AIConversation,
  AIMessage,
  AIStudyProfile,
  AITaskType,
  PerformanceData,
} from '@/lib/ai-types';

const AI_EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/madrsh-ai`;

export async function createConversation(
  taskType: AITaskType = 'chat',
  title = '',
): Promise<AIConversation | null> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({ task_type: taskType, title })
    .select()
    .single();
  if (error) return null;
  return data as AIConversation;
}

export async function loadConversations(): Promise<AIConversation[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) return [];
  return (data as AIConversation[]) || [];
}

export async function loadMessages(conversationId: string): Promise<AIMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) return [];
  return (data as AIMessage[]) || [];
}

export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata: Record<string, unknown> = {},
): Promise<AIMessage | null> {
  const { data, error } = await supabase
    .from('ai_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      metadata,
    })
    .select()
    .single();
  if (error) return null;
  return data as AIMessage;
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', conversationId);
  return !error;
}

export async function loadStudyProfile(): Promise<AIStudyProfile | null> {
  const { data, error } = await supabase
    .from('ai_study_profiles')
    .select('*')
    .maybeSingle();
  if (error) return null;
  return (data as AIStudyProfile) || null;
}

export async function saveStudyProfile(
  profile: Partial<AIStudyProfile>,
): Promise<AIStudyProfile | null> {
  const { data: existing } = await supabase
    .from('ai_study_profiles')
    .select('id')
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('ai_study_profiles')
      .update(profile)
      .eq('id', (existing as { id: string }).id)
      .select()
      .single();
    if (error) return null;
    return data as AIStudyProfile;
  }

  const { data, error } = await supabase
    .from('ai_study_profiles')
    .insert(profile)
    .select()
    .single();
  if (error) return null;
  return data as AIStudyProfile;
}

export async function loadPerformanceData(): Promise<PerformanceData> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const weekStartISO = weekStart.toISOString().split('T')[0];

  const [allRes, weekRes, recentRes] = await Promise.all([
    supabase
      .from('activities')
      .select('activity_date, duration_minutes, test_count, subject, correct, wrong, blank')
      .order('activity_date', { ascending: false })
      .limit(365),
    supabase
      .from('activities')
      .select('duration_minutes, test_count')
      .gte('activity_date', weekStartISO),
    supabase
      .from('activities')
      .select('subject, duration_minutes, test_count, correct, wrong, blank')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const allActivities = (allRes.data as Array<{
    activity_date: string;
    duration_minutes: number;
    test_count: number;
    subject: string;
    correct: number;
    wrong: number;
    blank: number;
  }>) || [];

  const weekActivities = (weekRes.data as Array<{
    duration_minutes: number;
    test_count: number;
  }>) || [];

  const recentActivities = (recentRes.data as Array<{
    subject: string;
    duration_minutes: number;
    test_count: number;
    correct: number;
    wrong: number;
    blank: number;
  }>) || [];

  const totalMinutes = allActivities.reduce((s, a) => s + a.duration_minutes, 0);
  const totalTests = allActivities.reduce((s, a) => s + a.test_count, 0);
  const weekMinutes = weekActivities.reduce((s, a) => s + a.duration_minutes, 0);

  const totalCorrect = recentActivities.reduce((s, a) => s + (a.correct || 0), 0);
  const totalWrong = recentActivities.reduce((s, a) => s + (a.wrong || 0), 0);
  const totalBlank = recentActivities.reduce((s, a) => s + (a.blank || 0), 0);
  const totalAnswered = totalCorrect + totalWrong + totalBlank;
  const avgPercentage = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const subjects = Array.from(new Set(allActivities.map((a) => a.subject)));

  // Calculate streak
  const dates = new Set(allActivities.map((a) => a.activity_date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    if (dates.has(iso)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return {
    total_minutes: totalMinutes,
    total_tests: totalTests,
    avg_percentage: avgPercentage,
    subjects_studied: subjects,
    streak,
    week_minutes: weekMinutes,
  };
}

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullContent: string) => void;
  onError: (error: string) => void;
}

export async function streamAIResponse(
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
  taskType: AITaskType,
  studyProfile: AIStudyProfile | null,
  performanceData: PerformanceData | null,
  callbacks: StreamCallbacks,
): Promise<void> {
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;

  try {
    const response = await fetch(AI_EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        messages,
        taskType,
        studyProfile: studyProfile
          ? {
              grade: studyProfile.grade,
              field: studyProfile.field,
              goal: studyProfile.goal,
              target_date: studyProfile.target_date,
              daily_study_hours: studyProfile.daily_study_hours,
              strengths: studyProfile.strengths || [],
              weaknesses: studyProfile.weaknesses || [],
              backlog_topics: studyProfile.backlog_topics || [],
              daily_test_count: studyProfile.daily_test_count,
              explanation_level: studyProfile.explanation_level,
            }
          : null,
        performanceData,
        conversationId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      callbacks.onError(errorData.error || `خطا (${response.status})`);
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullContent += chunk;
      callbacks.onToken(chunk);
    }

    callbacks.onDone(fullContent);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : 'خطای شبکه');
  }
}

/*
# MADRSH AI - Conversations, Study Profiles, and Usage Tracking

## Overview
Creates tables for the MADRSH AI assistant feature: conversation sessions,
chat messages, user study profiles for AI context, and API usage tracking.

## New Tables
1. ai_conversations — AI chat sessions (task type, title, created/updated)
2. ai_messages — Individual messages within AI conversations (role, content, metadata)
3. ai_study_profiles — User's educational context for AI personalization
4. ai_usage_tracking — Per-user API call tracking (tokens, cost, timestamps)

## Security
- RLS enabled on all tables
- Owner-scoped CRUD on all AI tables (authenticated users only access their own data)
- ai_usage_tracking is insert-only for users (they can read their own usage stats)
*/

-- ============ AI CONVERSATIONS ============
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type text NOT NULL DEFAULT 'chat',
  title text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id, created_at DESC);

DROP POLICY IF EXISTS "ai_conv_select_own" ON public.ai_conversations;
CREATE POLICY "ai_conv_select_own" ON public.ai_conversations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_conv_insert_own" ON public.ai_conversations;
CREATE POLICY "ai_conv_insert_own" ON public.ai_conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_conv_update_own" ON public.ai_conversations;
CREATE POLICY "ai_conv_update_own" ON public.ai_conversations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_conv_delete_own" ON public.ai_conversations;
CREATE POLICY "ai_conv_delete_own" ON public.ai_conversations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ AI MESSAGES ============
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON public.ai_messages(conversation_id, created_at ASC);

DROP POLICY IF EXISTS "ai_msg_select_own" ON public.ai_messages;
CREATE POLICY "ai_msg_select_own" ON public.ai_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_msg_insert_own" ON public.ai_messages;
CREATE POLICY "ai_msg_insert_own" ON public.ai_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_msg_delete_own" ON public.ai_messages;
CREATE POLICY "ai_msg_delete_own" ON public.ai_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ AI STUDY PROFILES ============
CREATE TABLE IF NOT EXISTS public.ai_study_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  grade text DEFAULT '',
  field text DEFAULT '',
  goal text DEFAULT '',
  target_date date,
  daily_study_hours int DEFAULT 4,
  available_hours jsonb DEFAULT '[]'::jsonb,
  off_days jsonb DEFAULT '[]'::jsonb,
  strengths jsonb DEFAULT '[]'::jsonb,
  weaknesses jsonb DEFAULT '[]'::jsonb,
  backlog_topics jsonb DEFAULT '[]'::jsonb,
  daily_test_count int DEFAULT 0,
  review_time_minutes int DEFAULT 30,
  explanation_level text DEFAULT 'konkur',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.ai_study_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_profile_select_own" ON public.ai_study_profiles;
CREATE POLICY "ai_profile_select_own" ON public.ai_study_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_profile_insert_own" ON public.ai_study_profiles;
CREATE POLICY "ai_profile_insert_own" ON public.ai_study_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_profile_update_own" ON public.ai_study_profiles;
CREATE POLICY "ai_profile_update_own" ON public.ai_study_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ AI USAGE TRACKING ============
CREATE TABLE IF NOT EXISTS public.ai_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  task_type text DEFAULT 'chat',
  input_tokens int DEFAULT 0,
  output_tokens int DEFAULT 0,
  model text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON public.ai_usage_tracking(user_id, created_at DESC);

DROP POLICY IF EXISTS "ai_usage_select_own" ON public.ai_usage_tracking;
CREATE POLICY "ai_usage_select_own" ON public.ai_usage_tracking FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_usage_insert_own" ON public.ai_usage_tracking;
CREATE POLICY "ai_usage_insert_own" ON public.ai_usage_tracking FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ TRIGGERS ============
DROP TRIGGER IF EXISTS ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS ai_study_profiles_updated_at ON public.ai_study_profiles;
CREATE TRIGGER ai_study_profiles_updated_at BEFORE UPDATE ON public.ai_study_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
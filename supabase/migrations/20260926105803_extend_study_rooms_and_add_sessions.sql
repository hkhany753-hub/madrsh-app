/*
# Extend Study Rooms and Add Study Sessions

1. Extended `study_rooms` with subject, is_private, capacity, session_duration, study_goal, is_active
2. Extended `room_members` with total_study_seconds
3. New table `study_sessions` for individual study session records
4. RLS on study_sessions — read all, write own
5. Realtime publication for study_sessions
*/

DO $$ BEGIN
  ALTER TABLE public.study_rooms ADD COLUMN IF NOT EXISTS subject text DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.study_rooms ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.study_rooms ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.study_rooms ADD COLUMN IF NOT EXISTS session_duration integer NOT NULL DEFAULT 50;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.study_rooms ADD COLUMN IF NOT EXISTS study_goal text DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.study_rooms ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.room_members ADD COLUMN IF NOT EXISTS total_study_seconds integer NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON public.study_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_room ON public.study_sessions(room_id, created_at DESC);

DROP POLICY IF EXISTS "study_sessions_select_all" ON public.study_sessions;
CREATE POLICY "study_sessions_select_all" ON public.study_sessions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "study_sessions_insert_own" ON public.study_sessions;
CREATE POLICY "study_sessions_insert_own" ON public.study_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "study_sessions_update_own" ON public.study_sessions;
CREATE POLICY "study_sessions_update_own" ON public.study_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "study_sessions_delete_own" ON public.study_sessions;
CREATE POLICY "study_sessions_delete_own" ON public.study_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.study_sessions;

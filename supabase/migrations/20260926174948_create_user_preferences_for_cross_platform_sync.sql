/*
# Create user_preferences table for cross-platform sync

## Purpose
MADRSH is being converted to a multi-platform product (Web + Android + Windows).
All three platforms must share a single backend and database. Currently, theme
selection and user preferences (reduce-motion, notification settings, privacy
settings) are stored only in localStorage — so a user who picks a theme on
Android will not see it on Web. This migration creates a central preferences
table keyed on the user's auth ID so preferences sync across all platforms.

## New Tables
- `user_preferences`
  - `user_id` (uuid, primary key, references auth.users, defaults to auth.uid())
  - `theme` (text, default 'dark') — the selected theme key
  - `reduce_motion` (boolean, default false) — motion-reduction preference
  - `notif_study_reminder` (boolean, default true)
  - `notif_task_reminder` (boolean, default true)
  - `notif_leaderboard` (boolean, default false)
  - `notif_chat_mentions` (boolean, default true)
  - `privacy_show_profile` (boolean, default true)
  - `privacy_show_stats` (boolean, default true)
  - `privacy_show_in_leaderboard` (boolean, default true)
  - `updated_at` (timestamptz, default now()) — last change timestamp

## Security
- RLS enabled on user_preferences.
- Four owner-scoped policies (SELECT/INSERT/UPDATE/DELETE) scoped to authenticated
  users, checking auth.uid() = user_id.
- user_id defaults to auth.uid() so inserts that omit it still pass WITH CHECK.

## Notes
1. The table uses user_id as the PRIMARY KEY (one row per user).
2. All columns have safe defaults so existing users get sensible values.
3. updated_at auto-refreshes on every write via a trigger.
*/

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark',
  reduce_motion boolean NOT NULL DEFAULT false,
  notif_study_reminder boolean NOT NULL DEFAULT true,
  notif_task_reminder boolean NOT NULL DEFAULT true,
  notif_leaderboard boolean NOT NULL DEFAULT false,
  notif_chat_mentions boolean NOT NULL DEFAULT true,
  privacy_show_profile boolean NOT NULL DEFAULT true,
  privacy_show_stats boolean NOT NULL DEFAULT true,
  privacy_show_in_leaderboard boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_preferences" ON user_preferences;
CREATE POLICY "select_own_preferences"
ON user_preferences FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_preferences" ON user_preferences;
CREATE POLICY "insert_own_preferences"
ON user_preferences FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_preferences" ON user_preferences;
CREATE POLICY "update_own_preferences"
ON user_preferences FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_preferences" ON user_preferences;
CREATE POLICY "delete_own_preferences"
ON user_preferences FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trigger_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

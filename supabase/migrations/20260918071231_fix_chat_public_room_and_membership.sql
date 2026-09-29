/*
# Fix MADRSH chat rooms and membership access

## Overview
Repairs the public conversation setup and replaces recursive chat membership checks with secure helper functions.

## Changes
1. Public conversation
- Ensures the fixed public conversation exists when a user signs up, even if the original seed ran before any user existed.
- Uses the signing-up user's ID as the required conversation creator.

2. Security functions
- Adds `is_conversation_member` to check membership without recursively re-evaluating row policies.
- Adds `is_conversation_owner` to check ownership without exposing private conversations.

3. Policies
- Replaces chat conversation and membership policies that could recurse through each other.
- Keeps public conversations visible to authenticated users.
- Keeps private group and direct conversations limited to their members or creator.
- Keeps message visibility and posting limited to public conversations or conversation members.

## Important notes
- No user rows or message rows are deleted.
- The migration is idempotent and safe to apply again.
*/

CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_owner(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_conversations
    WHERE id = p_conversation_id
      AND created_by = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_conversation_owner(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_owner(uuid) TO authenticated;

DROP POLICY IF EXISTS "chat_conv_select" ON public.chat_conversations;
CREATE POLICY "chat_conv_select" ON public.chat_conversations FOR SELECT
  TO authenticated USING (
    type = 'public'
    OR created_by = auth.uid()
    OR public.is_conversation_member(id)
  );

DROP POLICY IF EXISTS "conv_members_select" ON public.conversation_members;
CREATE POLICY "conv_members_select" ON public.conversation_members FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR public.is_conversation_member(conversation_id)
    OR public.is_conversation_owner(conversation_id)
  );

DROP POLICY IF EXISTS "conv_members_insert_own" ON public.conversation_members;
CREATE POLICY "conv_members_insert_own" ON public.conversation_members FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    OR public.is_conversation_owner(conversation_id)
  );

DROP POLICY IF EXISTS "conv_members_delete_own" ON public.conversation_members;
CREATE POLICY "conv_members_delete_own" ON public.conversation_members FOR DELETE
  TO authenticated USING (
    auth.uid() = user_id
    OR public.is_conversation_owner(conversation_id)
  );

DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
CREATE POLICY "chat_messages_select" ON public.chat_messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE id = chat_messages.conversation_id
        AND type = 'public'
    )
    OR public.is_conversation_member(conversation_id)
  );

DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
CREATE POLICY "chat_messages_insert" ON public.chat_messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM public.chat_conversations
        WHERE id = chat_messages.conversation_id
          AND type = 'public'
      )
      OR public.is_conversation_member(conversation_id)
    )
  );

-- Make the public room available to existing users as soon as this migration runs.
INSERT INTO public.chat_conversations (id, type, name, created_by)
SELECT '00000000-0000-0000-0000-000000000001', 'public', 'چت عمومی', id
FROM auth.users
ORDER BY created_at
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Ensure future signups also create the room if it was still absent.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.chat_conversations (id, type, name, created_by)
  VALUES ('00000000-0000-0000-0000-000000000001', 'public', 'چت عمومی', NEW.id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
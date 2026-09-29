/*
# MADRSH Community Policies

Adds RLS policies for all community tables.
*/

-- ============ STUDY ROOMS ============
DROP POLICY IF EXISTS "study_rooms_select_all" ON public.study_rooms;
CREATE POLICY "study_rooms_select_all" ON public.study_rooms FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "study_rooms_insert_own" ON public.study_rooms;
CREATE POLICY "study_rooms_insert_own" ON public.study_rooms FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "study_rooms_update_own" ON public.study_rooms;
CREATE POLICY "study_rooms_update_own" ON public.study_rooms FOR UPDATE
  TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "study_rooms_delete_own" ON public.study_rooms;
CREATE POLICY "study_rooms_delete_own" ON public.study_rooms FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- ============ ROOM MEMBERS ============
DROP POLICY IF EXISTS "room_members_select_all" ON public.room_members;
CREATE POLICY "room_members_select_all" ON public.room_members FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "room_members_insert_own" ON public.room_members;
CREATE POLICY "room_members_insert_own" ON public.room_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "room_members_update_own" ON public.room_members;
CREATE POLICY "room_members_update_own" ON public.room_members FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "room_members_delete_own" ON public.room_members;
CREATE POLICY "room_members_delete_own" ON public.room_members FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ CHAT CONVERSATIONS ============
DROP POLICY IF EXISTS "chat_conv_select" ON public.chat_conversations;
CREATE POLICY "chat_conv_select" ON public.chat_conversations FOR SELECT
  TO authenticated USING (
    type = 'public'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_id = chat_conversations.id AND user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "chat_conv_insert_own" ON public.chat_conversations;
CREATE POLICY "chat_conv_insert_own" ON public.chat_conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "chat_conv_update_own" ON public.chat_conversations;
CREATE POLICY "chat_conv_update_own" ON public.chat_conversations FOR UPDATE
  TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "chat_conv_delete_own" ON public.chat_conversations;
CREATE POLICY "chat_conv_delete_own" ON public.chat_conversations FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- ============ CONVERSATION MEMBERS ============
DROP POLICY IF EXISTS "conv_members_select" ON public.conversation_members;
CREATE POLICY "conv_members_select" ON public.conversation_members FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE id = conversation_members.conversation_id AND type = 'public'
    )
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.conversation_members cm2
      WHERE cm2.conversation_id = conversation_members.conversation_id AND cm2.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "conv_members_insert_own" ON public.conversation_members;
CREATE POLICY "conv_members_insert_own" ON public.conversation_members FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE id = conversation_members.conversation_id AND created_by = auth.uid()
    )
  );
DROP POLICY IF EXISTS "conv_members_delete_own" ON public.conversation_members;
CREATE POLICY "conv_members_delete_own" ON public.conversation_members FOR DELETE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE id = conversation_members.conversation_id AND created_by = auth.uid()
    )
  );

-- ============ CHAT MESSAGES ============
DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
CREATE POLICY "chat_messages_select" ON public.chat_messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE id = chat_messages.conversation_id AND type = 'public'
    )
    OR EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
CREATE POLICY "chat_messages_insert" ON public.chat_messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM public.chat_conversations
        WHERE id = chat_messages.conversation_id AND type = 'public'
      )
      OR EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid()
      )
    )
  );
DROP POLICY IF EXISTS "chat_messages_update_own" ON public.chat_messages;
CREATE POLICY "chat_messages_update_own" ON public.chat_messages FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "chat_messages_delete_own" ON public.chat_messages;
CREATE POLICY "chat_messages_delete_own" ON public.chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
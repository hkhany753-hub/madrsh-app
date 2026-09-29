/*
# MADRSH Seed Public Conversation

Creates the default public chat conversation that all users can see.
Uses a fixed UUID so it's idempotent.
*/

INSERT INTO public.chat_conversations (id, type, name, created_by)
SELECT '00000000-0000-0000-0000-000000000001', 'public', 'چت عمومی', id
FROM auth.users
LIMIT 1
ON CONFLICT (id) DO NOTHING;
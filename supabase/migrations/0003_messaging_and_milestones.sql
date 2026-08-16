-- ============================================================
-- Migration 0003: Messaging, Circle Passcodes & Career Milestones
-- ============================================================

-- 1) Extend circles table with passcode and announcement
ALTER TABLE public.circles ADD COLUMN IF NOT EXISTS passcode TEXT;
ALTER TABLE public.circles ADD COLUMN IF NOT EXISTS announcement TEXT;

-- 2) Direct Messaging Tables
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudonym_id UUID REFERENCES public.pseudonyms(id) ON DELETE SET NULL,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudonym_id UUID REFERENCES public.pseudonyms(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Career Milestones & Pivots Table
CREATE TABLE IF NOT EXISTS public.career_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_or_period TEXT NOT NULL,
  title TEXT NOT NULL,
  role_or_venture TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pivot', 'win', 'failure', 'lesson', 'role')),
  story TEXT NOT NULL,
  key_lesson TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dm_conv ON public.direct_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dm_sender ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_created ON public.direct_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_career_milestones_user ON public.career_milestones(user_id, created_at ASC);

-- 5) Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_milestones ENABLE ROW LEVEL SECURITY;

-- 6) RLS Helper function for messaging
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

-- 7) RLS Policies
-- conversations
CREATE POLICY conversations_select ON public.conversations
  FOR SELECT USING (public.is_conversation_participant(id));
CREATE POLICY conversations_insert ON public.conversations
  FOR INSERT WITH CHECK (true);
CREATE POLICY conversations_update ON public.conversations
  FOR UPDATE USING (public.is_conversation_participant(id));

-- conversation_participants
CREATE POLICY conv_participants_select ON public.conversation_participants
  FOR SELECT USING (user_id = auth.uid() OR public.is_conversation_participant(conversation_id));
CREATE POLICY conv_participants_insert ON public.conversation_participants
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_conversation_participant(conversation_id));
CREATE POLICY conv_participants_update ON public.conversation_participants
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY conv_participants_delete ON public.conversation_participants
  FOR DELETE USING (user_id = auth.uid());

-- direct_messages
CREATE POLICY direct_messages_select ON public.direct_messages
  FOR SELECT USING (public.is_conversation_participant(conversation_id));
CREATE POLICY direct_messages_insert ON public.direct_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid() AND public.is_conversation_participant(conversation_id));
CREATE POLICY direct_messages_delete ON public.direct_messages
  FOR DELETE USING (sender_id = auth.uid());

-- career_milestones
CREATE POLICY career_milestones_select ON public.career_milestones
  FOR SELECT USING (true);
CREATE POLICY career_milestones_insert ON public.career_milestones
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY career_milestones_update ON public.career_milestones
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY career_milestones_delete ON public.career_milestones
  FOR DELETE USING (user_id = auth.uid());

-- 8) Updated_at trigger for conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

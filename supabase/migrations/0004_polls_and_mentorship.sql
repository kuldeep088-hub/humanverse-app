-- ============================================================
-- Migration 0004: Polls, Help Tags & Mentorship Support
-- ============================================================

-- 1) Polls Table
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(post_id)
);

-- 2) Poll Options Table
CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Poll Votes Table
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

-- 4) Add Help Tags to Posts & Mentorship to Profiles
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS help_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS open_to_help BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS help_topics TEXT[];

-- 5) Indexes
CREATE INDEX IF NOT EXISTS idx_polls_post_id ON public.polls(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON public.poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON public.poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_help_type ON public.posts(help_type);

-- 6) RLS Policies
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY polls_select ON public.polls FOR SELECT USING (true);
CREATE POLICY polls_insert ON public.polls FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY polls_update ON public.polls FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY polls_delete ON public.polls FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY poll_options_select ON public.poll_options FOR SELECT USING (true);
CREATE POLICY poll_options_insert ON public.poll_options FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY poll_options_update ON public.poll_options FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY poll_options_delete ON public.poll_options FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY poll_votes_select ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY poll_votes_insert ON public.poll_votes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY poll_votes_delete ON public.poll_votes FOR DELETE USING (user_id = auth.uid());


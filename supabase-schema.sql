-- ============================================================
-- Humanverse Database Schema
-- Run this in Supabase SQL Editor
-- 100% Idempotent: safe to run on fresh or existing databases.
-- ============================================================

-- 1) Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2) Tables
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  professional_context TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pseudonyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS circles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS circle_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudonym_id UUID REFERENCES pseudonyms(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'circle', 'pseudonymous')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudonym_id UUID REFERENCES pseudonyms(id) ON DELETE SET NULL,
  parent_reply_id UUID REFERENCES replies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES replies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('been_there', 'oof', 'respect', 'needed_this')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id, type),
  UNIQUE(user_id, reply_id, type),
  CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND reply_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('reply', 'thread_reply', 'circle_invite', 'circle_join', 'moderation', 'security')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT CHECK (reference_type IN ('post', 'reply', 'thread', 'circle')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES replies(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  reply_id UUID REFERENCES replies(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('remove_content', 'restore_content', 'suspend_user', 'warn_user')),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'circle', 'pseudonymous')),
  circle_id UUID REFERENCES circles(id) ON DELETE SET NULL,
  pseudonym_id UUID REFERENCES pseudonyms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_pseudonym_id ON posts(pseudonym_id);
CREATE INDEX IF NOT EXISTS idx_posts_thread_id ON posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_posts_circle_id ON posts(circle_id);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts(author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_replies_post_id ON replies(post_id);
CREATE INDEX IF NOT EXISTS idx_replies_author_id ON replies(author_id);
CREATE INDEX IF NOT EXISTS idx_replies_parent_reply_id ON replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_replies_created_at ON replies(created_at ASC);

CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_reply_id ON reactions(reply_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_post_id ON reports(post_id);
CREATE INDEX IF NOT EXISTS idx_reports_reply_id ON reports(reply_id);

CREATE INDEX IF NOT EXISTS idx_circle_members_user_id ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_circle_id ON circle_members(circle_id);

CREATE INDEX IF NOT EXISTS idx_threads_slug ON threads(slug);
CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id);

-- 4) Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pseudonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

-- 5) Helper Functions for RLS (SECURITY DEFINER avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_circle_member(circle UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circle_members cm
    WHERE cm.circle_id = circle AND cm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_post(p public.posts)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.visibility = 'public'
    OR p.author_id = auth.uid()
    OR p.visibility = 'pseudonymous'
    OR (p.visibility = 'circle' AND p.circle_id IS NOT NULL AND public.is_circle_member(p.circle_id));
$$;

-- 6) Drop existing public policies safely to avoid duplicate policy errors
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 7) RLS Policies

-- profiles
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (id = auth.uid());

-- posts
CREATE POLICY posts_select ON public.posts FOR SELECT USING (public.can_view_post(posts));
CREATE POLICY posts_insert ON public.posts FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY posts_update ON public.posts FOR UPDATE USING (
  author_id = auth.uid() OR pseudonym_id IN (SELECT id FROM public.pseudonyms WHERE user_id = auth.uid())
);
CREATE POLICY posts_delete ON public.posts FOR DELETE USING (
  author_id = auth.uid() OR pseudonym_id IN (SELECT id FROM public.pseudonyms WHERE user_id = auth.uid())
);

-- threads
CREATE POLICY threads_select ON public.threads FOR SELECT USING (true);
CREATE POLICY threads_insert ON public.threads FOR INSERT WITH CHECK (true);
CREATE POLICY threads_update ON public.threads FOR UPDATE USING (true);

-- circles
CREATE POLICY circles_select ON public.circles FOR SELECT USING (owner_id = auth.uid() OR public.is_circle_member(id));
CREATE POLICY circles_insert ON public.circles FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY circles_update ON public.circles FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY circles_delete ON public.circles FOR DELETE USING (owner_id = auth.uid());

-- circle_members
CREATE POLICY circle_members_select ON public.circle_members FOR SELECT USING (user_id = auth.uid() OR public.is_circle_member(circle_id));
CREATE POLICY circle_members_insert ON public.circle_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY circle_members_delete ON public.circle_members FOR DELETE USING (
  user_id = auth.uid() OR circle_id IN (SELECT id FROM public.circles WHERE owner_id = auth.uid())
);

-- replies
CREATE POLICY replies_select ON public.replies FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = replies.post_id AND public.can_view_post(p))
);
CREATE POLICY replies_insert ON public.replies FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY replies_update ON public.replies FOR UPDATE USING (
  author_id = auth.uid() OR pseudonym_id IN (SELECT id FROM public.pseudonyms WHERE user_id = auth.uid())
);
CREATE POLICY replies_delete ON public.replies FOR DELETE USING (
  author_id = auth.uid() OR pseudonym_id IN (SELECT id FROM public.pseudonyms WHERE user_id = auth.uid())
);

-- reactions
CREATE POLICY reactions_select ON public.reactions FOR SELECT USING (
  (post_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = reactions.post_id AND public.can_view_post(p)))
  OR (reply_id IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.replies r JOIN public.posts p ON p.id = r.post_id
       WHERE r.id = reactions.reply_id AND public.can_view_post(p)))
);
CREATE POLICY reactions_insert ON public.reactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY reactions_delete ON public.reactions FOR DELETE USING (user_id = auth.uid());

-- notifications
CREATE POLICY notifications_select ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_update ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY notifications_delete ON public.notifications FOR DELETE USING (user_id = auth.uid());

-- pseudonyms
CREATE POLICY pseudonyms_select ON public.pseudonyms FOR SELECT USING (true);
CREATE POLICY pseudonyms_insert ON public.pseudonyms FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY pseudonyms_update ON public.pseudonyms FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY pseudonyms_delete ON public.pseudonyms FOR DELETE USING (user_id = auth.uid());

-- drafts
CREATE POLICY drafts_select ON public.drafts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY drafts_insert ON public.drafts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY drafts_update ON public.drafts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY drafts_delete ON public.drafts FOR DELETE USING (user_id = auth.uid());

-- reports
CREATE POLICY reports_select ON public.reports FOR SELECT USING (reporter_id = auth.uid());
CREATE POLICY reports_insert ON public.reports FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- 8) Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pseudonyms_updated_at ON pseudonyms;
CREATE TRIGGER update_pseudonyms_updated_at BEFORE UPDATE ON pseudonyms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_threads_updated_at ON threads;
CREATE TRIGGER update_threads_updated_at BEFORE UPDATE ON threads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_circles_updated_at ON circles;
CREATE TRIGGER update_circles_updated_at BEFORE UPDATE ON circles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_replies_updated_at ON replies;
CREATE TRIGGER update_replies_updated_at BEFORE UPDATE ON replies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drafts_updated_at ON drafts;
CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9) Thread post count increment/decrement triggers
CREATE OR REPLACE FUNCTION increment_thread_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE threads SET post_count = post_count + 1 WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trigger_increment_thread_post_count ON posts;
CREATE TRIGGER trigger_increment_thread_post_count AFTER INSERT ON posts FOR EACH ROW EXECUTE FUNCTION increment_thread_post_count();

CREATE OR REPLACE FUNCTION decrement_thread_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.thread_id IS NOT NULL THEN
    UPDATE threads SET post_count = post_count - 1 WHERE id = OLD.thread_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trigger_decrement_thread_post_count ON posts;
CREATE TRIGGER trigger_decrement_thread_post_count AFTER DELETE ON posts FOR EACH ROW EXECUTE FUNCTION decrement_thread_post_count();

-- 10) Auto-create profile trigger on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'New member'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11) Notification triggers (replies & reactions)
CREATE OR REPLACE FUNCTION public.notify_on_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id UUID;
  v_pseudonym_id UUID;
  v_visibility TEXT;
  v_author_name TEXT;
BEGIN
  SELECT p.author_id, p.pseudonym_id, p.visibility
    INTO v_author_id, v_pseudonym_id, v_visibility
    FROM public.posts p
   WHERE p.id = NEW.post_id;

  IF v_author_id IS NULL OR v_author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;

  IF NEW.pseudonym_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_author_name
    FROM public.profiles
   WHERE id = NEW.author_id;

  INSERT INTO public.notifications (user_id, type, title, message, reference_id, reference_type)
  VALUES (
    v_author_id,
    'reply',
    COALESCE(v_author_name, 'Someone') || ' replied to your post',
    LEFT(NEW.content, 140),
    NEW.post_id,
    'post'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_reply ON public.replies;
CREATE TRIGGER trigger_notify_on_reply AFTER INSERT ON public.replies FOR EACH ROW EXECUTE FUNCTION public.notify_on_reply();

CREATE OR REPLACE FUNCTION public.notify_on_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id UUID;
  v_reactor_name TEXT;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT p.author_id INTO v_author_id
      FROM public.posts p
     WHERE p.id = NEW.post_id;
  ELSE
    SELECT r.author_id INTO v_author_id
      FROM public.replies r
     WHERE r.id = NEW.reply_id;
  END IF;

  IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_reactor_name
    FROM public.profiles
   WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, reference_id, reference_type)
  VALUES (
    v_author_id,
    'reply',
    COALESCE(v_reactor_name, 'Someone') || ' reacted to your ' || CASE WHEN NEW.post_id IS NOT NULL THEN 'post' ELSE 'reply' END,
    REPLACE(NEW.type, '_', ' '),
    COALESCE(NEW.post_id, NEW.reply_id),
    CASE WHEN NEW.post_id IS NOT NULL THEN 'post' ELSE 'reply' END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_reaction ON public.reactions;
CREATE TRIGGER trigger_notify_on_reaction AFTER INSERT ON public.reactions FOR EACH ROW EXECUTE FUNCTION public.notify_on_reaction();

-- 12) Storage Bucket & Policies for Avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
CREATE POLICY "avatars public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars auth upload" ON storage.objects;
CREATE POLICY "avatars auth upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "avatars auth update own" ON storage.objects;
CREATE POLICY "avatars auth update own" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND owner = auth.uid());

DROP POLICY IF EXISTS "avatars auth delete own" ON storage.objects;
CREATE POLICY "avatars auth delete own" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND owner = auth.uid());

-- 13) Storage Bucket & Policies for Post Attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-attachments', 'post-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "post_attachments public read" ON storage.objects;
CREATE POLICY "post_attachments public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-attachments');

DROP POLICY IF EXISTS "post_attachments auth upload" ON storage.objects;
CREATE POLICY "post_attachments auth upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'post-attachments' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "post_attachments auth update own" ON storage.objects;
CREATE POLICY "post_attachments auth update own" ON storage.objects
  FOR UPDATE USING (bucket_id = 'post-attachments' AND owner = auth.uid());

DROP POLICY IF EXISTS "post_attachments auth delete own" ON storage.objects;
CREATE POLICY "post_attachments auth delete own" ON storage.objects
  FOR DELETE USING (bucket_id = 'post-attachments' AND owner = auth.uid());

-- 14) Direct Messaging & Milestones (Migration 0003)
ALTER TABLE public.circles ADD COLUMN IF NOT EXISTS passcode TEXT;
ALTER TABLE public.circles ADD COLUMN IF NOT EXISTS announcement TEXT;

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

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dm_conv ON public.direct_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dm_sender ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_created ON public.direct_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_career_milestones_user ON public.career_milestones(user_id, created_at ASC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_milestones ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY conversations_select ON public.conversations
  FOR SELECT USING (public.is_conversation_participant(id));
CREATE POLICY conversations_insert ON public.conversations
  FOR INSERT WITH CHECK (true);
CREATE POLICY conversations_update ON public.conversations
  FOR UPDATE USING (public.is_conversation_participant(id));

CREATE POLICY conv_participants_select ON public.conversation_participants
  FOR SELECT USING (user_id = auth.uid() OR public.is_conversation_participant(conversation_id));
CREATE POLICY conv_participants_insert ON public.conversation_participants
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_conversation_participant(conversation_id));
CREATE POLICY conv_participants_update ON public.conversation_participants
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY conv_participants_delete ON public.conversation_participants
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY direct_messages_select ON public.direct_messages
  FOR SELECT USING (public.is_conversation_participant(conversation_id));
CREATE POLICY direct_messages_insert ON public.direct_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid() AND public.is_conversation_participant(conversation_id));
CREATE POLICY direct_messages_delete ON public.direct_messages
  FOR DELETE USING (sender_id = auth.uid());

CREATE POLICY career_milestones_select ON public.career_milestones
  FOR SELECT USING (true);
CREATE POLICY career_milestones_insert ON public.career_milestones
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY career_milestones_update ON public.career_milestones
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY career_milestones_delete ON public.career_milestones
  FOR DELETE USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15) Polls, Help Tags & Mentorship (Migration 0004)
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(post_id)
);

CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS help_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS open_to_help BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS help_topics TEXT[];

CREATE INDEX IF NOT EXISTS idx_polls_post_id ON public.polls(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON public.poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON public.poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_help_type ON public.posts(help_type);

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
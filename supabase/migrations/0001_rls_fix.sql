-- ============================================================
-- Humanverse — RLS fix + full policy suite + auth hooks
-- Run this once in the Supabase dashboard → SQL Editor.
-- Idempotent: safe to run twice.
-- ============================================================

-- 1) Helpers (SECURITY DEFINER avoids RLS recursion)

create or replace function public.is_circle_member(circle uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.circle_members cm
    where cm.circle_id = circle and cm.user_id = auth.uid()
  );
$$;

create or replace function public.can_view_post(p public.posts)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p.visibility = 'public'
    or p.author_id = auth.uid()
    or p.visibility = 'pseudonymous'
    or (p.visibility = 'circle' and p.circle_id is not null and public.is_circle_member(p.circle_id));
$$;

-- 2) Drop ALL existing policies (removes the infinite-recursion ones)

do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 3) New policy suite

-- profiles
create policy profiles_select on public.profiles
  for select using (true);                                   -- everyone (incl. anon) may view profiles
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update on public.profiles
  for update using (id = auth.uid());

-- posts
create policy posts_select on public.posts
  for select using (public.can_view_post(posts));
create policy posts_insert on public.posts
  for insert with check (author_id = auth.uid());
create policy posts_update on public.posts
  for update using (
    author_id = auth.uid()
    or pseudonym_id in (select id from public.pseudonyms where user_id = auth.uid())
  );
create policy posts_delete on public.posts
  for delete using (
    author_id = auth.uid()
    or pseudonym_id in (select id from public.pseudonyms where user_id = auth.uid())
  );

-- threads
create policy threads_select on public.threads
  for select using (true);
create policy threads_insert on public.threads
  for insert with check (true);                               -- app creates threads when hashtags are new
create policy threads_update on public.threads
  for update using (true);                                    -- post_count is maintained by the app

-- circles
create policy circles_select on public.circles
  for select using (owner_id = auth.uid() or public.is_circle_member(id));
create policy circles_insert on public.circles
  for insert with check (owner_id = auth.uid());
create policy circles_update on public.circles
  for update using (owner_id = auth.uid());
create policy circles_delete on public.circles
  for delete using (owner_id = auth.uid());

-- circle_members
create policy circle_members_select on public.circle_members
  for select using (user_id = auth.uid() or public.is_circle_member(circle_id));
create policy circle_members_insert on public.circle_members
  for insert with check (user_id = auth.uid());
create policy circle_members_delete on public.circle_members
  for delete using (
    user_id = auth.uid()
    or circle_id in (select id from public.circles where owner_id = auth.uid())
  );

-- replies
create policy replies_select on public.replies
  for select using (
    exists (select 1 from public.posts p where p.id = replies.post_id and public.can_view_post(p))
  );
create policy replies_insert on public.replies
  for insert with check (author_id = auth.uid());
create policy replies_update on public.replies
  for update using (
    author_id = auth.uid()
    or pseudonym_id in (select id from public.pseudonyms where user_id = auth.uid())
  );
create policy replies_delete on public.replies
  for delete using (
    author_id = auth.uid()
    or pseudonym_id in (select id from public.pseudonyms where user_id = auth.uid())
  );

-- reactions
create policy reactions_select on public.reactions
  for select using (
    (post_id is not null and exists (select 1 from public.posts p where p.id = reactions.post_id and public.can_view_post(p)))
    or (reply_id is not null and exists (
         select 1 from public.replies r join public.posts p on p.id = r.post_id
         where r.id = reactions.reply_id and public.can_view_post(p)))
  );
create policy reactions_insert on public.reactions
  for insert with check (user_id = auth.uid());
create policy reactions_delete on public.reactions
  for delete using (user_id = auth.uid());

-- notifications
create policy notifications_select on public.notifications
  for select using (user_id = auth.uid());
create policy notifications_update on public.notifications
  for update using (user_id = auth.uid());
create policy notifications_delete on public.notifications
  for delete using (user_id = auth.uid());

-- pseudonyms
create policy pseudonyms_select on public.pseudonyms
  for select using (true);                                   -- viewers need names on pseudonymous posts
create policy pseudonyms_insert on public.pseudonyms
  for insert with check (user_id = auth.uid());
create policy pseudonyms_update on public.pseudonyms
  for update using (user_id = auth.uid());
create policy pseudonyms_delete on public.pseudonyms
  for delete using (user_id = auth.uid());

-- drafts
create policy drafts_select on public.drafts
  for select using (user_id = auth.uid());
create policy drafts_insert on public.drafts
  for insert with check (user_id = auth.uid());
create policy drafts_update on public.drafts
  for update using (user_id = auth.uid());
create policy drafts_delete on public.drafts
  for delete using (user_id = auth.uid());

-- reports
create policy reports_select on public.reports
  for select using (reporter_id = auth.uid());
create policy reports_insert on public.reports
  for insert with check (reporter_id = auth.uid());

-- moderation_actions: no authenticated access

-- 4) Auto-create a profile for every new auth user

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'New member'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Storage: avatars bucket (public read, user-scoped uploads)

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars auth upload" on storage.objects;
create policy "avatars auth upload" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid() is not null);

drop policy if exists "avatars auth update own" on storage.objects;
create policy "avatars auth update own" on storage.objects
  for update using (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "avatars auth delete own" on storage.objects;
create policy "avatars auth delete own" on storage.objects
  for delete using (bucket_id = 'avatars' and owner = auth.uid());

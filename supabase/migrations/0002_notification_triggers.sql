-- ============================================================
-- Humanverse — notification triggers (replies + reactions)
-- Run once in the Supabase dashboard → SQL Editor.
-- Idempotent: safe to run twice.
-- ============================================================

-- 1) Notify the post author when someone replies (not their own reply).
--    Pseudonymous posts are skipped so the author's identity stays unlinked.

create or replace function public.notify_on_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_pseudonym_id uuid;
  v_visibility text;
  v_author_name text;
begin
  select p.author_id, p.pseudonym_id, p.visibility
    into v_author_id, v_pseudonym_id, v_visibility
    from public.posts p
   where p.id = new.post_id;

  if v_author_id is null or v_author_id = new.author_id then
    return new;
  end if;

  -- Don't notify when the reply is pseudonymous (identity unrevealed)
  if new.pseudonym_id is not null then
    return new;
  end if;

  select display_name into v_author_name
    from public.profiles
   where id = new.author_id;

  insert into public.notifications (user_id, type, title, message, reference_id, reference_type)
  values (
    v_author_id,
    'reply',
    coalesce(v_author_name, 'Someone') || ' replied to your post',
    left(new.content, 140),
    new.post_id,
    'post'
  );
  return new;
end;
$$;

drop trigger if exists trigger_notify_on_reply on public.replies;
create trigger trigger_notify_on_reply
after insert on public.replies
for each row execute function public.notify_on_reply();

-- 2) Notify the post author when someone reacts to their post (not their own reaction).

create or replace function public.notify_on_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_reactor_name text;
begin
  if new.post_id is not null then
    select p.author_id into v_author_id
      from public.posts p
     where p.id = new.post_id;
  else
    select r.author_id into v_author_id
      from public.replies r
     where r.id = new.reply_id;
  end if;

  if v_author_id is null or v_author_id = new.user_id then
    return new;
  end if;

  select display_name into v_reactor_name
    from public.profiles
   where id = new.user_id;

  insert into public.notifications (user_id, type, title, message, reference_id, reference_type)
  values (
    v_author_id,
    'reply',
    coalesce(v_reactor_name, 'Someone') || ' reacted to your ' || case when new.post_id is not null then 'post' else 'reply' end,
    replace(new.type, '_', ' '),
    coalesce(new.post_id, new.reply_id),
    case when new.post_id is not null then 'post' else 'reply' end
  );
  return new;
end;
$$;

drop trigger if exists trigger_notify_on_reaction on public.reactions;
create trigger trigger_notify_on_reaction
after insert on public.reactions
for each row execute function public.notify_on_reaction();
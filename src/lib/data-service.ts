import { SupabaseClient } from '@supabase/supabase-js'
import {
  Post,
  ReactionType,
  ProfileMinimal,
  Pseudonym,
  ThreadMinimal,
  CircleMinimal,
  Poll,
  PollOption,
  HelpType,
} from '@/types'

export interface FetchPostsOptions {
  currentUserId?: string | null
  threadSlug?: string | null
  circleId?: string | null
  authorId?: string | null
  helpType?: HelpType | null
  limit?: number
}

interface RawPost {
  id: string
  author_id: string
  pseudonym_id: string | null
  thread_id: string | null
  circle_id: string | null
  content: string
  visibility: 'public' | 'circle' | 'pseudonymous'
  help_type?: HelpType | null
  created_at: string
  updated_at: string
}

interface RawPoll {
  id: string
  post_id: string
  question: string
  created_at: string
  expires_at?: string | null
}

interface RawPollOption {
  id: string
  poll_id: string
  text: string
  vote_count: number
  created_at: string
}

interface RawPollVote {
  id: string
  poll_id: string
  option_id: string
  user_id: string
}

export async function fetchFeedPosts(
  supabase: SupabaseClient,
  options: FetchPostsOptions = {}
): Promise<Post[]> {
  const { currentUserId, threadSlug, circleId, authorId, helpType, limit = 100 } = options

  // 1. Build posts query
  let postsQuery = supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (authorId) {
    postsQuery = postsQuery.eq('author_id', authorId)
  }

  if (circleId) {
    postsQuery = postsQuery.eq('circle_id', circleId)
  }

  if (helpType) {
    postsQuery = postsQuery.eq('help_type', helpType)
  }

  const { data: rawPosts, error: postsError } = await postsQuery
  if (postsError || !rawPosts) {
    console.error('Error fetching posts:', postsError)
    return []
  }

  if (rawPosts.length === 0) {
    return []
  }

  // 2. Extract IDs for related entities
  const authorIds = Array.from(new Set(rawPosts.map((p: RawPost) => p.author_id).filter(Boolean)))
  const pseudonymIds = Array.from(new Set(rawPosts.map((p: RawPost) => p.pseudonym_id).filter(Boolean)))
  const threadIds = Array.from(new Set(rawPosts.map((p: RawPost) => p.thread_id).filter(Boolean)))
  const circleIds = Array.from(new Set(rawPosts.map((p: RawPost) => p.circle_id).filter(Boolean)))
  const postIds = rawPosts.map((p: RawPost) => p.id)

  // 3. Fetch related records in parallel
  const [
    profilesRes,
    pseudonymsRes,
    threadsRes,
    circlesRes,
    reactionsRes,
    repliesRes,
    pollsRes,
  ] = await Promise.all([
    authorIds.length > 0
      ? supabase.from('profiles').select('id, display_name, professional_context, avatar_url, open_to_help, help_topics').in('id', authorIds)
      : Promise.resolve({ data: [] }),
    pseudonymIds.length > 0
      ? supabase.from('pseudonyms').select('id, display_name, avatar_url, user_id').in('id', pseudonymIds)
      : Promise.resolve({ data: [] }),
    threadIds.length > 0
      ? supabase.from('threads').select('id, slug, name').in('id', threadIds)
      : Promise.resolve({ data: [] }),
    circleIds.length > 0
      ? supabase.from('circles').select('id, name').in('id', circleIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabase.from('reactions').select('post_id, type, user_id').in('post_id', postIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabase.from('replies').select('id, post_id').in('post_id', postIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabase.from('polls').select('*').in('post_id', postIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileMap = new Map<string, ProfileMinimal>(
    ((profilesRes.data || []) as ProfileMinimal[]).map(p => [p.id, p])
  )
  const pseudoMap = new Map<string, Pseudonym>(
    ((pseudonymsRes.data || []) as Pseudonym[]).map(p => [p.id, p])
  )
  const threadMap = new Map<string, ThreadMinimal>(
    ((threadsRes.data || []) as ThreadMinimal[]).map(t => [t.id, t])
  )
  const circleMap = new Map<string, CircleMinimal>(
    ((circlesRes.data || []) as CircleMinimal[]).map(c => [c.id, c])
  )

  // Fetch poll options and votes if any polls exist
  const rawPolls: RawPoll[] = pollsRes.data || []
  const pollIds = rawPolls.map(p => p.id)

  const pollOptionsMap = new Map<string, PollOption[]>()
  const userVotesMap = new Map<string, string>() // poll_id -> option_id

  if (pollIds.length > 0) {
    const [optionsRes, votesRes] = await Promise.all([
      supabase.from('poll_options').select('*').in('poll_id', pollIds),
      currentUserId
        ? supabase.from('poll_votes').select('*').in('poll_id', pollIds).eq('user_id', currentUserId)
        : Promise.resolve({ data: [] }),
    ])

    const allOptions: RawPollOption[] = optionsRes.data || []
    for (const opt of allOptions) {
      const list = pollOptionsMap.get(opt.poll_id) || []
      list.push({
        id: opt.id,
        poll_id: opt.poll_id,
        text: opt.text,
        vote_count: opt.vote_count || 0,
      })
      pollOptionsMap.set(opt.poll_id, list)
    }

    const allVotes: RawPollVote[] = votesRes.data || []
    for (const v of allVotes) {
      userVotesMap.set(v.poll_id, v.option_id)
    }
  }

  // 4. Combine and structure
  let assembled: Post[] = rawPosts.map((post: RawPost) => {
    const postReactions = (reactionsRes.data || []).filter((r: { post_id: string }) => r.post_id === post.id)
    const postReplies = (repliesRes.data || []).filter((r: { post_id: string }) => r.post_id === post.id)

    const reactionCounts = {
      been_there: postReactions.filter((r: { type: string }) => r.type === 'been_there').length,
      oof: postReactions.filter((r: { type: string }) => r.type === 'oof').length,
      respect: postReactions.filter((r: { type: string }) => r.type === 'respect').length,
      needed_this: postReactions.filter((r: { type: string }) => r.type === 'needed_this').length,
    }

    let userReaction: ReactionType | null = null
    if (currentUserId) {
      const userReactionObj = postReactions.find((r: { user_id: string }) => r.user_id === currentUserId)
      if (userReactionObj) {
        userReaction = userReactionObj.type as ReactionType
      }
    }

    const resolvedAuthor: ProfileMinimal = profileMap.get(post.author_id) || {
      id: post.author_id,
      display_name: 'Human Member',
      professional_context: null,
      avatar_url: null,
      open_to_help: false,
    }

    const rawPoll = rawPolls.find(p => p.post_id === post.id)
    let pollObj: Poll | null = null
    if (rawPoll) {
      const options = pollOptionsMap.get(rawPoll.id) || []
      const totalVotes = options.reduce((sum, opt) => sum + (opt.vote_count || 0), 0)
      pollObj = {
        id: rawPoll.id,
        post_id: post.id,
        question: rawPoll.question,
        options,
        total_votes: totalVotes,
        user_voted_option_id: userVotesMap.get(rawPoll.id) || null,
        expires_at: rawPoll.expires_at || null,
        created_at: rawPoll.created_at,
      }
    }

    return {
      id: post.id,
      author_id: post.author_id,
      pseudonym_id: post.pseudonym_id,
      thread_id: post.thread_id,
      circle_id: post.circle_id,
      content: post.content,
      visibility: post.visibility,
      help_type: post.help_type || null,
      poll: pollObj,
      created_at: post.created_at,
      updated_at: post.updated_at,
      author: resolvedAuthor,
      pseudonym: post.pseudonym_id ? pseudoMap.get(post.pseudonym_id) || null : null,
      thread: post.thread_id ? threadMap.get(post.thread_id) || null : null,
      circle: post.circle_id ? circleMap.get(post.circle_id) || null : null,
      reaction_counts: reactionCounts,
      user_reaction: userReaction,
      reply_count: postReplies.length,
    }
  })

  // Filter by thread slug if requested
  if (threadSlug) {
    const cleanSlug = threadSlug.toLowerCase()
    assembled = assembled.filter(
      p => p.thread?.slug?.toLowerCase() === cleanSlug || p.content.toLowerCase().includes(`#${cleanSlug}`)
    )
  }

  return assembled
}

export async function fetchPostDetail(
  supabase: SupabaseClient,
  postId: string,
  currentUserId?: string | null
) {
  // 1. Fetch main post
  const { data: rawPost, error: postErr } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single()

  if (postErr || !rawPost) {
    return { post: null, replies: [] }
  }

  // 2. Fetch replies for this post
  const { data: rawReplies } = await supabase
    .from('replies')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  const replyAuthorIds = Array.from(
    new Set((rawReplies || []).map((r: { author_id: string }) => r.author_id).concat(rawPost.author_id))
  )
  const replyPseudoIds = Array.from(
    new Set((rawReplies || []).map((r: { pseudonym_id: string | null }) => r.pseudonym_id).filter(Boolean))
  )

  const replyIds = (rawReplies || []).map((r: { id: string }) => r.id)

  const [
    profilesRes,
    pseudonymsRes,
    threadRes,
    circleRes,
    postReactionsRes,
    replyReactionsRes,
    pollRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id, display_name, professional_context, avatar_url, open_to_help, help_topics').in('id', replyAuthorIds),
    replyPseudoIds.length > 0 || rawPost.pseudonym_id
      ? supabase.from('pseudonyms').select('id, display_name, avatar_url, user_id').in('id', [...replyPseudoIds, rawPost.pseudonym_id].filter(Boolean))
      : Promise.resolve({ data: [] }),
    rawPost.thread_id
      ? supabase.from('threads').select('id, slug, name').eq('id', rawPost.thread_id).single()
      : Promise.resolve({ data: null }),
    rawPost.circle_id
      ? supabase.from('circles').select('id, name').eq('id', rawPost.circle_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('reactions').select('type, user_id').eq('post_id', postId),
    replyIds.length > 0
      ? supabase.from('reactions').select('reply_id, type, user_id').in('reply_id', replyIds)
      : Promise.resolve({ data: [] }),
    supabase.from('polls').select('*').eq('post_id', postId).single(),
  ])

  const profileMap = new Map<string, ProfileMinimal>(
    ((profilesRes.data || []) as ProfileMinimal[]).map(p => [p.id, p])
  )
  const pseudoMap = new Map<string, Pseudonym>(
    ((pseudonymsRes.data || []) as Pseudonym[]).map(p => [p.id, p])
  )

  const postReactions = postReactionsRes.data || []
  const reactionCounts = {
    been_there: postReactions.filter((r: { type: string }) => r.type === 'been_there').length,
    oof: postReactions.filter((r: { type: string }) => r.type === 'oof').length,
    respect: postReactions.filter((r: { type: string }) => r.type === 'respect').length,
    needed_this: postReactions.filter((r: { type: string }) => r.type === 'needed_this').length,
  }

  let userReaction: ReactionType | null = null
  if (currentUserId) {
    const userReactionObj = postReactions.find((r: { user_id: string }) => r.user_id === currentUserId)
    if (userReactionObj) userReaction = userReactionObj.type as ReactionType
  }

  const resolvedAuthor: ProfileMinimal = profileMap.get(rawPost.author_id) || {
    id: rawPost.author_id,
    display_name: 'Human Member',
    professional_context: null,
    avatar_url: null,
    open_to_help: false,
  }

  // Fetch poll options if poll exists
  let pollObj: Poll | null = null
  if (pollRes.data) {
    const rawPoll: RawPoll = pollRes.data
    const [optRes, voteRes] = await Promise.all([
      supabase.from('poll_options').select('*').eq('poll_id', rawPoll.id),
      currentUserId
        ? supabase.from('poll_votes').select('*').eq('poll_id', rawPoll.id).eq('user_id', currentUserId).single()
        : Promise.resolve({ data: null }),
    ])

    const options: PollOption[] = (optRes.data || []).map((o: RawPollOption) => ({
      id: o.id,
      poll_id: o.poll_id,
      text: o.text,
      vote_count: o.vote_count || 0,
    }))
    const totalVotes = options.reduce((sum, opt) => sum + (opt.vote_count || 0), 0)

    pollObj = {
      id: rawPoll.id,
      post_id: rawPost.id,
      question: rawPoll.question,
      options,
      total_votes: totalVotes,
      user_voted_option_id: voteRes.data?.option_id || null,
      expires_at: rawPoll.expires_at || null,
      created_at: rawPoll.created_at,
    }
  }

  const post: Post = {
    id: rawPost.id,
    author_id: rawPost.author_id,
    pseudonym_id: rawPost.pseudonym_id,
    thread_id: rawPost.thread_id,
    circle_id: rawPost.circle_id,
    content: rawPost.content,
    visibility: rawPost.visibility,
    help_type: rawPost.help_type || null,
    poll: pollObj,
    created_at: rawPost.created_at,
    updated_at: rawPost.updated_at,
    author: resolvedAuthor,
    pseudonym: rawPost.pseudonym_id ? pseudoMap.get(rawPost.pseudonym_id) || null : null,
    thread: threadRes.data || null,
    circle: circleRes.data || null,
    reaction_counts: reactionCounts,
    user_reaction: userReaction,
    reply_count: (rawReplies || []).length,
  }

  interface RawReply {
    id: string
    post_id: string
    author_id: string
    pseudonym_id: string | null
    parent_reply_id: string | null
    content: string
    created_at: string
    updated_at: string
  }

  const replies = (rawReplies || []).map((reply: RawReply) => {
    const reactions = (replyReactionsRes.data || []).filter((r: { reply_id: string }) => r.reply_id === reply.id)
    const replyAuthor: ProfileMinimal = profileMap.get(reply.author_id) || {
      id: reply.author_id,
      display_name: 'Human Member',
      professional_context: null,
      avatar_url: null,
    }

    return {
      ...reply,
      author: replyAuthor,
      pseudonym: reply.pseudonym_id ? pseudoMap.get(reply.pseudonym_id) || null : null,
      reactions,
    }
  })

  return { post, replies }
}

export async function votePoll(
  supabase: SupabaseClient,
  pollId: string,
  optionId: string,
  userId: string
) {
  // Check if user already voted on this poll
  const { data: existingVote } = await supabase
    .from('poll_votes')
    .select('id, option_id')
    .eq('poll_id', pollId)
    .eq('user_id', userId)
    .single()

  if (existingVote) {
    if (existingVote.option_id === optionId) {
      return { success: true, message: 'Already voted for this option' }
    }
    // Delete old vote or update
    await supabase.from('poll_votes').delete().eq('id', existingVote.id)
    const { data: oldOpt } = await supabase.from('poll_options').select('vote_count').eq('id', existingVote.option_id).single()
    if (oldOpt) {
      await supabase.from('poll_options').update({ vote_count: Math.max(0, (oldOpt.vote_count || 1) - 1) }).eq('id', existingVote.option_id)
    }
  }

  // Insert new vote
  await supabase.from('poll_votes').insert({
    poll_id: pollId,
    option_id: optionId,
    user_id: userId,
  })

  // Increment option vote_count
  const { data: newOpt } = await supabase.from('poll_options').select('vote_count').eq('id', optionId).single()
  await supabase.from('poll_options').update({ vote_count: (newOpt?.vote_count || 0) + 1 }).eq('id', optionId)

  return { success: true }
}


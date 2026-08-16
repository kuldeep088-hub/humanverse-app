import { SupabaseClient } from '@supabase/supabase-js'
import { Post, ReactionType, ProfileMinimal, Pseudonym, ThreadMinimal, CircleMinimal } from '@/types'

export interface FetchPostsOptions {
  currentUserId?: string | null
  threadSlug?: string | null
  circleId?: string | null
  authorId?: string | null
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
  created_at: string
  updated_at: string
}

export async function fetchFeedPosts(
  supabase: SupabaseClient,
  options: FetchPostsOptions = {}
): Promise<Post[]> {
  const { currentUserId, threadSlug, circleId, authorId, limit = 100 } = options

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

  // 3. Fetch related records in parallel without brittle join hints
  const [profilesRes, pseudonymsRes, threadsRes, circlesRes, reactionsRes, repliesRes] =
    await Promise.all([
      authorIds.length > 0
        ? supabase.from('profiles').select('id, display_name, professional_context, avatar_url').in('id', authorIds)
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
    }

    return {
      id: post.id,
      author_id: post.author_id,
      pseudonym_id: post.pseudonym_id,
      thread_id: post.thread_id,
      circle_id: post.circle_id,
      content: post.content,
      visibility: post.visibility,
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

  const [profilesRes, pseudonymsRes, threadRes, circleRes, postReactionsRes, replyReactionsRes] =
    await Promise.all([
      supabase.from('profiles').select('id, display_name, professional_context, avatar_url').in('id', replyAuthorIds),
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
  }

  const post: Post = {
    id: rawPost.id,
    author_id: rawPost.author_id,
    pseudonym_id: rawPost.pseudonym_id,
    thread_id: rawPost.thread_id,
    circle_id: rawPost.circle_id,
    content: rawPost.content,
    visibility: rawPost.visibility,
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

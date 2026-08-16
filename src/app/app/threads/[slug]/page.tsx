'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { PostComponent } from '@/components/app/post'
import { Composer } from '@/components/app/composer'
import { Post, ReactionType } from '@/types'
import Link from 'next/link'
import { ChevronLeft, Loader2, Hash, Sparkles } from 'lucide-react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Reaction {
  type: string
  user_id: string
}

interface Circle {
  id: string
  name: string
}

interface PostWithRelations {
  id: string
  author_id: string
  pseudonym_id: string | null
  thread_id: string | null
  circle_id: string | null
  content: string
  visibility: 'public' | 'circle' | 'pseudonymous'
  created_at: string
  updated_at: string
  author: { id: string; display_name: string; professional_context: string | null; avatar_url: string | null } | null
  pseudonym: { id: string; display_name: string; avatar_url: string | null; user_id: string } | null
  thread: { id: string; slug: string; name: string } | null
  circle: { id: string; name: string } | null
  reactions: Reaction[]
  replies: { count: number }[]
}

interface Thread {
  id: string
  slug: string
  name: string
  description: string | null
  post_count: number
}

export default function ThreadDetailPage() {
  const params = useParams<{ slug: string }>()
  const rawSlug = params.slug
  const slug = rawSlug?.toLowerCase() || ''

  const [thread, setThread] = useState<Thread | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [pseudonym, setPseudonym] = useState<{ id: string; display_name: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)

  const { userId: currentUserId, isLoading: isUserLoading } = useCurrentUser()

  const fetchThreadData = useCallback(async () => {
    if (!currentUserId || !slug) return
    const supabase = createClient()

    // 1. Get or find thread
    let { data: threadData } = await supabase
      .from('threads')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!threadData) {
      // Auto-provision thread if it's a valid slug
      const { data: newThread } = await supabase
        .from('threads')
        .insert({ slug, name: `#${slug}` })
        .select()
        .single()

      threadData = newThread
    }

    if (!threadData) {
      setIsNotFound(true)
      setIsLoading(false)
      return
    }

    setThread(threadData as Thread)

    // 2. Fetch user circles and pseudonym for composer
    const [circlesRes, pseudoRes, postsRes] = await Promise.all([
      supabase.from('circle_members').select('circle:circles(id, name)').eq('user_id', currentUserId),
      supabase.from('pseudonyms').select('id, display_name').eq('user_id', currentUserId).single(),
      supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_author_id_fkey(id, display_name, professional_context, avatar_url),
          pseudonym:pseudonyms!posts_pseudonym_id_fkey(id, display_name, avatar_url, user_id),
          thread:threads!posts_thread_id_fkey(id, slug, name),
          circle:circles!posts_circle_id_fkey(id, name),
          reactions(type, user_id),
          replies(count)
        `)
        .eq('thread_id', threadData.id)
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    interface CircleMembershipRow {
      circle: Circle | null
    }

    const foundCircles: Circle[] = ((circlesRes.data as unknown as CircleMembershipRow[]) || [])
      .map(c => c.circle)
      .filter((c): c is Circle => c !== null && typeof c === 'object' && 'id' in c && 'name' in c)
    setCircles(foundCircles)

    setPseudonym(pseudoRes.data as { id: string; display_name: string } | null)

    const processedPosts: Post[] = ((postsRes.data as PostWithRelations[]) || []).map(post => {
      const reactionCounts = {
        been_there: 0,
        oof: 0,
        respect: 0,
        needed_this: 0,
      }
      let userReaction: ReactionType | null = null

      post.reactions?.forEach((r: Reaction) => {
        reactionCounts[r.type as keyof typeof reactionCounts]++
      })

      const userReactionData = post.reactions?.find((r: Reaction) => r.user_id === currentUserId)
      if (userReactionData) {
        userReaction = userReactionData.type as ReactionType
      }

      return {
        ...post,
        reaction_counts: reactionCounts,
        user_reaction: userReaction,
        reply_count: post.replies?.[0]?.count || 0,
      }
    })

    setPosts(processedPosts)
    setIsLoading(false)
  }, [slug, currentUserId])

  useEffect(() => {
    const run = async () => {
      await fetchThreadData()
    }
    run()
  }, [fetchThreadData])

  if (isLoading || isUserLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isNotFound || !thread) {
    return (
      <div className="text-center py-20 text-gray-500 dark:text-gray-400">
        <p className="text-xl font-medium text-gray-900 dark:text-white">Thread not found</p>
        <p className="mt-2 text-sm">We couldn&apos;t load the thread #{slug}.</p>
        <Button asChild className="mt-4">
          <Link href="/app/threads">Browse All Threads</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Thread Header Banner */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/app/threads"
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            All Threads
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-950 dark:text-white flex items-center gap-2">
              <Hash className="h-6 w-6 text-primary" />
              {thread.slug}
            </h1>
            {thread.description && (
              <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {thread.description}
              </p>
            )}
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 text-right shrink-0">
            <span className="block text-lg font-bold text-gray-950 dark:text-white">
              {posts.length}
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              {posts.length === 1 ? 'post' : 'posts'}
            </span>
          </div>
        </div>
      </div>

      {/* Inline Post Composer Pre-Tagged with #{slug} */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
          Post in #{thread.slug}
        </p>
        <Composer
          initialContent={`#${thread.slug} `}
          circles={circles}
          pseudonym={pseudonym}
          onPostCreated={fetchThreadData}
        />
      </div>

      {/* Posts Section */}
      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <Sparkles className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-base font-medium text-gray-900 dark:text-white">No posts in #{thread.slug} yet</p>
          <p className="text-xs text-gray-500 mt-1">Be the first to share your experience or reflection.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Community Contributions ({posts.length})
            </span>
          </div>
          {posts.map(post => (
            <PostComponent
              key={post.id}
              post={post}
              onUpdate={fetchThreadData}
              showThreadLink={false}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
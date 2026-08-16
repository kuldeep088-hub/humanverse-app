'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { PostComponent } from '@/components/app/post'
import { Post, ReactionType } from '@/types'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'

interface Reaction {
  type: string
  user_id: string
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

export default function ThreadPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const [thread, setThread] = useState<Thread | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)

  const { userId: currentUserId, isLoading: isUserLoading } = useCurrentUser()

  const fetchThread = useCallback(async () => {
    if (!currentUserId) return
    const supabase = createClient()

    const { data: threadData } = await supabase
      .from('threads')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!threadData) {
      setIsNotFound(true)
      setIsLoading(false)
      return
    }
    setThread(threadData as Thread)

    const { data: postsData } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(id, display_name, professional_context, avatar_url),
        pseudonym:pseudonyms!posts_pseudonym_id_fkey(id, display_name, avatar_url, user_id),
        thread:threads!posts_thread_id_fkey(id, slug, name),
        circle:circles!posts_circle_id_fkey(id, name),
        reactions(type),
        replies(count)
      `)
      .eq('thread_id', threadData.id)
      .order('created_at', { ascending: true })
      .limit(100)

    const processedPosts: Post[] = (postsData as PostWithRelations[] || []).map(post => {
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
      await fetchThread()
    }
    run()
  }, [fetchThread])

  if (isLoading || isUserLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isNotFound || !thread) {
    return (
      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
        <p className="text-lg">Thread not found.</p>
        <Link href="/app/threads" className="mt-2 inline-block text-sm text-primary hover:underline">
          Browse threads
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/app/threads"
          className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-medium text-primary">#{thread.slug}</h1>
          {thread.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{thread.description}</p>
          )}
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            {thread.post_count} post{thread.post_count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-lg">No posts in this thread yet.</p>
          <p className="mt-1 text-sm">Be the first to write what happened.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostComponent key={post.id} post={post} onUpdate={fetchThread} showThreadLink={false} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { Composer } from '@/components/app/composer'
import { PostComponent } from '@/components/app/post'
import { Post, ReactionType } from '@/types'
import { Loader2 } from 'lucide-react'

interface Circle {
  id: string
  name: string
}

interface CircleWithCircle {
  circle: Circle | null
}

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

export default function FeedPage() {
  const { userId: currentUserId, isLoading: isUserLoading } = useCurrentUser()
  const [posts, setPosts] = useState<Post[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [pseudonym, setPseudonym] = useState<{ id: string; display_name: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchFeed = useCallback(async () => {
    if (!currentUserId) return
    const supabase = createClient()

    // Get user's circles for composer
    const { data: circlesData } = await supabase
      .from('circle_members')
      .select('circle:circles(id, name)')
      .eq('user_id', currentUserId)

    const foundCircles: Circle[] = (circlesData as CircleWithCircle[] || [])
      .map(c => c.circle as unknown as Circle)
      .filter((c): c is Circle => c !== null && typeof c === 'object' && 'id' in c && 'name' in c)
    setCircles(foundCircles)

    // Get user's pseudonym
    const { data: pseudonymData } = await supabase
      .from('pseudonyms')
      .select('id, display_name')
      .eq('user_id', currentUserId)
      .single()
    setPseudonym(pseudonymData as { id: string; display_name: string } | null)

    // Get feed posts: public posts + circle posts user is member of + pseudonymous posts
    const circleIds = foundCircles.map(c => c.id)
    const { data: postsData } = await supabase
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
      .or(`visibility.eq.public,and(visibility.eq.circle,circle_id.in.(${circleIds.join(',') || '00000000-0000-0000-0000-000000000000'})),visibility.eq.pseudonymous`)
      .order('created_at', { ascending: false })
      .limit(50)

    // Process reaction counts and user reactions
    const processedPosts: Post[] = (postsData as PostWithRelations[] || []).map(post => {
      const reactionCounts = {
        been_there: 0,
        oof: 0,
        respect: 0,
        needed_this: 0,
      }
      let userReaction: ReactionType | null = null

      post.reactions?.forEach((r) => {
        reactionCounts[r.type as keyof typeof reactionCounts]++
      })

      const userReactionData = post.reactions?.find((r) => r.user_id === currentUserId)
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
  }, [currentUserId])

  useEffect(() => {
    const run = async () => {
      await fetchFeed()
    }
    run()
  }, [fetchFeed])

  if (isLoading || isUserLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Composer
        circles={circles}
        pseudonym={pseudonym}
        onPostCreated={fetchFeed}
      />

      {posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-lg">Nothing here yet.</p>
          <p className="mt-1 text-sm">Posts from people you follow and circles you&apos;re in will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostComponent key={post.id} post={post} onUpdate={fetchFeed} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  )
}
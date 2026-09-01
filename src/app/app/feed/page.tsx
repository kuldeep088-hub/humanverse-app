'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { Composer } from '@/components/app/composer'
import { PostComponent } from '@/components/app/post'
import { fetchFeedPosts } from '@/lib/data-service'
import { Post } from '@/types'
import {
  Loader2,
  Sparkles,
  RefreshCw,
} from 'lucide-react'

interface Circle {
  id: string
  name: string
}

interface CircleWithCircle {
  circle: Circle | null
}

interface UserProfile {
  display_name: string
  avatar_url: string | null
  professional_context: string | null
}

export default function FeedPage() {
  const { userId: currentUserId, isLoading: isUserLoading } = useCurrentUser()
  const [posts, setPosts] = useState<Post[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [pseudonym, setPseudonym] = useState<{ id: string; display_name: string } | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasNewPosts, setHasNewPosts] = useState(false)

  const fetchFeed = useCallback(async (isBackground = false) => {
    if (!currentUserId) return
    const supabase = createClient()

    if (!isBackground) {
      // 1. Fetch current user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, professional_context')
        .eq('id', currentUserId)
        .single()

      if (profileData) {
        setCurrentUserProfile(profileData)
      }

      // 2. Get user's circles for composer & feed
      const { data: circlesData } = await supabase
        .from('circle_members')
        .select('circle:circles(id, name)')
        .eq('user_id', currentUserId)

      const foundCircles: Circle[] = (circlesData as CircleWithCircle[] || [])
        .map(c => c.circle as unknown as Circle)
        .filter((c): c is Circle => c !== null && typeof c === 'object' && 'id' in c && 'name' in c)
      setCircles(foundCircles)

      // 3. Get user's pseudonym
      const { data: pseudonymData } = await supabase
        .from('pseudonyms')
        .select('id, display_name')
        .eq('user_id', currentUserId)
        .single()
      setPseudonym(pseudonymData as { id: string; display_name: string } | null)
    }

    // 4. Robust feed fetch
    const fetchedPosts = await fetchFeedPosts(supabase, {
      currentUserId,
      limit: 100,
    })

    if (isBackground && posts.length > 0 && fetchedPosts.length > posts.length) {
      setHasNewPosts(true)
    } else {
      setPosts(fetchedPosts)
      setHasNewPosts(false)
    }

    setIsLoading(false)
  }, [currentUserId, posts.length])

  useEffect(() => {
    const run = async () => {
      await fetchFeed()
    }
    run()
  }, [fetchFeed])

  // Realtime subscription for incoming posts
  useEffect(() => {
    if (!currentUserId) return
    const supabase = createClient()
    const channel = supabase
      .channel('feed-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        setHasNewPosts(true)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId])

  if (isLoading || isUserLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Upgraded Composer */}
      <Composer
        circles={circles}
        pseudonym={pseudonym}
        currentUserProfile={currentUserProfile}
        onPostCreated={() => fetchFeed()}
      />

      {/* Real-time New Posts Banner */}
      {hasNewPosts && (
        <button
          onClick={() => fetchFeed()}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity animate-in fade-in slide-in-from-top-2"
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          New thoughts have been shared. Click to refresh.
        </button>
      )}

      {/* Posts Stream */}
      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <Sparkles className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            No posts in the feed yet
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Write what actually happened today to inspire and connect with other members.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostComponent
              key={post.id}
              post={post}
              onUpdate={() => fetchFeed()}
              currentUserId={currentUserId}
              currentUserProfile={currentUserProfile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

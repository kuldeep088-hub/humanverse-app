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
  Flame,
  Users,
  Compass,
  ShieldCheck,
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
  const [activeTab, setActiveTab] = useState<'all' | 'trending' | 'circles' | 'reflections'>('all')
  const [isLoading, setIsLoading] = useState(true)

  const fetchFeed = useCallback(async () => {
    if (!currentUserId) return
    const supabase = createClient()

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

    // 4. Robust feed fetch without fragile PostgREST foreign key hint errors
    const fetchedPosts = await fetchFeedPosts(supabase, {
      currentUserId,
      limit: 100,
    })

    setPosts(fetchedPosts)
    setIsLoading(false)
  }, [currentUserId])

  useEffect(() => {
    const run = async () => {
      await fetchFeed()
    }
    run()
  }, [fetchFeed])

  // Filter posts by active tab
  const filteredPosts = posts.filter(post => {
    if (activeTab === 'all') return true
    if (activeTab === 'circles') return post.visibility === 'circle'
    if (activeTab === 'reflections') {
      const content = post.content.toLowerCase()
      const threadSlug = post.thread?.slug?.toLowerCase() || ''
      return (
        threadSlug.includes('pivot') ||
        threadSlug.includes('win') ||
        threadSlug.includes('wrong') ||
        threadSlug.includes('laidoff') ||
        threadSlug.includes('shipped') ||
        content.includes('learned') ||
        content.includes('lesson') ||
        content.includes('pivot')
      )
    }
    return true
  })

  // Sort by trending if activeTab is trending
  const sortedPosts = activeTab === 'trending'
    ? [...filteredPosts].sort((a, b) => {
        const countA = (a.reaction_counts?.been_there || 0) + (a.reaction_counts?.respect || 0) + (a.reaction_counts?.needed_this || 0) + (a.reply_count || 0)
        const countB = (b.reaction_counts?.been_there || 0) + (b.reaction_counts?.respect || 0) + (b.reaction_counts?.needed_this || 0) + (b.reply_count || 0)
        return countB - countA
      })
    : filteredPosts

  if (isLoading || isUserLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Welcome / Feed Header */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-white flex items-center gap-2">
            Feed
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real stories, career pivots, and unvarnished workplace realities.
          </p>
        </div>

        {currentUserProfile?.display_name && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60">
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              {currentUserProfile.display_name}
            </span>
            <span title="Verified Human">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </span>
          </div>
        )}
      </div>

      {/* Upgraded Composer */}
      <Composer
        circles={circles}
        pseudonym={pseudonym}
        currentUserProfile={currentUserProfile}
        onPostCreated={fetchFeed}
      />

      {/* Feed Filter Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'all'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800'
          }`}
        >
          <Compass className="h-3.5 w-3.5" />
          All Stories ({posts.length})
        </button>

        <button
          onClick={() => setActiveTab('trending')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'trending'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800'
          }`}
        >
          <Flame className="h-3.5 w-3.5 text-amber-500" />
          Trending
        </button>

        <button
          onClick={() => setActiveTab('circles')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'circles'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800'
          }`}
        >
          <Users className="h-3.5 w-3.5 text-purple-500" />
          My Circles ({posts.filter(p => p.visibility === 'circle').length})
        </button>

        <button
          onClick={() => setActiveTab('reflections')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'reflections'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          Reflections & Wins
        </button>
      </div>

      {/* Posts Stream */}
      {sortedPosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <Sparkles className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            {activeTab === 'circles'
              ? 'No posts in your private circles yet'
              : activeTab === 'reflections'
              ? 'No reflections shared under this filter yet'
              : 'No posts in the feed yet'}
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {activeTab === 'circles'
              ? 'Share a thought with your circle using the composer above with the "Private Circle" option.'
              : 'Write what actually happened today to inspire and connect with other members.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedPosts.map(post => (
            <PostComponent
              key={post.id}
              post={post}
              onUpdate={fetchFeed}
              currentUserId={currentUserId}
              currentUserProfile={currentUserProfile}
            />
          ))}
        </div>
      )}
    </div>
  )
}
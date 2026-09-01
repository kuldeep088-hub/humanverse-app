'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { Composer } from '@/components/app/composer'
import { PostComponent } from '@/components/app/post'
import { fetchFeedPosts } from '@/lib/data-service'
import { isPostSaved, getSavedPostIds } from '@/lib/bookmarks'
import { Post, HelpType } from '@/types'
import {
  Loader2,
  Sparkles,
  Flame,
  Users,
  Compass,
  Bookmark,
  RefreshCw,
  HeartHandshake,
  BarChart2,
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

type FeedTab = 'all' | 'help' | 'polls' | 'trending' | 'circles' | 'reflections' | 'saved'

const HELP_SUB_FILTERS: { id: HelpType | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All Requests & Offers', icon: '🤝' },
  { id: 'offering_help', label: 'Offering Help', icon: '✨' },
  { id: 'seeking_advice', label: 'Seeking Advice', icon: '🙋‍♂️' },
  { id: 'resume_review', label: 'Resume Review', icon: '📄' },
  { id: 'mock_interview', label: 'Mock Interview', icon: '🎯' },
  { id: 'layoff_support', label: 'Layoff Support', icon: '💛' },
]

export default function FeedPage() {
  const { userId: currentUserId, isLoading: isUserLoading } = useCurrentUser()
  const [posts, setPosts] = useState<Post[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [pseudonym, setPseudonym] = useState<{ id: string; display_name: string } | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null)
  const [activeTab, setActiveTab] = useState<FeedTab>('all')
  const [helpSubFilter, setHelpSubFilter] = useState<HelpType | 'all'>('all')
  const [savedCount, setSavedCount] = useState(0)
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

    setSavedCount(getSavedPostIds().length)
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

  // Listen to bookmark changes
  useEffect(() => {
    const handleBookmarkChange = () => {
      setSavedCount(getSavedPostIds().length)
    }
    window.addEventListener('humanverse_bookmarks_updated', handleBookmarkChange)
    return () => window.removeEventListener('humanverse_bookmarks_updated', handleBookmarkChange)
  }, [])

  // Filter posts by active tab
  const filteredPosts = posts.filter(post => {
    if (activeTab === 'all') return true
    if (activeTab === 'help') {
      if (!post.help_type) return false
      if (helpSubFilter === 'all') return true
      return post.help_type === helpSubFilter
    }
    if (activeTab === 'polls') {
      return !!post.poll
    }
    if (activeTab === 'circles') return post.visibility === 'circle'
    if (activeTab === 'saved') return isPostSaved(post.id)
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

  const helpPostsCount = posts.filter(p => !!p.help_type).length
  const pollsCount = posts.filter(p => !!p.poll).length

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

      {/* Feed Filter Navigation Tabs */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            All Stories ({posts.length})
          </button>

          <button
            onClick={() => setActiveTab('help')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'help'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800'
            }`}
          >
            <HeartHandshake className="h-3.5 w-3.5 text-emerald-500" />
            Help Exchange ({helpPostsCount})
          </button>

          <button
            onClick={() => setActiveTab('polls')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'polls'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5 text-indigo-500" />
            Polls ({pollsCount})
          </button>

          <button
            onClick={() => setActiveTab('trending')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'circles'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800'
            }`}
          >
            <Users className="h-3.5 w-3.5 text-purple-500" />
            Circles ({posts.filter(p => p.visibility === 'circle').length})
          </button>

          <button
            onClick={() => setActiveTab('reflections')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'reflections'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            Reflections
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'saved'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5 text-emerald-500" />
            Saved ({savedCount})
          </button>
        </div>

        {/* Sub-Filter Pills for Help Exchange */}
        {activeTab === 'help' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar animate-in fade-in">
            {HELP_SUB_FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setHelpSubFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border shrink-0 transition-all flex items-center gap-1 ${
                  helpSubFilter === f.id
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700 shadow-xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800'
                }`}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Posts Stream */}
      {sortedPosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <Sparkles className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            {activeTab === 'circles'
              ? 'No posts in your private circles yet'
              : activeTab === 'saved'
              ? 'No saved stories in your collection'
              : activeTab === 'help'
              ? 'No active requests or help offers under this tag'
              : activeTab === 'polls'
              ? 'No community polls created yet'
              : 'No posts in the feed yet'}
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {activeTab === 'help'
              ? 'Use the composer above with a help tag (e.g. "Offering Help" or "Resume Review") to support a peer.'
              : activeTab === 'polls'
              ? 'Create the first anonymous poll using the poll icon in the composer above!'
              : activeTab === 'saved'
              ? 'Click the bookmark icon on any post card to save stories here for future reading.'
              : 'Write what actually happened today to inspire and connect with other members.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedPosts.map(post => (
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

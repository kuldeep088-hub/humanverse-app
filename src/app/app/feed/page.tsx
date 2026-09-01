'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { Composer } from '@/components/app/composer'
import { PostComponent } from '@/components/app/post'
import { ProfileSidebarCard } from '@/components/app/profile-sidebar-card'
import { fetchFeedPosts } from '@/lib/data-service'
import { Post } from '@/types'
import Link from 'next/link'
import {
  Loader2,
  Sparkles,
  RefreshCw,
  ChevronDown,
  TrendingUp,
  Info,
  Compass,
  ArrowRight,
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
  const [sortBy, setSortBy] = useState<'top' | 'recent'>('top')

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
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* 1. LEFT SIDEBAR: PROFILE CARD (Visible on Desktop / Tablet)               */}
        {/* ========================================================================= */}
        <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 sticky top-20">
          <ProfileSidebarCard
            userProfile={currentUserProfile}
            userId={currentUserId}
            pseudonym={pseudonym}
          />
        </aside>

        {/* ========================================================================= */}
        {/* 2. MAIN FEED COLUMN (Composer + Sort + Posts)                            */}
        {/* ========================================================================= */}
        <main className="lg:col-span-8 xl:col-span-6 space-y-4 min-w-0">
          {/* Upgraded Composer */}
          <Composer
            circles={circles}
            pseudonym={pseudonym}
            currentUserProfile={currentUserProfile}
            onPostCreated={() => fetchFeed()}
          />

          {/* Sort By Divider Bar matching screenshot */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-[1px] bg-gray-200/90 dark:bg-gray-800" />
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 shrink-0">
              <span>Sort by:</span>
              <button
                type="button"
                onClick={() => setSortBy(prev => (prev === 'top' ? 'recent' : 'top'))}
                className="font-bold text-gray-950 dark:text-white inline-flex items-center gap-0.5 hover:text-primary transition-colors cursor-pointer"
              >
                <span>{sortBy === 'top' ? 'Top' : 'Recent'}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Real-time New Posts Banner */}
          {hasNewPosts && (
            <button
              onClick={() => fetchFeed()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity animate-in fade-in slide-in-from-top-2"
            >
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              New posts have been shared. Click to refresh.
            </button>
          )}

          {/* Posts Stream */}
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <Sparkles className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-base font-bold text-gray-900 dark:text-white">
                No posts in the feed yet
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Write what actually happened today to inspire and connect with other members.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
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
        </main>

        {/* ========================================================================= */}
        {/* 3. RIGHT SIDEBAR: TRENDING & NEWS (Visible on XL Screens)                */}
        {/* ========================================================================= */}
        <aside className="hidden xl:block xl:col-span-3 sticky top-20 space-y-4">
          {/* Trending Topics Card */}
          <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-950 dark:text-white flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" />
                Trending in Network
              </h3>
              <Info className="h-3.5 w-3.5 text-gray-400" />
            </div>

            <div className="space-y-3 pt-1 text-xs">
              <div>
                <Link
                  href="/app/threads/ai-growth"
                  className="font-bold text-gray-900 dark:text-gray-100 hover:text-primary transition-colors block"
                >
                  #ai-growth & automation
                </Link>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Top story • 1,420 readers
                </span>
              </div>

              <div>
                <Link
                  href="/app/threads/founder-stories"
                  className="font-bold text-gray-900 dark:text-gray-100 hover:text-primary transition-colors block"
                >
                  #founder-stories
                </Link>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  2h ago • 894 readers
                </span>
              </div>

              <div>
                <Link
                  href="/app/threads/career-advice"
                  className="font-bold text-gray-900 dark:text-gray-100 hover:text-primary transition-colors block"
                >
                  #career-advice & job market
                </Link>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  4h ago • 630 readers
                </span>
              </div>

              <div>
                <Link
                  href="/app/threads/tech-leadership"
                  className="font-bold text-gray-900 dark:text-gray-100 hover:text-primary transition-colors block"
                >
                  #tech-leadership
                </Link>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  1d ago • 512 readers
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <Link
                href="/app/search"
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <span>Discover all topics</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Quick Hub Card */}
          <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-2 text-xs">
            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-amber-500" />
              Explore Humanverse
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
              Share real experiences, join private circles, and connect with fellow builders.
            </p>
            <div className="pt-1 flex flex-wrap gap-2 text-[11px] text-gray-400">
              <Link href="/privacy" className="hover:text-primary">Privacy</Link>
              <span>•</span>
              <Link href="/app/settings" className="hover:text-primary">Settings</Link>
              <span>•</span>
              <Link href="/app/journal" className="hover:text-primary">Journal</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

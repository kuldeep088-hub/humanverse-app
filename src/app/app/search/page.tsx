'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { PostComponent } from '@/components/app/post'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { debounce } from '@/lib/utils'
import { Post, ReactionType } from '@/types'
import {
  Search,
  X,
  Loader2,
  Hash,
  User,
  FileText,
  Flame,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

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

const POPULAR_SEARCH_TAGS = [
  '#RejectedAgain',
  '#LaidOff',
  '#MoneyTalk',
  '#ShippedIt',
  '#GotItWrong',
  '#SmallWins',
  '#CareerPivot',
  '#BadManager',
]

export default function SearchPage() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'posts' | 'threads' | 'people'>('all')
  const [results, setResults] = useState<{
    posts: Post[]
    threads: { id: string; slug: string; name: string; post_count: number }[]
    profiles: { id: string; display_name: string; professional_context: string | null; avatar_url: string | null }[]
  }>({ posts: [], threads: [], profiles: [] })
  const [suggestedProfiles, setSuggestedProfiles] = useState<{ id: string; display_name: string; professional_context: string | null; avatar_url: string | null }[]>([])
  const [popularThreads, setPopularThreads] = useState<{ id: string; slug: string; name: string; post_count: number }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { userId: currentUserId } = useCurrentUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const query = searchParams.get('q') || ''

  // Fetch initial suggestions for empty search state
  useEffect(() => {
    const fetchSuggestions = async () => {
      const [threadsRes, profilesRes] = await Promise.all([
        supabase.from('threads').select('*').order('post_count', { ascending: false }).limit(6),
        supabase.from('profiles').select('id, display_name, professional_context, avatar_url').limit(6),
      ])

      setPopularThreads(threadsRes.data || [])
      setSuggestedProfiles(profilesRes.data || [])
    }
    fetchSuggestions()
  }, [supabase])

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults({ posts: [], threads: [], profiles: [] })
        return
      }
      setIsLoading(true)
      try {
        const cleanQuery = q.trim().replace(/^#/, '')

        // 1. Fetch matches
        const [postsRes, threadsRes, profilesRes] = await Promise.all([
          supabase
            .from('posts')
            .select('*')
            .eq('visibility', 'public')
            .ilike('content', `%${cleanQuery}%`)
            .order('created_at', { ascending: false })
            .limit(25),
          supabase
            .from('threads')
            .select('*')
            .or(`name.ilike.%${cleanQuery}%,slug.ilike.%${cleanQuery}%`)
            .limit(10),
          supabase
            .from('profiles')
            .select('id, display_name, professional_context, avatar_url')
            .ilike('display_name', `%${cleanQuery}%`)
            .limit(10),
        ])

        const rawPosts = postsRes.data || []
        const authorIds = Array.from(new Set(rawPosts.map((p: RawPost) => p.author_id)))
        const pseudoIds = Array.from(new Set(rawPosts.map((p: RawPost) => p.pseudonym_id).filter(Boolean)))
        const threadIds = Array.from(new Set(rawPosts.map((p: RawPost) => p.thread_id).filter(Boolean)))
        const postIds = rawPosts.map((p: RawPost) => p.id)

        // 2. Fetch related details for posts
        const [profDataRes, pseudoDataRes, threadDataRes, rxRes, repRes] = await Promise.all([
          authorIds.length > 0 ? supabase.from('profiles').select('*').in('id', authorIds) : Promise.resolve({ data: [] }),
          pseudoIds.length > 0 ? supabase.from('pseudonyms').select('*').in('id', pseudoIds) : Promise.resolve({ data: [] }),
          threadIds.length > 0 ? supabase.from('threads').select('*').in('id', threadIds) : Promise.resolve({ data: [] }),
          postIds.length > 0 ? supabase.from('reactions').select('post_id, type, user_id').in('post_id', postIds) : Promise.resolve({ data: [] }),
          postIds.length > 0 ? supabase.from('replies').select('id, post_id').in('post_id', postIds) : Promise.resolve({ data: [] }),
        ])

        const profMap = new Map((profDataRes.data || []).map((p: { id: string }) => [p.id, p]))
        const pMap = new Map((pseudoDataRes.data || []).map((p: { id: string }) => [p.id, p]))
        const tMap = new Map((threadDataRes.data || []).map((t: { id: string }) => [t.id, t]))

        const processedPosts: Post[] = rawPosts.map((post: RawPost) => {
          const postRx = (rxRes.data || []).filter((r: { post_id: string }) => r.post_id === post.id)
          const postRep = (repRes.data || []).filter((r: { post_id: string }) => r.post_id === post.id)

          const reactionCounts = {
            been_there: postRx.filter((r: { type: string }) => r.type === 'been_there').length,
            oof: postRx.filter((r: { type: string }) => r.type === 'oof').length,
            respect: postRx.filter((r: { type: string }) => r.type === 'respect').length,
            needed_this: postRx.filter((r: { type: string }) => r.type === 'needed_this').length,
          }

          let userReaction: ReactionType | null = null
          if (currentUserId) {
            const uRx = postRx.find((r: { user_id: string }) => r.user_id === currentUserId)
            if (uRx) userReaction = uRx.type as ReactionType
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
            author: profMap.get(post.author_id) || { id: post.author_id, display_name: 'Human Member', professional_context: null, avatar_url: null },
            pseudonym: post.pseudonym_id ? pMap.get(post.pseudonym_id) || null : null,
            thread: post.thread_id ? tMap.get(post.thread_id) || null : null,
            circle: null,
            reaction_counts: reactionCounts,
            user_reaction: userReaction,
            reply_count: postRep.length,
          }
        })

        setResults({
          posts: processedPosts,
          threads: threadsRes.data || [],
          profiles: profilesRes.data || [],
        })
      } catch {
        toast.error('Search failed')
      } finally {
        setIsLoading(false)
      }
    },
    [currentUserId, supabase]
  )

  useEffect(() => {
    const debouncedSearch = debounce(search, 300)
    debouncedSearch(query)
  }, [query, search])

  const handleSearch = (value: string) => {
    if (value) {
      router.push(`/app/search?q=${encodeURIComponent(value)}`)
    } else {
      router.push('/app/search')
    }
  }

  const clearSearch = () => {
    router.push('/app/search')
    setResults({ posts: [], threads: [], profiles: [] })
  }

  const totalResultsCount = results.posts.length + results.threads.length + results.profiles.length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search posts, topics, people, and reflections..."
          className="pl-11 pr-10 h-12 text-base rounded-2xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm"
          autoFocus
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Tabs when Query exists */}
      {query && (
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'all'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            All ({totalResultsCount})
          </button>
          <button
            onClick={() => setActiveFilter('posts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'posts'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            Posts ({results.posts.length})
          </button>
          <button
            onClick={() => setActiveFilter('threads')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'threads'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            Threads ({results.threads.length})
          </button>
          <button
            onClick={() => setActiveFilter('people')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === 'people'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            People ({results.profiles.length})
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Empty Search State (Show suggestions, trending topics) */}
      {!query && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Quick Hashtag Chips */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              Trending Discussions
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {POPULAR_SEARCH_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleSearch(tag.replace('#', ''))}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:border-primary/40 hover:text-primary transition-all dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 shadow-2xl"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Popular Threads List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Active Threads
              </span>
              <Link href="/app/threads" className="text-xs font-medium text-primary hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {popularThreads.map(thread => (
                <Link
                  key={thread.id}
                  href={`/app/threads/${thread.slug}`}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-white hover:border-primary/40 dark:border-gray-800 dark:bg-gray-900 shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                      #
                    </span>
                    <div>
                      <p className="font-semibold text-sm text-gray-950 dark:text-white">#{thread.slug}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{thread.post_count} posts</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>

          {/* Suggested People */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              Community Members
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {suggestedProfiles.map(person => (
                <Link
                  key={person.id}
                  href={`/app/profile/${person.id}`}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 bg-white hover:border-primary/40 dark:border-gray-800 dark:bg-gray-900 shadow-sm transition-all"
                >
                  <Avatar src={person.avatar_url || undefined} fallbackName={person.display_name} className="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-950 dark:text-white truncate">{person.display_name}</p>
                    {person.professional_context && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{person.professional_context}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No results for query */}
      {!isLoading && query && totalResultsCount === 0 && (
        <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          <Search className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-base font-semibold text-gray-900 dark:text-white">No results found for &ldquo;{query}&rdquo;</p>
          <p className="text-xs text-gray-500 mt-1">Try another keyword, or explore our active threads.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/app/threads">Browse Threads</Link>
          </Button>
        </div>
      )}

      {/* People Results */}
      {(activeFilter === 'all' || activeFilter === 'people') && results.profiles.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-primary" />
            People ({results.profiles.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {results.profiles.map(profile => (
              <Link
                key={profile.id}
                href={`/app/profile/${profile.id}`}
                className="flex items-center justify-between p-3.5 border border-gray-200 rounded-xl bg-white hover:border-primary/40 dark:border-gray-800 dark:bg-gray-900 shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={profile.avatar_url || undefined}
                    fallbackName={profile.display_name}
                    className="h-10 w-10 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-950 dark:text-white truncate">{profile.display_name}</p>
                    {profile.professional_context && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{profile.professional_context}</p>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-xs shrink-0">
                  Profile
                </Button>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Threads Results */}
      {(activeFilter === 'all' || activeFilter === 'threads') && results.threads.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-primary" />
            Threads ({results.threads.length})
          </h2>
          <div className="space-y-2">
            {results.threads.map(thread => (
              <Link
                key={thread.id}
                href={`/app/threads/${thread.slug}`}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white hover:border-primary/40 dark:border-gray-800 dark:bg-gray-900 shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                    #
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-gray-950 dark:text-white">#{thread.slug}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {thread.post_count} {thread.post_count === 1 ? 'post' : 'posts'}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-primary font-medium">Visit Thread →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Posts Results */}
      {(activeFilter === 'all' || activeFilter === 'posts') && results.posts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" />
            Posts ({results.posts.length})
          </h2>
          <div className="space-y-4">
            {results.posts.map(post => (
              <PostComponent
                key={post.id}
                post={post}
                onUpdate={() => search(query)}
                showThreadLink={true}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
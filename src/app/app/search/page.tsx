'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { PostComponent } from '@/components/app/post'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { debounce } from '@/lib/utils'
import { Post } from '@/types'
import { Search, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

interface SearchPostRow {
  id: string
  author_id: string
  pseudonym_id: string | null
  thread_id: string | null
  circle_id: string | null
  content: string
  visibility: Post['visibility']
  created_at: string
  updated_at: string
  author: Post['author']
  pseudonym: Post['pseudonym']
  thread: Post['thread']
  reactions?: { type: string; user_id: string }[]
}

export default function SearchPage() {
  const [results, setResults] = useState<{
    posts: Post[]
    threads: { id: string; slug: string; name: string; post_count: number }[]
    profiles: { id: string; display_name: string; professional_context: string | null; avatar_url: string | null }[]
  }>({ posts: [], threads: [], profiles: [] })
  const [isLoading, setIsLoading] = useState(false)
  const { userId: currentUserId } = useCurrentUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const query = searchParams.get('q') || ''

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults({ posts: [], threads: [], profiles: [] })
        return
      }
      setIsLoading(true)
      try {
        const [postsRes, threadsRes, profilesRes] = await Promise.all([
          supabase
            .from('posts')
            .select(`
            *,
            author:profiles!posts_author_id_fkey(id, display_name, professional_context, avatar_url),
            pseudonym:pseudonyms!posts_pseudonym_id_fkey(id, display_name, avatar_url, user_id),
            thread:threads!posts_thread_id_fkey(id, slug, name),
            reactions(type, user_id)
          `)
            .eq('visibility', 'public')
            .ilike('content', `%${q}%`)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('threads')
            .select('*')
            .ilike('name', `%${q}%`)
            .limit(10),
          supabase
            .from('profiles')
            .select('id, display_name, professional_context, avatar_url')
            .ilike('display_name', `%${q}%`)
            .limit(10),
        ])

        const processedPosts: Post[] = (postsRes.data || []).map((post: SearchPostRow) => {
          const reactionCounts = { been_there: 0, oof: 0, respect: 0, needed_this: 0 }
          let userReaction: Post['user_reaction'] = null

          post.reactions?.forEach((r) => {
            reactionCounts[r.type as keyof typeof reactionCounts]++
          })

          const userReactionData = post.reactions?.find((r) => r.user_id === currentUserId)
          if (userReactionData) userReaction = userReactionData.type as Post['user_reaction']

          return {
            ...post,
            reaction_counts: reactionCounts,
            user_reaction: userReaction,
            reply_count: 0,
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
    router.push(`/app/search?q=${encodeURIComponent(value)}`)
  }

  const clearSearch = () => {
    router.push('/app/search')
    setResults({ posts: [], threads: [], profiles: [] })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search posts, threads, people"
          className="pl-10 pr-10"
          autoFocus
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {!isLoading && query && results.posts.length === 0 && results.threads.length === 0 && results.profiles.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {results.posts.length > 0 && (
        <section>
          <h2 className="text-lg font-medium text-gray-950 dark:text-white mb-3">Posts</h2>
          <div className="space-y-4">
            {results.posts.map(post => (
              <PostComponent key={post.id} post={post} onUpdate={() => {}} showThreadLink={true} currentUserId={currentUserId} />
            ))}
          </div>
        </section>
      )}

      {results.threads.length > 0 && (
        <section>
          <h2 className="text-lg font-medium text-gray-950 dark:text-white mb-3">Threads</h2>
          <div className="space-y-2">
            {results.threads.map(thread => (
              <Link
                key={thread.id}
                href={`/app/threads/${thread.slug}`}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">#</span>
                  <div>
                    <p className="font-medium text-gray-950 dark:text-white">{thread.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {thread.post_count} post{thread.post_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {results.profiles.length > 0 && (
        <section>
          <h2 className="text-lg font-medium text-gray-950 dark:text-white mb-3">People</h2>
          <div className="space-y-2">
            {results.profiles.map(profile => (
              <Link
                key={profile.id}
                href={`/app/profile/${profile.id}`}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
              >
                <Avatar
                  src={profile.avatar_url || undefined}
                  fallbackName={profile.display_name}
                  className="h-10 w-10"
                />
                <div>
                  <p className="font-medium text-gray-950 dark:text-white">{profile.display_name}</p>
                  {profile.professional_context && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{profile.professional_context}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
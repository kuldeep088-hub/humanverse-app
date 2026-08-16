'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { PostComponent } from '@/components/app/post'
import { Avatar } from '@/components/ui/avatar'
import { formatRelativeTime } from '@/lib/utils'
import { Post, ReactionType } from '@/types'
import { Briefcase, Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'

interface Reaction {
  type: string
  user_id: string
}

interface Profile {
  id: string
  display_name: string
  professional_context: string | null
  avatar_url: string | null
  created_at: string
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

export default function ProfilePage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const { userId: currentUserId, isLoading: isUserLoading } = useCurrentUser()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)

  const isOwnProfile = id === 'me' || id === currentUserId
  const targetUserId = isOwnProfile ? currentUserId : id

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) return
    const supabase = createClient()

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single()

    if (!profileData) {
      setIsNotFound(true)
      setIsLoading(false)
      return
    }
    setProfile(profileData as Profile)

    // Get public posts only for other users, all posts for own profile
    const visibilityFilter = isOwnProfile
      ? 'visibility.in.(public,circle,pseudonymous)'
      : 'visibility.eq.public'

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
      .eq('author_id', targetUserId)
      .or(visibilityFilter)
      .order('created_at', { ascending: false })
      .limit(50)

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
  }, [targetUserId, isOwnProfile, currentUserId])

  useEffect(() => {
    const run = async () => {
      await fetchProfile()
    }
    run()
  }, [fetchProfile])

  if (isLoading || isUserLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isNotFound || !profile) {
    return (
      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
        <p className="text-lg">Profile not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <Avatar
          src={profile.avatar_url || undefined}
          fallbackName={profile.display_name}
          className="h-20 w-20"
        />
        <div className="flex-1">
          <h1 className="text-2xl font-medium text-gray-950 dark:text-white">{profile.display_name}</h1>
          {profile.professional_context && (
            <p className="mt-1 flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Briefcase className="h-4 w-4" />
              {profile.professional_context}
            </p>
          )}
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            Member since {formatRelativeTime(profile.created_at).replace('y', ' years').replace('mo', ' months').replace('w', ' weeks').replace('d', ' days')}
          </p>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-lg">No posts yet</p>
          {isOwnProfile && (
            <p className="mt-1 text-sm">Write what actually happened to get started</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostComponent key={post.id} post={post} onUpdate={fetchProfile} showThreadLink={true} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  )
}
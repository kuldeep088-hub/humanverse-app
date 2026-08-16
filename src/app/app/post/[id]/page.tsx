'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { PostComponent } from '@/components/app/post'
import { Post, ReactionType } from '@/types'
import { Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Reaction {
  type: string
  user_id: string
}

interface ReplyWithRelations {
  id: string
  post_id: string
  author_id: string
  pseudonym_id: string | null
  parent_reply_id: string | null
  content: string
  created_at: string
  updated_at: string
  author: { id: string; display_name: string; professional_context: string | null; avatar_url: string | null } | null
  pseudonym: { id: string; display_name: string; avatar_url: string | null; user_id: string } | null
  reactions: Reaction[]
}

const REACTION_EMOJI: Record<ReactionType, string> = {
  been_there: '🤝',
  oof: '😬',
  respect: '🫡',
  needed_this: '💚',
}

const REACTION_LABELS: Record<ReactionType, string> = {
  been_there: 'Been there',
  oof: 'Oof',
  respect: 'Respect',
  needed_this: 'I needed this',
}

export default function PostPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  // TODO: Remove mock when auth is added
  const { userId: currentUserId, isLoading: isUserLoading } = useCurrentUser()
  const [post, setPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<ReplyWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)

  const fetchPost = useCallback(async () => {
    if (!currentUserId) return
    const supabase = createClient()

    const { data: postData } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(id, display_name, professional_context, avatar_url),
        pseudonym:pseudonyms!posts_pseudonym_id_fkey(id, display_name, avatar_url, user_id),
        thread:threads!posts_thread_id_fkey(id, slug, name),
        circle:circles!posts_circle_id_fkey(id, name),
        reactions(type, user_id)
      `)
      .eq('id', id)
      .single()

    if (!postData) {
      setIsNotFound(true)
      setIsLoading(false)
      return
    }

    // Check access
    let hasAccess = postData.visibility === 'public' || postData.visibility === 'pseudonymous' || postData.author_id === currentUserId
    if (!hasAccess && postData.visibility === 'circle' && postData.circle_id) {
      const { data: memberData } = await supabase
        .from('circle_members')
        .select('id')
        .eq('circle_id', postData.circle_id)
        .eq('user_id', currentUserId)
        .limit(1)
      hasAccess = !!memberData?.length
    }

    if (!hasAccess) {
      setIsNotFound(true)
      setIsLoading(false)
      return
    }

    // Get replies for this post
    const { data: repliesData } = await supabase
      .from('replies')
      .select(`
        *,
        author:profiles!replies_author_id_fkey(id, display_name, professional_context, avatar_url),
        pseudonym:pseudonyms!replies_pseudonym_id_fkey(id, display_name, avatar_url, user_id),
        reactions(type, user_id)
      `)
      .eq('post_id', id)
      .order('created_at', { ascending: true })

    const replyRows = repliesData as ReplyWithRelations[] || []

    const reactionCounts = {
      been_there: 0,
      oof: 0,
      respect: 0,
      needed_this: 0,
    }
    let userReaction: ReactionType | null = null

    postData.reactions?.forEach((r: Reaction) => {
      reactionCounts[r.type as keyof typeof reactionCounts]++
    })

    const userReactionData = postData.reactions?.find((r: Reaction) => r.user_id === currentUserId)
    if (userReactionData) {
      userReaction = userReactionData.type as ReactionType
    }

    const processedPost: Post = {
      ...postData,
      reaction_counts: reactionCounts,
      user_reaction: userReaction,
      reply_count: replyRows.length,
    }

    setReplies(replyRows)
    setPost(processedPost)
    setIsLoading(false)
  }, [id, currentUserId])

  useEffect(() => {
    const run = async () => {
      await fetchPost()
    }
    run()
  }, [fetchPost])

  const handleReplyReact = async (replyId: string, type: ReactionType) => {
    if (!currentUserId) return
    const supabase = createClient()
    const reply = replies.find(r => r.id === replyId)
    if (!reply) return

    const userReactionData = (reply.reactions || []).find((r: Reaction) => r.user_id === currentUserId)
    if (userReactionData?.type === type) {
      await supabase.from('reactions').delete().match({
        user_id: currentUserId,
        reply_id: replyId,
        type,
      })
    } else {
      await supabase.from('reactions').upsert({
        user_id: currentUserId,
        reply_id: replyId,
        type,
      })
    }
    await fetchPost()
  }

  if (isLoading || isUserLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isNotFound || !post) {
    return (
      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
        <p className="text-lg">This post isn&apos;t available.</p>
        <Link href="/app/feed" className="mt-2 inline-block text-sm text-primary hover:underline">
          Back to feed
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PostComponent
        post={post}
        onUpdate={fetchPost}
        showThreadLink={true}
        currentUserId={currentUserId}
      />

      {replies.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-gray-950 dark:text-white">
            Replies ({replies.length})
          </h2>
          {replies.map(reply => {
            const replyAuthor = reply.pseudonym || reply.author
            const replyCounts = { been_there: 0, oof: 0, respect: 0, needed_this: 0 }
            let replyUserReaction: ReactionType | null = null
            reply.reactions?.forEach((r) => {
              replyCounts[r.type as keyof typeof replyCounts]++
              if (r.user_id === currentUserId) {
                replyUserReaction = r.type as ReactionType
              }
            })
            return (
              <div key={reply.id} className="border border-gray-200 rounded-lg p-4 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-950 dark:text-white">
                    {replyAuthor?.display_name || 'Anonymous'}
                  </span>
                  <span className="text-sm text-gray-400 dark:text-gray-500">
                    · {new Date(reply.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-gray-950 dark:text-gray-100">{reply.content}</p>
                <div className="mt-3 flex items-center gap-4">
                  {(['been_there', 'oof', 'respect', 'needed_this'] as const).map((type) => {
                    const count = replyCounts[type]
                    const isActive = replyUserReaction === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleReplyReact(reply.id, type)}
                        className={`flex items-center gap-1 text-sm ${isActive ? 'text-primary font-medium' : 'text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-gray-200'}`}
                      >
                        <span>{REACTION_EMOJI[type]}</span>
                        <span>{REACTION_LABELS[type]}</span>
                        {count > 0 && <span className="text-xs">{count}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { PostComponent } from '@/components/app/post'
import { fetchPostDetail } from '@/lib/data-service'
import { Post, ReactionType } from '@/types'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Loader2,
  ChevronLeft,
  Send,
  MessageSquare,
  Handshake,
  AlertCircle,
  Award,
  Heart,
} from 'lucide-react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'
import { toast } from 'sonner'

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

const REACTION_CONFIG: {
  type: ReactionType
  label: string
  icon: typeof Handshake
}[] = [
  { type: 'been_there', label: 'Been there', icon: Handshake },
  { type: 'oof', label: 'Oof', icon: AlertCircle },
  { type: 'respect', label: 'Respect', icon: Award },
  { type: 'needed_this', label: 'Needed this', icon: Heart },
]

export default function PostPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const { userId: currentUserId, isLoading: isUserLoading } = useCurrentUser()
  const [post, setPost] = useState<Post | null>(null)
  const [replies, setReplies] = useState<ReplyWithRelations[]>([])
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    display_name: string
    avatar_url: string | null
    professional_context: string | null
  } | null>(null)
  const [replyInput, setReplyInput] = useState('')
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)

  const fetchPost = useCallback(async () => {
    if (!currentUserId || !id) return
    const supabase = createClient()

    // 1. Fetch current user profile
    const { data: profData } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, professional_context')
      .eq('id', currentUserId)
      .single()

    if (profData) {
      setCurrentUserProfile(profData)
    }

    // 2. Fetch post detail & replies via data service
    const { post: fetchedPost, replies: fetchedReplies } = await fetchPostDetail(
      supabase,
      id,
      currentUserId
    )

    if (!fetchedPost) {
      setIsNotFound(true)
      setIsLoading(false)
      return
    }

    setPost(fetchedPost)
    setReplies(fetchedReplies as ReplyWithRelations[])
    setIsLoading(false)
  }, [id, currentUserId])

  useEffect(() => {
    const run = async () => {
      await fetchPost()
    }
    run()
  }, [fetchPost])

  const handlePostReply = async () => {
    if (!replyInput.trim() || !currentUserId) return
    setIsSubmittingReply(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('replies').insert({
        post_id: id,
        author_id: currentUserId,
        content: replyInput.trim(),
      })
      if (error) throw error

      setReplyInput('')
      toast.success('Reply published')
      await fetchPost()
    } catch {
      toast.error('Could not submit reply. Please try again.')
    } finally {
      setIsSubmittingReply(false)
    }
  }

  const handleReplyReact = async (replyId: string, type: ReactionType) => {
    if (!currentUserId) {
      toast.error('Please sign in to react')
      return
    }
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
      if (userReactionData) {
        await supabase.from('reactions').delete().match({
          user_id: currentUserId,
          reply_id: replyId,
          type: userReactionData.type,
        })
      }
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
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isNotFound || !post) {
    return (
      <div className="text-center py-20 text-gray-500 dark:text-gray-400">
        <p className="text-lg font-semibold text-gray-900 dark:text-white">This post is not available</p>
        <p className="mt-1 text-sm">It may have been deleted by the author or you don&apos;t have permission.</p>
        <Button asChild className="mt-4">
          <Link href="/app/feed">Back to Feed</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/app/feed"
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Feed
        </Link>
      </div>

      {/* Main Post */}
      <PostComponent
        post={post}
        onUpdate={fetchPost}
        showThreadLink={true}
        currentUserId={currentUserId}
        currentUserProfile={currentUserProfile}
      />

      {/* Reply Box */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start gap-3">
          <Avatar
            src={currentUserProfile?.avatar_url || undefined}
            fallbackName={currentUserProfile?.display_name || 'You'}
            className="h-9 w-9 shrink-0 border border-gray-100 dark:border-gray-800"
          />
          <div className="flex-1 min-w-0">
            <Textarea
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              placeholder="Write a thoughtful reply, shared lesson, or follow-up question..."
              className="min-h-[70px] text-sm resize-none rounded-xl border-gray-200 dark:border-gray-800"
            />
            <div className="mt-2.5 flex justify-end">
              <Button
                size="sm"
                onClick={handlePostReply}
                disabled={isSubmittingReply || !replyInput.trim()}
                className="gap-1.5 text-xs font-semibold"
              >
                {isSubmittingReply ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Reply
                    <Send className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Replies Thread */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-primary" />
          Discussion ({replies.length})
        </h2>

        {replies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <p className="text-sm font-medium">No replies yet.</p>
            <p className="text-xs text-gray-400 mt-0.5">Be the first to share your perspective.</p>
          </div>
        ) : (
          replies.map(reply => {
            const isPseudonymous = !!reply.pseudonym_id
            const replyAuthor = isPseudonymous ? reply.pseudonym : reply.author
            const authorName = replyAuthor?.display_name || (isPseudonymous ? 'Anonymous Peer' : 'Human Member')
            const authorAvatar = isPseudonymous ? null : replyAuthor?.avatar_url
            const authorContext = isPseudonymous ? null : reply.author?.professional_context

            const replyCounts = { been_there: 0, oof: 0, respect: 0, needed_this: 0 }
            let replyUserReaction: ReactionType | null = null

            reply.reactions?.forEach((r) => {
              replyCounts[r.type as keyof typeof replyCounts]++
              if (r.user_id === currentUserId) {
                replyUserReaction = r.type as ReactionType
              }
            })

            return (
              <div
                key={reply.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-all hover:border-gray-300 dark:hover:border-gray-700"
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    src={authorAvatar || undefined}
                    fallbackName={authorName}
                    className="h-8 w-8 shrink-0 border border-gray-100 dark:border-gray-800"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isPseudonymous ? (
                        <span className="font-semibold text-xs text-gray-950 dark:text-white">
                          {authorName}
                        </span>
                      ) : (
                        <Link
                          href={`/app/profile/${reply.author_id}`}
                          className="font-semibold text-xs text-gray-950 hover:text-primary hover:underline dark:text-white truncate"
                        >
                          {authorName}
                        </Link>
                      )}

                      {authorContext && (
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                          · {authorContext}
                        </span>
                      )}

                      <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
                        · {formatRelativeTime(reply.created_at)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-gray-950 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                      {reply.content}
                    </p>

                    {/* Reactions for Reply (NO EMOJIS, Clean SVG Icons) */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {REACTION_CONFIG.map(({ type, label, icon: Icon }) => {
                        const count = replyCounts[type]
                        const isActive = replyUserReaction === type
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleReplyReact(reply.id, type)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                              isActive
                                ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-xs'
                                : 'bg-gray-50 text-gray-600 border-gray-200/60 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700/60 dark:hover:bg-gray-700'
                            }`}
                          >
                            <Icon className="h-3 w-3 shrink-0" />
                            <span className="hidden sm:inline">{label}</span>
                            {count > 0 && <span className="font-bold ml-0.5">{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
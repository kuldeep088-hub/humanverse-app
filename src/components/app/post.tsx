'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { formatRelativeTime } from '@/lib/utils'
import { Post, ReactionType } from '@/types'
import { FormattedContent } from '@/components/app/formatted-content'
import { isPostSaved, toggleSavedPost } from '@/lib/bookmarks'
import { votePoll } from '@/lib/data-service'
import { getProfilePhoto, getRealAuthorName } from '@/lib/avatar'
import {
  MessageCircle,
  MoreHorizontal,
  Trash2,
  Edit2,
  Users,
  UserCircle,
  Loader2,
  Hash,
  Share2,
  Check,
  Handshake,
  AlertCircle,
  Award,
  Heart,
  Bookmark,
  BarChart2,
  CheckCircle2,
  HeartHandshake,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PostProps {
  post: Post
  onUpdate: () => void
  showThreadLink?: boolean
  currentUserId: string | null
  currentUserProfile?: {
    display_name: string
    avatar_url: string | null
    professional_context: string | null
  } | null
}

const REACTIONS: {
  type: ReactionType
  label: string
  icon: typeof Handshake
}[] = [
  { type: 'been_there', label: 'Been there', icon: Handshake },
  { type: 'oof', label: 'Oof', icon: AlertCircle },
  { type: 'respect', label: 'Respect', icon: Award },
  { type: 'needed_this', label: 'Needed this', icon: Heart },
]

const HELP_TAG_CONFIG: Record<string, { label: string; icon: string; style: string }> = {
  seeking_advice: { label: 'Seeking Advice', icon: '🙋‍♂️', style: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' },
  offering_help: { label: 'Offering Help', icon: '🤝', style: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' },
  resume_review: { label: 'Resume Review', icon: '📄', style: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800' },
  mock_interview: { label: 'Mock Interview', icon: '🎯', style: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800' },
  layoff_support: { label: 'Layoff Support', icon: '💛', style: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800' },
}

export function PostComponent({
  post,
  onUpdate,
  showThreadLink = true,
  currentUserId,
  currentUserProfile,
}: PostProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [isCopied, setIsCopied] = useState(false)
  const [isSaved, setIsSaved] = useState(() => isPostSaved(post.id))
  const [isVoting, setIsVoting] = useState(false)
  const [optimisticVote, setOptimisticVote] = useState<{ pollId: string; optionId: string } | null>(null)
  const supabase = createClient()

  const pollData = post.poll ? {
    ...post.poll,
    options: post.poll.options.map(opt => {
      if (!optimisticVote || optimisticVote.pollId !== post.poll?.id) return opt
      let count = opt.vote_count || 0
      if (opt.id === post.poll.user_voted_option_id) count = Math.max(0, count - 1)
      if (opt.id === optimisticVote.optionId) count += 1
      return { ...opt, vote_count: count }
    }),
    total_votes: optimisticVote && optimisticVote.pollId === post.poll.id && !post.poll.user_voted_option_id
      ? post.poll.total_votes + 1
      : post.poll.total_votes,
    user_voted_option_id: optimisticVote && optimisticVote.pollId === post.poll.id
      ? optimisticVote.optionId
      : post.poll.user_voted_option_id,
  } : null

  useEffect(() => {
    const handleBookmarksChanged = () => {
      setIsSaved(isPostSaved(post.id))
    }
    window.addEventListener('humanverse_bookmarks_updated', handleBookmarksChanged)
    return () => window.removeEventListener('humanverse_bookmarks_updated', handleBookmarksChanged)
  }, [post.id])

  const isPseudonymous = post.visibility === 'pseudonymous' || !!post.pseudonym_id
  const author = isPseudonymous ? post.pseudonym : post.author
  const authorName = getRealAuthorName(author?.display_name, post.author_id)
  const authorAvatar = getProfilePhoto(author?.avatar_url, authorName || post.author_id)
  const authorContext = isPseudonymous ? null : post.author?.professional_context

  const isAuthor = currentUserId && (post.author_id === currentUserId || post.pseudonym?.user_id === currentUserId)

  const handleReact = async (type: ReactionType) => {
    if (!currentUserId) {
      toast.error('Please sign in to react to posts')
      return
    }

    if (post.user_reaction === type) {
      await supabase.from('reactions').delete().match({
        user_id: currentUserId,
        post_id: post.id,
        type,
      })
    } else {
      if (post.user_reaction) {
        await supabase.from('reactions').delete().match({
          user_id: currentUserId,
          post_id: post.id,
          type: post.user_reaction,
        })
      }
      await supabase.from('reactions').upsert({
        user_id: currentUserId,
        post_id: post.id,
        type,
      })
    }
    onUpdate()
  }

  const handleToggleBookmark = () => {
    const saved = toggleSavedPost(post.id)
    setIsSaved(saved)
    toast.success(saved ? 'Post saved to your collection' : 'Post removed from saved')
  }

  const handleVote = async (optionId: string) => {
    if (!currentUserId) {
      toast.error('Please sign in to vote in community polls')
      return
    }
    if (!post.poll) return

    setIsVoting(true)
    setOptimisticVote({ pollId: post.poll.id, optionId })

    try {
      await votePoll(supabase, post.poll.id, optionId, currentUserId)
      toast.success('Vote recorded anonymously')
      onUpdate()
    } catch {
      setOptimisticVote(null)
      toast.error('Could not submit vote')
    } finally {
      setIsVoting(false)
    }
  }

  const handleReply = async () => {
    if (!replyContent.trim() || !currentUserId) return
    setIsSubmittingReply(true)
    try {
      const { error } = await supabase.from('replies').insert({
        post_id: post.id,
        author_id: currentUserId,
        content: replyContent.trim(),
      })
      if (error) throw error

      setReplyContent('')
      setIsReplying(false)
      toast.success('Reply published')
      onUpdate()
    } catch {
      toast.error('Could not post reply. Please try again.')
    } finally {
      setIsSubmittingReply(false)
    }
  }

  const handleEdit = async () => {
    if (!editContent.trim()) return
    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editContent.trim() })
        .eq('id', post.id)

      if (error) throw error

      setIsEditing(false)
      toast.success('Post updated')
      onUpdate()
    } catch {
      toast.error('Could not update post')
    }
  }

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)

      if (error) throw error

      toast.success('Post deleted')
      onUpdate()
    } catch {
      toast.error('Could not delete post')
    }
  }

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/app/post/${post.id}`
      navigator.clipboard.writeText(url)
      setIsCopied(true)
      toast.success('Post link copied to clipboard!')
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  const helpTagInfo = post.help_type ? HELP_TAG_CONFIG[post.help_type] : null

  return (
    <article className="card-hover-effect group rounded-2xl border border-gray-200/90 bg-white p-4 sm:p-5 shadow-xs transition-all duration-300 hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700">
      <div className="flex items-start gap-3 sm:gap-3.5">
        {/* Author Avatar */}
        <Link href={isPseudonymous ? '#' : `/app/profile/${post.author_id}`} className="shrink-0 group/av">
          <Avatar
            src={authorAvatar || undefined}
            fallbackName={authorName}
            className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 border border-gray-200 dark:border-gray-700 shadow-2xs transition-transform duration-200 group-hover/av:scale-105"
          />
        </Link>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              {/* Line 1: Author Name + Verified Badge + Following */}
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                {isPseudonymous ? (
                  <span className="font-bold text-[15px] text-gray-950 dark:text-white">
                    {authorName}
                  </span>
                ) : (
                  <Link
                    href={`/app/profile/${post.author_id}`}
                    className="font-bold text-[15px] text-gray-950 hover:text-primary hover:underline transition-colors dark:text-white truncate"
                  >
                    {authorName}
                  </Link>
                )}

                {/* Verified Badge */}
                <span className="inline-flex items-center text-gray-700 dark:text-gray-300" title="Verified Member">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </span>

                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  • Following
                </span>

                {isPseudonymous && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    <UserCircle className="h-3 w-3" />
                    Alias
                  </span>
                )}

                {/* Open to Support Mentor Badge */}
                {!isPseudonymous && post.author?.open_to_help && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                    <HeartHandshake className="h-3 w-3" />
                    Open to Support
                  </span>
                )}

                {post.visibility === 'circle' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.2 rounded-full">
                    <Users className="h-3 w-3" />
                    {post.circle?.name || 'Circle'}
                  </span>
                )}
              </div>

              {/* Line 2: Author Headline / Context */}
              {authorContext && !isPseudonymous ? (
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate max-w-md sm:max-w-lg leading-tight">
                  {authorContext}
                </p>
              ) : (
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate leading-tight">
                  Product & Growth Specialist • Humanverse Community
                </p>
              )}

              {/* Line 3: Timestamp & Globe */}
              <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                <span>{formatRelativeTime(post.created_at)}</span>
                <span>•</span>
                <span className="inline-flex items-center" title="Public to network">
                  🌐
                </span>
              </div>
            </div>

            {/* Top right actions (··· and ✕) */}
            <div className="flex items-center gap-0.5 ml-auto shrink-0">
              <button
                type="button"
                onClick={handleToggleBookmark}
                className={`p-1.5 rounded-lg transition-colors ${
                  isSaved
                    ? 'text-primary bg-primary/10'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                }`}
                title={isSaved ? 'Remove from Saved' : 'Save Story'}
              >
                <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="Share link"
              >
                {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
              </button>

              {isAuthor && (
                <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuLabel className="text-xs">Post Options</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => { setIsEditing(true); setShowDropdown(false); }}>
                      <Edit2 className="mr-2 h-3.5 w-3.5" />
                      Edit Post
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => { handleDelete(); setShowDropdown(false); }} className="text-red-600">
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete Post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Dismiss / Hide button */}
              <button
                type="button"
                onClick={() => toast.info('Post hidden from your feed')}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                title="Hide this post"
                aria-label="Hide post"
              >
                <span className="text-sm font-bold leading-none">✕</span>
              </button>
            </div>
          </div>

          {/* Badges Bar: Thread & Help Tag */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {post.thread && showThreadLink && (
              <Link
                href={`/app/threads/${post.thread.slug}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <Hash className="h-3 w-3" />
                {post.thread.slug}
              </Link>
            )}

            {helpTagInfo && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${helpTagInfo.style}`}>
                <span>{helpTagInfo.icon}</span>
                <span>{helpTagInfo.label}</span>
              </span>
            )}
          </div>

          {/* Post Content Body */}
          <div className="mt-3">
            {isEditing ? (
              <div className="space-y-2 mt-1">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleEdit}>
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <FormattedContent content={post.content} />
            )}
          </div>

          {/* Interactive Poll Card */}
          {pollData && (
            <div className="mt-4 p-4 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5 text-primary" />
                  {pollData.question}
                </h4>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  {pollData.total_votes} {pollData.total_votes === 1 ? 'vote' : 'votes'}
                </span>
              </div>

              <div className="space-y-2">
                {pollData.options.map((opt) => {
                  const percentage = pollData.total_votes > 0
                    ? Math.round(((opt.vote_count || 0) / pollData.total_votes) * 100)
                    : 0
                  const isUserVoted = pollData.user_voted_option_id === opt.id

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleVote(opt.id)}
                      disabled={isVoting}
                      className={`relative w-full text-left p-2.5 rounded-lg border text-xs transition-all overflow-hidden group ${
                        isUserVoted
                          ? 'border-primary bg-primary/5 font-semibold text-primary'
                          : 'border-gray-200 bg-white hover:border-primary/50 dark:border-gray-700 dark:bg-gray-900'
                      }`}
                    >
                      {/* Animated Progress Fill */}
                      {pollData.total_votes > 0 && (
                        <div
                          className={`absolute top-0 bottom-0 left-0 transition-all duration-500 opacity-20 pointer-events-none ${
                            isUserVoted ? 'bg-primary' : 'bg-gray-400 dark:bg-gray-600'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      )}

                      <div className="relative z-10 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isUserVoted ? (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full border border-gray-300 dark:border-gray-600 shrink-0 group-hover:border-primary" />
                          )}
                          <span className="truncate">{opt.text}</span>
                        </div>
                        <span className="font-bold text-[11px] shrink-0 text-gray-600 dark:text-gray-300">
                          {percentage}% ({opt.vote_count || 0})
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Reactions and Reply Bar */}
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {REACTIONS.map(({ type, label, icon: Icon }) => {
                const count = (post.reaction_counts && post.reaction_counts[type]) || 0
                const isActive = post.user_reaction === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleReact(type)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-90 border cursor-pointer',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold animate-pop'
                        : 'bg-gray-50 text-gray-600 border-gray-200/60 hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-800/80 dark:text-gray-300 dark:border-gray-700/60 dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                    <span>{label}</span>
                    {count > 0 && <span className="ml-0.5 text-[11px] font-bold">{count}</span>}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs text-gray-600 dark:text-gray-300 hover:text-primary gap-1.5 ml-auto"
                onClick={() => setIsReplying(!isReplying)}
              >
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
                <span>{post.reply_count && post.reply_count > 0 ? `${post.reply_count} Replies` : 'Reply'}</span>
              </Button>

              <Link
                href={`/app/post/${post.id}`}
                className="text-xs text-gray-400 hover:text-primary transition-colors hidden sm:inline"
              >
                Full Story →
              </Link>
            </div>
          </div>

          {/* Inline Reply Composer */}
          {isReplying && (
            <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-start gap-2.5 animate-in fade-in">
              <Avatar
                src={currentUserProfile?.avatar_url || undefined}
                fallbackName={currentUserProfile?.display_name || 'You'}
                className="h-8 w-8 shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`Reply to ${authorName}...`}
                  className="min-h-[60px] text-xs p-2.5 resize-none rounded-xl"
                  autoFocus
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsReplying(false)} className="h-7 text-xs">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleReply}
                    disabled={isSubmittingReply || !replyContent.trim()}
                    className="h-7 text-xs gap-1"
                  >
                    {isSubmittingReply ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Send Reply'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

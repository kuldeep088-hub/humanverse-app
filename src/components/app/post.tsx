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
  const supabase = createClient()

  useEffect(() => {
    const handleBookmarksChanged = () => {
      setIsSaved(isPostSaved(post.id))
    }
    window.addEventListener('humanverse_bookmarks_updated', handleBookmarksChanged)
    return () => window.removeEventListener('humanverse_bookmarks_updated', handleBookmarksChanged)
  }, [post.id])

  const isPseudonymous = post.visibility === 'pseudonymous' || !!post.pseudonym_id
  const author = isPseudonymous ? post.pseudonym : post.author
  const authorName = author?.display_name || (isPseudonymous ? 'Anonymous Peer' : 'Human Member')
  const authorAvatar = isPseudonymous ? null : author?.avatar_url
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
      toast.error('Could not update post.')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this thought?')) return
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id)
      if (error) throw error

      toast.success('Post removed')
      onUpdate()
    } catch {
      toast.error('Could not delete post.')
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

  const reactionCounts = post.reaction_counts || {
    been_there: 0,
    oof: 0,
    respect: 0,
    needed_this: 0,
  }

  return (
    <article className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700">
      <div className="flex items-start gap-3.5">
        {/* Author Avatar */}
        <Avatar
          src={authorAvatar || undefined}
          fallbackName={authorName}
          className="h-10 w-10 shrink-0 border border-gray-100 dark:border-gray-800"
        />

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              {isPseudonymous ? (
                <span className="font-semibold text-sm text-gray-950 dark:text-white">
                  {authorName}
                </span>
              ) : (
                <Link
                  href={`/app/profile/${post.author_id}`}
                  className="font-semibold text-sm text-gray-950 hover:text-primary hover:underline transition-colors dark:text-white truncate"
                >
                  {authorName}
                </Link>
              )}

              {isPseudonymous && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  <UserCircle className="h-3 w-3" />
                  Alias
                </span>
              )}

              {authorContext && !isPseudonymous && (
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                  · {authorContext}
                </span>
              )}

              <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                · {formatRelativeTime(post.created_at)}
              </span>

              {post.visibility === 'circle' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.2 rounded-full">
                  <Users className="h-3 w-3" />
                  {post.circle?.name || 'Circle'}
                </span>
              )}
            </div>

            {/* Top right actions */}
            <div className="flex items-center gap-1 ml-auto">
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
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-600">
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
            </div>
          </div>

          {/* Thread pill */}
          {post.thread && showThreadLink && (
            <Link
              href={`/app/threads/${post.thread.slug}`}
              className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <Hash className="h-3 w-3" />
              {post.thread.slug}
            </Link>
          )}

          {/* Post Content Body with Markdown & Media Support */}
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

          {/* Reactions and Reply Bar */}
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {REACTIONS.map(({ type, label, icon: Icon }) => {
                const count = reactionCounts[type] || 0
                const isActive = post.user_reaction === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleReact(type)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-95 border',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                        : 'bg-gray-50 text-gray-600 border-gray-200/60 hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-800/80 dark:text-gray-300 dark:border-gray-700/60 dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
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
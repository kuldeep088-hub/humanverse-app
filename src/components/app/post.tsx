'use client'

import { useState } from 'react'
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
import {
  MessageCircle,
  MoreHorizontal,
  Flag,
  Trash2,
  Edit2,
  Globe,
  Users,
  UserCircle,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PostProps {
  post: Post
  onUpdate: () => void
  showThreadLink?: boolean
  currentUserId: string | null
}

const REACTIONS: { type: ReactionType; label: string; icon: string }[] = [
  { type: 'been_there', label: 'Been there', icon: '🤝' },
  { type: 'oof', label: 'Oof', icon: '😬' },
  { type: 'respect', label: 'Respect', icon: '🫡' },
  { type: 'needed_this', label: 'I needed this', icon: '💚' },
]

export function PostComponent({ post, onUpdate, showThreadLink = true, currentUserId }: PostProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const supabase = createClient()

  const author = post.pseudonym || post.author
  const authorName = author?.display_name || 'Anonymous'
  const authorAvatar = author?.avatar_url
  const authorContext = post.pseudonym ? null : post.author?.professional_context

  const visibilityIcons = {
    public: Globe,
    circle: Users,
    pseudonymous: UserCircle,
  }
  const VisibilityIcon = visibilityIcons[post.visibility]

  const isAuthor = post.author_id === currentUserId || post.pseudonym?.user_id === currentUserId

  const handleReact = async (type: ReactionType) => {
    if (!currentUserId) return
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

  const handleReply = async () => {
    if (!replyContent.trim() || !currentUserId) return
    setIsSubmittingReply(true)
    try {
      const { error } = await supabase.from('replies').insert({
        post_id: post.id,
        author_id: currentUserId,
        content: replyContent,
      })
      if (error) throw error
      setReplyContent('')
      setIsReplying(false)
      toast.success('Replied')
      onUpdate()
    } catch {
      toast.error('Couldn\'t send reply. Try again.')
    } finally {
      setIsSubmittingReply(false)
    }
  }

  const handleEdit = async () => {
    if (!editContent.trim()) return
    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editContent })
        .eq('id', post.id)
      if (error) throw error
      setIsEditing(false)
      toast.success('Updated')
      onUpdate()
    } catch {
      toast.error('Couldn\'t update. Try again.')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this post? This cannot be undone.')) return
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id)
      if (error) throw error
      toast.success('Deleted')
      onUpdate()
    } catch {
      toast.error('Couldn\'t delete. Try again.')
    }
  }

  const handleReport = async () => {
    const reason = prompt('Why are you reporting this?')
    if (!reason) return
    try {
      const { error } = await supabase.from('reports').insert({
        post_id: post.id,
        reason,
      })
      if (error) throw error
      toast.success('Reported. We\'ll review it.')
    } catch {
      toast.error('Couldn\'t submit report.')
    }
  }

  const reactionCounts = post.reaction_counts || {
    been_there: 0,
    oof: 0,
    respect: 0,
    needed_this: 0,
  }

  return (
    <article className="border border-gray-200 rounded-lg p-4 dark:border-gray-800">
      <div className="flex items-start gap-3">
        <Avatar
          src={authorAvatar || undefined}
          fallbackName={authorName}
          className="h-10 w-10 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={post.pseudonym ? '#' : `/app/profile/${post.author_id}`}
              className="font-medium text-gray-950 hover:underline dark:text-white"
            >
              {authorName}
            </Link>
            {post.pseudonym && (
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                Pseudonymous
              </span>
            )}
            {authorContext && !post.pseudonym && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                · {authorContext}
              </span>
            )}
            <span className="text-sm text-gray-400 dark:text-gray-500">
              · {formatRelativeTime(post.created_at)}
            </span>
            {post.visibility !== 'public' && (
              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <VisibilityIcon className="h-3 w-3" />
                {post.visibility === 'circle' ? 'Circle' : 'Pseudonymous'}
              </span>
            )}
          </div>

            {post.thread && showThreadLink && (
            <Link
              href={`/app/threads/${post.thread.slug}`}
              className="mt-1 inline-block text-sm font-medium text-primary hover:text-primary-hover hover:underline"
            >
              #{post.thread.slug}
            </Link>
          )}

          <div className="mt-3 prose prose-sm max-w-none text-gray-950 dark:text-gray-100">
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEdit} disabled={isSubmittingReply}>
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{post.content}</p>
            )}
          </div>

          <div className="mt-4 flex items-center gap-4">
            {REACTIONS.map(({ type, label, icon }) => {
              const count = reactionCounts[type] || 0
              const isActive = post.user_reaction === type
              return (
                <Button
                  key={type}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn('gap-1 h-8 px-3', isActive && 'bg-primary/10 text-primary')}
                  onClick={() => handleReact(type)}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                  {count > 0 && <span className="text-xs">{count}</span>}
                </Button>
              )
            })}

            <Button
              variant="ghost"
              size="sm"
              className="gap-1 h-8 px-3 ml-auto"
              onClick={() => setIsReplying(!isReplying)}
            >
              <MessageCircle className="h-4 w-4" />
              <span>Reply</span>
              {post.reply_count && post.reply_count > 0 && (
                <span className="text-xs">{post.reply_count}</span>
              )}
            </Button>

            {showThreadLink && post.thread && (
              <Link
                href={`/app/threads/${post.thread.slug}`}
                className="text-sm text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-gray-200"
              >
                Open thread
              </Link>
            )}

            {isAuthor && (
              <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Post options</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => { setIsEditing(true); setShowDropdown(false); }}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => { handleDelete(); setShowDropdown(false); }} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => { handleReport(); setShowDropdown(false); }}>
                    <Flag className="mr-2 h-4 w-4" />
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isReplying && (
            <div className="mt-4 flex gap-3">
              <Avatar
                src={post.author?.avatar_url || undefined}
                fallbackName={post.author?.display_name || 'You'}
                className="h-8 w-8 shrink-0"
              />
              <div className="flex-1">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply"
                  className="min-h-[60px]"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsReplying(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleReply} disabled={isSubmittingReply || !replyContent.trim()}>
                    {isSubmittingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reply'}
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
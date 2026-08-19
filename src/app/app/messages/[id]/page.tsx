'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatRelativeTime } from '@/lib/utils'
import { DirectMessage, ProfileMinimal, Pseudonym } from '@/types'
import {
  ChevronLeft,
  Send,
  Loader2,
  UserCircle,
  User,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface ParticipantInfo {
  user_id: string
  pseudonym_id: string | null
  profile: ProfileMinimal | null
  pseudonym: Pseudonym | null
}

export default function ConversationDetailPage() {
  const params = useParams<{ id: string }>()
  const convId = params.id
  const { userId: currentUserId, isLoading: isUserLoading } = useCurrentUser()
  const router = useRouter()

  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [otherUser, setOtherUser] = useState<ParticipantInfo | null>(null)
  const [messageContent, setMessageContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [usePseudonym, setUsePseudonym] = useState(false)
  const [myPseudonym, setMyPseudonym] = useState<Pseudonym | null>(null)
  const [myProfile, setMyProfile] = useState<ProfileMinimal | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Fetch conversation data and messages
  const fetchConversation = useCallback(async (isBackground = false) => {
    if (!currentUserId || !convId) return

    try {
      if (!isBackground) {
        // 1. Fetch user pseudonym and profile
        const [pseudoRes, profRes] = await Promise.all([
          supabase.from('pseudonyms').select('*').eq('user_id', currentUserId).single(),
          supabase.from('profiles').select('*').eq('id', currentUserId).single(),
        ])
        if (pseudoRes.data) setMyPseudonym(pseudoRes.data)
        if (profRes.data) setMyProfile(profRes.data)

        // 2. Fetch conversation participants
        const { data: partData, error: partError } = await supabase
          .from('conversation_participants')
          .select('id, user_id, pseudonym_id')
          .eq('conversation_id', convId)

        if (partError || !partData || partData.length === 0) {
          toast.error('Conversation not found')
          router.push('/app/messages')
          return
        }

        const userIds = partData.map((p: { user_id: string }) => p.user_id)
        const pseudoIds = partData.map((p: { pseudonym_id: string | null }) => p.pseudonym_id).filter(Boolean)

        const [pRes, psRes] = await Promise.all([
          supabase.from('profiles').select('id, display_name, professional_context, avatar_url').in('id', userIds),
          pseudoIds.length > 0
            ? supabase.from('pseudonyms').select('id, display_name, avatar_url, user_id').in('id', pseudoIds)
            : Promise.resolve({ data: [] }),
        ])

        const pMap = new Map((pRes.data || []).map((p: ProfileMinimal) => [p.id, p]))
        const psMap = new Map((psRes.data || []).map((ps: Pseudonym) => [ps.id, ps]))

        const mappedParts: ParticipantInfo[] = partData.map((p: { user_id: string; pseudonym_id: string | null }) => ({
          user_id: p.user_id,
          pseudonym_id: p.pseudonym_id,
          profile: pMap.get(p.user_id) || null,
          pseudonym: p.pseudonym_id ? psMap.get(p.pseudonym_id) || null : null,
        }))

        const other = mappedParts.find(p => p.user_id !== currentUserId) || mappedParts[0]
        setOtherUser(other)
      }

      // 3. Fetch messages
      const { data: msgData } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })

      if (msgData) {
        // Fetch sender profiles & pseudonyms
        const senderIds = Array.from(new Set(msgData.map((m: { sender_id: string }) => m.sender_id)))
        const msgPseudoIds = Array.from(new Set(msgData.map((m: { pseudonym_id: string | null }) => m.pseudonym_id).filter(Boolean)))

        const [profDataRes, pseudoDataRes] = await Promise.all([
          supabase.from('profiles').select('id, display_name, professional_context, avatar_url').in('id', senderIds),
          msgPseudoIds.length > 0
            ? supabase.from('pseudonyms').select('id, display_name, avatar_url, user_id').in('id', msgPseudoIds)
            : Promise.resolve({ data: [] }),
        ])

        const senderMap = new Map((profDataRes.data || []).map((p: ProfileMinimal) => [p.id, p]))
        const pMap = new Map((pseudoDataRes.data || []).map((p: Pseudonym) => [p.id, p]))

        const assembled: DirectMessage[] = msgData.map((m: DirectMessage) => ({
          ...m,
          sender: senderMap.get(m.sender_id) || null,
          pseudonym: m.pseudonym_id ? pMap.get(m.pseudonym_id) || null : null,
        }))

        setMessages(assembled)
      }
    } catch (err) {
      console.error('Error fetching conversation detail:', err)
    } finally {
      setIsLoading(false)
    }
  }, [convId, currentUserId, router, supabase])

  useEffect(() => {
    const run = async () => {
      await fetchConversation()
    }
    run()
  }, [fetchConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Realtime subscription for instant message delivery
  useEffect(() => {
    if (!convId) return
    const channel = supabase
      .channel(`conv-${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${convId}`,
        },
        () => {
          fetchConversation(true)
        }
      )
      .subscribe()

    // Backup polling fallback
    const interval = setInterval(() => {
      fetchConversation(true)
    }, 6000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [convId, fetchConversation, supabase])

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const content = messageContent.trim()
    if (!content || !currentUserId || !convId) return

    setIsSending(true)
    try {
      const pseudonymId = usePseudonym && myPseudonym ? myPseudonym.id : null

      const { error } = await supabase.from('direct_messages').insert({
        conversation_id: convId,
        sender_id: currentUserId,
        pseudonym_id: pseudonymId,
        content,
      })

      if (error) throw error

      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId)

      setMessageContent('')
      await fetchConversation(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (isLoading || isUserLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const otherIsPseudonym = !!otherUser?.pseudonym_id
  const otherName = otherIsPseudonym
    ? otherUser?.pseudonym?.display_name || 'Anonymous Peer'
    : otherUser?.profile?.display_name || 'Member'
  const otherAvatar = otherIsPseudonym ? null : otherUser?.profile?.avatar_url
  const otherHeadline = otherIsPseudonym ? null : otherUser?.profile?.professional_context

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8.5rem)] rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/app/messages"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors shrink-0"
            title="Back to conversations"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          <Avatar
            src={otherAvatar || undefined}
            fallbackName={otherName}
            className="h-10 w-10 shrink-0 border border-gray-100 dark:border-gray-800"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gray-950 dark:text-white truncate">
                {otherName}
              </span>
              {otherIsPseudonym ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  <UserCircle className="h-3 w-3" />
                  Alias
                </span>
              ) : (
                <span title="Verified Member">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                </span>
              )}
            </div>
            {otherHeadline && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                {otherHeadline}
              </p>
            )}
          </div>
        </div>

        {/* Identity Indicator */}
        {myPseudonym && (
          <button
            type="button"
            onClick={() => setUsePseudonym(!usePseudonym)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all shrink-0 ${
              usePseudonym
                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
            }`}
            title="Click to toggle identity mode"
          >
            {usePseudonym ? (
              <>
                <UserCircle className="h-3.5 w-3.5" />
                <span>As Alias: {myPseudonym.display_name}</span>
              </>
            ) : (
              <>
                <User className="h-3.5 w-3.5 text-primary" />
                <span>As Real: {myProfile?.display_name || 'You'}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50 dark:bg-gray-950/40">
        {messages.length === 0 ? (
          <div className="text-center py-16 text-gray-400 space-y-2">
            <Sparkles className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="text-xs font-medium">This is the start of your direct conversation.</p>
            <p className="text-[11px]">Messages are encrypted at rest and private to participants.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            const isMsgPseudonym = !!msg.pseudonym_id
            const senderName = isMsgPseudonym
              ? msg.pseudonym?.display_name || 'Anonymous Peer'
              : msg.sender?.display_name || (isMe ? 'You' : 'Member')
            const avatarUrl = isMsgPseudonym ? null : msg.sender?.avatar_url

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <Avatar
                  src={avatarUrl || undefined}
                  fallbackName={senderName}
                  className="h-8 w-8 shrink-0 border border-gray-200/60 dark:border-gray-700/60 mt-1"
                />

                <div className={`max-w-[75%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-1.5 text-[11px] ${isMe ? 'justify-end text-gray-400' : 'justify-start text-gray-500'}`}>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{senderName}</span>
                    {isMsgPseudonym && (
                      <span className="text-[9px] bg-gray-200/80 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1 rounded">
                        Alias
                      </span>
                    )}
                    <span>· {formatRelativeTime(msg.created_at)}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-tr-xs shadow-xs'
                        : 'bg-white dark:bg-gray-800 text-gray-950 dark:text-white border border-gray-200 dark:border-gray-700 rounded-tl-xs shadow-xs'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
        <div className="flex items-end gap-2">
          <Textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              usePseudonym
                ? `Message ${otherName} as ${myPseudonym?.display_name || 'Alias'} (Enter to send)...`
                : `Message ${otherName} (Enter to send)...`
            }
            className="min-h-[44px] max-h-32 text-xs resize-none rounded-xl p-2.5 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus-visible:ring-1"
            rows={1}
            autoFocus
          />

          <Button
            type="submit"
            size="sm"
            disabled={isSending || !messageContent.trim()}
            className="h-10 px-4 rounded-xl shrink-0 gap-1.5"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

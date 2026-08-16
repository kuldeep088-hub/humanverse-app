'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatRelativeTime } from '@/lib/utils'
import { Conversation, ProfileMinimal, Pseudonym } from '@/types'
import {
  MessageSquare,
  Search,
  Plus,
  Loader2,
  UserCircle,
  User,
  ShieldCheck,
  Send,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface ParticipantRow {
  id: string
  conversation_id: string
  user_id: string
  pseudonym_id: string | null
  last_read_at: string | null
  profiles?: ProfileMinimal
  pseudonyms?: Pseudonym
}

export default function MessagesPage() {
  const { userId: currentUserId, isLoading: isUserLoading } = useCurrentUser()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileMinimal[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isStartingChat, setIsStartingChat] = useState(false)
  const [usePseudonymMode, setUsePseudonymMode] = useState(false)
  const [pseudonym, setPseudonym] = useState<Pseudonym | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return

    try {
      // 1. Get user pseudonym
      const { data: pseudoData } = await supabase
        .from('pseudonyms')
        .select('*')
        .eq('user_id', currentUserId)
        .single()
      if (pseudoData) setPseudonym(pseudoData)

      // 2. Get conversations user participates in
      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId)

      const convIds = (participantData || []).map((p: { conversation_id: string }) => p.conversation_id)

      if (convIds.length === 0) {
        setConversations([])
        setIsLoading(false)
        return
      }

      // 3. Fetch all participants and recent message for these conversations
      const [participantsRes, messagesRes] = await Promise.all([
        supabase
          .from('conversation_participants')
          .select('id, conversation_id, user_id, pseudonym_id, last_read_at')
          .in('conversation_id', convIds),
        supabase
          .from('direct_messages')
          .select('id, conversation_id, sender_id, pseudonym_id, content, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false }),
      ])

      const allParticipants = participantsRes.data || []
      const allMessages = messagesRes.data || []

      // Fetch profiles & pseudonyms for participants
      const userIds = Array.from(new Set(allParticipants.map((p: ParticipantRow) => p.user_id)))
      const pseudoIds = Array.from(new Set(allParticipants.map((p: ParticipantRow) => p.pseudonym_id).filter(Boolean)))

      const [profilesRes, pseudoRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from('profiles').select('id, display_name, professional_context, avatar_url').in('id', userIds)
          : Promise.resolve({ data: [] }),
        pseudoIds.length > 0
          ? supabase.from('pseudonyms').select('id, display_name, avatar_url, user_id').in('id', pseudoIds)
          : Promise.resolve({ data: [] }),
      ])

      const profMap = new Map((profilesRes.data || []).map((p: ProfileMinimal) => [p.id, p]))
      const pMap = new Map((pseudoRes.data || []).map((p: Pseudonym) => [p.id, p]))

      const convList: Conversation[] = convIds.map((cId: string) => {
        const parts = allParticipants
          .filter((p: ParticipantRow) => p.conversation_id === cId)
          .map((p: ParticipantRow) => ({
            ...p,
            profile: profMap.get(p.user_id) || null,
            pseudonym: p.pseudonym_id ? pMap.get(p.pseudonym_id) || null : null,
          }))

        const lastMsg = allMessages.find((m: { conversation_id: string }) => m.conversation_id === cId) || null

        return {
          id: cId,
          created_at: new Date().toISOString(),
          updated_at: lastMsg ? lastMsg.created_at : new Date().toISOString(),
          participants: parts,
          last_message: lastMsg ? {
            ...lastMsg,
            sender: profMap.get(lastMsg.sender_id) || null,
            pseudonym: lastMsg.pseudonym_id ? pMap.get(lastMsg.pseudonym_id) || null : null,
          } : null,
        }
      })

      convList.sort((a, b) => {
        const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0
        const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0
        return timeB - timeA
      })

      setConversations(convList)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentUserId, supabase])

  useEffect(() => {
    const run = async () => {
      await fetchConversations()
    }
    run()
  }, [fetchConversations])

  // Live user search for starting a new chat
  useEffect(() => {
    const q = searchQuery.trim()
    let isMounted = true

    if (!q) {
      const timer = setTimeout(() => {
        if (isMounted) setSearchResults([])
      }, 0)
      return () => {
        isMounted = false
        clearTimeout(timer)
      }
    }

    const search = async () => {
      setIsSearching(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, professional_context, avatar_url')
        .ilike('display_name', `%${q}%`)
        .neq('id', currentUserId || '')
        .limit(8)

      if (isMounted) {
        setSearchResults((data as ProfileMinimal[]) || [])
        setIsSearching(false)
      }
    }

    const timer = setTimeout(search, 200)
    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [searchQuery, currentUserId, supabase])

  const handleStartConversation = async (targetUser: ProfileMinimal) => {
    if (!currentUserId) return
    setIsStartingChat(true)

    try {
      // 1. Check if conversation already exists between current user & targetUser
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId)

      const myConvIds = (myConvs || []).map((c: { conversation_id: string }) => c.conversation_id)

      if (myConvIds.length > 0) {
        const { data: sharedConvs } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', targetUser.id)
          .in('conversation_id', myConvIds)

        if (sharedConvs && sharedConvs.length > 0) {
          const existingId = sharedConvs[0].conversation_id
          setShowNewModal(false)
          router.push(`/app/messages/${existingId}`)
          return
        }
      }

      // 2. Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single()

      if (convError || !newConv) throw convError || new Error('Could not create conversation')

      // 3. Add participants
      await supabase.from('conversation_participants').insert([
        {
          conversation_id: newConv.id,
          user_id: currentUserId,
          pseudonym_id: usePseudonymMode && pseudonym ? pseudonym.id : null,
        },
        {
          conversation_id: newConv.id,
          user_id: targetUser.id,
          pseudonym_id: null,
        },
      ])

      toast.success(`Chat started with ${targetUser.display_name}`)
      setShowNewModal(false)
      router.push(`/app/messages/${newConv.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start chat')
    } finally {
      setIsStartingChat(false)
    }
  }

  if (isLoading || isUserLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Peer Messages
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Private 1:1 candid discussions. Switch between your verified name and pseudonym alias at will.
          </p>
        </div>

        <Button onClick={() => setShowNewModal(true)} className="gap-1.5 shrink-0 rounded-xl shadow-xs">
          <Plus className="h-4 w-4" />
          New Message
        </Button>
      </div>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400 space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h2 className="text-base font-semibold text-gray-950 dark:text-white">No active conversations</h2>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Connect directly with colleagues, founders, or peers to discuss career advice, offers, or shared experiences in confidence.
          </p>
          <Button onClick={() => setShowNewModal(true)} variant="outline" className="gap-1.5 text-xs mt-2">
            <Plus className="h-4 w-4" />
            Start a Conversation
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden shadow-sm">
          {conversations.map((conv) => {
            const otherParticipant = conv.participants.find(p => p.user_id !== currentUserId)
            const isPseudonymous = !!otherParticipant?.pseudonym_id
            const displayName = isPseudonymous
              ? otherParticipant?.pseudonym?.display_name || 'Anonymous Peer'
              : otherParticipant?.profile?.display_name || 'Community Member'
            const avatarUrl = isPseudonymous ? null : otherParticipant?.profile?.avatar_url
            const headline = isPseudonymous ? null : otherParticipant?.profile?.professional_context

            return (
              <Link
                key={conv.id}
                href={`/app/messages/${conv.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Avatar
                    src={avatarUrl || undefined}
                    fallbackName={displayName}
                    className="h-11 w-11 shrink-0 border border-gray-100 dark:border-gray-800"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-950 dark:text-white truncate group-hover:text-primary transition-colors">
                        {displayName}
                      </span>
                      {isPseudonymous ? (
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

                    {headline && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                        {headline}
                      </p>
                    )}

                    {conv.last_message ? (
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-1">
                        <span className="font-medium text-gray-500 dark:text-gray-400">
                          {conv.last_message.sender_id === currentUserId ? 'You: ' : ''}
                        </span>
                        {conv.last_message.content}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic mt-1">No messages yet</p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 ml-4">
                  {conv.last_message && (
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      {formatRelativeTime(conv.last_message.created_at)}
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1 ml-auto" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Start New Conversation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-950 dark:text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                New Direct Message
              </h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Identity Mode Toggle */}
              {pseudonym && (
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Identity Mode
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUsePseudonymMode(false)}
                      className={`p-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                        !usePseudonymMode
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800'
                      }`}
                    >
                      <User className="h-3.5 w-3.5" />
                      Real Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsePseudonymMode(true)}
                      className={`p-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                        usePseudonymMode
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800'
                      }`}
                    >
                      <UserCircle className="h-3.5 w-3.5" />
                      Alias ({pseudonym.display_name})
                    </button>
                  </div>
                </div>
              )}

              {/* Search User Input */}
              <div className="space-y-1.5">
                <Label htmlFor="search-user" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Search member to message
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="search-user"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type name (e.g. Alex, Priya, Marcus)..."
                    className="pl-9 h-9 text-xs"
                    autoFocus
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-gray-400" />
                  )}
                </div>
              </div>

              {/* Results List */}
              {searchResults.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleStartConversation(user)}
                      disabled={isStartingChat}
                      className="w-full flex items-center justify-between p-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar src={user.avatar_url || undefined} fallbackName={user.display_name} className="h-8 w-8 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-950 dark:text-white truncate">{user.display_name}</p>
                          {user.professional_context && (
                            <p className="text-[10px] text-gray-400 truncate">{user.professional_context}</p>
                          )}
                        </div>
                      </div>
                      <Send className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              ) : searchQuery && !isSearching ? (
                <p className="text-xs text-gray-400 text-center py-4">No community members found.</p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

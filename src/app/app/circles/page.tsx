'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Avatar } from '@/components/ui/avatar'
import {
  Plus,
  Users,
  UserPlus,
  UserMinus,
  Trash2,
  MoreHorizontal,
  Lock,
  Loader2,
  X,
  Search,
  CheckCircle2,
  Link as LinkIcon,
  Share2,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'

interface Circle {
  id: string
  name: string
  owner_id: string
  created_at: string
  member_count?: number
}

interface CircleRow {
  id: string
  name: string
  owner_id: string
  created_at: string
  members: { count: number }[]
}

interface MemberProfile {
  id: string
  display_name: string
  professional_context: string | null
  avatar_url: string | null
}

export default function CirclesPage() {
  const [circles, setCircles] = useState<Circle[]>([])
  const [activeFilter, setActiveFilter] = useState<'all' | 'owner' | 'joined'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newCircleName, setNewCircleName] = useState('')
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null)
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [showMembers, setShowMembers] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MemberProfile[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [copiedCircleId, setCopiedCircleId] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const joinCircleId = searchParams.get('join')

  const { userId: currentUserId, isLoading: isUserLoading } = useCurrentUser()
  const supabase = createClient()

  const fetchCircles = useCallback(async () => {
    if (!currentUserId) return

    // Fetch circles where user is owner OR user is a member
    const { data: memberCircleIds } = await supabase
      .from('circle_members')
      .select('circle_id')
      .eq('user_id', currentUserId)

    const circleIds = (memberCircleIds || []).map((m: { circle_id: string }) => m.circle_id)

    const query = supabase
      .from('circles')
      .select(`
        *,
        members:circle_members(count)
      `)

    if (circleIds.length > 0) {
      query.or(`owner_id.eq.${currentUserId},id.in.(${circleIds.join(',')})`)
    } else {
      query.eq('owner_id', currentUserId)
    }

    const { data } = await query.order('created_at', { ascending: false })

    setCircles((data || []).map((c: CircleRow) => ({
      ...c,
      member_count: c.members?.[0]?.count || 0,
    })))
    setIsLoading(false)
  }, [currentUserId, supabase])

  // Handle ?join= query param
  useEffect(() => {
    if (!joinCircleId || !currentUserId) return

    const handleAutoJoin = async () => {
      // Check if already in circle
      const { data: existing } = await supabase
        .from('circle_members')
        .select('id')
        .eq('circle_id', joinCircleId)
        .eq('user_id', currentUserId)
        .single()

      if (existing) {
        toast.info('You are already a member of this circle.')
        router.replace('/app/circles')
        return
      }

      // Check if circle exists
      const { data: targetCircle } = await supabase
        .from('circles')
        .select('name')
        .eq('id', joinCircleId)
        .single()

      if (!targetCircle) {
        toast.error('Circle invite link is invalid or expired.')
        router.replace('/app/circles')
        return
      }

      const { error } = await supabase.from('circle_members').insert({
        circle_id: joinCircleId,
        user_id: currentUserId,
      })

      if (!error) {
        toast.success(`You joined circle "${targetCircle.name}"!`)
        fetchCircles()
      }
      router.replace('/app/circles')
    }

    handleAutoJoin()
  }, [joinCircleId, currentUserId, supabase, router, fetchCircles])

  useEffect(() => {
    const run = async () => {
      await fetchCircles()
    }
    run()
  }, [fetchCircles])

  const fetchMembers = async (circleId: string) => {
    const { data: memberRows } = await supabase
      .from('circle_members')
      .select('user_id')
      .eq('circle_id', circleId)

    const userIds = (memberRows || []).map((m: { user_id: string }) => m.user_id)
    if (userIds.length === 0) {
      setMembers([])
      return
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, professional_context, avatar_url')
      .in('id', userIds)

    setMembers((profiles as MemberProfile[]) || [])
  }

  // Live search users for invitation
  useEffect(() => {
    const query = userSearchQuery.trim()
    if (!query) return

    let isMounted = true
    const searchUsers = async () => {
      setIsSearchingUsers(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, professional_context, avatar_url')
        .ilike('display_name', `%${query}%`)
        .limit(6)

      if (isMounted) {
        setSearchResults((data as MemberProfile[]) || [])
        setIsSearchingUsers(false)
      }
    }

    const timer = setTimeout(searchUsers, 250)
    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [userSearchQuery, supabase])

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCircleName.trim() || !currentUserId) return

    setIsActionLoading(true)
    try {
      // 1. Insert circle
      const { data: newCircle, error: circleError } = await supabase
        .from('circles')
        .insert({
          name: newCircleName.trim(),
          owner_id: currentUserId,
        })
        .select()
        .single()

      if (circleError) throw circleError

      // 2. Automatically add owner to circle_members
      if (newCircle) {
        await supabase.from('circle_members').insert({
          circle_id: newCircle.id,
          user_id: currentUserId,
        })
      }

      toast.success(`Circle "${newCircleName.trim()}" created!`)
      setNewCircleName('')
      setShowCreate(false)
      fetchCircles()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create circle')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleCopyInviteLink = (circle: Circle) => {
    if (typeof window !== 'undefined') {
      const inviteUrl = `${window.location.origin}/app/circles?join=${circle.id}`
      navigator.clipboard.writeText(inviteUrl)
      setCopiedCircleId(circle.id)
      toast.success(`Invite link for "${circle.name}" copied to clipboard!`)
      setTimeout(() => setCopiedCircleId(null), 2500)
    }
  }

  const handleInviteUser = async (targetUser: MemberProfile) => {
    if (!selectedCircle) return

    if (members.some(m => m.id === targetUser.id)) {
      toast.info(`${targetUser.display_name} is already a member`)
      return
    }

    setIsActionLoading(true)
    try {
      const { error } = await supabase.from('circle_members').insert({
        circle_id: selectedCircle.id,
        user_id: targetUser.id,
      })

      if (error) throw error

      toast.success(`${targetUser.display_name} added to ${selectedCircle.name}`)
      setUserSearchQuery('')
      setSearchResults([])
      await fetchMembers(selectedCircle.id)
      fetchCircles()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add member')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!selectedCircle) return
    if (!confirm(`Remove ${memberName} from this circle?`)) return

    setIsActionLoading(true)
    try {
      const { error } = await supabase
        .from('circle_members')
        .delete()
        .match({ circle_id: selectedCircle.id, user_id: memberUserId })

      if (error) throw error

      toast.success(`${memberName} removed`)
      await fetchMembers(selectedCircle.id)
      fetchCircles()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove member')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleLeaveCircle = async (circleId: string, circleName: string) => {
    if (!currentUserId) return
    if (!confirm(`Are you sure you want to leave "${circleName}"?`)) return

    setIsActionLoading(true)
    try {
      const { error } = await supabase
        .from('circle_members')
        .delete()
        .match({ circle_id: circleId, user_id: currentUserId })

      if (error) throw error

      toast.success(`Left circle "${circleName}"`)
      fetchCircles()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not leave circle')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDeleteCircle = async (circleId: string, circleName: string) => {
    if (!confirm(`Permanently delete circle "${circleName}"? All private posts inside will be removed.`)) return

    setIsActionLoading(true)
    try {
      const { error } = await supabase.from('circles').delete().eq('id', circleId)
      if (error) throw error

      toast.success(`Circle "${circleName}" deleted`)
      if (selectedCircle?.id === circleId) {
        setShowMembers(false)
        setSelectedCircle(null)
      }
      fetchCircles()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete circle')
    } finally {
      setIsActionLoading(false)
    }
  }

  const filteredCircles = circles.filter(c => {
    if (activeFilter === 'owner') return c.owner_id === currentUserId
    if (activeFilter === 'joined') return c.owner_id !== currentUserId
    return true
  })

  if (isLoading || isUserLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Private Circles
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-lg">
            Small, trusted spaces for honest peer conversations. Circle posts are strictly private to members and never indexed publicly.
          </p>
        </div>

        <Button
          onClick={() => setShowCreate(true)}
          className="gap-1.5 shrink-0 rounded-xl shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Create Circle
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeFilter === 'all'
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
          }`}
        >
          All Circles ({circles.length})
        </button>
        <button
          onClick={() => setActiveFilter('owner')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeFilter === 'owner'
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
          }`}
        >
          Created by You ({circles.filter(c => c.owner_id === currentUserId).length})
        </button>
        <button
          onClick={() => setActiveFilter('joined')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeFilter === 'joined'
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
          }`}
        >
          Member Of ({circles.filter(c => c.owner_id !== currentUserId).length})
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-950 dark:text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                New Private Circle
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCircle} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="circleName" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Circle Name
                </Label>
                <Input
                  id="circleName"
                  value={newCircleName}
                  onChange={(e) => setNewCircleName(e.target.value)}
                  placeholder="e.g. YC Founders, Design Leads, Stealth Club"
                  required
                  autoFocus
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isActionLoading || !newCircleName.trim()}>
                  {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Create Circle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Management Drawer Modal */}
      {showMembers && selectedCircle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-base font-bold text-gray-950 dark:text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  {selectedCircle.name}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{members.length} active members</p>
              </div>
              <button
                onClick={() => {
                  setShowMembers(false)
                  setSelectedCircle(null)
                  setUserSearchQuery('')
                  setSearchResults([])
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Copy Invite Link in Drawer */}
            <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">Shareable Circle Invite</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">Anyone with this link can join this circle</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyInviteLink(selectedCircle)}
                className="gap-1.5 text-xs shrink-0"
              >
                {copiedCircleId === selectedCircle.id ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-3.5 w-3.5" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>

            {/* Invite New User Search Box */}
            {selectedCircle.owner_id === currentUserId && (
              <div className="mt-4 space-y-2">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Invite Member by Name
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search name to invite..."
                    className="pl-9 h-9 text-xs"
                  />
                  {isSearchingUsers && (
                    <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-gray-400" />
                  )}
                </div>

                {/* User Search Results */}
                {searchResults.length > 0 && (
                  <div className="p-2 rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/60 space-y-1">
                    {searchResults.map(user => {
                      const isAlreadyMember = members.some(m => m.id === user.id)
                      return (
                        <div key={user.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar src={user.avatar_url || undefined} fallbackName={user.display_name} className="h-7 w-7" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-950 dark:text-white truncate">{user.display_name}</p>
                              {user.professional_context && (
                                <p className="text-[10px] text-gray-400 truncate">{user.professional_context}</p>
                              )}
                            </div>
                          </div>

                          {isAlreadyMember ? (
                            <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              Member
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleInviteUser(user)}
                              disabled={isActionLoading}
                              className="h-6 text-[11px] px-2.5 gap-1"
                            >
                              <UserPlus className="h-3 w-3" />
                              Add
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Members List */}
            <div className="mt-5 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Current Members ({members.length})
              </span>
              <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                {members.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={member.avatar_url || undefined} fallbackName={member.display_name} className="h-8 w-8" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-950 dark:text-white truncate">
                          {member.display_name}
                          {member.id === selectedCircle.owner_id && (
                            <span className="ml-1.5 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                              Owner
                            </span>
                          )}
                        </p>
                        {member.professional_context && (
                          <p className="text-[10px] text-gray-400 truncate">{member.professional_context}</p>
                        )}
                      </div>
                    </div>

                    {selectedCircle.owner_id === currentUserId && member.id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id, member.display_name)}
                        className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <UserMinus className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Circles Grid */}
      {filteredCircles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <Users className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            {activeFilter === 'owner' ? 'You haven’t created any circles yet' : 'No circles found'}
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Circles are invite-only trusted groups where discussions are kept 100% private.
          </p>
          <Button onClick={() => setShowCreate(true)} className="mt-4">
            Create Your First Circle
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredCircles.map(circle => {
            const isOwner = circle.owner_id === currentUserId
            const isCopied = copiedCircleId === circle.id

            return (
              <div
                key={circle.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-all hover:border-gray-300 dark:hover:border-gray-700 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300 font-bold">
                        <Lock className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="font-bold text-sm text-gray-950 dark:text-white">{circle.name}</h2>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          {circle.member_count} {circle.member_count === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isOwner && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          Owner
                        </span>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel className="text-xs">Circle Options</DropdownMenuLabel>
                          <DropdownMenuItem
                            onSelect={() => {
                              setSelectedCircle(circle)
                              setShowMembers(true)
                              fetchMembers(circle.id)
                            }}
                          >
                            <Users className="mr-2 h-3.5 w-3.5" />
                            Manage Members
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleCopyInviteLink(circle)}>
                            <Share2 className="mr-2 h-3.5 w-3.5" />
                            Copy Invite Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {isOwner ? (
                            <DropdownMenuItem
                              onSelect={() => handleDeleteCircle(circle.id, circle.name)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete Circle
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() => handleLeaveCircle(circle.id, circle.name)}
                              className="text-red-600"
                            >
                              <UserMinus className="mr-2 h-3.5 w-3.5" />
                              Leave Circle
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Footer Controls on Card */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCircle(circle)
                      setShowMembers(true)
                      fetchMembers(circle.id)
                    }}
                    className="text-xs h-7 gap-1"
                  >
                    <Users className="h-3 w-3" />
                    Members
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyInviteLink(circle)}
                    className="text-xs h-7 gap-1 text-gray-500 hover:text-primary"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        Link Copied
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3 w-3" />
                        Share Invite
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
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
} from 'lucide-react'
import { toast } from 'sonner'

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

  useEffect(() => {
    const run = async () => {
      await fetchCircles()
    }
    run()
  }, [fetchCircles])

  const fetchMembers = async (circleId: string) => {
    const { data } = await supabase
      .from('circle_members')
      .select(`
        user:profiles!circle_members_user_id_fkey(id, display_name, professional_context, avatar_url)
      `)
      .eq('circle_id', circleId)

    interface MemberRow {
      user: MemberProfile | null
    }

    const membersData = (data || []) as unknown as MemberRow[]
    setMembers(membersData.map(m => m.user).filter((u): u is MemberProfile => !!u))
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

  const handleInviteUser = async (targetUser: MemberProfile) => {
    if (!selectedCircle) return

    // Check if already in circle
    if (members.some(m => m.id === targetUser.id)) {
      toast.info(`${targetUser.display_name} is already a member`)
      return
    }

    try {
      const { error } = await supabase.from('circle_members').insert({
        circle_id: selectedCircle.id,
        user_id: targetUser.id,
      })

      if (error) throw error

      toast.success(`Added ${targetUser.display_name} to circle!`)
      setUserSearchQuery('')
      setSearchResults([])
      fetchMembers(selectedCircle.id)
      fetchCircles()
    } catch {
      toast.error('Could not add member')
    }
  }

  const handleRemoveMember = async (circleId: string, memberId: string, name: string) => {
    try {
      const { error } = await supabase
        .from('circle_members')
        .delete()
        .eq('circle_id', circleId)
        .eq('user_id', memberId)

      if (error) throw error

      toast.success(`Removed ${name}`)
      fetchMembers(circleId)
      fetchCircles()
    } catch {
      toast.error('Could not remove member')
    }
  }

  const handleLeaveCircle = async (circleId: string) => {
    if (!confirm('Leave this circle?')) return
    try {
      const { error } = await supabase
        .from('circle_members')
        .delete()
        .eq('circle_id', circleId)
        .eq('user_id', currentUserId)

      if (error) throw error

      toast.success('Left circle')
      setShowMembers(false)
      fetchCircles()
    } catch {
      toast.error('Could not leave circle')
    }
  }

  const handleDeleteCircle = async (circleId: string) => {
    if (!confirm('Are you sure you want to delete this circle? Posts in this circle will also be removed.')) return
    try {
      const { error } = await supabase.from('circles').delete().eq('id', circleId)
      if (error) throw error

      toast.success('Circle deleted')
      setShowMembers(false)
      fetchCircles()
    } catch {
      toast.error('Could not delete circle')
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            My Circles
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Private trust-based spaces to share candid posts exclusively with chosen peers.
          </p>
        </div>

        <Button onClick={() => setShowCreate(true)} className="gap-1.5 self-start sm:self-center shadow-sm">
          <Plus className="h-4 w-4" />
          Create Circle
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeFilter === 'all'
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          All Circles ({circles.length})
        </button>
        <button
          onClick={() => setActiveFilter('owner')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeFilter === 'owner'
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          Created by Me ({circles.filter(c => c.owner_id === currentUserId).length})
        </button>
        <button
          onClick={() => setActiveFilter('joined')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeFilter === 'joined'
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          Joined Circles ({circles.filter(c => c.owner_id !== currentUserId).length})
        </button>
      </div>

      {/* Circles List */}
      {filteredCircles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <Users className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">No circles found</p>
          <p className="mt-1 text-sm max-w-md mx-auto">
            Circles let you post things you only want specific co-workers, mentors, or trusted friends to read.
          </p>
          <Button onClick={() => setShowCreate(true)} className="mt-4 gap-1.5">
            <Plus className="h-4 w-4" />
            Create Your First Circle
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredCircles.map(circle => {
            const isOwner = circle.owner_id === currentUserId
            return (
              <div
                key={circle.id}
                className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-base text-gray-950 dark:text-white">
                          {circle.name}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                            isOwner
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                          }`}>
                            {isOwner ? 'Owner' : 'Member'}
                          </span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {circle.member_count || 1} {(circle.member_count || 1) === 1 ? 'member' : 'members'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>{circle.name}</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => {
                          setSelectedCircle(circle)
                          setShowMembers(true)
                          fetchMembers(circle.id)
                        }}>
                          <Users className="mr-2 h-4 w-4" />
                          Manage Members
                        </DropdownMenuItem>
                        {isOwner ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => handleDeleteCircle(circle.id)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Circle
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => handleLeaveCircle(circle.id)} className="text-red-600">
                              <UserMinus className="mr-2 h-4 w-4" />
                              Leave Circle
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-medium gap-1.5"
                    onClick={() => {
                      setSelectedCircle(circle)
                      setShowMembers(true)
                      fetchMembers(circle.id)
                    }}
                  >
                    <UserPlus className="h-3.5 w-3.5 text-primary" />
                    Members & Invites
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Circle Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-950 dark:text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Create a Private Circle
              </h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCircle} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="circleName" className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  Circle Name
                </Label>
                <Input
                  id="circleName"
                  value={newCircleName}
                  onChange={(e) => setNewCircleName(e.target.value)}
                  placeholder="e.g. Design Leadership, Ex-Founders, Close Team"
                  className="mt-1"
                  required
                  autoFocus
                />
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  Posts shared to this circle will only ever be visible to its members.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isActionLoading || !newCircleName.trim()}>
                  {isActionLoading ? 'Creating...' : 'Create Circle'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members & Invite Management Modal */}
      {showMembers && selectedCircle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-gray-950 dark:text-white">
                  {selectedCircle.name}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Manage circle members & invite trusted peers
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMembers(false)
                  setUserSearchQuery('')
                  setSearchResults([])
                }}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Invite Peer Search */}
            <div className="mt-4 space-y-2">
              <Label htmlFor="searchUsers" className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Invite Member by Name
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="searchUsers"
                  value={userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value)
                    if (!e.target.value.trim()) setSearchResults([])
                  }}
                  placeholder="Search user by display name..."
                  className="pl-9"
                />
                {isSearchingUsers && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>

              {/* Search Suggestions */}
              {searchResults.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-800/60 space-y-1">
                  {searchResults.map(user => {
                    const isAlreadyMember = members.some(m => m.id === user.id)
                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar src={user.avatar_url || undefined} fallbackName={user.display_name} className="h-8 w-8" />
                          <div>
                            <p className="text-xs font-semibold text-gray-950 dark:text-white">{user.display_name}</p>
                            {user.professional_context && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">{user.professional_context}</p>
                            )}
                          </div>
                        </div>

                        {isAlreadyMember ? (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Member
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleInviteUser(user)}
                            className="h-7 px-2.5 text-xs gap-1"
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

            {/* Current Members List */}
            <div className="mt-6 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Current Members ({members.length})
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {members.map(member => {
                  const isMemberOwner = selectedCircle.owner_id === member.id
                  const canRemove = selectedCircle.owner_id === currentUserId && member.id !== currentUserId

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={member.avatar_url || undefined}
                          fallbackName={member.display_name}
                          className="h-9 w-9"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-950 dark:text-white">
                              {member.display_name}
                            </span>
                            {isMemberOwner && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 px-1.5 py-0.2 rounded font-medium">
                                Owner
                              </span>
                            )}
                          </div>
                          {member.professional_context && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {member.professional_context}
                            </p>
                          )}
                        </div>
                      </div>

                      {canRemove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(selectedCircle.id, member.id, member.display_name)}
                          className="text-red-500 hover:text-red-700 h-8 px-2"
                          title="Remove from circle"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMembers(false)
                  setUserSearchQuery('')
                  setSearchResults([])
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
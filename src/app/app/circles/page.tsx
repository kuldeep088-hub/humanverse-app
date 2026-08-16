'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Avatar } from '@/components/ui/avatar'
import { Plus, Users, UserPlus, UserMinus, Trash2, MoreHorizontal } from 'lucide-react'
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

export default function CirclesPage() {
  const [circles, setCircles] = useState<Circle[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newCircleName, setNewCircleName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null)
  const [members, setMembers] = useState<{ id: string; display_name: string; avatar_url: string | null }[]>([])
  const [showMembers, setShowMembers] = useState(false)
  const { userId: currentUserId } = useCurrentUser()
  const supabase = createClient()

  const fetchCircles = useCallback(async () => {
    if (!currentUserId) return

    const { data } = await supabase
      .from('circles')
      .select(`
        *,
        members:circle_members(count)
      `)
      .or(`owner_id.eq.${currentUserId},id.in.(select circle_id from circle_members where user_id = '${currentUserId}')`)

    setCircles((data || []).map((c: CircleRow) => ({
      ...c,
      member_count: c.members?.[0]?.count || 0,
    })))
  }, [currentUserId, supabase])

  useEffect(() => {
    // Use mock user for now
    const run = async () => {
      await fetchCircles()
    }
    run()
  }, [fetchCircles])

  const fetchMembers = async (circleId: string) => {
    const { data } = await supabase
      .from('circle_members')
      .select(`
        user:profiles!circle_members_user_id_fkey(id, display_name, avatar_url)
      `)
      .eq('circle_id', circleId)

    const membersData = (data || []) as unknown as { user: { id: string; display_name: string; avatar_url: string | null } | null }[]
    setMembers(membersData.map(m => m.user).filter((u): u is { id: string; display_name: string; avatar_url: string | null } => !!u))
  }

  const handleCreate = async () => {
    if (!newCircleName.trim()) return
    try {
      const { error } = await supabase.from('circles').insert({
        name: newCircleName,
        owner_id: currentUserId,
      })
      if (error) throw error
      toast.success('Circle created')
      setNewCircleName('')
      setShowCreate(false)
      fetchCircles()
    } catch {
      toast.error('Could not create circle')
    }
  }

  const handleInvite = async (circleId: string) => {
    if (!inviteEmail.trim()) return
    try {
      const { data: invitee } = await supabase
        .from('profiles')
        .select('id')
        .eq('display_name', inviteEmail)
        .single()

      if (!invitee) {
        toast.error('User not found')
        return
      }

      const { error } = await supabase.from('circle_members').insert({
        circle_id: circleId,
        user_id: invitee.id,
      })
      if (error) throw error

      toast.success('Invited')
      setInviteEmail('')
      fetchMembers(circleId)
    } catch {
      toast.error('Could not invite')
    }
  }

  const handleLeave = async (circleId: string) => {
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
      toast.error('Could not leave')
    }
  }

  const handleDelete = async (circleId: string) => {
    if (!confirm('Delete this circle? This cannot be undone.')) return
    try {
      const { error } = await supabase.from('circles').delete().eq('id', circleId)
      if (error) throw error
      toast.success('Circle deleted')
      setShowMembers(false)
      fetchCircles()
    } catch {
      toast.error('Could not delete')
    }
  }

  const handleRemoveMember = async (circleId: string, memberId: string) => {
    try {
      const { error } = await supabase
        .from('circle_members')
        .delete()
        .eq('circle_id', circleId)
        .eq('user_id', memberId)
      if (error) throw error
      toast.success('Removed')
      fetchMembers(circleId)
    } catch {
      toast.error('Could not remove')
    }
  }

  const isOwner = (circle: Circle) => circle.owner_id === currentUserId
  const isNotCurrentUser = (memberId: string) => memberId !== currentUserId

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium text-gray-950 dark:text-white">Circles</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New circle
        </Button>
      </div>

      {circles.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Users className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-4 text-lg">No circles yet</p>
          <p className="mt-1 text-sm">Create a circle to share posts with a private group</p>
        </div>
      ) : (
        <div className="space-y-3">
          {circles.map(circle => (
            <div
              key={circle.id}
              className="border border-gray-200 rounded-lg p-4 dark:border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-950 dark:text-white">{circle.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {circle.member_count} member{circle.member_count !== 1 ? 's' : ''}
                      {isOwner(circle) && ' · You\'re the owner'}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{circle.name}</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => { setSelectedCircle(circle); setShowMembers(true); fetchMembers(circle.id); }}>
                      <Users className="mr-2 h-4 w-4" />
                      View members
                    </DropdownMenuItem>
                    {isOwner(circle) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleDelete(circle.id)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete circle
                        </DropdownMenuItem>
                      </>
                    )}
                    {!isOwner(circle) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleLeave(circle.id)} className="text-red-600">
                          <UserMinus className="mr-2 h-4 w-4" />
                          Leave circle
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-800">
          <h3 className="font-medium text-gray-950 dark:text-white">New circle</h3>
          <div className="mt-4 flex gap-2">
            <Input
              value={newCircleName}
              onChange={(e) => setNewCircleName(e.target.value)}
              placeholder="Circle name"
              className="flex-1"
            />
            <Button onClick={handleCreate}>Create</Button>
            <Button variant="ghost" onClick={() => { setShowCreate(false); setNewCircleName(''); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showMembers && selectedCircle && (
        <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-950 dark:text-white">{selectedCircle.name} members</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowMembers(false)}>
              Done
            </Button>
          </div>

          <div className="mb-4 flex gap-2">
            <Input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email or display name to invite"
              className="flex-1"
            />
            <Button onClick={() => handleInvite(selectedCircle.id)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={member.avatar_url || undefined}
                    fallbackName={member.display_name}
                    className="h-8 w-8"
                  />
                  <span className="font-medium text-gray-950 dark:text-white">{member.display_name}</span>
                </div>
                {isOwner(selectedCircle) && isNotCurrentUser(member.id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(selectedCircle.id, member.id)}
                    className="text-red-600 hover:text-red-600"
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
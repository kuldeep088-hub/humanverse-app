'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, User, Briefcase, Image as ImageIcon, Mail, Lock, AlertCircle, Users } from 'lucide-react'
import Image from 'next/image'

type SettingsTab = 'account' | 'security' | 'privacy' | 'notifications' | 'pseudonym' | 'circles'

const TABS: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'privacy', label: 'Privacy', icon: AlertCircle },
  { id: 'notifications', label: 'Notifications', icon: Mail },
  { id: 'pseudonym', label: 'Pseudonym', icon: User },
  { id: 'circles', label: 'Circles', icon: Users },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const [displayName, setDisplayName] = useState('')
  const [professionalContext, setProfessionalContext] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pseudonymName, setPseudonymName] = useState('')
  const [hasPseudonym, setHasPseudonym] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [saveType, setSaveType] = useState<'account' | 'security' | 'pseudonym' | ''>('')
  const supabase = createClient()
  const { userId } = useCurrentUser()

  const fetchProfile = useCallback(async () => {
    if (!userId) return
    const mockUserId = userId

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', mockUserId)
      .single()

    if (profile) {
      setDisplayName(profile.display_name)
      setProfessionalContext(profile.professional_context || '')
      setAvatarPreview(profile.avatar_url || null)
      const { data: { user } } = await supabase.auth.getUser()
      setEmail(user?.email || '')
    }

    const { data: pseudo } = await supabase
      .from('pseudonyms')
      .select('display_name')
      .eq('user_id', mockUserId)
      .single()

    if (pseudo) {
      setPseudonymName(pseudo.display_name)
      setHasPseudonym(true)
    }
  }, [supabase, userId])

  useEffect(() => {
    const run = async () => {
      await fetchProfile()
    }
    run()
  }, [fetchProfile])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be less than 2MB')
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleAccountSave = async () => {
    if (!displayName.trim()) {
      toast.error('Display name is required')
      return
    }
    setIsLoading(true)
    setSaveType('account')

    try {
      const mockUserId = userId || 'dev-user-1'

      let avatarUrl = avatarPreview
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${mockUserId}/avatar.${fileExt}`

        const { error } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true })

        if (!error) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
          avatarUrl = data.publicUrl
        }
      }

      const { error } = await supabase.from('profiles').upsert({
        id: mockUserId,
        display_name: displayName,
        professional_context: professionalContext || null,
        avatar_url: avatarUrl,
      })
      if (error) throw error

      toast.success('Saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save')
    } finally {
      setIsLoading(false)
      setSaveType('')
    }
  }

  const handleSecuritySave = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Fill in all fields')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setIsLoading(true)
    setSaveType('security')

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Password updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update password')
    } finally {
      setIsLoading(false)
      setSaveType('')
    }
  }

  const handlePseudonymSave = async () => {
    setIsLoading(true)
    setSaveType('pseudonym')

    try {
      const mockUserId = userId || 'dev-user-1'

      if (pseudonymName.trim()) {
        const { error } = await supabase.from('pseudonyms').upsert({
          user_id: mockUserId,
          display_name: pseudonymName,
        })
        if (error) throw error
      } else if (hasPseudonym) {
        const { error } = await supabase.from('pseudonyms').delete().eq('user_id', mockUserId)
        if (error) throw error
        setHasPseudonym(false)
      }

      toast.success('Saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save')
    } finally {
      setIsLoading(false)
      setSaveType('')
    }
  }

  const handleDeleteAccount = async () => {
    const confirm = prompt('Type "DELETE" to confirm account deletion')
    if (confirm !== 'DELETE') return

    setIsLoading(true)
    try {
      // Mock: account deletion would go here
      toast.success('Account deleted (mock)')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-medium text-gray-950 dark:text-white">Settings</h1>

      <nav className="flex gap-4 border-b border-gray-200 dark:border-gray-800">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-gray-950 text-gray-950 dark:border-white dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'account' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-medium text-gray-950 dark:text-white">Profile</h2>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="sr-only"
                  id="avatar"
                  disabled={isLoading}
                />
                <label
                  htmlFor="avatar"
                  className={`cursor-pointer ${avatarPreview ? 'h-20 w-20' : 'h-20 w-20 border-2 border-dashed border-gray-300 dark:border-gray-600'}`}
                >
                  {avatarPreview ? (
                    <Image src={avatarPreview} alt="Preview" width={80} height={80} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </label>
              </div>
              <div>
                <p className="font-medium text-gray-950 dark:text-white">Avatar</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Click to change</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Display name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="professionalContext" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Professional context
              </Label>
              <Textarea
                id="professionalContext"
                value={professionalContext}
                onChange={(e) => setProfessionalContext(e.target.value)}
                placeholder="e.g. Product designer at a fintech startup"
                rows={2}
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This appears under your name on public posts. Not shown on pseudonymous posts.
              </p>
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                value={email}
                disabled
                className="bg-gray-50 dark:bg-gray-900"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Email changes require verification. Contact support to update.
              </p>
            </div>
          </div>

          <Button onClick={handleAccountSave} disabled={isLoading}>
            {saveType === 'account' && isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="font-medium text-gray-950 dark:text-white">Change password</h2>
            <div>
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                minLength={8}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <Button onClick={handleSecuritySave} disabled={isLoading}>
            {saveType === 'security' && isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating
              </>
            ) : (
              'Update password'
            )}
          </Button>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
            <h2 className="font-medium text-gray-950 dark:text-white">Danger zone</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Deleting your account will permanently remove all your posts, replies, circles, and pseudonym.
              This cannot be undone.
            </p>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting
                </>
              ) : (
                'Delete account'
              )}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'pseudonym' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="font-medium text-gray-950 dark:text-white">Pseudonym</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              A persistent alias for pseudonymous posts. Your posting history stays attached to this name.
              Your real identity is never linked to it in the database.
            </p>

            <div>
              <Label htmlFor="pseudonymName">Pseudonym name</Label>
              <Input
                id="pseudonymName"
                value={pseudonymName}
                onChange={(e) => setPseudonymName(e.target.value)}
                placeholder="Choose a pseudonym"
                disabled={isLoading}
              />
            </div>

            {hasPseudonym && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current pseudonym: <strong>{pseudonymName}</strong>
              </p>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Leave blank to remove your pseudonym. You can create a new one later.
            </p>
          </div>

          <Button onClick={handlePseudonymSave} disabled={isLoading}>
            {saveType === 'pseudonym' && isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving
              </>
            ) : hasPseudonym ? (
              'Update pseudonym'
            ) : (
              'Create pseudonym'
            )}
          </Button>
        </div>
      )}

      {activeTab === 'circles' && (
        <div className="space-y-4">
          <h2 className="font-medium text-gray-950 dark:text-white">Circles</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your circles from the <a href="/app/circles" className="underline">Circles page</a>.
          </p>
        </div>
      )}

      {activeTab === 'privacy' && (
        <div className="space-y-6">
          <h2 className="font-medium text-gray-950 dark:text-white">Privacy</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Read our <a href="/privacy" className="underline">Privacy Policy</a> for full details on how your data is handled.
          </p>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-950 dark:text-white">Post visibility</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
              <li><strong>Public:</strong> Visible to everyone, indexed by search engines, accessible via URL.</li>
              <li><strong>Circle:</strong> Visible only to circle members. Never indexed, no public URL.</li>
              <li><strong>Pseudonymous:</strong> Visible to everyone but attributed to your pseudonym. Your account identity is not stored with the post.</li>
            </ul>

            <h3 className="font-medium text-gray-950 dark:text-white">Data retention</h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
              <li>Deleting a post removes the database record entirely.</li>
              <li>Deleting your account removes your profile, posts, replies, circles, pseudonym, and all associated data.</li>
              <li>No soft deletes or tombstones are kept.</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <h2 className="font-medium text-gray-950 dark:text-white">Notifications</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Humanverse only sends notifications for things that genuinely happened:
          </p>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
            <li>Someone replied to your post</li>
            <li>Someone replied to a thread you&apos;re participating in</li>
            <li>Someone joined a circle you manage</li>
            <li>Moderation or security events</li>
          </ul>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            We never send engagement nudges, streak reminders, or popularity alerts.
          </p>
        </div>
      )}
    </div>
  )
}
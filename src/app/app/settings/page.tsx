'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Loader2,
  Lock,
  Shield,
  Bell,
  Users,
  ShieldCheck,
  UserCheck,
  Trash2,
  ArrowRight,
  User,
  KeyRound,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type SettingsTab = 'security' | 'pseudonym' | 'privacy' | 'notifications' | 'account'

const TABS: { id: SettingsTab; label: string; icon: typeof Lock }[] = [
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'pseudonym', label: 'Pseudonym Alias', icon: UserCheck },
  { id: 'privacy', label: 'Privacy & Circles', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account', label: 'Account & Data', icon: User },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('security')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pseudonymName, setPseudonymName] = useState('')
  const [hasPseudonym, setHasPseudonym] = useState(false)
  const [circleCount, setCircleCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [saveType, setSaveType] = useState<'security' | 'pseudonym' | 'delete' | ''>('')
  const supabase = createClient()
  const router = useRouter()
  const { userId } = useCurrentUser()

  const fetchUserData = useCallback(async () => {
    if (!userId) return

    const [authRes, pseudoRes, circlesRes] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('pseudonyms').select('display_name').eq('user_id', userId).single(),
      supabase.from('circle_members').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ])

    if (authRes.data?.user?.email) {
      setEmail(authRes.data.user.email)
    }

    if (pseudoRes.data) {
      setPseudonymName(pseudoRes.data.display_name)
      setHasPseudonym(true)
    }

    setCircleCount(circlesRes.count || 0)
  }, [supabase, userId])

  useEffect(() => {
    const run = async () => {
      await fetchUserData()
    }
    run()
  }, [fetchUserData])

  const handleSecuritySave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || !confirmPassword) {
      toast.error('Please enter and confirm your new password')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    setSaveType('security')

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      toast.success('Password updated successfully')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update password')
    } finally {
      setIsLoading(false)
      setSaveType('')
    }
  }

  const handlePseudonymSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setIsLoading(true)
    setSaveType('pseudonym')

    try {
      const cleanPseudo = pseudonymName.trim()
      if (cleanPseudo) {
        const { error } = await supabase.from('pseudonyms').upsert({
          user_id: userId,
          display_name: cleanPseudo,
        })
        if (error) throw error
        setHasPseudonym(true)
        toast.success(`Pseudonym alias updated to "${cleanPseudo}"`)
      } else if (hasPseudonym) {
        const { error } = await supabase.from('pseudonyms').delete().eq('user_id', userId)
        if (error) throw error
        setHasPseudonym(false)
        toast.success('Pseudonym alias removed')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save pseudonym')
    } finally {
      setIsLoading(false)
      setSaveType('')
    }
  }

  const handleDeleteAccount = async () => {
    const confirmText = prompt('This will permanently delete all your posts, replies, and circles. Type "DELETE" to confirm:')
    if (confirmText !== 'DELETE') return

    setIsLoading(true)
    setSaveType('delete')

    try {
      if (userId) {
        await Promise.all([
          supabase.from('posts').delete().eq('author_id', userId),
          supabase.from('replies').delete().eq('author_id', userId),
          supabase.from('pseudonyms').delete().eq('user_id', userId),
          supabase.from('profiles').delete().eq('id', userId),
        ])
      }

      await supabase.auth.signOut()
      toast.success('Account deleted')
      router.push('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not complete deletion')
    } finally {
      setIsLoading(false)
      setSaveType('')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Settings</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Manage your security, pseudonym alias, privacy preferences, and notifications.
        </p>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all shrink-0 ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-950 dark:text-white flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Change Password
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Update your Humanverse account password.
              </p>
            </div>

            <form onSubmit={handleSecuritySave} className="space-y-4">
              <div>
                <Label htmlFor="newPassword" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={isLoading}
                  minLength={6}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  disabled={isLoading}
                  minLength={6}
                  required
                  className="mt-1"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={isLoading} className="text-xs font-semibold gap-1.5">
                  {saveType === 'security' && isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Account Authentication Info Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-3">
            <h2 className="text-base font-semibold text-gray-950 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Authentication & Email
            </h2>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Registered Email Address</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{email || 'Authenticated User'}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pseudonym Tab */}
      {activeTab === 'pseudonym' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-base font-semibold text-gray-950 dark:text-white flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              Pseudonym Alias
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              A persistent alias that lets you share vulnerable or candid thoughts without tying them to your real name.
            </p>
          </div>

          <form onSubmit={handlePseudonymSave} className="space-y-4">
            <div>
              <Label htmlFor="pseudonymName" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Pseudonym Display Name
              </Label>
              <Input
                id="pseudonymName"
                value={pseudonymName}
                onChange={(e) => setPseudonymName(e.target.value)}
                placeholder="e.g. Senior Architect, BurntOutLead, Anonymous Founder"
                disabled={isLoading}
                className="mt-1"
              />
              <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                Leave blank and save if you wish to remove your current pseudonym.
              </p>
            </div>

            {hasPseudonym && (
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900 text-xs text-purple-900 dark:text-purple-300">
                Active Pseudonym: <strong>{pseudonymName}</strong>
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="text-xs font-semibold gap-1.5">
              {saveType === 'pseudonym' && isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : hasPseudonym ? (
                'Update Pseudonym'
              ) : (
                'Create Pseudonym'
              )}
            </Button>
          </form>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Pseudonymity Guarantees
            </h3>
            <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
              <li>Pseudonymous posts attach your chosen alias, with no link to your profile or name.</li>
              <li>Your real identity is never exposed in the public feed or thread streams.</li>
              <li>You can update your pseudonym title at any time.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Privacy & Circles Tab */}
      {activeTab === 'privacy' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-950 dark:text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Private Circles
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  You are currently a member of {circleCount} {circleCount === 1 ? 'circle' : 'circles'}.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
                <Link href="/app/circles">
                  Manage Circles
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
            <h2 className="text-base font-semibold text-gray-950 dark:text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Privacy & Visibility Standards
            </h2>
            <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-1">
                <p className="font-semibold text-gray-900 dark:text-white">Public Posts</p>
                <p className="text-gray-500 dark:text-gray-400">
                  Visible to everyone on the platform. Displayed with your verified name and professional headline.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-1">
                <p className="font-semibold text-gray-900 dark:text-white">Circle Posts</p>
                <p className="text-gray-500 dark:text-gray-400">
                  Encrypted at rest and strictly restricted to the explicit members of that private group.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-1">
                <p className="font-semibold text-gray-900 dark:text-white">Data Retention</p>
                <p className="text-gray-500 dark:text-gray-400">
                  Deleting a post permanently purges it from the database with no retained shadow copies.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4 animate-in fade-in duration-200">
          <div>
            <h2 className="text-base font-semibold text-gray-950 dark:text-white flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Notification Delivery
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Humanverse only notifies you when meaningful human interactions take place.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { title: 'Post Discussions', desc: 'Direct replies to your posts and thoughts' },
              { title: 'Thread Mentions', desc: 'Replies in community threads you participate in' },
              { title: 'Circle Invitations', desc: 'Invites to join trusted private peer circles' },
              { title: 'Security & Integrity', desc: 'Account access and security updates' },
            ].map(item => (
              <div key={item.title} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
                <div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{item.title}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{item.desc}</p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Active</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-gray-400 dark:text-gray-500 pt-2 italic">
            Zero engagement tricks, streak popups, or artificial notification nudges.
          </p>
        </div>
      )}

      {/* Account & Data Management */}
      {activeTab === 'account' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Edit Profile Pointer Card */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-gray-950 dark:text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Profile Customization
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                  Your photo, display name, professional headline, and bio are managed directly on your Profile page.
                </p>
              </div>
              <Button asChild size="sm" className="gap-1.5 text-xs font-semibold shrink-0">
                <Link href="/app/profile/me">
                  Open Profile
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Danger Zone Card */}
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-950/60 dark:bg-gray-900 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Danger Zone
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Permanently delete your Humanverse account, posts, replies, and profile data.
              </p>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="text-xs font-semibold gap-1.5"
            >
              {saveType === 'delete' && isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting Account...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete My Account
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
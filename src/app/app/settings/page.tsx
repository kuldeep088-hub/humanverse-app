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
  UserCheck,
  Trash2,
  ArrowRight,
  User,
  KeyRound,
  ExternalLink,
  CheckCircle2,
  HeartHandshake,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type SettingsTab = 'security' | 'mentorship' | 'pseudonym' | 'privacy' | 'notifications' | 'account'

const TABS: { id: SettingsTab; label: string; icon: typeof Lock }[] = [
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'mentorship', label: 'Peer Support', icon: HeartHandshake },
  { id: 'pseudonym', label: 'Pseudonym Alias', icon: UserCheck },
  { id: 'privacy', label: 'Privacy & Circles', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'account', label: 'Account & Data', icon: User },
]

const AVAILABLE_TOPICS = [
  'Resume Review',
  'Mock Interviews',
  'Career Pivots',
  'Offer Negotiation',
  'Layoff Recovery',
  'Founder Advice',
  'System Design',
  'Portfolio Review',
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('security')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pseudonymName, setPseudonymName] = useState('')
  const [hasPseudonym, setHasPseudonym] = useState(false)
  const [circleCount, setCircleCount] = useState(0)
  const [openToHelp, setOpenToHelp] = useState(false)
  const [helpTopics, setHelpTopics] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [saveType, setSaveType] = useState<'security' | 'pseudonym' | 'mentorship' | 'delete' | ''>('')
  const supabase = createClient()
  const router = useRouter()
  const { userId } = useCurrentUser()

  const fetchUserData = useCallback(async () => {
    if (!userId) return

    const [authRes, pseudoRes, circlesRes, profileRes] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('pseudonyms').select('display_name').eq('user_id', userId).single(),
      supabase.from('circle_members').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('profiles').select('open_to_help, help_topics').eq('id', userId).single(),
    ])

    if (authRes.data?.user?.email) {
      setEmail(authRes.data.user.email)
    }

    if (pseudoRes.data) {
      setPseudonymName(pseudoRes.data.display_name)
      setHasPseudonym(true)
    }

    if (profileRes.data) {
      setOpenToHelp(!!profileRes.data.open_to_help)
      setHelpTopics(profileRes.data.help_topics || [])
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

  const handleMentorshipSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setIsLoading(true)
    setSaveType('mentorship')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          open_to_help: openToHelp,
          help_topics: helpTopics,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error

      toast.success('Peer support settings saved successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update mentorship settings')
    } finally {
      setIsLoading(false)
      setSaveType('')
    }
  }

  const toggleTopic = (topic: string) => {
    if (helpTopics.includes(topic)) {
      setHelpTopics(helpTopics.filter(t => t !== topic))
    } else {
      setHelpTopics([...helpTopics, topic])
    }
  }

  const handlePseudonymSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setIsLoading(true)
    setSaveType('pseudonym')

    try {
      const trimmed = pseudonymName.trim()
      if (!trimmed) {
        toast.error('Pseudonym display name cannot be blank')
        setIsLoading(false)
        setSaveType('')
        return
      }

      if (hasPseudonym) {
        const { error } = await supabase
          .from('pseudonyms')
          .update({ display_name: trimmed })
          .eq('user_id', userId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('pseudonyms')
          .insert({ user_id: userId, display_name: trimmed })
        if (error) throw error
        setHasPseudonym(true)
      }

      toast.success('Pseudonym alias saved successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save pseudonym')
    } finally {
      setIsLoading(false)
      setSaveType('')
    }
  }

  const handleDeleteAccount = async () => {
    if (!userId) return
    const confirmed = window.confirm(
      'Are you absolutely sure? This will delete your account, posts, replies, and remove all your data permanently.'
    )
    if (!confirmed) return

    setIsLoading(true)
    setSaveType('delete')

    try {
      await supabase.from('profiles').delete().eq('id', userId)
      await supabase.auth.signOut()
      toast.success('Account deleted successfully.')
      router.push('/login')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete account')
    } finally {
      setIsLoading(false)
      setSaveType('')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Settings</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Manage your security credentials, pseudonym identity, privacy rules, and peer mentorship preferences.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-950 dark:text-white flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Account Credentials
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Your login email address is registered as <span className="font-semibold text-gray-800 dark:text-gray-200">{email || 'your account'}</span>.
              </p>
            </div>

            <form onSubmit={handleSecuritySave} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="max-w-md h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Confirm New Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="max-w-md h-9 text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                size="sm"
                className="gap-1.5 text-xs font-semibold"
              >
                {saveType === 'security' && isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    Update Password
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Mentorship & Peer Support Tab */}
      {activeTab === 'mentorship' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-base font-semibold text-gray-950 dark:text-white flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-emerald-600" />
              Peer Support & Mentorship Network
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Let fellow job seekers, career pivoters, and peers reach out for honest advice, mock interviews, or resume feedback.
            </p>
          </div>

          <form onSubmit={handleMentorshipSave} className="space-y-5 pt-2">
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  Show &ldquo;Open to Support&rdquo; Badge on Profile
                </span>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Adds a mentor tag to your cards and profile so peers can message you for help.
                </p>
              </div>
              <input
                type="checkbox"
                checked={openToHelp}
                onChange={(e) => setOpenToHelp(e.target.checked)}
                className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {openToHelp && (
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Select topics you are comfortable discussing:
                </Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TOPICS.map(topic => {
                    const isSelected = helpTopics.includes(topic)
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {topic}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              size="sm"
              className="gap-1.5 text-xs font-semibold"
            >
              {saveType === 'mentorship' && isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Save Peer Support Settings
                </>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* Pseudonym Tab */}
      {activeTab === 'pseudonym' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-950 dark:text-white flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Pseudonym Identity Alias
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Posting under your pseudonym completely decouples your verified name and employer context from the published content.
              </p>
            </div>

            <form onSubmit={handlePseudonymSave} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="pseudonym-name" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Pseudonym Display Name
                </Label>
                <Input
                  id="pseudonym-name"
                  value={pseudonymName}
                  onChange={(e) => setPseudonymName(e.target.value)}
                  placeholder="e.g. QuietObserver, TechWanderer, AnonPM"
                  className="max-w-md h-9 text-xs"
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  This alias is visible when choosing &ldquo;Pseudonymous&rdquo; in the post composer or peer messaging.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !pseudonymName.trim()}
                size="sm"
                className="gap-1.5 text-xs font-semibold"
              >
                {saveType === 'pseudonym' && isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Save Pseudonym
                  </>
                )}
              </Button>
            </form>
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

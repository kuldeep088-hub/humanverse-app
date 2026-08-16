'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { PostComponent } from '@/components/app/post'
import { fetchFeedPosts } from '@/lib/data-service'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Post } from '@/types'
import { EditProfileModal } from '@/components/app/edit-profile-modal'
import { CareerTimeline } from '@/components/app/career-timeline'
import {
  Briefcase,
  Loader2,
  Calendar,
  Sparkles,
  Share2,
  Pencil,
  FileText,
  ShieldCheck,
  MessageSquare,
  GitCommit,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

interface Profile {
  id: string
  display_name: string
  professional_context: string | null
  avatar_url: string | null
  created_at: string
}

export default function ProfilePage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()

  const { userId: currentUserId, isLoading: isUserLoading } = useCurrentUser()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [activeTab, setActiveTab] = useState<'posts' | 'timeline'>('posts')
  const [isLoading, setIsLoading] = useState(true)
  const [isNotFound, setIsNotFound] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isStartingChat, setIsStartingChat] = useState(false)

  const isOwnProfile = id === 'me' || id === currentUserId
  const targetUserId = isOwnProfile ? currentUserId : id

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) return
    const supabase = createClient()

    // 1. Fetch Profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single()

    if (!profileData) {
      setIsNotFound(true)
      setIsLoading(false)
      return
    }
    setProfile(profileData as Profile)

    // 2. Fetch author's posts via data service
    const userPosts = await fetchFeedPosts(supabase, {
      currentUserId,
      authorId: targetUserId,
      limit: 100,
    })

    // Filter visibility: other users only see public posts
    const visiblePosts = isOwnProfile
      ? userPosts
      : userPosts.filter(p => p.visibility === 'public')

    setPosts(visiblePosts)
    setIsLoading(false)
  }, [targetUserId, isOwnProfile, currentUserId])

  useEffect(() => {
    const run = async () => {
      await fetchProfile()
    }
    run()
  }, [fetchProfile])

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Profile link copied to clipboard!')
    }
  }

  const handleMessageUser = async () => {
    if (!currentUserId || !targetUserId) return
    setIsStartingChat(true)

    try {
      const supabase = createClient()

      // Check existing conversation
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId)

      const myConvIds = (myConvs || []).map((c: { conversation_id: string }) => c.conversation_id)

      if (myConvIds.length > 0) {
        const { data: sharedConvs } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', targetUserId)
          .in('conversation_id', myConvIds)

        if (sharedConvs && sharedConvs.length > 0) {
          router.push(`/app/messages/${sharedConvs[0].conversation_id}`)
          return
        }
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single()

      if (convError || !newConv) throw convError || new Error('Could not start conversation')

      await supabase.from('conversation_participants').insert([
        { conversation_id: newConv.id, user_id: currentUserId, pseudonym_id: null },
        { conversation_id: newConv.id, user_id: targetUserId, pseudonym_id: null },
      ])

      router.push(`/app/messages/${newConv.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open chat')
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

  if (isNotFound || !profile) {
    return (
      <div className="text-center py-20 text-gray-500 dark:text-gray-400">
        <p className="text-xl font-medium text-gray-900 dark:text-white">Profile not found</p>
        <p className="mt-2 text-sm">The user you are looking for does not exist or has been removed.</p>
        <Button asChild className="mt-6">
          <Link href="/app/feed">Back to Feed</Link>
        </Button>
      </div>
    )
  }

  // Calculate totals
  const totalPosts = posts.length
  const totalReactions = posts.reduce((acc, p) => {
    const r = p.reaction_counts || { been_there: 0, oof: 0, respect: 0, needed_this: 0 }
    return acc + r.been_there + r.oof + r.respect + r.needed_this
  }, 0)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 relative overflow-hidden">
        {/* Subtle decorative top accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pt-2">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar
                src={profile.avatar_url || undefined}
                fallbackName={profile.display_name}
                className="h-20 w-20 text-xl border-2 border-white shadow dark:border-gray-800"
              />
              <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900" title="Active member" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-950 dark:text-white tracking-tight">
                  {profile.display_name}
                </h1>
                <span title="Verified Member">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </span>
              </div>

              {profile.professional_context ? (
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-gray-400 shrink-0" />
                  {profile.professional_context}
                </p>
              ) : (
                <p className="text-xs text-gray-400 italic">No professional context added</p>
              )}

              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5 pt-1">
                <Calendar className="h-3.5 w-3.5" />
                Member since {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start">
            {isOwnProfile ? (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="gap-1.5"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleMessageUser}
                disabled={isStartingChat}
                className="gap-1.5"
              >
                {isStartingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                Message
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-1.5"
              title="Share profile"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 text-center">
          <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/40">
            <span className="block text-xl font-bold text-gray-950 dark:text-white">{totalPosts}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Posts Written</span>
          </div>
          <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/40">
            <span className="block text-xl font-bold text-gray-950 dark:text-white">{totalReactions}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Reactions Received</span>
          </div>
          <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/40">
            <span className="block text-xl font-bold text-gray-950 dark:text-white">100%</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Authentic Stories</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'posts'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          Stories & Posts ({posts.length})
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'timeline'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <GitCommit className="h-4 w-4" />
          Career Journey & Pivots
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'timeline' ? (
        <CareerTimeline userId={targetUserId!} isOwnProfile={isOwnProfile} />
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <Sparkles className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-base font-medium text-gray-900 dark:text-gray-100">No posts published yet</p>
          <p className="mt-1 text-sm max-w-sm mx-auto">
            {isOwnProfile
              ? 'Share your honest workplace stories, career pivots, or real lessons learned.'
              : 'This user hasn’t shared any public posts yet.'}
          </p>
          {isOwnProfile && (
            <Button asChild className="mt-4">
              <Link href="/app/feed">Create First Post</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostComponent
              key={post.id}
              post={post}
              onUpdate={fetchProfile}
              showThreadLink={true}
              currentUserId={currentUserId}
              currentUserProfile={profile}
            />
          ))}
        </div>
      )}

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
          onProfileUpdated={fetchProfile}
        />
      )}
    </div>
  )
}
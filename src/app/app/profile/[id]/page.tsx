'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { PostComponent } from '@/components/app/post'
import { fetchFeedPosts } from '@/lib/data-service'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Post, Profile } from '@/types'
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
  HeartHandshake,
  Camera,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import { BANNER_PRESETS } from '@/components/app/edit-profile-modal'

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
  const [localBanner] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && (id === 'me' ? currentUserId : id)) {
      const uid = id === 'me' ? currentUserId : id
      return uid ? localStorage.getItem(`humanverse_banner_${uid}`) : null
    }
    return null
  })

  const isOwnProfile = id === 'me' || id === currentUserId
  const targetUserId = isOwnProfile ? currentUserId : id

  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const refreshProfile = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  useEffect(() => {
    let isCancelled = false

    const loadProfileData = async () => {
      const supabase = createClient()
      let effectiveUserId = targetUserId

      // If viewing 'me' and targetUserId is still resolving, look up auth directly
      if (!effectiveUserId && id === 'me') {
        const { data: authData } = await supabase.auth.getUser()
        effectiveUserId = authData?.user?.id
      }

      if (!effectiveUserId) {
        if (!isUserLoading && !isCancelled) setIsLoading(false)
        return
      }

      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', effectiveUserId)
        .single()

      if (isCancelled) return

      if (!profileData) {
        // Fallback for current user if profile not yet inserted
        const { data: authUser } = await supabase.auth.getUser()
        if (authUser?.user && (authUser.user.id === effectiveUserId || id === 'me')) {
          const fallbackProf: Profile = {
            id: authUser.user.id,
            display_name: authUser.user.user_metadata?.display_name || authUser.user.email?.split('@')[0] || 'User',
            avatar_url: authUser.user.user_metadata?.avatar_url || authUser.user.user_metadata?.picture || null,
            professional_context: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          if (!isCancelled) setProfile(fallbackProf)
        } else {
          if (!isCancelled) {
            setIsNotFound(true)
            setIsLoading(false)
          }
          return
        }
      } else {
        if (!isCancelled) setProfile(profileData as Profile)
      }

      // 2. Fetch author's real posts from Supabase
      const userPosts = await fetchFeedPosts(supabase, {
        currentUserId: effectiveUserId,
        authorId: effectiveUserId,
        limit: 100,
      })

      if (!isCancelled) {
        const visiblePosts = (id === 'me' || effectiveUserId === currentUserId)
          ? userPosts
          : userPosts.filter(p => p.visibility === 'public')

        setPosts(visiblePosts)
        setIsLoading(false)
      }
    }

    loadProfileData()

    return () => {
      isCancelled = true
    }
  }, [targetUserId, id, isUserLoading, currentUserId, refreshTrigger])

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

  // Active banner url/preset resolution
  const activeBanner = profile.banner_url || localBanner || 'preset:tech-grid'
  const presetClass = BANNER_PRESETS.find(p => p.id === activeBanner)?.class || 'bg-gradient-to-r from-[#1e293b] via-[#0f172a] to-[#1e3a8a]'
  const isCustomImage = activeBanner.startsWith('http') || activeBanner.startsWith('data:')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profile Header Card */}
      <div className="card-hover-effect rounded-2xl sm:rounded-3xl border border-gray-200/90 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 relative overflow-hidden transition-all duration-300">
        
        {/* Banner Cover */}
        <div className="relative h-36 sm:h-48 w-full overflow-hidden group">
          {isCustomImage ? (
            <Image
              src={activeBanner}
              alt="Profile Cover Banner"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority
            />
          ) : (
            <div className={`h-full w-full ${presetClass} relative`}>
              <div className="absolute inset-0 opacity-35 bg-[radial-gradient(#38bdf8_1.5px,transparent_1.5px)] [background-size:16px_16px] transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          )}

          {/* Edit Banner Camera Button (for profile owner) */}
          {isOwnProfile && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="absolute top-3.5 right-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/85 text-white text-xs font-semibold backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg cursor-pointer border border-white/20"
              title="Edit Cover Banner"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Edit banner</span>
            </button>
          )}
        </div>

        {/* Profile Details Container */}
        <div className="px-5 sm:px-8 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-16 mb-4">
            {/* Overlapping Avatar */}
            <div className="relative inline-block">
              <div className="rounded-full p-1 bg-white dark:bg-gray-900 ring-4 ring-white dark:ring-gray-900 shadow-xl">
                <Avatar
                  src={profile.avatar_url || undefined}
                  fallbackName={profile.display_name}
                  className="h-24 w-24 sm:h-28 sm:w-28 text-2xl"
                />
              </div>
              <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 shadow-sm" title="Active member" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-auto pt-2 sm:pt-0">
              {isOwnProfile ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                  className="gap-1.5 rounded-full font-bold shadow-xs hover:shadow-md transition-all"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Profile
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleMessageUser}
                  disabled={isStartingChat}
                  className="gap-1.5 rounded-full font-bold shadow-xs hover:shadow-md transition-all"
                >
                  {isStartingChat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                  Message
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="gap-1.5 rounded-full font-bold transition-all hover:scale-105 active:scale-95"
                title="Share profile"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 dark:text-white tracking-tight">
                {profile.display_name}
              </h1>
              <span title="Verified Member">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </span>
            </div>

            {profile.professional_context ? (
              <p className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-primary shrink-0" />
                {profile.professional_context}
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic">No professional headline added</p>
            )}

            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5 pt-0.5">
              <Calendar className="h-3.5 w-3.5" />
              Member since {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently'}
            </p>
          </div>
        </div>

        {/* Bio Section */}
        {profile.bio && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Open to Support / Mentorship Banner */}
        {profile.open_to_help && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <HeartHandshake className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Open to Giving Peer Support & Mentorship
              </span>
              {!isOwnProfile && (
                <button
                  type="button"
                  onClick={handleMessageUser}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
                >
                  Request Advice →
                </button>
              )}
            </div>

            {profile.help_topics && profile.help_topics.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {profile.help_topics.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-emerald-800 border border-emerald-200 dark:bg-gray-900 dark:text-emerald-300 dark:border-emerald-700/60 shadow-2xs"
                  >
                    ✓ {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

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

      {/* Tab Contents */}
      {activeTab === 'posts' ? (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <Sparkles className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="font-semibold text-gray-900 dark:text-white">No stories published yet</p>
              <p className="text-xs text-gray-400 mt-1">
                {isOwnProfile ? 'Share your thoughts, layoff reflections, or career lessons to see them here.' : 'This member has not published public stories yet.'}
              </p>
            </div>
          ) : (
            posts.map(post => (
              <PostComponent
                key={post.id}
                post={post}
                onUpdate={refreshProfile}
                currentUserId={currentUserId}
                currentUserProfile={profile}
              />
            ))
          )}
        </div>
      ) : (
        <CareerTimeline
          userId={targetUserId!}
          isOwnProfile={isOwnProfile}
        />
      )}

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={profile}
          onProfileUpdated={refreshProfile}
        />
      )}
    </div>
  )
}

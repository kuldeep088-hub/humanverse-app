'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { extractThreads } from '@/lib/utils'
import { getProfilePhoto, getRealAuthorName } from '@/lib/avatar'
import {
  Globe,
  Users,
  UserCircle,
  Loader2,
  ChevronDown,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  X,
  BarChart2,
  Plus,
  Trash2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Image from 'next/image'

export interface ComposerProps {
  initialContent?: string
  circles: { id: string; name: string }[]
  pseudonym: { id: string; display_name: string } | null
  currentUserProfile?: {
    display_name: string
    avatar_url: string | null
    professional_context: string | null
  } | null
  onPostCreated?: () => void
  defaultOpen?: boolean
}

export type ComposerMode = 'post' | 'photo' | 'video' | 'article'

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public Feed', icon: Globe, desc: 'Visible to everyone in Humanverse' },
  { value: 'pseudonymous', label: 'Pseudonymous', icon: UserCircle, desc: 'Posted under your alias with no identity link' },
  { value: 'circle', label: 'Private Circle', icon: Users, desc: 'Shared only with selected circle members' },
] as const

export function Composer({
  initialContent = '',
  circles,
  pseudonym,
  currentUserProfile,
  onPostCreated,
  defaultOpen = false,
}: ComposerProps) {
  // Modal Open State
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [activeMode, setActiveMode] = useState<ComposerMode>('post')

  // Content States
  const [content, setContent] = useState(initialContent)
  const [articleTitle, setArticleTitle] = useState('')
  const [articleCover, setArticleCover] = useState<string | null>(null)
  const [articleCoverFile, setArticleCoverFile] = useState<File | null>(null)

  // Visibility & Target States
  const [visibility, setVisibility] = useState<'public' | 'circle' | 'pseudonymous'>('public')
  const [selectedCircle, setSelectedCircle] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Media Attachment States
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [attachedVideo, setAttachedVideo] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)

  // Poll state
  const [showPollBuilder, setShowPollBuilder] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])

  // Refs
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const articleCoverInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const triggerButtonRef = useRef<HTMLButtonElement>(null)

  // User Profile State & Dynamic Fetch
  const [fetchedProfile, setFetchedProfile] = useState<{
    display_name: string
    avatar_url: string | null
    professional_context: string | null
  } | null>(null)

  const profile = currentUserProfile || fetchedProfile

  const router = useRouter()
  const supabase = createClient()
  const { userId } = useCurrentUser()

  // Fetch logged-in user profile dynamically if not provided
  useEffect(() => {
    if (!userId || currentUserProfile) return
    let isCancelled = false

    const fetchUserProfile = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, professional_context')
          .eq('id', userId)
          .single()

        if (!isCancelled && data) {
          setFetchedProfile({
            display_name: getRealAuthorName(data.display_name, userId),
            avatar_url: data.avatar_url || null,
            professional_context: data.professional_context || null,
          })
        } else if (!isCancelled) {
          const { data: authUser } = await supabase.auth.getUser()
          if (!isCancelled && authUser?.user) {
            const rawName =
              authUser.user.user_metadata?.display_name ||
              authUser.user.email?.split('@')[0]
            setFetchedProfile({
              display_name: getRealAuthorName(rawName, authUser.user.id),
              avatar_url:
                authUser.user.user_metadata?.avatar_url ||
                authUser.user.user_metadata?.picture ||
                null,
              professional_context: null,
            })
          }
        }
      } catch {
        // Silently handle
      }
    }

    fetchUserProfile()
    return () => {
      isCancelled = true
    }
  }, [userId, supabase, currentUserProfile])

  const detectedThreads = extractThreads(content)

  // Open modal in specific mode
  const handleOpenModal = useCallback((mode: ComposerMode = 'post') => {
    setActiveMode(mode)
    setIsOpen(true)

    // Trigger file dialogs if user specifically clicked photo/video
    setTimeout(() => {
      if (mode === 'photo' && !attachedImage) {
        imageInputRef.current?.click()
      } else if (mode === 'video' && !attachedVideo) {
        videoInputRef.current?.click()
      } else {
        textareaRef.current?.focus()
      }
    }, 150)
  }, [attachedImage, attachedVideo])

  // Close modal and restore focus
  const handleCloseModal = useCallback(() => {
    setIsOpen(false)
    triggerButtonRef.current?.focus()
  }, [])

  // Media Selection Handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setAttachedImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setAttachedImage(null)
    setImageFile(null)
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video must be under 50MB')
      return
    }

    setVideoFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setAttachedVideo(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveVideo = () => {
    setAttachedVideo(null)
    setVideoFile(null)
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
  }

  const handleArticleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Cover image must be under 5MB')
      return
    }

    setArticleCoverFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setArticleCover(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveArticleCover = () => {
    setArticleCover(null)
    setArticleCoverFile(null)
    if (articleCoverInputRef.current) {
      articleCoverInputRef.current.value = ''
    }
  }

  // Poll Option Handlers
  const handleAddPollOption = () => {
    if (pollOptions.length >= 4) {
      toast.error('Maximum 4 options per poll')
      return
    }
    setPollOptions([...pollOptions, ''])
  }

  const handleRemovePollOption = (idx: number) => {
    if (pollOptions.length <= 2) {
      toast.error('A poll requires at least 2 options')
      return
    }
    setPollOptions(pollOptions.filter((_, i) => i !== idx))
  }

  const handlePollOptionChange = (idx: number, val: string) => {
    const updated = [...pollOptions]
    updated[idx] = val
    setPollOptions(updated)
  }

  // Submit / Publish Post
  const handleSubmit = async (saveDraft = false) => {
    const isArticle = activeMode === 'article'

    if (isArticle && !articleTitle.trim() && !content.trim() && !saveDraft) {
      toast.error('Please enter an article title and content')
      return
    }

    if (!isArticle && !content.trim() && !attachedImage && !attachedVideo && !showPollBuilder && !saveDraft) {
      toast.error('Please enter some text or attach media to post')
      return
    }

    if (!userId) {
      toast.error('Please sign in to share a post')
      return
    }

    // Validate poll if enabled
    if (showPollBuilder && !saveDraft) {
      if (!pollQuestion.trim()) {
        toast.error('Please enter a question for your poll')
        return
      }
      const validOptions = pollOptions.filter(o => o.trim().length > 0)
      if (validOptions.length < 2) {
        toast.error('Please provide at least 2 non-empty poll options')
        return
      }
    }

    setIsSubmitting(true)
    try {
      let circleId: string | null = null
      let pseudonymId: string | null = null

      if (visibility === 'circle') {
        circleId = selectedCircle
        if (!circleId) {
          toast.error('Please select a circle to post to')
          setIsSubmitting(false)
          return
        }
      } else if (visibility === 'pseudonymous') {
        if (!pseudonym) {
          toast.error('Please set up a pseudonym in Settings before posting anonymously')
          router.push('/app/settings')
          setIsSubmitting(false)
          return
        }
        pseudonymId = pseudonym.id
      }

      // Extract thread
      const threadSlug = detectedThreads[0] || null
      let threadId: string | null = null

      if (threadSlug) {
        const { data: thread } = await supabase
          .from('threads')
          .select('id')
          .eq('slug', threadSlug.toLowerCase())
          .single()

        threadId = thread?.id || null

        if (!threadId) {
          const { data: newThread } = await supabase
            .from('threads')
            .insert({ slug: threadSlug.toLowerCase(), name: `#${threadSlug}` })
            .select()
            .single()
          threadId = newThread?.id || null
        }
      }

      // Ensure user profile exists in public.profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('id', userId)
        .single()

      if (!existingProfile) {
        const { data: authUser } = await supabase.auth.getUser()
        const rawName =
          authUser?.user?.user_metadata?.display_name ||
          authUser?.user?.email?.split('@')[0]
        const fallbackName = getRealAuthorName(rawName, userId)
        await supabase.from('profiles').upsert({
          id: userId,
          display_name: fallbackName,
        })
      }

      let finalContent = content.trim()

      // Handle Image Upload
      if (attachedImage) {
        let finalImageUrl = attachedImage
        if (imageFile) {
          try {
            const ext = imageFile.name.split('.').pop() || 'png'
            const fileId = crypto.randomUUID()
            const filePath = `posts/${userId}/${fileId}.${ext}`
            const { error: uploadError } = await supabase.storage
              .from('post-attachments')
              .upload(filePath, imageFile, { upsert: true })

            if (!uploadError) {
              const { data: publicData } = supabase.storage
                .from('post-attachments')
                .getPublicUrl(filePath)
              if (publicData?.publicUrl) {
                finalImageUrl = publicData.publicUrl
              }
            }
          } catch {
            // Fall back to data URL
          }
        }
        finalContent = `${finalContent}\n\n[image: ${finalImageUrl}]`.trim()
      }

      // Handle Video Upload
      if (attachedVideo) {
        let finalVideoUrl = attachedVideo
        if (videoFile) {
          try {
            const ext = videoFile.name.split('.').pop() || 'mp4'
            const fileId = crypto.randomUUID()
            const filePath = `videos/${userId}/${fileId}.${ext}`
            const { error: uploadError } = await supabase.storage
              .from('post-attachments')
              .upload(filePath, videoFile, { upsert: true })

            if (!uploadError) {
              const { data: publicData } = supabase.storage
                .from('post-attachments')
                .getPublicUrl(filePath)
              if (publicData?.publicUrl) {
                finalVideoUrl = publicData.publicUrl
              }
            }
          } catch {
            // Fall back to data URL
          }
        }
        finalContent = `${finalContent}\n\n[video: ${finalVideoUrl}]`.trim()
      }

      // Handle Article Cover & Metadata
      if (isArticle) {
        let finalCoverUrl = articleCover
        if (articleCoverFile) {
          try {
            const ext = articleCoverFile.name.split('.').pop() || 'png'
            const fileId = crypto.randomUUID()
            const filePath = `articles/${userId}/${fileId}.${ext}`
            const { error: uploadError } = await supabase.storage
              .from('post-attachments')
              .upload(filePath, articleCoverFile, { upsert: true })

            if (!uploadError) {
              const { data: publicData } = supabase.storage
                .from('post-attachments')
                .getPublicUrl(filePath)
              if (publicData?.publicUrl) {
                finalCoverUrl = publicData.publicUrl
              }
            }
          } catch {
            // Fall back
          }
        }

        let articlePrefix = `[article_title: ${articleTitle.trim()}]`
        if (finalCoverUrl) {
          articlePrefix += `\n[article_cover: ${finalCoverUrl}]`
        }
        finalContent = `${articlePrefix}\n\n${finalContent}`.trim()
      }

      // Handle Draft Saving
      if (saveDraft) {
        const { error } = await supabase.from('drafts').upsert({
          user_id: userId,
          content: finalContent,
          thread_id: threadId,
          visibility,
          circle_id: circleId,
          pseudonym_id: pseudonymId,
        })
        if (error) throw error
        toast.success('Draft saved successfully')
        return
      }

      // Insert Post
      const { data: createdPost, error } = await supabase.from('posts').insert({
        author_id: userId,
        content: finalContent,
        visibility,
        thread_id: threadId,
        circle_id: circleId,
        pseudonym_id: pseudonymId,
      }).select().single()

      if (error) throw error

      // If poll is attached, insert into polls and poll_options
      if (showPollBuilder && createdPost?.id) {
        const { data: createdPoll, error: pollErr } = await supabase.from('polls').insert({
          post_id: createdPost.id,
          question: pollQuestion.trim(),
        }).select().single()

        if (!pollErr && createdPoll?.id) {
          const validOptions = pollOptions.filter(o => o.trim().length > 0)
          const optionsRows = validOptions.map(opt => ({
            poll_id: createdPoll.id,
            text: opt.trim(),
            vote_count: 0,
          }))
          await supabase.from('poll_options').insert(optionsRows)
        }
      }

      // Reset Form
      setContent('')
      setArticleTitle('')
      handleRemoveArticleCover()
      handleRemoveImage()
      handleRemoveVideo()
      setSelectedCircle('')
      setShowPollBuilder(false)
      setPollQuestion('')
      setPollOptions(['', ''])
      handleCloseModal()

      toast.success(isArticle ? 'Article published successfully!' : 'Your post has been shared!')

      if (onPostCreated) {
        onPostCreated()
      }
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error('Failed to publish post. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Active Display Info
  const selectedOption = VISIBILITY_OPTIONS.find(o => o.value === visibility)!
  const OptionIcon = selectedOption.icon
  
  // Real User Info from dynamic profile
  const rawUserName = profile?.display_name || currentUserProfile?.display_name
  const userDisplayName = getRealAuthorName(rawUserName, userId)
  const userAvatarUrl = getProfilePhoto(profile?.avatar_url || currentUserProfile?.avatar_url, userDisplayName || userId)

  const isAnonymous = visibility === 'pseudonymous'
  const activeDisplayName = isAnonymous
    ? getRealAuthorName(pseudonym?.display_name, userId)
    : userDisplayName
  const activeAvatarUrl = getProfilePhoto(userAvatarUrl, activeDisplayName || userId)

  // Is Publish button valid
  const hasValidContent =
    activeMode === 'article'
      ? articleTitle.trim().length > 0 && content.trim().length > 0
      : content.trim().length > 0 || !!attachedImage || !!attachedVideo || (showPollBuilder && pollQuestion.trim().length > 0)

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. COMPACT FEED COMPOSER CARD (Initial State)                             */}
      {/* ========================================================================= */}
      <div className="group/card rounded-2xl border border-gray-200/90 bg-white p-3.5 sm:p-4 shadow-xs hover:shadow-md dark:border-gray-800 dark:bg-gray-900 transition-all duration-200">
        {/* Top Row: User Avatar + 'Start a post' input trigger */}
        <div className="flex items-center gap-3">
          <div
            className="relative group/avatar cursor-pointer shrink-0"
            onClick={() => handleOpenModal('post')}
            title="Open composer"
          >
            <Avatar
              src={userAvatarUrl || undefined}
              fallbackName={userDisplayName}
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-full shrink-0 border border-gray-200 dark:border-gray-700 shadow-2xs transition-transform duration-200 group-hover/avatar:scale-105"
            />
          </div>

          <button
            ref={triggerButtonRef}
            type="button"
            onClick={() => handleOpenModal('post')}
            className="flex-1 h-11 sm:h-12 flex items-center px-5 rounded-full border border-gray-300 dark:border-gray-700 bg-white hover:bg-gray-50/80 dark:bg-gray-900 dark:hover:bg-gray-800/80 text-left text-sm sm:text-[15px] font-bold text-gray-900 dark:text-gray-100 transition-all duration-150 cursor-pointer shadow-2xs active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Start a post"
          >
            <span>Start a post</span>
          </button>
        </div>

        {/* Bottom Row: 3 Primary Actions (Video, Photo, Write article) + Poll */}
        <div className="mt-3.5 pt-2.5 flex items-center justify-around gap-1">
          {/* 1. Video Option */}
          <button
            type="button"
            onClick={() => handleOpenModal('video')}
            className="group/btn flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-bold text-gray-700 hover:text-gray-950 dark:text-gray-200 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150 shrink-0 cursor-pointer active:scale-95"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-sm text-emerald-600 dark:text-emerald-400">
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M19 4H5a3 3 0 00-3 3v10a3 3 0 003 3h14a3 3 0 003-3V7a3 3 0 00-3-3zm-9 11V9l6 3-6 3z" />
              </svg>
            </span>
            <span className="font-bold">Video</span>
          </button>

          {/* 2. Photo Option */}
          <button
            type="button"
            onClick={() => handleOpenModal('photo')}
            className="group/btn flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-bold text-gray-700 hover:text-gray-950 dark:text-gray-200 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150 shrink-0 cursor-pointer active:scale-95"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-sm text-[#0a66c2] dark:text-sky-400">
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M19 3H5a3 3 0 00-3 3v12a3 3 0 003 3h14a3 3 0 003-3V6a3 3 0 00-3-3zm-1 15H6l3.5-4.5 2.5 3 3.5-4.5 2.5 3zM8.5 9.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
              </svg>
            </span>
            <span className="font-bold">Photo</span>
          </button>

          {/* 3. Write Article Option */}
          <button
            type="button"
            onClick={() => handleOpenModal('article')}
            className="group/btn flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-bold text-gray-700 hover:text-gray-950 dark:text-gray-200 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150 shrink-0 cursor-pointer active:scale-95"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-sm text-[#b24020] dark:text-orange-400">
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H6v-2h8v2zm4-4H6v-2h12v2zm0-4H6V7h12v2z" />
              </svg>
            </span>
            <span className="font-bold">Write article</span>
          </button>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        type="file"
        accept="image/*"
        ref={imageInputRef}
        onChange={handleImageSelect}
        className="sr-only"
        id="composer-image-file-picker"
      />
      <input
        type="file"
        accept="video/*"
        ref={videoInputRef}
        onChange={handleVideoSelect}
        className="sr-only"
        id="composer-video-file-picker"
      />
      <input
        type="file"
        accept="image/*"
        ref={articleCoverInputRef}
        onChange={handleArticleCoverSelect}
        className="sr-only"
        id="composer-article-cover-picker"
      />

      {/* ========================================================================= */}
      {/* 2. EXPANDED COMPOSER MODAL DIALOG (Matches LinkedIn Modal Screenshot)     */}
      {/* ========================================================================= */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal()
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="composer-modal-title"
        >
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col min-h-[440px] max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between p-4 sm:p-5 pb-2 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <Avatar
                  src={activeAvatarUrl || undefined}
                  fallbackName={activeDisplayName}
                  className="h-12 w-12 shrink-0 border border-gray-200 dark:border-gray-700 shadow-2xs"
                />
                <div className="min-w-0 space-y-1">
                  {/* Name with selector dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-bold text-base text-gray-950 dark:text-white hover:text-primary transition-colors cursor-pointer group"
                      >
                        <span className="truncate">{activeDisplayName}</span>
                        <ChevronDown className="h-4 w-4 text-gray-500 group-hover:text-primary transition-colors shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 z-50">
                      <DropdownMenuLabel className="text-xs">Post as</DropdownMenuLabel>
                      <DropdownMenuItem
                        onSelect={() => setVisibility('public')}
                        className="flex items-center gap-2 cursor-pointer py-2 font-medium text-xs"
                      >
                        <Globe className="h-4 w-4 text-primary" />
                        <span>{userDisplayName} (Public)</span>
                      </DropdownMenuItem>
                      {pseudonym && (
                        <DropdownMenuItem
                          onSelect={() => setVisibility('pseudonymous')}
                          className="flex items-center gap-2 cursor-pointer py-2 font-medium text-xs"
                        >
                          <UserCircle className="h-4 w-4 text-amber-600" />
                          <span>@{pseudonym.display_name} (Alias)</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Pills Row: 'Post to Anyone' & 'Comments: Anyone' */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {/* 1. Post to Anyone Pill */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors cursor-pointer border border-gray-200/80 dark:border-gray-700/80"
                        >
                          <OptionIcon className="h-3.5 w-3.5 text-gray-700 dark:text-gray-300" />
                          <span>
                            {visibility === 'public'
                              ? 'Post to Anyone'
                              : visibility === 'pseudonymous'
                              ? 'Post as Alias'
                              : 'Post to Circle'}
                          </span>
                          <ChevronDown className="h-3 w-3 text-gray-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64 z-50">
                        <DropdownMenuLabel className="text-xs">Who can see this post?</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {VISIBILITY_OPTIONS.map((opt) => {
                          const Icon = opt.icon
                          return (
                            <DropdownMenuItem
                              key={opt.value}
                              onSelect={() => setVisibility(opt.value)}
                              className="flex flex-col items-start gap-0.5 cursor-pointer py-2"
                            >
                              <div className="flex items-center gap-2 font-semibold text-xs">
                                <Icon className="h-3.5 w-3.5 text-primary" />
                                {opt.label}
                              </div>
                              <span className="text-[11px] text-gray-500">{opt.desc}</span>
                            </DropdownMenuItem>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Circle Select (if circle visibility chosen) */}
                    {visibility === 'circle' && (
                      <select
                        value={selectedCircle}
                        onChange={(e) => setSelectedCircle(e.target.value)}
                        className="h-7 rounded-full border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-800 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      >
                        <option value="">Choose Circle...</option>
                        {circles.map((circle) => (
                          <option key={circle.id} value={circle.id}>
                            {circle.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* 2. Comments: Anyone Pill */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors cursor-pointer border border-gray-200/80 dark:border-gray-700/80"
                        >
                          <svg className="h-3.5 w-3.5 text-gray-700 dark:text-gray-300 fill-current" viewBox="0 0 24 24">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                          </svg>
                          <span>Comments: Anyone</span>
                          <ChevronDown className="h-3 w-3 text-gray-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56 z-50">
                        <DropdownMenuLabel className="text-xs">Who can comment?</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer font-medium text-xs">
                          Anyone
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer font-medium text-xs">
                          Connections & Circles only
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors cursor-pointer"
                aria-label="Close composer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-4">
              {/* Article Mode Cover & Title if active */}
              {activeMode === 'article' && (
                <div className="space-y-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                  {articleCover ? (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 max-h-52">
                      <Image
                        src={articleCover}
                        alt="Article Cover"
                        width={800}
                        height={300}
                        className="w-full max-h-52 object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={handleRemoveArticleCover}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-950/80 text-white hover:bg-gray-950 transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => articleCoverInputRef.current?.click()}
                      className="w-full py-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 hover:border-amber-400 text-gray-500 hover:text-gray-900 dark:text-gray-400 transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold"
                    >
                      <ImageIcon className="h-4 w-4 text-amber-500" />
                      <span>Add cover photo</span>
                    </button>
                  )}

                  <Input
                    placeholder="Article Title..."
                    value={articleTitle}
                    onChange={(e) => setArticleTitle(e.target.value)}
                    className="text-lg font-bold border-none px-0 focus-visible:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-transparent h-auto py-1 shadow-none"
                  />
                </div>
              )}

              {/* Main Text Area matching 'Share your thoughts ...' */}
              <div className="relative min-h-[160px] sm:min-h-[200px]">
                <Textarea
                  ref={textareaRef}
                  placeholder="Share your thoughts ..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault()
                      if (hasValidContent && !isSubmitting) {
                        handleSubmit(false)
                      }
                    }
                  }}
                  className="w-full resize-none border-none p-0 focus-visible:ring-0 text-base sm:text-lg leading-relaxed text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-transparent shadow-none selection:bg-primary/20 min-h-[160px] sm:min-h-[200px]"
                />
              </div>

              {/* Attached Image Preview */}
              {attachedImage && (
                <div className="relative inline-block rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <Image
                    src={attachedImage}
                    alt="Upload preview"
                    width={400}
                    height={250}
                    className="max-h-60 w-auto object-contain rounded-2xl"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-950/80 text-white hover:bg-gray-950 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Attached Video Preview */}
              {attachedVideo && (
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-black max-h-60">
                  <video
                    src={attachedVideo}
                    controls
                    className="max-h-60 w-full rounded-2xl"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-950/80 text-white hover:bg-gray-950 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Poll Builder Box */}
              {showPollBuilder && (
                <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <BarChart2 className="h-4 w-4 text-indigo-500" />
                      Community Poll
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPollBuilder(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <Input
                    placeholder="Ask a question..."
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="h-9 text-xs bg-white dark:bg-gray-900"
                  />

                  <div className="space-y-2">
                    {pollOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                          className="h-8 text-xs bg-white dark:bg-gray-900"
                        />
                        {pollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePollOption(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {pollOptions.length < 4 && (
                    <button
                      type="button"
                      onClick={handleAddPollOption}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Option
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Modal Bottom Bar Matching Screenshot */}
            <div className="px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 shrink-0">
              {/* Left Toolbar Icons: Emoji, Photo, Award, Plus */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* 1. Emoji / Smile Icon */}
                <button
                  type="button"
                  onClick={() => setContent(prev => `${prev} 😊`)}
                  className="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Add Emoji"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                </button>

                {/* 2. Photo Icon */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    attachedImage
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                  }`}
                  title="Add Image"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </button>

                {/* 3. Award / Celebrate Badge Icon */}
                <button
                  type="button"
                  onClick={() => {
                    setContent(prev => `${prev}\n\n🏆 Celebrating a milestone! `)
                  }}
                  className="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Celebrate an occasion"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8L12 2z" />
                  </svg>
                </button>

                {/* 4. Plus / More Icon (Poll, Video, Article) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      title="More options"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 z-50">
                    <DropdownMenuItem
                      onSelect={() => videoInputRef.current?.click()}
                      className="flex items-center gap-2 cursor-pointer text-xs font-semibold py-2"
                    >
                      <VideoIcon className="h-4 w-4 text-emerald-600" />
                      <span>Add Video</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setShowPollBuilder(true)}
                      className="flex items-center gap-2 cursor-pointer text-xs font-semibold py-2"
                    >
                      <BarChart2 className="h-4 w-4 text-indigo-500" />
                      <span>Create Poll</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => setActiveMode(prev => prev === 'article' ? 'post' : 'article')}
                      className="flex items-center gap-2 cursor-pointer text-xs font-semibold py-2"
                    >
                      <FileText className="h-4 w-4 text-amber-500" />
                      <span>{activeMode === 'article' ? 'Switch to Post' : 'Write Article'}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Right Side: Clock Schedule icon + 'Post' button */}
              <div className="flex items-center gap-3">
                {/* Schedule / Clock Button */}
                <button
                  type="button"
                  onClick={() => toast.info('Post scheduling is coming soon!')}
                  className="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Schedule for later"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </button>

                {/* Post Button */}
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || !hasValidContent}
                  className={`h-9 px-6 rounded-full text-sm font-bold transition-all duration-150 cursor-pointer ${
                    hasValidContent && !isSubmitting
                      ? 'bg-[#0a66c2] text-white hover:bg-[#004182] shadow-xs active:scale-95'
                      : 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Posting...
                    </span>
                  ) : (
                    <span>Post</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}

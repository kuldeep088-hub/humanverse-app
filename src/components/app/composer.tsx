'use client'

import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { Button } from '@/components/ui/button'
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
import { scanPrivacy, anonymizeContent, PrivacyScanResult } from '@/lib/privacy-scanner'
import { getProfilePhoto, getRealAuthorName } from '@/lib/avatar'
import {
  Globe,
  Users,
  UserCircle,
  Send,
  Save,
  Hash,
  Loader2,
  ChevronDown,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  X,
  Code,
  Bold,
  Italic,
  Heading2,
  Quote,
  ShieldCheck,
  ShieldAlert,
  BarChart2,
  Plus,
  Trash2,
  Wand2,
  AlertTriangle,
  BookOpen,
  PenLine,
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

  // Privacy Shield
  const [showPrivacyShield, setShowPrivacyShield] = useState(false)

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

  // Live privacy scan result
  const privacyResult: PrivacyScanResult = useMemo(() => {
    return scanPrivacy(`${articleTitle} ${content}`)
  }, [articleTitle, content])

  // Estimated reading time & writing stats
  const estimatedReadTime = useMemo(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.ceil(words / 200))
  }, [content])

  const charCount = content.length
  const wordCount = useMemo(() => {
    return content.trim().split(/\s+/).filter(Boolean).length
  }, [content])

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
    setShowPrivacyShield(false)
    triggerButtonRef.current?.focus()
  }, [])

  // Listen for Escape and Cmd+Enter keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCloseModal()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleCloseModal])

  // Formatting Handlers
  const handleInsertCode = () => {
    setContent(prev => `${prev}\n\`\`\`\n// Add your code or reflection snippet here\n\`\`\`\n`)
  }

  const handleInsertBold = () => {
    setContent(prev => `${prev} **bold text** `)
  }

  const handleInsertItalic = () => {
    setContent(prev => `${prev} *italic text* `)
  }

  const handleInsertHeading = () => {
    setContent(prev => `${prev}\n\n## Section Heading\n`)
  }

  const handleInsertQuote = () => {
    setContent(prev => `${prev}\n\n> Key lesson or quote\n`)
  }

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

  const handleApplyAnonymize = () => {
    const { sanitizedText, changesCount } = anonymizeContent(content)
    setContent(sanitizedText)
    if (articleTitle) {
      const { sanitizedText: cleanTitle } = anonymizeContent(articleTitle)
      setArticleTitle(cleanTitle)
    }
    toast.success(`De-identified ${changesCount} potential identifying markers!`)
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
      setShowPrivacyShield(false)
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
      <div className="group/card rounded-2xl border border-gray-200/90 bg-white p-3.5 sm:p-4.5 shadow-xs hover:shadow-md dark:border-gray-800 dark:bg-gray-900 transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-700">
        {/* Top Row: User Avatar + 'Start a post' input trigger */}
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div
            className="relative group/avatar cursor-pointer shrink-0"
            onClick={() => handleOpenModal('post')}
            title="Open composer"
          >
            <Avatar
              src={userAvatarUrl || undefined}
              fallbackName={userDisplayName}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full shrink-0 border border-gray-200/90 dark:border-gray-700 shadow-2xs transition-transform duration-200 group-hover/avatar:scale-105"
            />
          </div>

          <button
            ref={triggerButtonRef}
            type="button"
            onClick={() => handleOpenModal('post')}
            className="flex-1 h-10 sm:h-11 flex items-center px-4.5 rounded-full border border-gray-200/90 bg-gray-50/70 hover:bg-gray-100/90 hover:border-primary/40 dark:border-gray-700/70 dark:bg-gray-800/50 dark:hover:bg-gray-800 dark:hover:border-primary/40 text-left text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-all duration-200 cursor-pointer shadow-2xs active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Start a post"
          >
            <span>Start a post...</span>
          </button>
        </div>

        {/* Bottom Row: 3 Primary Actions (Video, Photo, Write article) + Poll */}
        <div className="mt-3 sm:mt-3.5 pt-2.5 sm:pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
          {/* 1. Video Option */}
          <button
            type="button"
            onClick={() => handleOpenModal('video')}
            className="group/btn flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 transition-all duration-200 shrink-0 cursor-pointer active:scale-95"
          >
            <VideoIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 transition-transform duration-200 group-hover/btn:scale-110 group-hover/btn:-translate-y-0.5" />
            <span>Video</span>
          </button>

          {/* 2. Photo Option */}
          <button
            type="button"
            onClick={() => handleOpenModal('photo')}
            className="group/btn flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 transition-all duration-200 shrink-0 cursor-pointer active:scale-95"
          >
            <ImageIcon className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0 transition-transform duration-200 group-hover/btn:scale-110 group-hover/btn:-translate-y-0.5" />
            <span>Photo</span>
          </button>

          {/* 3. Write Article Option */}
          <button
            type="button"
            onClick={() => handleOpenModal('article')}
            className="group/btn flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 transition-all duration-200 shrink-0 cursor-pointer active:scale-95"
          >
            <FileText className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 transition-transform duration-200 group-hover/btn:scale-110 group-hover/btn:-translate-y-0.5" />
            <span>Write article</span>
          </button>

          {/* Auxiliary Option: Poll */}
          <button
            type="button"
            onClick={() => {
              setShowPollBuilder(true)
              handleOpenModal('post')
            }}
            className="group/btn hidden sm:flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 transition-all duration-200 shrink-0 cursor-pointer active:scale-95"
          >
            <BarChart2 className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0 transition-transform duration-200 group-hover/btn:scale-110 group-hover/btn:-translate-y-0.5" />
            <span>Poll</span>
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
      {/* 2. EXPANDED COMPOSER MODAL DIALOG                                         */}
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
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  src={activeAvatarUrl || undefined}
                  fallbackName={activeDisplayName}
                  className="h-10 w-10 shrink-0 border border-gray-200 dark:border-gray-700"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-950 dark:text-white truncate">
                      {activeDisplayName}
                    </span>
                    {isAnonymous && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                        <UserCircle className="h-3 w-3" />
                        Pseudonym
                      </span>
                    )}
                  </div>

                  {/* Visibility Dropdown Selector */}
                  <div className="flex items-center gap-2 mt-0.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border border-gray-200/60 dark:border-gray-700 transition-colors"
                        >
                          <OptionIcon className="h-3 w-3 text-primary" />
                          <span>{selectedOption.label}</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64 z-50">
                        <DropdownMenuLabel className="text-xs">Post Visibility & Identity</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {VISIBILITY_OPTIONS.map((opt) => {
                          const Icon = opt.icon
                          return (
                            <DropdownMenuItem
                              key={opt.value}
                              onSelect={() => setVisibility(opt.value)}
                              className="flex flex-col items-start gap-0.5 cursor-pointer py-2"
                            >
                              <div className="flex items-center gap-2 font-medium text-xs">
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
                        className="h-6 rounded-full border border-gray-200 bg-white px-2 text-xs font-medium text-gray-800 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      >
                        <option value="">Choose Circle...</option>
                        {circles.map((circle) => (
                          <option key={circle.id} value={circle.id}>
                            {circle.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Header Actions: Privacy Scanner Pill + Close Button */}
              <div className="flex items-center gap-2">
                {/* Privacy Shield Pill */}
                {content.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPrivacyShield(!showPrivacyShield)}
                    className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      privacyResult.status === 'safe'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : privacyResult.status === 'warning'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                    }`}
                    title="Toggle Privacy Shield Analysis"
                  >
                    {privacyResult.status === 'safe' ? (
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                    )}
                    <span>Shield: {privacyResult.score}%</span>
                  </button>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Close composer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Mode Switcher Tabs (Post vs Article) */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/60 dark:bg-gray-800/30">
              <div className="flex items-center gap-1.5 p-0.5 bg-gray-200/60 dark:bg-gray-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveMode('post')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeMode !== 'article'
                      ? 'bg-white dark:bg-gray-900 text-gray-950 dark:text-white shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <PenLine className="h-3.5 w-3.5 text-primary" />
                  <span>Short Post</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('article')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeMode === 'article'
                      ? 'bg-white dark:bg-gray-900 text-amber-700 dark:text-amber-300 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 text-amber-500" />
                  <span>Long-form Article</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activeMode === 'article' ? (
                  <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {estimatedReadTime} min read
                  </span>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                    <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <span>{charCount} chars</span>
                  </div>
                )}
              </div>
            </div>

            {/* Privacy Shield Drawer */}
            {showPrivacyShield && privacyResult.risks.length > 0 && (
              <div className="mx-4 mt-3 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-2.5 animate-in fade-in shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Privacy Shield: {privacyResult.risks.length} identifying marker(s) detected
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleApplyAnonymize}
                    className="h-7 text-xs gap-1.5 bg-white text-amber-900 border-amber-300 hover:bg-amber-100 dark:bg-gray-900 dark:text-amber-200 dark:border-amber-700 cursor-pointer"
                  >
                    <Wand2 className="h-3 w-3 text-amber-600" />
                    1-Click De-Identify
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 text-xs">
                  {privacyResult.risks.map((risk, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-white/90 dark:bg-gray-900/90 border border-amber-200/60 dark:border-amber-900/40">
                      <div>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{risk.label}: </span>
                        <span className="text-gray-600 dark:text-gray-300">&ldquo;{risk.matchedText}&rdquo;</span>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">💡 {risk.suggestion}</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 ${
                        risk.severity === 'high' ? 'bg-rose-100 text-rose-800' : risk.severity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {risk.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* ARTICLE MODE: Headline & Cover Photo */}
              {activeMode === 'article' && (
                <div className="space-y-3 pb-2 border-b border-gray-100 dark:border-gray-800 animate-in fade-in">
                  {/* Article Cover Image */}
                  {articleCover ? (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 max-h-56">
                      <Image
                        src={articleCover}
                        alt="Article Cover"
                        width={800}
                        height={300}
                        className="w-full max-h-56 object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={handleRemoveArticleCover}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-950/80 text-white hover:bg-gray-950 transition-colors cursor-pointer"
                        title="Remove cover"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => articleCoverInputRef.current?.click()}
                      className="w-full py-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-amber-400/80 dark:hover:border-amber-500/80 bg-gray-50/50 dark:bg-gray-800/20 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ImageIcon className="h-6 w-6 text-amber-500" />
                      <span className="text-xs font-semibold">Add a cover image</span>
                      <span className="text-[11px] text-gray-400">PNG, JPG, WebP up to 5MB</span>
                    </button>
                  )}

                  {/* Article Headline Input */}
                  <Input
                    placeholder="Article Headline / Title..."
                    value={articleTitle}
                    onChange={(e) => setArticleTitle(e.target.value)}
                    className="text-lg sm:text-xl font-bold border-none px-0 focus-visible:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-transparent h-auto py-1 shadow-none"
                  />
                </div>
              )}

              {/* Main Text Editor (Short Post / Article) */}
              <div className="relative min-h-[150px]">
                <Textarea
                  ref={textareaRef}
                  placeholder={
                    activeMode === 'article'
                      ? 'Write your detailed story, analysis, career advice, or deep-dive article here...'
                      : isAnonymous
                      ? 'Share candid experiences, unfiltered compensation details, or what really happened without your name attached...'
                      : 'What are you thinking about? Share real stories, lessons, or reflections...'
                  }
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
                  className={`w-full resize-none border-none p-0 focus-visible:ring-0 text-[15px] sm:text-base leading-relaxed text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-transparent shadow-none selection:bg-primary/20 ${
                    activeMode === 'article' ? 'min-h-[220px]' : 'min-h-[150px]'
                  }`}
                />
              </div>

              {/* Attached Image Preview (Standard Mode) */}
              {attachedImage && (
                <div className="relative inline-block rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 animate-in fade-in zoom-in-95">
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
                    title="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Attached Video Preview */}
              {attachedVideo && (
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-black max-h-60 animate-in fade-in zoom-in-95">
                  <video
                    src={attachedVideo}
                    controls
                    className="max-h-60 w-full rounded-2xl"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-gray-950/80 text-white hover:bg-gray-950 transition-colors cursor-pointer"
                    title="Remove video"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Poll Builder Box */}
              {showPollBuilder && (
                <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <BarChart2 className="h-4 w-4 text-indigo-500" />
                      Anonymous Community Poll
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
                    placeholder="Ask a question (e.g. How long did your job hunt take?)"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="h-9 text-xs bg-white dark:bg-gray-900"
                  />

                  <div className="space-y-2">
                    {pollOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder={`Option ${idx + 1} (e.g. ${idx === 0 ? 'Less than 1 month' : idx === 1 ? '1 - 3 months' : '4+ months'})`}
                          value={opt}
                          onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                          className="h-8 text-xs bg-white dark:bg-gray-900"
                        />
                        {pollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePollOption(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                            title="Remove option"
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

              {/* Detected Thread Banner */}
              {detectedThreads.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium bg-primary/5 py-1 px-2.5 rounded-lg w-fit border border-primary/15 animate-in fade-in">
                  <Hash className="h-3.5 w-3.5 shrink-0" />
                  <span>Publishing into: {detectedThreads.map(t => `#${t}`).join(', ')}</span>
                </div>
              )}
            </div>

            {/* Modal Footer Action Bar */}
            <div className="p-3.5 sm:p-4.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Left Media & Formatting Tools */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                {/* Photo Picker */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className={`p-2 rounded-xl text-xs transition-all duration-150 flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 ${
                    attachedImage
                      ? 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 shadow-2xs'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                  title="Attach Photo"
                >
                  <ImageIcon className="h-4 w-4 text-blue-500" />
                </button>

                {/* Video Picker */}
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className={`p-2 rounded-xl text-xs transition-all duration-150 flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 ${
                    attachedVideo
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 shadow-2xs'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                  title="Attach Video"
                >
                  <VideoIcon className="h-4 w-4 text-emerald-500" />
                </button>

                {/* Poll Trigger */}
                <button
                  type="button"
                  onClick={() => setShowPollBuilder(!showPollBuilder)}
                  className={`p-2 rounded-xl text-xs transition-all duration-150 flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 ${
                    showPollBuilder
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 shadow-2xs'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                  title="Add Poll"
                >
                  <BarChart2 className="h-4 w-4 text-indigo-500" />
                </button>

                <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />

                {/* Formatting: Bold */}
                <button
                  type="button"
                  onClick={handleInsertBold}
                  className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
                  title="Bold (**text**)"
                >
                  <Bold className="h-4 w-4" />
                </button>

                {/* Formatting: Italic */}
                <button
                  type="button"
                  onClick={handleInsertItalic}
                  className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
                  title="Italic (*text*)"
                >
                  <Italic className="h-4 w-4" />
                </button>

                {/* Formatting: Heading */}
                <button
                  type="button"
                  onClick={handleInsertHeading}
                  className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
                  title="Heading (## Section)"
                >
                  <Heading2 className="h-4 w-4" />
                </button>

                {/* Formatting: Quote */}
                <button
                  type="button"
                  onClick={handleInsertQuote}
                  className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
                  title="Quote (> quote)"
                >
                  <Quote className="h-4 w-4" />
                </button>

                {/* Formatting: Code */}
                <button
                  type="button"
                  onClick={handleInsertCode}
                  className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
                  title="Code snippet (```code```)"
                >
                  <Code className="h-4 w-4" />
                </button>
              </div>

              {/* Right Side: Keyboard Hint + Draft & Post / Publish */}
              <div className="flex items-center gap-2.5 ml-auto">
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-gray-400 font-medium select-none pr-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-[10px] font-mono">⌘↵</kbd> to post
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting || (!content.trim() && !attachedImage && !attachedVideo)}
                  className="h-9 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Draft
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || !hasValidContent}
                  className="h-9 gap-1.5 text-xs font-semibold px-5 rounded-full shadow-xs transition-all duration-200 hover:shadow-md active:scale-95 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      {activeMode === 'article' ? 'Publish Article' : 'Post'}
                      <Send className="h-3.5 w-3.5 ml-0.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}

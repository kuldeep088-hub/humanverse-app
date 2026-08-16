'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Globe,
  Users,
  UserCircle,
  Send,
  Save,
  Hash,
  Loader2,
  ChevronDown,
  Sparkles,
  Image as ImageIcon,
  X,
  Code,
  Bold,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Image from 'next/image'

interface ComposerProps {
  initialContent?: string
  circles: { id: string; name: string }[]
  pseudonym: { id: string; display_name: string } | null
  currentUserProfile?: {
    display_name: string
    avatar_url: string | null
    professional_context: string | null
  } | null
  onPostCreated?: () => void
}

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public Feed', icon: Globe, desc: 'Visible to everyone in Humanverse' },
  { value: 'circle', label: 'Private Circle', icon: Users, desc: 'Shared only with selected circle members' },
  { value: 'pseudonymous', label: 'Pseudonymous', icon: UserCircle, desc: 'Posted under your alias with no identity link' },
] as const

const QUICK_TOPICS = ['#RejectedAgain', '#ShippedIt', '#GotItWrong', '#MoneyTalk', '#SmallWins', '#CareerPivot']

export function Composer({
  initialContent = '',
  circles,
  pseudonym,
  currentUserProfile,
  onPostCreated,
}: ComposerProps) {
  const [content, setContent] = useState(initialContent)
  const [visibility, setVisibility] = useState<'public' | 'circle' | 'pseudonymous'>('public')
  const [selectedCircle, setSelectedCircle] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const { userId } = useCurrentUser()

  const detectedThreads = extractThreads(content)

  const handleAddTag = (tag: string) => {
    if (!content.includes(tag)) {
      setContent(prev => (prev.trim() ? `${prev.trim()} ${tag} ` : `${tag} `))
    }
  }

  const handleInsertCode = () => {
    setContent(prev => `${prev}\n\`\`\`\n// Add your snippet here\n\`\`\`\n`)
  }

  const handleInsertBold = () => {
    setContent(prev => `${prev} **bold text** `)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image must be under 3MB')
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
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (saveDraft = false) => {
    if (!content.trim() && !attachedImage && !saveDraft) return

    if (!userId) {
      toast.error('Please sign in to share a thought')
      return
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

      // Ensure user profile exists in public.profiles to guarantee author name shows
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('id', userId)
        .single()

      if (!existingProfile) {
        const { data: authUser } = await supabase.auth.getUser()
        const fallbackName =
          authUser?.user?.user_metadata?.display_name ||
          authUser?.user?.email?.split('@')[0] ||
          'Human Member'
        await supabase.from('profiles').upsert({
          id: userId,
          display_name: fallbackName,
        })
      }

      let finalContent = content.trim()

      // Handle image upload if attached
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
            // Fall back to data URI
          }
        }
        finalContent = `${finalContent}\n\n[image: ${finalImageUrl}]`.trim()
      }

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

      const { error } = await supabase.from('posts').insert({
        author_id: userId,
        content: finalContent,
        visibility,
        thread_id: threadId,
        circle_id: circleId,
        pseudonym_id: pseudonymId,
      })

      if (error) throw error

      setContent('')
      handleRemoveImage()
      setSelectedCircle('')
      toast.success('Your thought has been shared!')

      if (onPostCreated) {
        onPostCreated()
      }
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error('Could not publish post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedOption = VISIBILITY_OPTIONS.find(v => v.value === visibility) || VISIBILITY_OPTIONS[0]
  const OptionIcon = selectedOption.icon

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-all focus-within:border-primary/40 focus-within:shadow-md">
      <div className="flex items-start gap-3.5">
        <Avatar
          src={visibility === 'pseudonymous' ? undefined : (currentUserProfile?.avatar_url || undefined)}
          fallbackName={
            visibility === 'pseudonymous'
              ? (pseudonym?.display_name || 'Alias')
              : (currentUserProfile?.display_name || 'You')
          }
          className="h-10 w-10 shrink-0 border border-gray-100 dark:border-gray-800 shadow-sm"
        />

        <div className="flex-1 min-w-0">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              visibility === 'pseudonymous'
                ? 'What happened that you could never share under your real name?'
                : 'What actually happened? Share the real, unfiltered story...'
            }
            className="min-h-[90px] w-full resize-none border-0 p-0 text-base leading-relaxed placeholder:text-gray-400 focus-visible:ring-0 bg-transparent dark:text-white"
            aria-label="Post content"
          />

          {/* Attached Image Thumbnail */}
          {attachedImage && (
            <div className="relative mt-2 inline-block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <Image
                src={attachedImage}
                alt="Upload preview"
                width={300}
                height={200}
                className="max-h-48 w-auto object-cover rounded-xl"
                unoptimized
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-gray-950/80 text-white hover:bg-gray-950 transition-colors"
                title="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Quick topic pills */}
          {!content && !attachedImage && (
            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[11px] font-semibold text-gray-400 shrink-0 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Prompt:
              </span>
              {QUICK_TOPICS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddTag(tag)}
                  className="px-2 py-0.5 rounded-md bg-gray-50 text-[11px] font-medium text-gray-600 border border-gray-200/60 hover:bg-gray-100 hover:text-primary dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700/60 shrink-0 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Detected Thread Tag Banner */}
          {detectedThreads.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-primary font-medium bg-primary/5 py-1 px-2.5 rounded-lg w-fit border border-primary/15">
              <Hash className="h-3.5 w-3.5 shrink-0" />
              <span>Publishing into: {detectedThreads.map(t => `#${t}`).join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
        {/* Left Tools (Visibility + Media + Formatting) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Visibility Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold rounded-xl border-gray-200 dark:border-gray-700"
              >
                <OptionIcon className="h-3.5 w-3.5 text-primary" />
                <span>{selectedOption.label}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="text-xs">Post Visibility</DropdownMenuLabel>
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

          {/* Circle Picker if Circle Visibility is chosen */}
          {visibility === 'circle' && (
            <select
              value={selectedCircle}
              onChange={(e) => setSelectedCircle(e.target.value)}
              className="h-8 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-800 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">Choose Circle...</option>
              {circles.map((circle) => (
                <option key={circle.id} value={circle.id}>
                  {circle.name}
                </option>
              ))}
            </select>
          )}

          {/* Media Upload Attachment */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="sr-only"
            id="composer-image-upload"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
              attachedImage
                ? 'border-primary/50 text-primary bg-primary/5'
                : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
            title="Attach screenshot or photo"
          >
            <ImageIcon className="h-4 w-4" />
          </button>

          {/* Code Formatting */}
          <button
            type="button"
            onClick={handleInsertCode}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            title="Add code snippet"
          >
            <Code className="h-4 w-4" />
          </button>

          {/* Bold Formatting */}
          <button
            type="button"
            onClick={handleInsertBold}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            title="Bold text"
          >
            <Bold className="h-4 w-4" />
          </button>
        </div>

        {/* Right Actions: Draft and Share */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting || (!content.trim() && !attachedImage)}
            className="h-8 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Draft
          </Button>

          <Button
            size="sm"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || (!content.trim() && !attachedImage)}
            className="h-8 gap-1.5 text-xs font-semibold px-4 rounded-xl shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                Share Story
                <Send className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
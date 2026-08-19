'use client'

import { useState, useRef, useMemo } from 'react'
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
import { HelpType } from '@/types'
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
  ShieldCheck,
  ShieldAlert,
  BarChart2,
  Plus,
  Trash2,
  HeartHandshake,
  Wand2,
  AlertTriangle,
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

const HELP_TYPES: { id: HelpType; label: string; icon: string }[] = [
  { id: 'seeking_advice', label: 'Seeking Advice', icon: '🙋‍♂️' },
  { id: 'offering_help', label: 'Offering Help', icon: '🤝' },
  { id: 'resume_review', label: 'Resume Review', icon: '📄' },
  { id: 'mock_interview', label: 'Mock Interview', icon: '🎯' },
  { id: 'layoff_support', label: 'Layoff Support', icon: '💛' },
]

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
  const [selectedHelpType, setSelectedHelpType] = useState<HelpType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [showPrivacyShield, setShowPrivacyShield] = useState(false)

  // Poll state
  const [showPollBuilder, setShowPollBuilder] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const { userId } = useCurrentUser()

  const detectedThreads = extractThreads(content)

  // Live privacy scan result
  const privacyResult: PrivacyScanResult = useMemo(() => {
    return scanPrivacy(content)
  }, [content])

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

  const handleApplyAnonymize = () => {
    const { sanitizedText, changesCount } = anonymizeContent(content)
    setContent(sanitizedText)
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

  const handleSubmit = async (saveDraft = false) => {
    if (!content.trim() && !attachedImage && !saveDraft) return

    if (!userId) {
      toast.error('Please sign in to share a thought')
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

      const { data: createdPost, error } = await supabase.from('posts').insert({
        author_id: userId,
        content: finalContent,
        visibility,
        thread_id: threadId,
        circle_id: circleId,
        pseudonym_id: pseudonymId,
        help_type: selectedHelpType || null,
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

      setContent('')
      handleRemoveImage()
      setSelectedCircle('')
      setSelectedHelpType(null)
      setShowPollBuilder(false)
      setPollQuestion('')
      setPollOptions(['', ''])
      setShowPrivacyShield(false)
      toast.success('Your thought has been shared!')

      if (onPostCreated) {
        onPostCreated()
      }
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error('Failed to post. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedOption = VISIBILITY_OPTIONS.find(o => o.value === visibility)!
  const OptionIcon = selectedOption.icon

  // Identity preview details
  const isAnonymous = visibility === 'pseudonymous'
  const activeDisplayName = isAnonymous
    ? pseudonym?.display_name || 'Anonymous Alias (Not configured)'
    : currentUserProfile?.display_name || 'You'
  const activeAvatarUrl = isAnonymous ? null : currentUserProfile?.avatar_url

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900 transition-all">
      {/* Identity Indicator Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar
            src={activeAvatarUrl || undefined}
            fallbackName={activeDisplayName}
            className="h-8 w-8 shrink-0 border border-gray-200/80 dark:border-gray-700"
          />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
              {activeDisplayName}
            </span>
            {isAnonymous ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                <UserCircle className="h-3 w-3" />
                Pseudonym
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary dark:bg-primary/20 shrink-0">
                <Globe className="h-3 w-3" />
                Real Profile
              </span>
            )}
          </div>
        </div>

        {/* Privacy Shield Scanner Button */}
        {content.trim().length > 0 && (
          <button
            type="button"
            onClick={() => setShowPrivacyShield(!showPrivacyShield)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              privacyResult.status === 'safe'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : privacyResult.status === 'warning'
                ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            {privacyResult.status === 'safe' ? (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
            )}
            <span>Privacy Shield: {privacyResult.score}%</span>
          </button>
        )}
      </div>

      {/* Privacy Shield Drawer / Risk Report */}
      {showPrivacyShield && privacyResult.risks.length > 0 && (
        <div className="mb-4 p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-2.5 animate-in fade-in">
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
              className="h-7 text-xs gap-1.5 bg-white text-amber-900 border-amber-300 hover:bg-amber-100 dark:bg-gray-900 dark:text-amber-200 dark:border-amber-700"
            >
              <Wand2 className="h-3 w-3 text-amber-600" />
              1-Click De-Identify
            </Button>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 text-xs">
            {privacyResult.risks.map((risk, i) => (
              <div key={i} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-white/80 dark:bg-gray-900/80 border border-amber-200/60 dark:border-amber-900/40">
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

      {/* Main Composer Box */}
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <Textarea
            placeholder={
              isAnonymous
                ? 'Share candid experiences, unfiltered compensation details, or what really happened without your name attached...'
                : 'What real work experience, layoff story, or career pivot is on your mind today?'
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none border-none p-0 focus-visible:ring-0 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-transparent"
          />

          {/* Attached Image Preview */}
          {attachedImage && (
            <div className="relative mt-3 inline-block rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <Image
                src={attachedImage}
                alt="Upload preview"
                width={320}
                height={180}
                className="max-h-48 w-auto object-cover rounded-xl"
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

          {/* Interactive Poll Builder Box */}
          {showPollBuilder && (
            <div className="mt-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <BarChart2 className="h-4 w-4 text-primary" />
                  Anonymous Community Poll
                </span>
                <button
                  type="button"
                  onClick={() => setShowPollBuilder(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <Input
                placeholder="Ask a question (e.g. How long did your job hunt take?)"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="h-8 text-xs bg-white dark:bg-gray-900"
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
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0"
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
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 pt-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Option
                </button>
              )}
            </div>
          )}

          {/* Help Exchange Tag Selector */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[11px] font-semibold text-gray-400 shrink-0 flex items-center gap-1">
              <HeartHandshake className="h-3 w-3 text-primary" />
              Tag:
            </span>
            {HELP_TYPES.map(ht => {
              const isSelected = selectedHelpType === ht.id
              return (
                <button
                  key={ht.id}
                  type="button"
                  onClick={() => setSelectedHelpType(isSelected ? null : ht.id)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border shrink-0 transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-primary/10 text-primary border-primary font-bold shadow-xs'
                      : 'bg-gray-50 text-gray-600 border-gray-200/80 hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700/80'
                  }`}
                >
                  <span>{ht.icon}</span>
                  <span>{ht.label}</span>
                </button>
              )
            })}
          </div>

          {/* Quick topic pills */}
          {!content && !attachedImage && (
            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[11px] font-semibold text-gray-400 shrink-0 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Topics:
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
        {/* Left Tools (Visibility + Media + Formatting + Poll) */}
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

          {/* Poll Builder Trigger */}
          <button
            type="button"
            onClick={() => setShowPollBuilder(!showPollBuilder)}
            className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
              showPollBuilder
                ? 'border-primary/50 text-primary bg-primary/5'
                : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
            title="Create an anonymous poll"
          >
            <BarChart2 className="h-4 w-4" />
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
            disabled={isSubmitting || (!content.trim() && !attachedImage && !showPollBuilder)}
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

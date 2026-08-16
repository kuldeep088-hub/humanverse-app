'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
  const router = useRouter()
  const supabase = createClient()
  const { userId } = useCurrentUser()

  const detectedThreads = extractThreads(content)

  const handleAddTag = (tag: string) => {
    if (!content.includes(tag)) {
      setContent(prev => (prev.trim() ? `${prev.trim()} ${tag} ` : `${tag} `))
    }
  }

  const handleSubmit = async (saveDraft = false) => {
    if (!content.trim() && !saveDraft) return

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
          router.push('/app/settings/pseudonym')
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
        const fallbackName = authUser?.user?.user_metadata?.display_name || authUser?.user?.email?.split('@')[0] || 'Human Member'
        await supabase.from('profiles').upsert({
          id: userId,
          display_name: fallbackName,
        })
      }

      if (saveDraft) {
        const { error } = await supabase.from('drafts').upsert({
          user_id: userId,
          content,
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
        content: content.trim(),
        visibility,
        thread_id: threadId,
        circle_id: circleId,
        pseudonym_id: pseudonymId,
      })

      if (error) throw error

      setContent('')
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

          {/* Quick topic pills */}
          {!content && (
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
        {/* Visibility Selector */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 px-2.5 text-xs font-medium bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
                disabled={isSubmitting}
              >
                <OptionIcon className="h-3.5 w-3.5 text-primary" />
                <span>{selectedOption.label}</span>
                <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-1.5">
              <DropdownMenuLabel className="text-xs text-gray-500 font-medium">
                Who can see this thought?
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {VISIBILITY_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => setVisibility(option.value)}
                  className={`p-2 rounded-lg cursor-pointer ${visibility === option.value ? 'bg-primary/10 text-primary' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <option.icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-xs text-gray-950 dark:text-white">{option.label}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{option.desc}</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Circle Picker if visibility is circle */}
          {visibility === 'circle' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs font-medium border-primary/40 bg-primary/5 text-primary">
                  {selectedCircle
                    ? (circles.find(c => c.id === selectedCircle)?.name || 'Select Circle')
                    : 'Choose Circle'}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel className="text-xs">Select a Circle</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {circles.length === 0 ? (
                  <DropdownMenuItem disabled className="text-xs text-gray-400">
                    No circles yet. Create one in My Circles.
                  </DropdownMenuItem>
                ) : (
                  circles.map((circle) => (
                    <DropdownMenuItem
                      key={circle.id}
                      onSelect={() => setSelectedCircle(circle.id)}
                      className={selectedCircle === circle.id ? 'bg-primary/10 text-primary font-medium' : ''}
                    >
                      {circle.name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting || !content.trim()}
            className="h-8 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save Draft
          </Button>
          <Button
            size="sm"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || !content.trim()}
            className="h-8 px-4 text-xs font-semibold gap-1.5 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                Share Thought
                <Send className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface ComposerProps {
  initialContent?: string
  circles: { id: string; name: string }[]
  pseudonym: { id: string; display_name: string } | null
}

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', icon: Globe, desc: 'Anyone can see this' },
  { value: 'circle', label: 'Circle', icon: Users, desc: 'Only circle members' },
  { value: 'pseudonymous', label: 'Pseudonymous', icon: UserCircle, desc: 'Posted as your pseudonym' },
] as const

export function Composer({ initialContent = '', circles, pseudonym }: ComposerProps) {
  const [content, setContent] = useState(initialContent)
  const [visibility, setVisibility] = useState<'public' | 'circle' | 'pseudonymous'>('public')
  const [selectedCircle, setSelectedCircle] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { userId } = useCurrentUser()

  const mockUser = { id: userId || 'dev-user-1', email: 'dev@humanverse.fun' }

  const handleSubmit = async (saveDraft = false) => {
    if (!content.trim() && !saveDraft) return

    setIsSubmitting(true)
    try {
      let circleId: string | null = null
      let pseudonymId: string | null = null

      if (visibility === 'circle') {
        circleId = selectedCircle
        if (!circleId) {
          toast.error('Select a circle')
          return
        }
      } else if (visibility === 'pseudonymous') {
        if (!pseudonym) {
          toast.error('Set up a pseudonym first')
          router.push('/app/settings/pseudonym')
          return
        }
        pseudonymId = pseudonym.id
      }

      const threadSlug = extractThreads(content)[0] || null
      let threadId: string | null = null

      if (threadSlug) {
        const { data: thread } = await supabase
          .from('threads')
          .select('id')
          .eq('slug', threadSlug)
          .single()
        threadId = thread?.id || null

        if (!threadId) {
          const { data: newThread } = await supabase
            .from('threads')
            .insert({ slug: threadSlug, name: `#${threadSlug}` })
            .select()
            .single()
          threadId = newThread?.id || null
        }
      }

      if (saveDraft) {
        const { error } = await supabase.from('drafts').upsert({
          user_id: mockUser.id,
          content,
          thread_id: threadId,
          visibility,
          circle_id: circleId,
          pseudonym_id: pseudonymId,
        })
        if (error) throw error
        toast.success('Draft saved')
        return
      }

      const { error } = await supabase.from('posts').insert({
        author_id: mockUser.id,
        content,
        visibility,
        thread_id: threadId,
        circle_id: circleId,
        pseudonym_id: pseudonymId,
      })

      if (error) throw error

      setContent('')
      setSelectedCircle('')
      toast.success('Posted')
      router.refresh()
    } catch {
      toast.error('That didn\'t post. Your draft is saved — try again in a moment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-800">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What actually happened?"
        className="min-h-[100px] resize-none border-0 focus:ring-0 bg-transparent text-lg"
        aria-label="Post content"
      />

      {extractThreads(content).length > 0 && (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Hash className="h-4 w-4 shrink-0" />
          <span>Thread: {extractThreads(content).map(t => `#${t}`).join(', ')}</span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9 px-3"
                disabled={isSubmitting}
              >
                {(() => {
                  const option = VISIBILITY_OPTIONS.find(v => v.value === visibility)
                  if (option?.icon) {
                    return <option.icon className="h-4 w-4" />
                  }
                  return null
                })()}
                {VISIBILITY_OPTIONS.find(v => v.value === visibility)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Who sees this</DropdownMenuLabel>
              {VISIBILITY_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => setVisibility(option.value)}
                  className={visibility === option.value ? 'bg-primary/10' : ''}
                >
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-gray-500">{option.desc}</span>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {visibility === 'circle' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-3">
                  {selectedCircle
                    ? circles.find(c => c.id === selectedCircle)?.name
                    : 'Select circle'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Choose a circle</DropdownMenuLabel>
                {circles.map((circle) => (
                  <DropdownMenuItem
                    key={circle.id}
                    onSelect={() => setSelectedCircle(circle.id)}
                    className={selectedCircle === circle.id ? 'bg-primary/10' : ''}
                  >
                    {circle.name}
                  </DropdownMenuItem>
                ))}
                {circles.length === 0 && (
                  <DropdownMenuItem className="text-gray-500 cursor-default">
                    No circles yet
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="sm" onClick={() => handleSubmit(true)} disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            Save draft
          </Button>
          <Button
            size="sm"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting
              </>
            ) : (
              <>
                Post
                <Send className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
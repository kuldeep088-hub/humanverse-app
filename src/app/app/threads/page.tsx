'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Hash, Loader2, Plus, Search, MessageSquare, Flame, Sparkles, TrendingUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Thread {
  id: string
  slug: string
  name: string
  description: string | null
  post_count: number
  created_at: string
  updated_at: string
}

const FEATURED_TOPICS = [
  { slug: 'rejectedagain', name: '#RejectedAgain', desc: 'The rejection emails, ghosting stories, and resilient returns.', tag: 'Career' },
  { slug: 'laidoff', name: '#LaidOff', desc: 'Day 1 to day 90. The honest transition between roles.', tag: 'Career' },
  { slug: 'gotitwrong', name: '#GotItWrong', desc: 'Real mistakes with root causes left in. No sugarcoating.', tag: 'Lessons' },
  { slug: 'shippedit', name: '#ShippedIt', desc: 'The real gritty work delivered, beyond the LinkedIn fluff.', tag: 'Wins' },
  { slug: 'moneytalk', name: '#MoneyTalk', desc: 'Transparent salaries, offers turned down, and actual numbers.', tag: 'Finance' },
  { slug: 'smallwins', name: '#SmallWins', desc: 'Quiet milestones that nobody else noticed or applauded.', tag: 'Wins' },
  { slug: 'unpopularopinion', name: '#UnpopularOpinion', desc: 'What your industry secretly thinks but never says aloud.', tag: 'Culture' },
  { slug: 'badmanager', name: '#BadManager', desc: 'Dysfunctional leadership and how teams navigated it.', tag: 'Culture' },
  { slug: 'burnedout', name: '#BurnedOut', desc: 'Before it got bad, the breaking point, and recovery.', tag: 'Health' },
  { slug: 'careerpivot', name: '#CareerPivot', desc: 'Starting over in a whole new field at 30, 40, or 50.', tag: 'Career' },
  { slug: 'firstjob', name: '#FirstJob', desc: 'The unspoken rules no university prepared you for.', tag: 'Career' },
  { slug: 'impostersyndrome', name: '#ImposterSyndrome', desc: 'Still waiting to be found out as not qualified.', tag: 'Culture' },
]

export default function ThreadsPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('All')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newThreadName, setNewThreadName] = useState('')
  const [newThreadDesc, setNewThreadDesc] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchThreads = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from('threads')
      .select('*')
      .order('post_count', { ascending: false })
      .limit(100)

    setThreads((data as Thread[]) || [])
    setIsLoading(false)
  }

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('threads')
        .select('*')
        .order('post_count', { ascending: false })
        .limit(100)

      if (isMounted) {
        setThreads((data as Thread[]) || [])
        setIsLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanSlug = newThreadName.replace(/^#/, '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (!cleanSlug) {
      toast.error('Please enter a valid thread name')
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('threads').insert({
        slug: cleanSlug,
        name: `#${cleanSlug}`,
        description: newThreadDesc.trim() || null,
      })

      if (error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          toast.error('A thread with this name already exists')
        } else {
          throw error
        }
      } else {
        toast.success(`Thread #${cleanSlug} created!`)
        setIsCreateOpen(false)
        setNewThreadName('')
        setNewThreadDesc('')
        fetchThreads()
      }
    } catch {
      toast.error('Could not create thread')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Combine DB threads and default featured topics
  const combinedThreads = [...threads]
  for (const ft of FEATURED_TOPICS) {
    if (!combinedThreads.some(t => t.slug.toLowerCase() === ft.slug.toLowerCase())) {
      combinedThreads.push({
        id: `ft-${ft.slug}`,
        slug: ft.slug,
        name: ft.name,
        description: ft.desc,
        post_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  }

  // Filtering
  const filteredThreads = combinedThreads.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))

    if (!matchesSearch) return false

    if (selectedTag === 'All') return true
    if (selectedTag === 'Popular') return t.post_count > 0

    const featured = FEATURED_TOPICS.find(ft => ft.slug.toLowerCase() === t.slug.toLowerCase())
    if (selectedTag === 'Career') return featured?.tag === 'Career'
    if (selectedTag === 'Culture') return featured?.tag === 'Culture'
    if (selectedTag === 'Wins') return featured?.tag === 'Wins'

    return true
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-white flex items-center gap-2">
            <Hash className="h-6 w-6 text-primary" />
            Humanverse Threads
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Candid spaces dedicated to honest working life discussions.
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} className="gap-1.5 self-start sm:self-center shadow-sm">
          <Plus className="h-4 w-4" />
          Create Thread
        </Button>
      </div>

      {/* Search & Tag Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics (e.g. #LaidOff, #MoneyTalk, #SmallWins)..."
            className="pl-10 h-11 bg-gray-50/80 dark:bg-gray-900 border-gray-200 dark:border-gray-800 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Tags */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-medium no-scrollbar">
          {['All', 'Popular', 'Career', 'Culture', 'Wins'].map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3.5 py-1.5 rounded-full border transition-all shrink-0 ${
                selectedTag === tag
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800'
              }`}
            >
              {tag === 'Popular' && <Flame className="inline h-3 w-3 mr-1 text-amber-500" />}
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Threads Grid */}
      {filteredThreads.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          <Hash className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-base font-medium text-gray-900 dark:text-white">No matching threads</p>
          <p className="text-xs text-gray-500 mt-1">Try a different search keyword or create a new topic.</p>
          <Button onClick={() => setIsCreateOpen(true)} variant="outline" size="sm" className="mt-4">
            Start #{searchQuery.replace(/^#/, '') || 'NewTopic'}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredThreads.map(thread => {
            const isHot = thread.post_count > 2
            return (
              <Link
                key={thread.id}
                href={`/app/threads/${thread.slug}`}
                className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/30"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-base text-gray-950 group-hover:text-primary transition-colors dark:text-white">
                      #{thread.slug}
                    </span>
                    {isHot && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900">
                        <TrendingUp className="h-3 w-3" />
                        Trending
                      </span>
                    )}
                  </div>

                  {thread.description && (
                    <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">
                      {thread.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1.5 font-medium text-gray-600 dark:text-gray-400">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    {thread.post_count} {thread.post_count === 1 ? 'post' : 'posts'}
                  </span>
                  <span className="text-primary font-medium group-hover:translate-x-0.5 transition-transform">
                    Explore →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Create Thread Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-950 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Start a New Thread
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="threadName" className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  Thread Name / Hashtag
                </Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-gray-400">#</span>
                  <Input
                    id="threadName"
                    value={newThreadName}
                    onChange={(e) => setNewThreadName(e.target.value.replace(/^#/, ''))}
                    placeholder="e.g. PivotStory, OvertimeConfessions"
                    className="pl-7"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="threadDesc" className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  Topic Description <span className="normal-case text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="threadDesc"
                  value={newThreadDesc}
                  onChange={(e) => setNewThreadDesc(e.target.value)}
                  placeholder="What should people share under this thread?"
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !newThreadName.trim()}>
                  {isSubmitting ? 'Creating...' : 'Create Thread'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
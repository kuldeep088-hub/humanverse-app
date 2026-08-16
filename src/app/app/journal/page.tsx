'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { PostComponent } from '@/components/app/post'
import { fetchFeedPosts } from '@/lib/data-service'
import { getSavedPostIds } from '@/lib/bookmarks'
import { Post, Draft } from '@/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  BookOpen,
  Download,
  Bookmark,
  FileText,
  Lock,
  Loader2,
  Sparkles,
  Save,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

export default function JournalPage() {
  const { userId: currentUserId, isLoading: isUserLoading } = useCurrentUser()
  const [myPosts, setMyPosts] = useState<Post[]>([])
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [scratchNotes, setScratchNotes] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('humanverse_scratch_notes') || ''
    }
    return ''
  })
  const [activeTab, setActiveTab] = useState<'reflections' | 'saved' | 'drafts' | 'scratchpad'>('reflections')
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    display_name: string
    avatar_url: string | null
    professional_context: string | null
  } | null>(null)

  const supabase = createClient()

  const fetchJournalData = useCallback(async () => {
    if (!currentUserId) return

    try {
      // 1. Fetch user profile
      const { data: profData } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, professional_context')
        .eq('id', currentUserId)
        .single()
      if (profData) setCurrentUserProfile(profData)

      // 2. Fetch my posts
      const myPostsData = await fetchFeedPosts(supabase, {
        currentUserId,
        authorId: currentUserId,
        limit: 100,
      })
      setMyPosts(myPostsData)

      // 3. Fetch saved posts
      const savedIds = getSavedPostIds()
      if (savedIds.length > 0) {
        const allFeed = await fetchFeedPosts(supabase, {
          currentUserId,
          limit: 100,
        })
        const filteredSaved = allFeed.filter(p => savedIds.includes(p.id))
        setSavedPosts(filteredSaved)
      } else {
        setSavedPosts([])
      }

      // 4. Fetch drafts
      const { data: draftsData } = await supabase
        .from('drafts')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })

      setDrafts((draftsData as Draft[]) || [])
    } catch (err) {
      console.error('Failed to load journal:', err)
    } finally {
      setIsLoading(false)
    }
  }, [currentUserId, supabase])

  useEffect(() => {
    const run = async () => {
      await fetchJournalData()
    }
    run()
  }, [fetchJournalData])

  const handleSaveScratchpad = () => {
    setIsSavingNotes(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('humanverse_scratch_notes', scratchNotes)
    }
    toast.success('Private notes saved locally')
    setTimeout(() => setIsSavingNotes(false), 800)
  }

  // 1-Click Markdown Export Engine
  const handleExportMarkdown = () => {
    setIsExporting(true)
    try {
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      const authorName = currentUserProfile?.display_name || 'Humanverse Member'
      const context = currentUserProfile?.professional_context || 'Verified Professional'

      let md = `# Career Reflection Journal & Archive\n`
      md += `**Author:** ${authorName} (${context})\n`
      md += `**Exported on:** ${now.toLocaleDateString('en-US', { dateStyle: 'full' })}\n`
      md += `**Platform:** Humanverse (https://app.humanverse.fun)\n\n`
      md += `---\n\n`

      // 1. Published Stories
      md += `## 1. My Published Reflections & Stories (${myPosts.length})\n\n`
      if (myPosts.length === 0) {
        md += `*No published stories yet.*\n\n`
      } else {
        myPosts.forEach((post, i) => {
          const date = new Date(post.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })
          const reactions = post.reaction_counts || { been_there: 0, oof: 0, respect: 0, needed_this: 0 }
          const totalReactions = reactions.been_there + reactions.oof + reactions.respect + reactions.needed_this

          md += `### ${i + 1}. Story published on ${date}\n`
          if (post.thread) md += `**Thread:** #${post.thread.slug}\n`
          md += `**Visibility:** ${post.visibility}\n`
          md += `**Community Reactions:** ${totalReactions} (Been there: ${reactions.been_there}, Respect: ${reactions.respect}, Needed this: ${reactions.needed_this}, Oof: ${reactions.oof})\n\n`
          md += `${post.content}\n\n`
          md += `---\n\n`
        })
      }

      // 2. Saved Wisdom & Bookmarks
      md += `## 2. Saved Peer Wisdom & Bookmarked Stories (${savedPosts.length})\n\n`
      if (savedPosts.length === 0) {
        md += `*No saved stories yet.*\n\n`
      } else {
        savedPosts.forEach((post, i) => {
          const author = post.author?.display_name || 'Peer Member'
          const authorHeadline = post.author?.professional_context ? `(${post.author.professional_context})` : ''
          const date = new Date(post.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })

          md += `### ${i + 1}. Insight from ${author} ${authorHeadline} - ${date}\n`
          if (post.thread) md += `**Topic:** #${post.thread.slug}\n\n`
          md += `${post.content}\n\n`
          md += `---\n\n`
        })
      }

      // 3. Unpublished Drafts
      if (drafts.length > 0) {
        md += `## 3. My Unpublished Drafts (${drafts.length})\n\n`
        drafts.forEach((draft, i) => {
          const date = new Date(draft.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })
          md += `### ${i + 1}. Draft from ${date}\n`
          md += `${draft.content}\n\n`
          md += `---\n\n`
        })
      }

      // 4. Private Scratchpad Notes
      if (scratchNotes.trim()) {
        md += `## 4. Private Work Notes & Scratchpad\n\n`
        md += `${scratchNotes.trim()}\n\n`
        md += `---\n\n`
      }

      // Trigger Browser Download
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Humanverse-Career-Journal-${dateStr}.md`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Career Journal exported to Markdown (.md)!')
    } catch (err) {
      toast.error('Could not generate export file')
      console.error(err)
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading || isUserLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-950 dark:text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Career Journal & Archive
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-lg">
            Your personal archive of candid reflections, bookmarked wisdom, and private work logs.
          </p>
        </div>

        <Button
          onClick={handleExportMarkdown}
          disabled={isExporting}
          className="gap-2 shrink-0 rounded-xl shadow-xs"
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export to Markdown (.md)
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('reflections')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'reflections'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          My Published Stories ({myPosts.length})
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'saved'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800'
          }`}
        >
          <Bookmark className="h-3.5 w-3.5 text-emerald-500" />
          Saved Wisdom ({savedPosts.length})
        </button>

        <button
          onClick={() => setActiveTab('drafts')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'drafts'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800'
          }`}
        >
          <FileText className="h-3.5 w-3.5 text-amber-500" />
          Drafts ({drafts.length})
        </button>

        <button
          onClick={() => setActiveTab('scratchpad')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'scratchpad'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800'
          }`}
        >
          <Lock className="h-3.5 w-3.5 text-purple-500" />
          Private Scratchpad
        </button>
      </div>

      {/* Tab: My Published Stories */}
      {activeTab === 'reflections' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {myPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400 space-y-2">
              <Sparkles className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="text-base font-semibold text-gray-950 dark:text-white">No published stories yet</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Any story you post in the feed or community threads is archived here for your career records.
              </p>
            </div>
          ) : (
            myPosts.map((post) => (
              <PostComponent
                key={post.id}
                post={post}
                onUpdate={fetchJournalData}
                currentUserId={currentUserId}
                currentUserProfile={currentUserProfile}
              />
            ))
          )}
        </div>
      )}

      {/* Tab: Saved Wisdom */}
      {activeTab === 'saved' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {savedPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400 space-y-2">
              <Bookmark className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="text-base font-semibold text-gray-950 dark:text-white">No bookmarked stories yet</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Click the bookmark icon on any post across the platform to save valuable peer lessons into your personal journal.
              </p>
            </div>
          ) : (
            savedPosts.map((post) => (
              <PostComponent
                key={post.id}
                post={post}
                onUpdate={fetchJournalData}
                currentUserId={currentUserId}
                currentUserProfile={currentUserProfile}
              />
            ))
          )}
        </div>
      )}

      {/* Tab: Drafts */}
      {activeTab === 'drafts' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {drafts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400 space-y-2">
              <FileText className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="text-base font-semibold text-gray-950 dark:text-white">No saved drafts</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Any story drafts you start in the feed composer and save for later will appear here.
              </p>
            </div>
          ) : (
            drafts.map((draft) => (
              <div
                key={draft.id}
                className="p-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span className="font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                    Draft ({draft.visibility})
                  </span>
                  <span>{new Date(draft.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {draft.content}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Private Scratchpad */}
      {activeTab === 'scratchpad' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-950 dark:text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Private Career Scratchpad
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Unfiltered notes, negotiations in progress, or thoughts before sharing. Saved securely in your browser and included in your Markdown export.
              </p>
            </div>

            <Button
              size="sm"
              onClick={handleSaveScratchpad}
              disabled={isSavingNotes}
              className="gap-1.5 text-xs rounded-xl"
            >
              {isSavingNotes ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              Save Notes
            </Button>
          </div>

          <Textarea
            value={scratchNotes}
            onChange={(e) => setScratchNotes(e.target.value)}
            placeholder="Write unvarnished notes, interview retrospectives, salary negotiations, or things you learned this week..."
            className="min-h-[260px] text-sm leading-relaxed p-4 font-mono rounded-xl bg-gray-50/70 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
          />

          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
            <span>{scratchNotes.length} characters</span>
            <span>Automatically exported in your .md download</span>
          </div>
        </div>
      )}
    </div>
  )
}

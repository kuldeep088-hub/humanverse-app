'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CareerMilestone } from '@/types'
import {
  GitCommit,
  Plus,
  Trash2,
  Loader2,
  X,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Award,
  BookOpen,
  Briefcase,
} from 'lucide-react'
import { toast } from 'sonner'

interface CareerTimelineProps {
  userId: string
  isOwnProfile: boolean
}

const TYPE_CONFIG = {
  pivot: { label: 'Career Pivot', color: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800', icon: TrendingUp },
  win: { label: 'Major Win / Milestone', color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800', icon: Award },
  failure: { label: 'Failed Venture / Setback', color: 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800', icon: AlertCircle },
  lesson: { label: 'Hard Lesson Learned', color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800', icon: BookOpen },
  role: { label: 'Role & Responsibilities', color: 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700', icon: Briefcase },
}

export function CareerTimeline({ userId, isOwnProfile }: CareerTimelineProps) {
  const [milestones, setMilestones] = useState<CareerMilestone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [period, setPeriod] = useState('')
  const [title, setTitle] = useState('')
  const [roleOrVenture, setRoleOrVenture] = useState('')
  const [milestoneType, setMilestoneType] = useState<CareerMilestone['type']>('pivot')
  const [story, setStory] = useState('')
  const [keyLesson, setKeyLesson] = useState('')

  const supabase = createClient()

  const fetchMilestones = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('career_milestones')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      setMilestones((data as CareerMilestone[]) || [])
    } catch (err) {
      console.error('Failed to load milestones:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    const run = async () => {
      await fetchMilestones()
    }
    run()
  }, [fetchMilestones])

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !story.trim() || !period.trim()) {
      toast.error('Please fill in the title, timeframe, and story')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('career_milestones').insert({
        user_id: userId,
        year_or_period: period.trim(),
        title: title.trim(),
        role_or_venture: roleOrVenture.trim() || 'Independent / General',
        type: milestoneType,
        story: story.trim(),
        key_lesson: keyLesson.trim() || null,
      })

      if (error) throw error

      toast.success('Career milestone added!')
      setIsModalOpen(false)
      setPeriod('')
      setTitle('')
      setRoleOrVenture('')
      setStory('')
      setKeyLesson('')
      fetchMilestones()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add milestone')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('Remove this milestone from your journey?')) return
    try {
      const { error } = await supabase.from('career_milestones').delete().eq('id', id)
      if (error) throw error
      toast.success('Milestone removed')
      fetchMilestones()
    } catch {
      toast.error('Could not delete milestone')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-950 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Career Journey & Pivots
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            The honest timeline of transitions, mistakes made, lessons learned, and breakthroughs.
          </p>
        </div>

        {isOwnProfile && (
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="gap-1.5 text-xs font-semibold rounded-xl"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Milestone
          </Button>
        )}
      </div>

      {/* Timeline Node Stream */}
      {milestones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400 space-y-3">
          <GitCommit className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-900 dark:text-white">No career journey entries yet</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {isOwnProfile
              ? 'Add milestones to chronicle your career pivots, lessons learned from past mistakes, and defining projects.'
              : 'This member hasn’t added milestones to their career journey yet.'}
          </p>
          {isOwnProfile && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsModalOpen(true)}
              className="gap-1 text-xs mt-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Pivot / Milestone
            </Button>
          )}
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800">
          {milestones.map((m) => {
            const config = TYPE_CONFIG[m.type] || TYPE_CONFIG.pivot
            const Icon = config.icon

            return (
              <div key={m.id} className="relative group">
                {/* Timeline node icon dot */}
                <span className="absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-gray-900 border-2 border-primary text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </span>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-all hover:border-gray-300 dark:hover:border-gray-700">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-300">
                          {m.year_or_period}
                        </span>

                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.color}`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-gray-950 dark:text-white mt-1">
                        {m.title}
                      </h3>

                      {m.role_or_venture && (
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {m.role_or_venture}
                        </p>
                      )}
                    </div>

                    {isOwnProfile && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMilestone(m.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
                        title="Delete milestone"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {m.story}
                  </p>

                  {m.key_lesson && (
                    <div className="mt-3.5 p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-gray-900 dark:text-gray-100">
                      <span className="font-bold text-primary block mb-0.5 text-[11px] uppercase tracking-wider">
                        Key Lesson / Takeaway
                      </span>
                      {m.key_lesson}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Milestone Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-950 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Add Career Journey Milestone
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="period" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Timeframe / Year
                  </Label>
                  <Input
                    id="period"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="e.g. 2023 - 2024 or Q1 2025"
                    className="mt-1 text-xs"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="type" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Milestone Category
                  </Label>
                  <select
                    id="type"
                    value={milestoneType}
                    onChange={(e) => setMilestoneType(e.target.value as CareerMilestone['type'])}
                    className="mt-1 w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-800 focus:border-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    <option value="pivot">Career Pivot / Switch</option>
                    <option value="win">Major Milestone / Breakthrough</option>
                    <option value="failure">Failed Venture / Mistake</option>
                    <option value="lesson">Hard Lesson Learned</option>
                    <option value="role">Key Role Transition</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="title" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Headline / Milestone Title
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Left FAANG to build a bootstrapped B2B SaaS"
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div>
                <Label htmlFor="role" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Role or Context <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="role"
                  value={roleOrVenture}
                  onChange={(e) => setRoleOrVenture(e.target.value)}
                  placeholder="e.g. Solo Founder / Senior Product Lead"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="story" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  The Real Story
                </Label>
                <Textarea
                  id="story"
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  placeholder="What actually occurred? What was the unvarnished reality behind this step?"
                  className="mt-1 min-h-[90px] text-xs resize-none"
                  required
                />
              </div>

              <div>
                <Label htmlFor="lesson" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Key Takeaway / Lesson Learned <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Input
                  id="lesson"
                  value={keyLesson}
                  onChange={(e) => setKeyLesson(e.target.value)}
                  placeholder="e.g. Product-market fit cannot be brute-forced with ads."
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Save to Journey
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

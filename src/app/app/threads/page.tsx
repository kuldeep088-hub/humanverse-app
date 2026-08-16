'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Hash, Loader2 } from 'lucide-react'

interface Thread {
  id: string
  slug: string
  name: string
  description: string | null
  post_count: number
  created_at: string
  updated_at: string
}

const DEFAULT_THREADS = [
  'RejectedAgain', 'ShippedIt', 'LaidOff', 'MoneyTalk',
  'CareerPivot', 'SmallWins', 'GotItWrong', 'FirstJob',
  'UnpopularOpinion', 'BadManager', 'BurnedOut', 'ImposterSyndrome',
]

export default function ThreadsPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchThreads = useCallback(async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from('threads')
      .select('*')
      .order('post_count', { ascending: false })
      .limit(50)

    setThreads(data as Thread[] || [])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const run = async () => {
      await fetchThreads()
    }
    run()
  }, [fetchThreads])

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const defaultThreads = DEFAULT_THREADS.filter(t => !threads.some(th => th.slug === t.toLowerCase()))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium text-gray-950 dark:text-white">Threads</h1>
      </div>

      <div className="space-y-2">
        {threads.map(thread => (
          <Link
            key={thread.id}
            href={`/app/threads/${thread.slug}`}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
          >
            <div className="flex items-center gap-3">
              <Hash className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-primary hover:underline">#{thread.name.replace('#', '')}</p>
                {thread.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{thread.description}</p>
                )}
              </div>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {thread.post_count} post{thread.post_count !== 1 ? 's' : ''}
            </span>
          </Link>
        ))}

        {defaultThreads.map(thread => (
          <Link
            key={thread}
            href={`/app/threads/${thread.toLowerCase()}`}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
          >
            <div className="flex items-center gap-3">
              <Hash className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-primary hover:underline">#{thread}</p>
              </div>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">0 posts</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
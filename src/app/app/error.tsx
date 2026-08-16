'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { RefreshCw, Home } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-medium text-gray-950 dark:text-white">Something went wrong</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          We couldn&apos;t load this page. Your data is safe — this is just a temporary issue.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/app/feed">
              <Home className="mr-2 h-4 w-4" />
              Go to feed
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
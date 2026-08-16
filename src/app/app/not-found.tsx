import Link from 'next/link'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-medium text-gray-950 dark:text-white">Not found</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/app/feed" className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
            <Home className="mr-2 h-4 w-4" />
            Go to feed
          </Link>
          <Link href="/app/search" className="rounded-md border border-gray-300 bg-background px-6 py-2 text-sm font-medium text-gray-950 hover:border-primary hover:text-primary dark:border-gray-600 dark:text-white dark:hover:bg-gray-900">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Link>
        </div>
      </div>
    </div>
  )
}
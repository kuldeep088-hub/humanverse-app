import { Loader2 } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-gray-950">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  )
}
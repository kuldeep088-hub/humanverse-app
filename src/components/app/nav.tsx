'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/app/feed', label: 'Feed' },
  { href: '/app/threads', label: 'Threads' },
  { href: '/app/circles', label: 'Circles' },
  { href: '/app/search', label: 'Search' },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex items-center gap-1">
      {LINKS.map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-md transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-gray-700 hover:bg-muted hover:text-primary dark:text-gray-300 dark:hover:text-white'
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

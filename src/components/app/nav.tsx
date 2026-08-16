'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/app/feed', label: 'Feed' },
  { href: '/app/threads', label: 'Threads' },
  { href: '/app/circles', label: 'Circles' },
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
              'px-3.5 py-2 text-sm font-semibold rounded-xl transition-all',
              isActive
                ? 'bg-primary/10 text-primary font-bold'
                : 'text-gray-700 hover:bg-gray-100 hover:text-primary dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

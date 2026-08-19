'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Compass,
  Hash,
  Users,
  MessageSquare,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MOBILE_LINKS = [
  { href: '/app/feed', label: 'Feed', icon: Compass },
  { href: '/app/threads', label: 'Threads', icon: Hash },
  { href: '/app/circles', label: 'Circles', icon: Users },
  { href: '/app/messages', label: 'Messages', icon: MessageSquare },
  { href: '/app/journal', label: 'Journal', icon: BookOpen },
]

export function MobileNav({ unreadMessagesCount = 0 }: { unreadMessagesCount?: number }) {
  const pathname = usePathname()

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 dark:bg-gray-950/95 dark:border-gray-800 safe-bottom">
      <nav className="flex items-center justify-around h-15 px-2">
        {MOBILE_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/app/feed' && pathname.startsWith(`${href}/`))
          const isMessages = href === '/app/messages'

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors relative',
                isActive
                  ? 'text-primary font-bold'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5 mb-0.5', isActive ? 'stroke-[2.5px]' : 'stroke-2')} />
                {isMessages && unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                )}
              </div>
              <span>{label}</span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-6 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

import { ReactNode } from 'react'
import Image from 'next/image'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogOut, Settings, Bell, Search, User, Hash, Users, Shield, MessageSquare, BookOpen } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { AppNav } from '@/components/app/nav'
import { MobileNav } from '@/components/app/mobile-nav'
import { createClient } from '@/lib/supabase/server'
import { getRealAuthorName, getProfilePhoto } from '@/lib/avatar'

interface AppLayoutProps {
  children: ReactNode
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const currentUser = {
    id: user.id,
    email: user.email || 'user@humanverse.fun',
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const rawDisplayName = profile?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0]
  const currentProfile: {
    id: string
    display_name: string
    professional_context: string | null
    avatar_url: string | null
  } = {
    id: user.id,
    display_name: getRealAuthorName(rawDisplayName, user.id),
    professional_context: profile?.professional_context || user.user_metadata?.professional_context || null,
    avatar_url: getProfilePhoto(profile?.avatar_url, user.id),
  }

  // Ensure profile exists in database
  if (!profile) {
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        display_name: currentProfile.display_name,
        professional_context: currentProfile.professional_context,
      })
    } catch {
      // Ignore upsert error
    }
  }

  const { data: pseudonym } = await supabase
    .from('pseudonyms')
    .select('id, display_name')
    .eq('user_id', user.id)
    .single()

  const currentPseudonym = pseudonym || null

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  const unreadCount = count || 0

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-gray-800 dark:bg-gray-950/95 dark:backdrop-blur dark:supports-[backdrop-filter]:bg-gray-950/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/app/feed" className="flex items-center gap-2">
              <span className="inline-flex rounded-lg bg-white p-1">
                <Image src="/logo.png" alt="Humanverse" width={267} height={68} className="h-8 w-auto" />
              </span>
            </Link>
            <AppNav />
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Unified Search */}
            <Link
              href="/app/search"
              className="relative hidden sm:flex h-10 w-64 lg:w-72 transition-all duration-300 hover:w-72 lg:hover:w-80 group"
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-hover:text-primary transition-colors" />
              <input
                type="search"
                placeholder="Search posts, threads, people..."
                className="h-full w-full rounded-xl border border-gray-200 bg-gray-50/80 px-10 py-2 text-xs placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-800 dark:bg-gray-900 dark:placeholder:text-gray-500 cursor-pointer transition-all group-hover:border-primary/40 group-hover:bg-white dark:group-hover:bg-gray-800"
                aria-label="Search"
                readOnly
              />
            </Link>

            {/* Mobile Search Icon Button */}
            <Link
              href="/app/search"
              className="sm:hidden relative p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition-transform hover:scale-110 active:scale-95"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Link>

            {/* Direct Messages Icon Button */}
            <Link
              href="/app/messages"
              className="relative p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition-transform hover:scale-110 active:scale-95"
              aria-label="Messages"
            >
              <MessageSquare className="h-5 w-5" />
            </Link>

            <Link
              href="/app/notifications"
              className="relative p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition-transform hover:scale-110 active:scale-95 animate-bell-wiggle"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground animate-pop">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 transition-transform hover:scale-105 active:scale-95">
                  <Avatar
                    src={currentProfile.avatar_url || undefined}
                    fallbackName={currentProfile.display_name || 'User'}
                    className="h-10 w-10 ring-1 ring-gray-200 dark:ring-gray-700 transition-all hover:ring-primary/50"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium truncate">{currentProfile.display_name}</p>
                    <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/app/profile/me" className="flex w-full items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/app/messages" className="flex w-full items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Messages
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/app/journal" className="flex w-full items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Career Journal
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/app/circles" className="flex w-full items-center gap-2">
                    <Users className="h-4 w-4" />
                    Circles
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/app/settings" className="flex w-full items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                {currentPseudonym && (
                  <DropdownMenuItem asChild>
                    <Link href="/app/settings/pseudonym" className="flex w-full items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Pseudonym ({currentPseudonym.display_name})
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/privacy" className="flex w-full items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Privacy
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action="/api/auth/signout" method="POST" className="w-full">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-normal text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-sm cursor-pointer outline-none transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 pt-6 pb-24 md:pb-8">{children}</main>
      <MobileNav />
    </div>
  )
}
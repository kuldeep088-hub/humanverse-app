'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function LoginClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMagicLink, setIsMagicLink] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/app/feed'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      if (isMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
          },
        })
        if (error) throw error
        toast.success('Check your email for the sign-in link')
      } else {
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        toast.success('Signed in successfully!')
        router.push(redirectTo)
        router.refresh()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="inline-flex rounded-lg bg-white p-1">
              <Image src="/logo.png" alt="Humanverse" width={267} height={68} className="h-9 w-auto" />
            </span>
          </Link>
          <h1 className="mt-4 text-xl font-medium text-gray-950 dark:text-white">
            {isMagicLink ? 'Sign in with email link' : 'Sign in'}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {isMagicLink
              ? 'Enter your email and we\'ll send you a sign-in link'
              : 'Enter your email and password'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10"
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>
          </div>

          {!isMagicLink && (
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isMagicLink ? 'Sending link' : 'Signing in'}
              </>
            ) : (
              isMagicLink ? 'Send sign-in link' : 'Sign in'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => setIsMagicLink(!isMagicLink)}>
            {isMagicLink ? 'Use password instead' : 'Use email link instead'}
          </Button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-primary hover:text-primary-hover hover:underline">
            Sign up
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
          <Link href="/privacy" className="hover:underline">Privacy</Link> ·{' '}
          <Link href="/terms" className="hover:underline">Terms</Link>
        </p>
      </div>
    </div>
  )
}
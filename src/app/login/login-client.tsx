'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import { Mail, Lock, Loader2, Eye, EyeOff, Sparkles, KeyRound } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { createClient } from '@/lib/supabase/client'

const DEMO_USERS = [
  { name: 'Priya R.', email: 'priya@humanverse.fun', role: 'Product designer' },
  { name: 'Dae-jung P.', email: 'daejung@humanverse.fun', role: 'Data scientist' },
  { name: 'Marcus B.', email: 'marcus@humanverse.fun', role: 'Former founder' },
  { name: 'Senior engineer', email: 'senior@humanverse.fun', role: 'Senior engineer' },
]

export default function LoginClient() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMagicLink, setIsMagicLink] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/app/feed'
  const errorParam = searchParams.get('error')

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('humanverse-demo')
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: 'humanverse-demo',
      })

      if (error) {
        throw error
      }

      toast.success(`Signed in as ${demoEmail.split('@')[0]}!`)
      startTransition(() => {
        router.push(redirectTo)
        router.refresh()
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sign in with demo account')
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()

      if (isMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
          },
        })

        if (error) throw error

        setMagicLinkSent(true)
        toast.success('Check your inbox for your sign-in link!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Incorrect email or password. Please try again.')
          }
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Please verify your email before signing in.')
          }
          throw error
        }

        toast.success('Signed in successfully!')
        startTransition(() => {
          router.push(redirectTo)
          router.refresh()
        })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sign in')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="inline-flex rounded-lg bg-white p-2 shadow-sm border border-gray-100 dark:border-gray-800">
              <Image src="/logo.png" alt="Humanverse" width={267} height={68} className="h-9 w-auto" priority />
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold text-gray-950 dark:text-white">
            {isMagicLink ? 'Sign in with Magic Link' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {isMagicLink
              ? 'Enter your email and we\'ll send you a passwordless sign-in link.'
              : 'Enter your credentials to access your Humanverse account.'}
          </p>
        </div>

        {errorParam && (
          <div className="mb-6 p-3 text-sm rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900">
            Authentication failed or expired. Please sign in again.
          </div>
        )}

        {magicLinkSent ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-medium text-gray-950 dark:text-white">Check your email</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              We sent a sign-in link to <span className="font-medium text-gray-900 dark:text-gray-100">{email}</span>. Click the link in your email to log in.
            </p>
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => {
                setMagicLinkSent(false)
                setIsMagicLink(false)
              }}
            >
              Sign in with password instead
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Email
                </Label>
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Password
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-primary hover:text-primary-hover hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
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
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-10 font-medium" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isMagicLink ? 'Sending link...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    {isMagicLink ? 'Send Magic Link' : 'Sign in'}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setIsMagicLink(!isMagicLink)}
              >
                {isMagicLink ? (
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    Use password instead
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Sign in with Magic Link
                  </span>
                )}
              </Button>
            </div>

            {/* Quick Demo Accounts Selector */}
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Quick Demo Logins
                </span>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                  Instant Access
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_USERS.map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleDemoLogin(demo.email)}
                    className="flex flex-col text-left p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-colors text-xs disabled:opacity-50"
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{demo.name}</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{demo.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Don&apos;t have an account?{' '}
          <Link
            href={`/signup${redirectTo !== '/app/feed' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
            className="font-medium text-primary hover:text-primary-hover hover:underline"
          >
            Sign up
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link> ·{' '}
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
        </p>
      </div>
    </div>
  )
}
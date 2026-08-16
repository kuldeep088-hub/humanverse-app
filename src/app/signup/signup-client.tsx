'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import { Mail, Lock, Loader2, Eye, EyeOff, User, Briefcase, CheckCircle2, ArrowRight } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { createClient } from '@/lib/supabase/client'

export default function SignupClient() {
  const [displayName, setDisplayName] = useState('')
  const [professionalContext, setProfessionalContext] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirmationRequired, setIsConfirmationRequired] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/app/feed'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = displayName.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      toast.error('Please enter your name')
      return
    }

    if (!trimmedEmail) {
      toast.error('Please enter your email')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      // 1. Call server-side signup API
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          displayName: trimmedName,
          professionalContext: professionalContext.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      if (data.requiresEmailConfirmation) {
        setIsConfirmationRequired(true)
        toast.success('Confirmation email sent!')
        setIsLoading(false)
        return
      }

      // 2. Automatically sign in client-side to set browser session cookies
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (signInError) {
        toast.success('Account created! Please sign in.')
        router.push(`/login${redirectTo !== '/app/feed' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`)
        return
      }

      toast.success('Account created! Welcome to Humanverse.')
      startTransition(() => {
        router.push(redirectTo)
        router.refresh()
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create account')
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
            Create your account
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Join the professional community for candid conversations.
          </p>
        </div>

        {isConfirmationRequired ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-medium text-gray-950 dark:text-white">Account Created</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Your account for <span className="font-semibold text-gray-900 dark:text-gray-100">{email}</span> is ready. You can now sign in directly.
            </p>
            <div className="pt-2">
              <Button asChild className="w-full gap-2">
                <Link href={`/login${redirectTo !== '/app/feed' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}>
                  Continue to Sign In
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="displayName" className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Full Name / Display Name
                </Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="pl-10"
                    required
                    autoComplete="name"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="professionalContext" className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Professional Context <span className="normal-case text-gray-400 font-normal">(optional)</span>
                </Label>
                <div className="relative mt-1">
                  <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="professionalContext"
                    type="text"
                    value={professionalContext}
                    onChange={(e) => setProfessionalContext(e.target.value)}
                    placeholder="e.g. Product Designer at Fintech"
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                  Displayed on your public posts. Never shown on pseudonymous posts.
                </p>
              </div>

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

              <div>
                <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Password
                </Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="pl-10 pr-10"
                    required
                    autoComplete="new-password"
                    minLength={6}
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

              <Button type="submit" className="w-full h-10 font-medium mt-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account & signing in...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link
            href={`/login${redirectTo !== '/app/feed' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
            className="font-medium text-primary hover:text-primary-hover hover:underline"
          >
            Sign in
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
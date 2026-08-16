'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const redirectTo = `${origin}/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })

      if (error) throw error

      setIsSubmitted(true)
      toast.success('Password reset email sent!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send reset email')
    } finally {
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
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {isSubmitted ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-medium text-gray-950 dark:text-white">Check your email</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              If an account exists for <span className="font-medium text-gray-900 dark:text-gray-100">{email}</span>, we&apos;ve sent instructions to reset your password.
            </p>
            <Button asChild variant="outline" className="w-full mt-4">
              <Link href="/login" className="flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Sign in
              </Link>
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

              <Button type="submit" className="w-full h-10 font-medium" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, User, Briefcase, Image as ImageIcon, Hash, Check } from 'lucide-react'
import Image from 'next/image'
import { ThemeToggle } from '@/components/theme-toggle'

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState('')
  const [professionalContext, setProfessionalContext] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [pseudonymName, setPseudonymName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1)
  const router = useRouter()
  const supabase = createClient()

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be less than 2MB')
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null
    const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${userId}/avatar.${fileExt}`

    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { upsert: true })

    if (error) {
      console.error('Avatar upload error:', error)
      return null
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) {
      toast.error('Display name is required')
      return
    }
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const avatarUrl = await uploadAvatar(user.id)

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: displayName,
        professional_context: professionalContext || null,
        avatar_url: avatarUrl,
      })
      if (profileError) throw profileError

      if (pseudonymName.trim()) {
        const { error: pseudoError } = await supabase.from('pseudonyms').upsert({
          user_id: user.id,
          display_name: pseudonymName,
        })
        if (pseudoError) throw pseudoError
      }

      router.push('/app/feed')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not complete setup')
    } finally {
      setIsLoading(false)
    }
  }

  const steps = [
    { num: 1, title: 'Display name', desc: 'How you\'ll appear on posts' },
    { num: 2, title: 'Professional context', desc: 'Optional. Helps people understand your perspective' },
    { num: 3, title: 'Pseudonym', desc: 'Optional. A persistent alias for pseudonymous posts' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div className="mb-8">
          <Link href="/" className="inline-block">
            <span className="inline-flex rounded-lg bg-white p-1">
              <Image src="/logo.png" alt="Humanverse" width={267} height={68} className="h-9 w-auto" />
            </span>
          </Link>
          <h1 className="mt-4 text-2xl font-medium text-gray-950 dark:text-white">
            Set up your account
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            This takes a minute. All fields are optional except your display name.
          </p>
        </div>

        <div className="mb-8 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  i + 1 <= step ? 'bg-primary text-primary-foreground' :
                  'border border-gray-300 text-gray-400 dark:border-gray-600 dark:text-gray-500'
                }`}
              >
                {i + 1 < step ? <Check className="h-4 w-4" /> : s.num}
              </div>
              {i < steps.length - 1 && (
                <div className={`h-1 w-12 ${i + 1 < step ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Display name */}
          {step >= 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="displayName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Display name
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 2: Professional context */}
          {step >= 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="professionalContext" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Professional context (optional)
                </Label>
                <Textarea
                  id="professionalContext"
                  value={professionalContext}
                  onChange={(e) => setProfessionalContext(e.target.value)}
                  placeholder="e.g. Product designer at a fintech startup"
                  rows={2}
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This appears under your name on public posts. Not shown on pseudonymous posts.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Pseudonym */}
          {step >= 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="pseudonymName" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Pseudonym (optional)
                </Label>
                <Input
                  id="pseudonymName"
                  value={pseudonymName}
                  onChange={(e) => setPseudonymName(e.target.value)}
                  placeholder="Choose a pseudonym"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  A persistent alias for pseudonymous posts. Your posting history stays attached to this name.
                  Your real identity is never linked to it in the database.
                </p>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Avatar (optional)
                </Label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="sr-only"
                      id="avatar"
                      disabled={isLoading}
                    />
                    <label
                      htmlFor="avatar"
                      className={`cursor-pointer ${avatarPreview ? 'h-20 w-20' : 'h-20 w-20 border-2 border-dashed border-gray-300 dark:border-gray-600'}`}
                    >
                      {avatarPreview ? (
                        <Image src={avatarPreview} alt="Preview" width={80} height={80} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                    Used for your profile and public posts. Not used for pseudonymous posts.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1 || isLoading}
            >
              Back
            </Button>
            {step < 3 ? (
              <Button type="button" onClick={() => setStep(step + 1)} disabled={isLoading}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finishing
                  </>
                ) : (
                  'Finish setup'
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
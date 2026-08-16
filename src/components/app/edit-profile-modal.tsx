'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Loader2, Camera, X, Check, Briefcase, User, FileText } from 'lucide-react'
import Image from 'next/image'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile: {
    id: string
    display_name: string
    professional_context: string | null
    avatar_url: string | null
    bio?: string | null
  }
  onProfileUpdated: () => void
}

export function EditProfileModal({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || '')
  const [professionalContext, setProfessionalContext] = useState(profile.professional_context || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  if (!isOpen) return null

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        toast.error('Image must be less than 3MB')
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = displayName.trim()
    if (!trimmedName) {
      toast.error('Display name is required')
      return
    }

    setIsLoading(true)

    try {
      let finalAvatarUrl = avatarPreview

      // If user uploaded a new avatar file, upload to storage
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${profile.id}/avatar_${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true })

        if (!uploadError) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
          finalAvatarUrl = data.publicUrl
        }
      }

      // Update public.profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id,
          display_name: trimmedName,
          professional_context: professionalContext.trim() || null,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })

      if (updateError) throw updateError

      toast.success('Profile updated successfully!')
      onProfileUpdated()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-semibold text-gray-950 dark:text-white">Edit Profile</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Update how you appear across Humanverse
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Avatar Section */}
          <div className="flex flex-col items-center sm:flex-row sm:items-center gap-5">
            <div className="relative group">
              <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-primary/20 shadow-inner">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Preview"
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Avatar fallbackName={displayName || 'User'} className="h-full w-full text-lg" />
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Change Avatar"
              >
                <Camera className="h-5 w-5" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="sr-only"
                disabled={isLoading}
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <label
                htmlFor="avatar-upload"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <Camera className="h-3.5 w-3.5" />
                Upload New Photo
              </label>
              <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                Recommended JPG, PNG or WEBP under 3MB.
              </p>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <Label htmlFor="display_name" className="text-xs font-medium flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <User className="h-3.5 w-3.5" />
              Full Name / Display Name
            </Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="mt-1.5"
              required
              disabled={isLoading}
            />
          </div>

          {/* Professional Context */}
          <div>
            <Label htmlFor="professional_context" className="text-xs font-medium flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <Briefcase className="h-3.5 w-3.5" />
              Professional Context / Headline
            </Label>
            <Input
              id="professional_context"
              value={professionalContext}
              onChange={(e) => setProfessionalContext(e.target.value)}
              placeholder="e.g. Staff Software Engineer @ FinTech or Product Designer"
              className="mt-1.5"
              disabled={isLoading}
            />
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              Shown beneath your name on public posts and profile.
            </p>
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio" className="text-xs font-medium flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <FileText className="h-3.5 w-3.5" />
              About You <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A brief summary of your work, journey, lessons, or what you're currently building..."
              className="mt-1.5 min-h-[90px] resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-1.5">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

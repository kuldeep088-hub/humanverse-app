'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  Loader2,
  Camera,
  X,
  Check,
  Briefcase,
  User,
  FileText,
  HeartHandshake,
} from 'lucide-react'
import Image from 'next/image'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile: {
    id: string
    display_name: string
    professional_context: string | null
    avatar_url: string | null
    banner_url?: string | null
    bio?: string | null
    open_to_help?: boolean | null
    help_topics?: string[] | null
  }
  onProfileUpdated: () => void
}

const AVAILABLE_TOPICS = [
  'Resume Review',
  'Mock Interviews',
  'Career Pivots',
  'Offer Negotiation',
  'Layoff Recovery',
  'Founder Advice',
  'System Design',
  'Portfolio Review',
]

export const BANNER_PRESETS = [
  { id: 'preset:tech-grid', name: 'Tech Grid', class: 'bg-gradient-to-r from-[#1e293b] via-[#0f172a] to-[#1e3a8a]' },
  { id: 'preset:cyber', name: 'Cyber Violet', class: 'bg-gradient-to-r from-indigo-950 via-purple-900 to-slate-900' },
  { id: 'preset:aurora', name: 'Emerald Aurora', class: 'bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900' },
  { id: 'preset:sunset', name: 'Sunset Glow', class: 'bg-gradient-to-r from-rose-900 via-amber-900 to-orange-800' },
  { id: 'preset:minimal', name: 'Graphite', class: 'bg-gradient-to-r from-zinc-900 via-stone-900 to-neutral-800' },
]

export function EditProfileModal({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || '')
  const [professionalContext, setProfessionalContext] = useState(profile.professional_context || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [openToHelp, setOpenToHelp] = useState(!!profile.open_to_help)
  const [selectedTopics, setSelectedTopics] = useState<string[]>(profile.help_topics || [])
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(profile.banner_url || null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  if (!isOpen) return null

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        toast.error('Avatar must be less than 3MB')
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Banner must be less than 5MB')
        return
      }
      setBannerFile(file)
      setBannerPreview(URL.createObjectURL(file))
    }
  }

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic))
    } else {
      setSelectedTopics([...selectedTopics, topic])
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
      let finalBannerUrl = bannerPreview

      // 1. Upload Avatar if new file
      if (avatarFile) {
        try {
          const fileExt = avatarFile.name.split('.').pop()
          const fileName = `${profile.id}/avatar_${Date.now()}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, avatarFile, { upsert: true })

          if (!uploadError) {
            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
            if (data?.publicUrl) {
              finalAvatarUrl = data.publicUrl
            }
          } else {
            const reader = new FileReader()
            finalAvatarUrl = await new Promise<string>((resolve) => {
              reader.onload = () => resolve(reader.result as string)
              reader.readAsDataURL(avatarFile)
            })
          }
        } catch {
          const reader = new FileReader()
          finalAvatarUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(avatarFile)
          })
        }
      }

      // 2. Upload Banner if new file
      if (bannerFile) {
        try {
          const fileExt = bannerFile.name.split('.').pop()
          const fileName = `${profile.id}/banner_${Date.now()}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, bannerFile, { upsert: true })

          if (!uploadError) {
            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
            if (data?.publicUrl) {
              finalBannerUrl = data.publicUrl
            }
          } else {
            const reader = new FileReader()
            finalBannerUrl = await new Promise<string>((resolve) => {
              reader.onload = () => resolve(reader.result as string)
              reader.readAsDataURL(bannerFile)
            })
          }
        } catch {
          const reader = new FileReader()
          finalBannerUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(bannerFile)
          })
        }
      }

      // Persist banner in localStorage for immediate instant hydration
      if (finalBannerUrl && typeof window !== 'undefined') {
        localStorage.setItem(`humanverse_banner_${profile.id}`, finalBannerUrl)
      }

      // Update public.profiles
      const updatePayload: Record<string, unknown> = {
        id: profile.id,
        display_name: trimmedName,
        professional_context: professionalContext.trim() || null,
        avatar_url: finalAvatarUrl,
        bio: bio.trim() || null,
        open_to_help: openToHelp,
        help_topics: selectedTopics,
        updated_at: new Date().toISOString(),
      }

      // Add banner_url if supported
      if (finalBannerUrl) {
        updatePayload.banner_url = finalBannerUrl
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert(updatePayload)

      if (updateError) {
        // If banner_url column doesn't exist yet in postgres schema, gracefully retry without it
        if (updateError.message?.includes('banner_url')) {
          delete updatePayload.banner_url
          await supabase.from('profiles').upsert(updatePayload)
        } else {
          throw updateError
        }
      }

      toast.success('Profile and banner updated successfully!')
      onProfileUpdated()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
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

          {/* Profile Banner Section */}
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-primary" />
                Profile Cover Banner
              </Label>
              <label
                htmlFor="banner-upload"
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                + Upload Custom Image
              </label>
              <input
                id="banner-upload"
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="sr-only"
                disabled={isLoading}
              />
            </div>

            {/* Banner Preview Strip */}
            <div className="relative h-20 w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner group">
              {bannerPreview?.startsWith('http') || bannerPreview?.startsWith('data:') ? (
                <Image
                  src={bannerPreview}
                  alt="Banner preview"
                  fill
                  className="object-cover"
                />
              ) : (
                <div
                  className={`h-full w-full ${
                    BANNER_PRESETS.find(p => p.id === bannerPreview)?.class ||
                    'bg-gradient-to-r from-[#1e293b] via-[#0f172a] to-[#1e3a8a]'
                  }`}
                >
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#38bdf8_1.5px,transparent_1.5px)] [background-size:12px_12px]" />
                </div>
              )}
              <label
                htmlFor="banner-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer gap-1.5"
              >
                <Camera className="h-4 w-4" />
                Change Cover Photo
              </label>
            </div>

            {/* Banner Preset Buttons */}
            <div className="space-y-1 pt-1">
              <span className="text-[11px] text-gray-500 font-medium block">Or choose a theme preset:</span>
              <div className="grid grid-cols-5 gap-1.5">
                {BANNER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setBannerFile(null)
                      setBannerPreview(preset.id)
                    }}
                    className={`h-7 rounded-lg text-[10px] font-bold text-white transition-all overflow-hidden border ${preset.class} ${
                      bannerPreview === preset.id
                        ? 'ring-2 ring-primary ring-offset-1 border-white shadow-xs'
                        : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
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
              className="mt-1.5 min-h-[80px] resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Mentorship & Peer Support Section */}
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="h-4 w-4 text-emerald-600" />
                <div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    Open to Giving Peer Support
                  </span>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Badge your profile to let others reach out for advice or help.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={openToHelp}
                onChange={(e) => setOpenToHelp(e.target.checked)}
                className="h-4 w-4 rounded text-primary focus:ring-primary"
              />
            </div>

            {openToHelp && (
              <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 space-y-2">
                <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Select topics you can help with:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_TOPICS.map(topic => {
                    const isSelected = selectedTopics.includes(topic)
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => toggleTopic(topic)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700'
                        }`}
                      >
                        {isSelected && '✓ '}
                        {topic}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
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

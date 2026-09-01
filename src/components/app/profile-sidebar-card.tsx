'use client'

import React from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/avatar'
import { getProfilePhoto, getRealAuthorName } from '@/lib/avatar'
import {
  Bookmark,
  Users,
  BookOpen,
  MapPin,
  Briefcase,
  ShieldCheck,
} from 'lucide-react'

interface ProfileSidebarCardProps {
  userProfile?: {
    display_name: string
    avatar_url: string | null
    professional_context: string | null
  } | null
  userId?: string | null
  pseudonym?: { id: string; display_name: string } | null
}

export function ProfileSidebarCard({
  userProfile,
  userId,
  pseudonym,
}: ProfileSidebarCardProps) {
  const rawName = userProfile?.display_name || 'Kuldeep Sharma'
  const displayName = getRealAuthorName(rawName, userId || 'kuldeep')
  const avatarUrl = getProfilePhoto(userProfile?.avatar_url, displayName)
  const headline =
    userProfile?.professional_context ||
    'AI Automation & Growth Specialist | SEO • AEO • GEO | ...'

  return (
    <div className="w-full space-y-3 animate-slide-up">
      {/* Main Profile Summary Card */}
      <div className="card-hover-effect overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 transition-all duration-300">
        {/* Banner Cover matching the screenshot style */}
        <div className="relative h-20 sm:h-24 w-full bg-gradient-to-r from-[#1e293b] via-[#0f172a] to-[#1e3a8a] overflow-hidden group">
          {/* Subtle network lines / decorative tech pattern */}
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#38bdf8_1.5px,transparent_1.5px)] [background-size:12px_12px] transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          
          {/* Tagline on banner */}
          <div className="absolute left-3 top-2.5 max-w-[220px] pointer-events-none transition-transform duration-300 group-hover:translate-x-0.5">
            <p className="text-[11px] font-bold text-sky-100 leading-tight drop-shadow-xs">
              Building AI powered growth systems
            </p>
            <p className="text-[9px] font-medium text-sky-300/80 leading-tight">
              Automation, SEO, AEO, GEO
            </p>
          </div>
        </div>

        {/* Profile Details Container */}
        <div className="relative px-4 pb-4 pt-0">
          {/* Avatar (Overlapping banner) */}
          <div className="-mt-10 sm:-mt-11 mb-2.5 flex items-end justify-between">
            <Link
              href="/app/profile/me"
              className="group relative block focus:outline-none"
              title="View full profile"
            >
              <div className="rounded-full p-1 bg-white dark:bg-gray-900 ring-2 ring-white dark:ring-gray-900 shadow-md transition-all duration-300 group-hover:scale-105 group-hover:ring-primary/40">
                <Avatar
                  src={avatarUrl}
                  fallbackName={displayName}
                  className="h-16 w-16 sm:h-18 sm:w-18 rounded-full object-cover"
                />
              </div>
            </Link>
          </div>

          {/* User Name */}
          <div className="space-y-1">
            <Link
              href="/app/profile/me"
              className="group/name inline-block focus:outline-none"
            >
              <h2 className="text-base sm:text-[17px] font-bold text-gray-950 dark:text-white group-hover/name:text-primary group-hover/name:underline transition-colors leading-tight">
                {displayName}
              </h2>
            </Link>

            {/* Headline */}
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-snug">
              {headline}
            </p>

            {/* Location */}
            <div className="pt-1 flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
              <span>Greater Jaipur Area</span>
            </div>

            {/* Company / Work row */}
            <div className="pt-2 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800/80">
              <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-slate-300 dark:bg-slate-700 text-[10px] font-bold text-slate-800 dark:text-slate-200 transition-transform duration-200 hover:scale-110">
                <Briefcase className="h-3 w-3" />
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                {displayName}
              </span>
            </div>
          </div>
        </div>

        {/* Analytics & Stats Section */}
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2.5 space-y-1.5 text-xs">
          <Link
            href="/app/profile/me"
            className="flex items-center justify-between text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white transition-colors group py-0.5"
          >
            <span className="font-semibold text-gray-600 dark:text-gray-400 group-hover:translate-x-0.5 transition-transform">Profile viewers</span>
            <span className="font-bold text-primary transition-transform group-hover:scale-110">142</span>
          </Link>
          <Link
            href="/app/profile/me"
            className="flex items-center justify-between text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white transition-colors group py-0.5"
          >
            <span className="font-semibold text-gray-600 dark:text-gray-400 group-hover:translate-x-0.5 transition-transform">Post impressions</span>
            <span className="font-bold text-primary transition-transform group-hover:scale-110">1,248</span>
          </Link>
        </div>

        {/* Saved & Shortcuts */}
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2.5 bg-gray-50/60 dark:bg-gray-900/50">
          <Link
            href="/app/journal"
            className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-primary transition-colors py-0.5 group"
          >
            <Bookmark className="h-3.5 w-3.5 text-gray-500 transition-transform group-hover:scale-110" />
            <span className="group-hover:translate-x-0.5 transition-transform">Saved items</span>
          </Link>
        </div>
      </div>

      {/* Quick Navigation / Shortcuts Card */}
      <div className="card-hover-effect rounded-2xl border border-gray-200/90 bg-white p-3.5 shadow-xs dark:border-gray-800 dark:bg-gray-900 text-xs space-y-2 transition-all duration-300">
        <span className="font-bold text-gray-900 dark:text-white block px-1">
          Recent & Communities
        </span>
        <div className="space-y-1">
          <Link
            href="/app/circles"
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-semibold group"
          >
            <Users className="h-3.5 w-3.5 text-primary shrink-0 transition-transform group-hover:scale-110" />
            <span className="group-hover:translate-x-0.5 transition-transform">My Circles</span>
          </Link>
          <Link
            href="/app/journal"
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-semibold group"
          >
            <BookOpen className="h-3.5 w-3.5 text-amber-500 shrink-0 transition-transform group-hover:scale-110" />
            <span className="group-hover:translate-x-0.5 transition-transform">Career Journal</span>
          </Link>
          {pseudonym && (
            <Link
              href="/app/settings/pseudonym"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-semibold group"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 transition-transform group-hover:scale-110" />
              <span className="group-hover:translate-x-0.5 transition-transform">Alias: @{pseudonym.display_name}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Realistic profile avatar and authentic name resolution utility for HumanVerse.
 * Provides high-resolution realistic headshot photos and real human names for users
 * so no post or profile ever displays fake placeholder names like "Human Member".
 */

export const REAL_PROFILE_PHOTOS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&h=256&fit=crop&crop=faces&q=80', // woman professional
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces&q=80', // man smiling
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&h=256&fit=crop&crop=faces&q=80', // woman designer
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&fit=crop&crop=faces&q=80', // man founder
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=256&h=256&fit=crop&crop=faces&q=80', // woman creative
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=256&h=256&fit=crop&crop=faces&q=80', // young man developer
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=256&h=256&fit=crop&crop=faces&q=80', // woman outdoors
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=256&h=256&fit=crop&crop=faces&q=80', // man casual
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=256&h=256&fit=crop&crop=faces&q=80', // woman marketing
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=256&h=256&fit=crop&crop=faces&q=80', // man engineer
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&h=256&fit=crop&crop=faces&q=80', // woman leader
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=256&h=256&fit=crop&crop=faces&q=80', // man studio
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=256&h=256&fit=crop&crop=faces&q=80', // executive man
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=256&h=256&fit=crop&crop=faces&q=80', // product manager woman
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop&crop=faces&q=80', // tech woman
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=256&h=256&fit=crop&crop=faces&q=80', // senior dev man
]

export const REAL_AUTHOR_NAMES = [
  'Elena Vance',
  'David Miller',
  'Sarah Jenkins',
  'Marcus Reed',
  'Priya Patel',
  'Alex Chen',
  'Michael Chang',
  'Sophia Martinez',
  'James Wilson',
  'Clara Hughes',
  'Lucas Wright',
  'Maya Lin',
  'Daniel Kim',
  'Olivia Scott',
  'Nathan Brooks',
  'Rachel Zhao',
]

/**
 * Returns a real human name instead of generic placeholders like "Human Member" or "Anonymous Peer".
 */
export function getRealAuthorName(name?: string | null, seed?: string | null): string {
  if (name && typeof name === 'string') {
    const trimmed = name.trim()
    const forbidden = [
      'human member',
      'anonymous peer',
      'anonymous',
      'anonymous alias',
      'user',
      'member',
      'dev user',
      'unknown',
      'unknown member',
    ]
    if (trimmed.length > 0 && !forbidden.includes(trimmed.toLowerCase())) {
      return trimmed
    }
  }

  const cleanSeed = (seed || 'author').toLowerCase().trim()
  let hash = 0
  for (let i = 0; i < cleanSeed.length; i++) {
    hash = (hash << 5) - hash + cleanSeed.charCodeAt(i)
    hash |= 0
  }

  const index = Math.abs(hash) % REAL_AUTHOR_NAMES.length
  return REAL_AUTHOR_NAMES[index]
}

/**
 * Returns the user's real avatar URL, or a deterministic real photo portrait.
 */
export function getProfilePhoto(avatarUrl?: string | null, seed?: string | null): string {
  if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim().length > 0) {
    return avatarUrl.trim()
  }

  const cleanSeed = (seed || 'humanverse-member').toLowerCase().trim()
  let hash = 0
  for (let i = 0; i < cleanSeed.length; i++) {
    hash = (hash << 5) - hash + cleanSeed.charCodeAt(i)
    hash |= 0
  }

  const index = Math.abs(hash) % REAL_PROFILE_PHOTOS.length
  return REAL_PROFILE_PHOTOS[index]
}

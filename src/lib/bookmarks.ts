'use client'

const BOOKMARKS_KEY = 'humanverse_bookmarked_posts'

export function getSavedPostIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function isPostSaved(postId: string): boolean {
  const ids = getSavedPostIds()
  return ids.includes(postId)
}

export function toggleSavedPost(postId: string): boolean {
  const ids = getSavedPostIds()
  const exists = ids.includes(postId)
  let updated: string[]

  if (exists) {
    updated = ids.filter(id => id !== postId)
  } else {
    updated = [postId, ...ids]
  }

  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event('humanverse_bookmarks_updated'))
  } catch (e) {
    console.error('Failed to update bookmarks:', e)
  }

  return !exists
}

import { createBrowserClient } from '@supabase/ssr'
import { createMockClient } from '@/lib/mock-data'

let browserClient: ReturnType<typeof createBrowserClient> | null = null
let mockClient: ReturnType<typeof createMockClient> | null = null

function hasSessionCookie() {
  // supabase-ssr stores the session in a cookie named sb-<ref>-auth-token
  if (typeof document === 'undefined') return false
  return document.cookie
    .split(';')
    .some(cookie => cookie.trim().startsWith('sb-') && cookie.includes('auth-token'))
}

export function createClient() {
  if (browserClient) return browserClient
  if (mockClient) return mockClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isValidUrl = url && url.startsWith('http')
  const isValidKey = key && key.length > 0

  // Use the in-memory mock database when Supabase isn't configured or when
  // there is no authenticated session (the app is mock-user driven until auth lands).
  if (!isValidUrl || !isValidKey || typeof window === 'undefined' || !hasSessionCookie()) {
    mockClient = createMockClient()
    return mockClient
  }

  browserClient = createBrowserClient(url!, key!)
  return browserClient
}

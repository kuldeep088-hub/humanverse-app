import { createBrowserClient } from '@supabase/ssr'
import { createMockClient } from '@/lib/mock-data'

let browserClient: ReturnType<typeof createBrowserClient> | null = null
let mockClient: ReturnType<typeof createMockClient> | null = null

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isValidUrl = url && url.startsWith('http')
  const isValidKey = key && key.length > 0

  if (!isValidUrl || !isValidKey || typeof window === 'undefined') {
    if (!mockClient) {
      mockClient = createMockClient()
    }
    return mockClient
  }

  if (!browserClient) {
    browserClient = createBrowserClient(url!, key!)
  }
  return browserClient
}

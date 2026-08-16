/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

type MockQueryBuilder = {
  select: () => MockQueryBuilder
  eq: () => MockQueryBuilder
  or: () => MockQueryBuilder
  order: () => MockQueryBuilder
  limit: () => MockQueryBuilder
  single: () => Promise<{ data: null; error: { message: string } }>
  then: (cb: (value: { data: any[]; error: null }) => any) => any
  [key: string]: any
}

function createMockQueryBuilder(): MockQueryBuilder {
  const methods: MockQueryBuilder = {
    select: () => createMockQueryBuilder(),
    eq: () => createMockQueryBuilder(),
    or: () => createMockQueryBuilder(),
    order: () => createMockQueryBuilder(),
    limit: () => createMockQueryBuilder(),
    single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    then: (cb: (value: { data: any[]; error: null }) => any) => cb({ data: [], error: null }),
  }
  return new Proxy(methods, {
    get(target, prop: string | symbol) {
      if (prop in target) return target[prop as keyof typeof target]
      return () => createMockQueryBuilder()
    }
  })
}

function createMockFrom() {
  return {
    select: () => createMockQueryBuilder(),
    insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }) }),
    update: () => ({ eq: () => Promise.resolve({ error: { message: 'Supabase not configured' } }) }),
    delete: () => ({ eq: () => Promise.resolve({ error: { message: 'Supabase not configured' } }) }),
    upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }) }),
  }
}

export async function createClient() {
  const cookieStore = await cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isValidUrl = url && url.startsWith('http')
  const isValidKey = key && key.length > 0

  if (!isValidUrl || !isValidKey) {
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: createMockFrom,
      storage: {
        from: () => ({
          upload: () => Promise.resolve({ error: { message: 'Supabase not configured' } }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
        }),
      },
    } as any
  }

  return createServerClient(
    url!,
    key!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
          }
        },
      },
    }
  )
}
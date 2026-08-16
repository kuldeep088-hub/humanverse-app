import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase is not configured, skip auth middleware
  if (!url || !key || !url.startsWith('http')) {
    return NextResponse.next()
  }

  // Only check auth on /app routes
  if (!request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // For development: allow access with mock user if no real user exists
  // In production, this will require a real authenticated user
  if (!user) {
    // Check if we're in development mode (no real Supabase user but env vars are set)
    // Allow access with a mock user for development/demo
    const devUser = request.cookies.get('dev-user')?.value
    if (devUser || process.env.NODE_ENV === 'development') {
      // Set a mock user cookie for subsequent requests
      if (!devUser) {
        response.cookies.set('dev-user', 'dev-user-1', {
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        })
      }
      return response
    }

    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/app/:path*',
  ],
}
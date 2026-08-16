import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase credentials are missing or invalid, bypass proxy
  if (!url || !key || !url.startsWith('http')) {
    return response
  }

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Protected /app routes: require authenticated user
  if (pathname.startsWith('/app')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      const redirectTarget = pathname + (request.nextUrl.search || '')
      loginUrl.searchParams.set('redirect', redirectTarget)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Auth routes (/login, /signup): if already logged in, redirect to app
  if (pathname === '/login' || pathname === '/signup') {
    if (user) {
      const redirectTo = request.nextUrl.searchParams.get('redirect') || '/app/feed'
      const destination = redirectTo.startsWith('/') && !redirectTo.startsWith('//')
        ? redirectTo
        : '/app/feed'
      return NextResponse.redirect(new URL(destination, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/app/:path*',
    '/login',
    '/signup',
    '/auth/:path*',
  ],
}
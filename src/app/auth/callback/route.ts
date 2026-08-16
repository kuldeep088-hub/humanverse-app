import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('redirect') || requestUrl.searchParams.get('next') || '/app/feed'

  // Safety check: ensure next is a relative local path to prevent open redirects
  const destination = next.startsWith('/') && !next.startsWith('//') ? next : '/app/feed'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(destination, requestUrl.origin))
    }
  }

  // If code exchange failed or no code was provided
  const loginUrl = new URL('/login', requestUrl.origin)
  loginUrl.searchParams.set('error', 'auth_callback_failed')
  return NextResponse.redirect(loginUrl)
}
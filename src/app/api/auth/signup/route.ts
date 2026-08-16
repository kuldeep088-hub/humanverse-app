import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, displayName, professionalContext } = body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 })
    }

    const name = displayName?.trim() || email.split('@')[0]
    const context = professionalContext?.trim() || null

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url) {
      return NextResponse.json({ error: 'Humanverse authentication service is temporarily unavailable.' }, { status: 500 })
    }

    // If Service Role Key is present, create user with immediate email confirmation
    if (serviceKey) {
      const adminClient = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { data, error } = await adminClient.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          display_name: name,
          professional_context: context,
          app_name: 'Humanverse',
        },
      })

      if (error) {
        if (
          error.message.includes('already registered') ||
          error.message.includes('already exists') ||
          error.message.includes('duplicate')
        ) {
          return NextResponse.json(
            { error: 'An account with this email already exists on Humanverse. Please sign in.' },
            { status: 409 }
          )
        }
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      // Upsert profile into public.profiles table
      if (data?.user) {
        try {
          await adminClient.from('profiles').upsert({
            id: data.user.id,
            display_name: name,
            professional_context: context,
          })
        } catch (profileErr) {
          console.error('Failed to create profile row:', profileErr)
        }
      }

      return NextResponse.json({
        success: true,
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      })
    }

    // Fallback if no service role key is available
    if (anonKey) {
      const client = createClient(url, anonKey)
      const { data, error } = await client.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            display_name: name,
            professional_context: context,
            app_name: 'Humanverse',
          },
        },
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        user: data?.user,
        requiresEmailConfirmation: !data?.session,
      })
    }

    return NextResponse.json({ error: 'Humanverse configuration missing.' }, { status: 500 })
  } catch (err) {
    console.error('Signup error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

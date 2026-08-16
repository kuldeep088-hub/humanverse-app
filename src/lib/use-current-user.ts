'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function useCurrentUser() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return
        setUserId(user?.id ?? null)
        setUserEmail(user?.email ?? null)
      } catch {
        if (cancelled) return
        setUserId(null)
        setUserEmail(null)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (cancelled) return
      setUserId(session?.user?.id ?? null)
      setUserEmail(session?.user?.email ?? null)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
      subscription?.unsubscribe()
    }
  }, [])

  return { userId, userEmail, isLoading }
}
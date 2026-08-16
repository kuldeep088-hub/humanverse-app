'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MOCK_USER_ID } from '@/lib/mock-data'

export function useCurrentUser() {
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (cancelled) return
      setUserId(data.user?.id ?? (isMockClient() ? MOCK_USER_ID : null))
      setIsLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  return { userId, isLoading }
}

function isMockClient() {
  const client = createClient() as { isMock?: boolean }
  return client.isMock === true
}
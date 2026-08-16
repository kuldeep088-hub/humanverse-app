'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/use-current-user'
import { formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'
import { MessageCircle, Users, Bell, Check, Loader2 } from 'lucide-react'

interface Notification {
  id: string
  user_id: string
  type: 'reply' | 'thread_reply' | 'circle_invite' | 'circle_join' | 'moderation' | 'security'
  title: string
  message: string
  reference_id: string | null
  reference_type: 'post' | 'reply' | 'thread' | 'circle' | null
  read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const { userId: currentUserId, isLoading: isUserLoading } = useCurrentUser()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!currentUserId) return
    const supabase = createClient()

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(50)

    setNotifications(data as Notification[] || [])

    // Mark all as read
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', currentUserId)
      .eq('read', false)

    setIsLoading(false)
  }, [currentUserId])

  useEffect(() => {
    const run = async () => {
      await fetchNotifications()
    }
    run()
  }, [fetchNotifications])

  const getIcon = (type: string) => {
    switch (type) {
      case 'reply': return <MessageCircle className="h-5 w-5" />
      case 'thread_reply': return <MessageCircle className="h-5 w-5" />
      case 'circle_invite':
      case 'circle_join': return <Users className="h-5 w-5" />
      default: return <Bell className="h-5 w-5" />
    }
  }

  if (isLoading || isUserLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-medium text-gray-950 dark:text-white">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Bell className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-4 text-lg">No notifications</p>
          <p className="mt-1 text-sm">When something happens, it&apos;ll show up here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => (
            <Link
              key={notification.id}
              href={notification.reference_id
                ? notification.reference_type === 'post' || notification.reference_type === 'reply'
                  ? `/app/post/${notification.reference_id}`
                  : notification.reference_type === 'thread'
                  ? `/app/threads/${notification.reference_id}`
                  : notification.reference_type === 'circle'
                  ? `/app/circles`
                  : '/app/feed'
                : '/app/feed'
              }
              className={`flex items-start gap-3 p-4 border rounded-lg transition-colors ${
                !notification.read
                  ? 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800'
                  : 'bg-white border-gray-200 dark:bg-gray-950 dark:border-gray-800'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5 text-gray-500 dark:text-gray-400">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-950 dark:text-white">{notification.title}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{notification.message}</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {formatRelativeTime(notification.created_at)}
                </p>
              </div>
              {!notification.read && (
                <Check className="flex-shrink-0 mt-0.5 h-5 w-5 text-green-500" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
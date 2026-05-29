'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Mail, MessageSquare, Smartphone, CheckCheck, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { getNotifications, getUnreadCount, markAsRead } from '@/lib/notifications'
import { timeAgo } from '@/lib/utils'
import type { Notification } from '@/types'

const typeIcons: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="h-4 w-4" />,
  SMS: <MessageSquare className="h-4 w-4" />,
  IN_APP: <Bell className="h-4 w-4" />,
  PUSH: <Smartphone className="h-4 w-4" />,
}

export function NotificationPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-panel'],
    queryFn: async () => {
      const result = await getNotifications({ limit: 5 })
      return result.data
    },
    refetchInterval: 30000,
  })

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
  })

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-panel'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
    },
  })

  return (
    <div className="absolute right-0 mt-2 w-80 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">
              {unreadCount}
            </span>
          )}
        </h3>
        {notifications.some((n: Notification) => !n.readAt) && (
          <button
            onClick={() => {
              notifications.filter((n: Notification) => !n.readAt).forEach((n: Notification) => markReadMutation.mutate(n.id))
            }}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No notifications yet
          </div>
        ) : (
          notifications.map((notification: Notification) => {
            const isUnread = !notification.readAt
            return (
              <button
                key={notification.id}
                onClick={() => {
                  if (isUnread) markReadMutation.mutate(notification.id)
                }}
                className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  isUnread ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                }`}
              >
                <div className={`mt-0.5 shrink-0 ${isUnread ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                  {typeIcons[notification.type] || <Bell className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                      {notification.subject || notification.type}
                    </p>
                    <span className="shrink-0 text-xs text-gray-400">{timeAgo(notification.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notification.body}</p>
                </div>
              </button>
            )
          })
        )}
      </div>

      <Link
        href="/notifications"
        onClick={onClose}
        className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-b-lg font-medium"
      >
        View all notifications
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

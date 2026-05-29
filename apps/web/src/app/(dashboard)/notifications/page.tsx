'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Mail, MessageSquare, Smartphone, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { getNotifications, markAsRead } from '@/lib/notifications'
import { timeAgo } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import type { Notification } from '@/types'

const typeIcons: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="h-5 w-5" />,
  SMS: <MessageSquare className="h-5 w-5" />,
  IN_APP: <Bell className="h-5 w-5" />,
  PUSH: <Smartphone className="h-5 w-5" />,
}

const typeLabels: Record<string, string> = {
  EMAIL: 'Email',
  SMS: 'SMS',
  IN_APP: 'In-App',
  PUSH: 'Push',
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = React.useState<'all' | 'unread' | 'read'>('all')
  const [page, setPage] = React.useState(1)

  const queryParams: { limit: number; status?: string; page: number } = { limit: 20, page }
  if (filter === 'unread') queryParams.status = 'PENDING'
  if (filter === 'read') queryParams.status = 'SENT'

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-list', filter, page],
    queryFn: async () => {
      const result = await getNotifications(queryParams)
      return result
    },
  })

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-panel'] })
    },
  })

  const notifications = data?.data ?? []
  const meta = data?.meta
  const totalPages = meta?.totalPages ?? 1

  const unreadIds = notifications.filter((n: Notification) => !n.readAt).map((n: Notification) => n.id)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {meta?.total ?? 0} notification{(meta?.total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        {unreadIds.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => unreadIds.forEach((id) => markReadMutation.mutate(id))}
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'unread', 'read'] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No notifications found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification: Notification) => {
            const isUnread = !notification.readAt
            return (
              <div
                key={notification.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                  isUnread
                    ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className={`p-2 rounded-full shrink-0 ${
                  isUnread
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }`}>
                  {typeIcons[notification.type] || <Bell className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {notification.subject || 'Notification'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{typeLabels[notification.type] || notification.type}</Badge>
                        <span className="text-xs text-gray-400">{timeAgo(notification.createdAt)}</span>
                        {!isUnread && (
                          <span className="text-xs text-gray-400">Read</span>
                        )}
                      </div>
                    </div>
                    {isUnread && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markReadMutation.mutate(notification.id)}
                        className="shrink-0"
                      >
                        <CheckCheck className="h-4 w-4 mr-1" />
                        Mark read
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{notification.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

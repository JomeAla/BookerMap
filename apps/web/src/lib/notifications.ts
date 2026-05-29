import { api } from './api'
import type { Notification } from '@/types'

interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export async function getNotifications(params?: {
  status?: string
  type?: string
  page?: number
  limit?: number
}): Promise<PaginatedResult<Notification>> {
  const { data: res } = await api.get('/notifications', { params })
  return res.data as PaginatedResult<Notification>
}

export async function getUnreadCount(): Promise<number> {
  const { data: res } = await api.get('/notifications/unread-count')
  return (res.data as { count: number }).count
}

export async function markAsRead(id: string): Promise<Notification> {
  const { data: res } = await api.patch(`/notifications/${id}/read`)
  return res.data as Notification
}

export async function markAllAsRead(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => markAsRead(id)))
}

'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { RotateCcw, Plus, ToggleLeft, ToggleRight, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { RecurringBooking, Booking } from '@/types'

export default function RecurringBookingsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const { data: recurringList, isLoading } = useQuery({
    queryKey: ['recurring-bookings'],
    queryFn: async () => {
      const { data } = await api.get('/recurring-bookings')
      return data.data as (RecurringBooking & { bookings: Booking[] })[]
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/recurring-bookings/${id}/toggle`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bookings'] })
      addToast('Recurring schedule updated', 'success')
    },
    onError: () => addToast('Failed to update', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/recurring-bookings/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bookings'] })
      addToast('Recurring schedule deleted', 'success')
    },
    onError: () => addToast('Failed to delete', 'error'),
  })

  const frequencyLabel = (r: RecurringBooking) => {
    const f = r.frequency.toLowerCase()
    const interval = r.interval > 1 ? ` every ${r.interval}` : ''
    if (f === 'daily') return `Daily${interval}`
    if (f === 'weekly') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      return `Weekly${interval} on ${days[r.dayOfWeek ?? 0]}`
    }
    if (f === 'monthly') return `Monthly${interval} on day ${r.dayOfMonth ?? 1}`
    return `${f}${interval}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/bookings" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Bookings
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recurring Schedules</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage weekly, monthly, and custom recurring bookings</p>
        </div>
      </div>

      {isLoading ? <Spinner /> : !recurringList?.length ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <RotateCcw className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No recurring schedules</p>
            <p className="text-sm mt-1">Create a recurring schedule from the new booking form</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recurringList.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{frequencyLabel(r)}</CardTitle>
                    <Badge variant={r.isActive ? 'success' : 'secondary'}>
                      {r.isActive ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">
                    {formatDate(r.startDate, 'MMM d, yyyy')}
                    {r.endDate ? ` - ${formatDate(r.endDate, 'MMM d, yyyy')}` : ' (ongoing)'}
                    {r.discount > 0 && ` | ${r.discount}% discount`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleMutation.mutate(r.id)}
                  >
                    {r.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500 mb-2">
                  {r.bookings?.length || 0} bookings created
                </div>
                {r.bookings?.length > 0 && (
                  <div className="space-y-1">
                    {r.bookings.slice(0, 5).map((b) => (
                      <Link
                        key={b.id}
                        href={`/bookings/${b.id}`}
                        className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                      >
                        <span>{formatDate(b.startTime, 'MMM d, h:mm a')}</span>
                        <span className="text-gray-500">{b.customer?.firstName} {b.customer?.lastName}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

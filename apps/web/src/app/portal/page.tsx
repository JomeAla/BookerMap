'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CalendarCheck, Clock, User, Building2, CreditCard } from 'lucide-react'
import { ChatWidget } from '@/components/chat/chat-widget'
import type { Booking } from '@/types'

function PortalContent() {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['portal-bookings'],
    queryFn: async () => {
      const { data } = await api.get('/portal/bookings')
      return data.data as Booking[]
    },
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          <span className="font-bold text-gray-900 dark:text-white">My Portal</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Bookings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View and manage your appointments</p>
          </div>
          <Button>Book New Service</Button>
        </div>

        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : !bookings?.length ? (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">
              <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No bookings yet</p>
              <p className="text-sm mt-1">Book your first service to get started</p>
              <Button className="mt-4">Book Now</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{booking.service?.name}</h3>
                        <StatusBadge status={booking.status} />
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <CalendarCheck className="h-4 w-4" />
                          {formatDate(booking.startTime, 'EEE, MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDate(booking.startTime, 'h:mm a')}
                        </span>
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-4 w-4" />
                          {formatCurrency(booking.totalPrice)}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <ChatWidget />
    </div>
  )
}

export default function CustomerPortalPage() {
  const [queryClient] = React.useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <PortalContent />
    </QueryClientProvider>
  )
}

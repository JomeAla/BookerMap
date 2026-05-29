'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/ui/skeleton'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Wrench, MapPin, Clock, User, CheckCircle, Play, XCircle, Navigation } from 'lucide-react'
import { type Dispatch, type Booking, JobStatus } from '@/types'

const statusActions: { status: JobStatus; label: string; icon: React.ReactNode; variant?: 'default' | 'outline' | 'destructive' }[] = [
  { status: JobStatus.EN_ROUTE, label: 'En Route', icon: <Navigation className="h-4 w-4" /> },
  { status: JobStatus.STARTED, label: 'Start Job', icon: <Play className="h-4 w-4" /> },
  { status: JobStatus.COMPLETED, label: 'Complete', icon: <CheckCircle className="h-4 w-4" />, variant: 'default' },
  { status: JobStatus.CANCELLED, label: 'Cancel', icon: <XCircle className="h-4 w-4" />, variant: 'destructive' },
]

function TechnicianContent() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['technician-jobs'],
    queryFn: async () => {
      const { data } = await api.get('/technician/jobs')
      return data.data as (Dispatch & { booking: Booking })[]
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ dispatchId, status }: { dispatchId: string; status: string }) => {
      const { data } = await api.patch(`/technician/jobs/${dispatchId}`, { status })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technician-jobs'] })
      addToast('Job status updated', 'success')
    },
    onError: () => addToast('Failed to update job', 'error'),
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-gray-900 dark:text-white">Technician App</span>
          </div>
          <Badge variant="secondary">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Badge>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Today&apos;s Jobs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {jobs?.length || 0} job{(jobs?.length || 0) !== 1 ? 's' : ''} scheduled for today
          </p>
        </div>

        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : !jobs?.length ? (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No jobs for today</p>
              <p className="text-sm mt-1">Enjoy your day off or check back later</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((dispatch) => {
              const booking = dispatch.booking
              const customer = booking?.customer
              return (
                <Card key={dispatch.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{booking?.service?.name}</h3>
                          <StatusBadge status={dispatch.status} />
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {customer?.firstName} {customer?.lastName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDate(booking?.startTime || '', 'h:mm a')} - {formatDate(booking?.endTime || '', 'h:mm a')}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {customer?.addresses?.[0]?.street || 'Address not available'}
                          </span>
                        </div>
                        {booking?.notes && (
                          <p className="text-sm text-gray-500 italic bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            Note: {booking.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        {statusActions.map((action) => {
                          if (action.status === dispatch.status || dispatch.status === 'COMPLETED' || dispatch.status === 'CANCELLED') return null
                          return (
                            <Button
                              key={action.status}
                              size="sm"
                              variant={action.variant || 'outline'}
                              onClick={() => updateMutation.mutate({ dispatchId: dispatch.id, status: action.status })}
                              disabled={updateMutation.isPending}
                            >
                              {action.icon}
                              <span className="ml-1">{action.label}</span>
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default function TechnicianPage() {
  const [queryClient] = React.useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TechnicianContent />
      </ToastProvider>
    </QueryClientProvider>
  )
}

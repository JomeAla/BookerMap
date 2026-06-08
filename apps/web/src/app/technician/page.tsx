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
import { Wrench, MapPin, Clock, User, CheckCircle, Play, XCircle, Navigation, Crosshair } from 'lucide-react'
import { type Dispatch, type Booking, JobStatus, type LocationUpdate } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLocationSocket } from '@/components/providers/socket-provider'
import { useAuth } from '@/hooks/useAuth'

const statusActions: { status: JobStatus; label: string; icon: React.ReactNode; variant?: 'default' | 'outline' | 'destructive' }[] = [
  { status: JobStatus.EN_ROUTE, label: 'En Route', icon: <Navigation className="h-4 w-4" /> },
  { status: JobStatus.STARTED, label: 'Start Job', icon: <Play className="h-4 w-4" /> },
  { status: JobStatus.COMPLETED, label: 'Complete', icon: <CheckCircle className="h-4 w-4" />, variant: 'default' },
  { status: JobStatus.CANCELLED, label: 'Cancel', icon: <XCircle className="h-4 w-4" />, variant: 'destructive' },
]

function TechnicianContent() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const locationSocketRef = useLocationSocket()

  const { user } = useAuth()
  const [sharingBookingId, setSharingBookingId] = React.useState<string | null>(null)
  const [locationError, setLocationError] = React.useState<string | null>(null)
  const watchIdRef = React.useRef<number | null>(null)
  const [currentLat, setCurrentLat] = React.useState<number | null>(null)
  const [currentLng, setCurrentLng] = React.useState<number | null>(null)

  const stopSharing = React.useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setSharingBookingId(null)
    setCurrentLat(null)
    setCurrentLng(null)
    setLocationError(null)
  }, [])

  const startSharing = React.useCallback((bookingId: string, tenantId?: string) => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported')
      return
    }
    stopSharing()
    setSharingBookingId(bookingId)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading } = position.coords
        setCurrentLat(latitude)
        setCurrentLng(longitude)
        const ws = locationSocketRef?.current
        if (ws?.connected) {
          ws.emit('updateLocation', {
            latitude,
            longitude,
            accuracy: accuracy ?? undefined,
            speed: speed ?? undefined,
            heading: heading ?? undefined,
            bookingId,
            userId: user?.id || '',
            tenantId: tenantId || '',
          })
        } else {
          api.post('/locations/update', {
            userId: user?.id || '',
            bookingId,
            latitude,
            longitude,
            accuracy: accuracy ?? undefined,
            speed: speed ?? undefined,
            heading: heading ?? undefined,
          }).catch(() => {})
        }
      },
      (err) => {
        setLocationError(`Location error: ${err.message}`)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }, [locationSocketRef, stopSharing])

  React.useEffect(() => {
    return () => { stopSharing() }
  }, [stopSharing])

  const { data: todayJobs, isLoading: isLoadingToday } = useQuery({
    queryKey: ['technician-today-jobs'],
    queryFn: async () => {
      const { data } = await api.get('/technician/jobs')
      return data.data as (Dispatch & { booking: Booking })[]
    },
  })

  const { data: availableJobs, isLoading: isLoadingAvailable } = useQuery({
    queryKey: ['technician-available-jobs'],
    queryFn: async () => {
      const { data } = await api.get('/dispatches/my-offers', {
        params: { technicianId: 'current' } // This would need to be implemented in the API route
      })
      return data.data as (Dispatch & { booking: Booking })[]
    },
  })

  const acceptMutation = useMutation({
    mutationFn: async ({ dispatchId }: { dispatchId: string }) => {
      const { data } = await api.post(`/dispatches/${dispatchId}/accept`, {
        technicianId: user?.id || '',
      })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technician-available-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['technician-today-jobs'] })
      addToast('Job accepted successfully', 'success')
    },
    onError: () => addToast('Failed to accept job', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ dispatchId, status }: { dispatchId: string; status: string }) => {
      const { data } = await api.patch(`/technician/jobs/${dispatchId}`, { status })
      return data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['technician-today-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['technician-available-jobs'] })
      addToast('Job status updated', 'success')
      if (variables.status === JobStatus.EN_ROUTE || variables.status === JobStatus.STARTED) {
        startSharing(variables.dispatchId)
      }
      if (variables.status === JobStatus.COMPLETED || variables.status === JobStatus.CANCELLED) {
        stopSharing()
      }
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

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Tabs defaultValue="today">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="today">Today's Jobs</TabsTrigger>
              <TabsTrigger value="available">Available Jobs</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <TabsContent value="today">
          {isLoadingToday ? (
            <TableSkeleton rows={4} />
          ) : !todayJobs?.length ? (
            <Card>
              <CardContent className="text-center py-12 text-gray-500">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No jobs for today</p>
                <p className="text-sm mt-1">Enjoy your day off or check back later</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {todayJobs.map((dispatch) => {
                const booking = dispatch.booking
                const customer = booking?.customer
                const isSharing = sharingBookingId === dispatch.id
                return (
                  <Card key={dispatch.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{booking?.service?.name}</h3>
                            <StatusBadge status={dispatch.status} />
                            {isSharing && (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                                <Crosshair className="h-3 w-3" />
                                Sharing Location
                              </Badge>
                            )}
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
                            {isSharing && currentLat != null && (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <Navigation className="h-4 w-4" />
                                {currentLat.toFixed(4)}, {currentLng?.toFixed(4)}
                              </span>
                            )}
                          </div>
                          {booking?.notes && (
                            <p className="text-sm text-gray-500 italic bg-gray-50 dark:bg-gray-800 p-2 rounded">
                              Note: {booking.notes}
                            </p>
                          )}
                          {isSharing && locationError && (
                            <p className="text-sm text-red-500">{locationError}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          {isSharing && (
                            <Button size="sm" variant="outline" onClick={stopSharing}>
                              <Crosshair className="h-4 w-4 mr-1" />
                              Stop Sharing
                            </Button>
                          )}
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
        </TabsContent>

        <TabsContent value="available">
          {isLoadingAvailable ? (
            <TableSkeleton rows={4} />
          ) : !availableJobs?.length ? (
            <Card>
              <CardContent className="text-center py-12 text-gray-500">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No available jobs</p>
                <p className="text-sm mt-1">Check back later for new job offers</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {availableJobs.map((dispatch) => {
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
                          <Button
                            key={dispatch.id}
                            size="sm"
                            variant="outline"
                            onClick={() => acceptMutation.mutate({ dispatchId: dispatch.id })}
                            disabled={acceptMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Accept Job
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
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

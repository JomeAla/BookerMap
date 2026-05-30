'use client'

import * as React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { useSearchParams } from 'next/navigation'
import { Calendar, Link2, Link2Off, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

export default function CalendarSettingsPage() {
  const { addToast } = useToast()
  const searchParams = useSearchParams()

  const { data: statusData, isLoading, refetch } = useQuery({
    queryKey: ['google-calendar-status'],
    queryFn: async () => {
      const { data } = await api.get('/google-calendar/status')
      return data.data as { connected: boolean; email?: string; expiresAt?: string }
    },
  })

  const { mutate: connect, isPending: connecting } = useMutation({
    mutationFn: async () => {
      const { data } = await api.get('/google-calendar/auth')
      return data.data as { url: string }
    },
    onSuccess: (data) => {
      window.location.href = data.url
    },
    onError: () => addToast('Failed to initiate Google connection', 'error'),
  })

  const { mutate: sync, isPending: syncing } = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/google-calendar/sync')
      return data.data as { synced: number; results: any[] }
    },
    onSuccess: (data) => {
      addToast(`Synced ${data.synced} bookings to Google Calendar`, 'success')
      refetch()
    },
    onError: () => addToast('Sync failed', 'error'),
  })

  const { mutate: disconnect, isPending: disconnecting } = useMutation({
    mutationFn: async () => {
      await api.post('/google-calendar/disconnect')
    },
    onSuccess: () => {
      addToast('Google Calendar disconnected', 'success')
      refetch()
    },
    onError: () => addToast('Failed to disconnect', 'error'),
  })

  React.useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      addToast('Google Calendar connected successfully', 'success')
      refetch()
    }
    if (searchParams.get('error') === 'true') {
      addToast('Failed to connect Google Calendar', 'error')
    }
  }, [searchParams])

  const isConnected = statusData?.connected

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar Sync</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Sync your bookings with Google Calendar
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Google Calendar</CardTitle>
          </div>
          <CardDescription>
            Connect your Google Calendar to automatically sync your bookings as events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Spinner size="sm" /> Checking connection status...
            </div>
          ) : isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium text-gray-900 dark:text-white">Connected</span>
                {statusData?.email && (
                  <span className="text-gray-500">({statusData.email})</span>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => sync()} disabled={syncing}>
                  {syncing ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                  Sync Now
                </Button>
                <Button variant="outline" onClick={() => disconnect()} disabled={disconnecting}>
                  {disconnecting ? <Spinner size="sm" /> : <Link2Off className="h-4 w-4 mr-1.5" />}
                  Disconnect
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Syncs all future CONFIRMED/PENDING bookings to your Google Calendar as events.
                Existing events will be updated.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <span>Not connected</span>
              </div>
              <Button onClick={() => connect()} disabled={connecting}>
                {connecting ? <Spinner size="sm" /> : <Link2 className="h-4 w-4 mr-1.5" />}
                Connect Google Calendar
              </Button>
              <p className="text-xs text-gray-400">
                You'll be redirected to Google to authorize access to your calendar.
                Only calendar event management permissions are requested.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

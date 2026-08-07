'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { MapPin, Clock, Save, ChevronDown, ChevronRight } from 'lucide-react'
import type { Territory } from '@/types'

type DayHours = { start: string; end: string } | null
type Availability = Record<string, DayHours>

const DAYS = [
  { key: 'sunday', label: 'Sunday' },
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
]

function emptyAvailability(): Availability {
  const a: Availability = {}
  for (const d of DAYS) a[d.key] = { start: '08:00', end: '17:00' }
  return a
}

function summarizeHours(avail: Availability | null | undefined): string {
  if (!avail || Object.keys(avail).length === 0) return 'No restrictions (24/7)'
  const open = DAYS.filter((d) => avail[d.key]).map((d) => d.label.slice(0, 3)).join(', ')
  const closed = DAYS.filter((d) => !avail[d.key]).map((d) => d.label.slice(0, 3)).join(', ')
  const parts = []
  if (open) parts.push(`Open ${open}`)
  if (closed) parts.push(`Closed ${closed}`)
  return parts.join(' · ')
}

export default function TerritoriesAvailabilityPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [drafts, setDrafts] = React.useState<Record<string, Availability>>({})

  const { data: territories, isLoading } = useQuery({
    queryKey: ['territories'],
    queryFn: async () => {
      const { data } = await api.get('/territories')
      return data.data as Territory[]
    },
  })

  const availabilityQuery = useQuery({
    queryKey: ['territory-availability', expandedId],
    queryFn: async () => {
      if (!expandedId) return null
      const { data } = await api.get(`/territories/${expandedId}/availability`)
      return data.data as { territoryId: string; availability: Availability }
    },
    enabled: !!expandedId,
  })

  React.useEffect(() => {
    if (availabilityQuery.data && expandedId) {
      const a = availabilityQuery.data.availability
      setDrafts((prev) => ({
        ...prev,
        [expandedId]: Object.keys(a).length === 0 ? emptyAvailability() : { ...emptyAvailability(), ...a },
      }))
    }
  }, [availabilityQuery.data, expandedId])

  const saveMutation = useMutation({
    mutationFn: async ({ id, availability }: { id: string; availability: Availability }) => {
      const { data } = await api.put(`/territories/${id}/availability`, { availability })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territories'] })
      queryClient.invalidateQueries({ queryKey: ['territory-availability', expandedId] })
      addToast('Territory availability saved', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to save availability', 'error'),
  })

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const updateDay = (territoryId: string, day: string, closed: boolean) => {
    setDrafts((prev) => {
      const current = prev[territoryId] || emptyAvailability()
      return {
        ...prev,
        [territoryId]: { ...current, [day]: closed ? null : { start: '08:00', end: '17:00' } },
      }
    })
  }

  const updateTime = (territoryId: string, day: string, field: 'start' | 'end', value: string) => {
    setDrafts((prev) => {
      const current = prev[territoryId] || emptyAvailability()
      const dayHours = current[day]
      if (!dayHours) return prev
      return { ...prev, [territoryId]: { ...current, [day]: { ...dayHours, [field]: value } } }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Territory Availability</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Set weekly operating hours per territory. Bookings outside these hours will be rejected.
        </p>
      </div>

      {isLoading ? <Spinner /> : !territories?.length ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <MapPin className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No territories</p>
            <p className="text-sm mt-1">Create territories first to configure their hours</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {territories.map((t) => {
            const isExpanded = expandedId === t.id
            const draft = drafts[t.id]
            const hasHours = t.availability && Object.keys(t.availability).length > 0
            return (
              <Card key={t.id}>
                <button
                  onClick={() => handleToggleExpand(t.id)}
                  className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">{t.name}</span>
                        {hasHours
                          ? <Badge variant="success" className="text-xs">Hours set</Badge>
                          : <Badge variant="secondary" className="text-xs">24/7 (no restrictions)</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{summarizeHours(t.availability)}</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                </button>

                {isExpanded && (
                  <CardContent className="border-t border-gray-100 dark:border-gray-800 pt-4">
                    {availabilityQuery.isLoading && !draft ? (
                      <div className="py-6"><Spinner /></div>
                    ) : draft ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-2 pr-4 font-medium text-gray-700 dark:text-gray-300">Day</th>
                                <th className="text-left py-2 px-4 font-medium text-gray-700 dark:text-gray-300">Open</th>
                                <th className="text-left py-2 px-4 font-medium text-gray-700 dark:text-gray-300">Close</th>
                                <th className="text-right py-2 pl-4 font-medium text-gray-700 dark:text-gray-300">Closed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {DAYS.map((day) => {
                                const hours = draft[day.key]
                                const isClosed = hours === null
                                return (
                                  <tr key={day.key} className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{day.label}</td>
                                    <td className="py-3 px-4">
                                      <input
                                        type="time"
                                        value={hours?.start || '09:00'}
                                        disabled={isClosed}
                                        onChange={(e) => updateTime(t.id, day.key, 'start', e.target.value)}
                                        className="w-32 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                      />
                                    </td>
                                    <td className="py-3 px-4">
                                      <input
                                        type="time"
                                        value={hours?.end || '17:00'}
                                        disabled={isClosed}
                                        onChange={(e) => updateTime(t.id, day.key, 'end', e.target.value)}
                                        className="w-32 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                      />
                                    </td>
                                    <td className="py-3 pl-4 text-right">
                                      <input
                                        type="checkbox"
                                        checked={isClosed}
                                        onChange={(e) => updateDay(t.id, day.key, e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600"
                                      />
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-4">
                          <Button onClick={() => saveMutation.mutate({ id: t.id, availability: draft })} disabled={saveMutation.isPending}>
                            <Save className="h-4 w-4 mr-2" /> Save Availability
                          </Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 py-4">Failed to load availability</p>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
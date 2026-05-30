'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

type TimeBlock = { start: string; end: string }
type Availability = Record<string, TimeBlock[]>

export default function TechnicianAvailabilityPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const id = params.id as string

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const { data } = await api.get(`/users/${id}`)
      return data.data as any
    },
  })

  const [availability, setAvailability] = React.useState<Availability>({})

  React.useEffect(() => {
    if (user?.availability) {
      setAvailability(user.availability as Availability)
    }
  }, [user])

  const updateMutation = useMutation({
    mutationFn: async (avail: Availability) => {
      const { data } = await api.put(`/users/${id}/availability`, { availability: avail })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      addToast('Availability saved', 'success')
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to save availability', 'error')
    },
  })

  const addTimeBlock = (day: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), { start: '09:00', end: '17:00' }],
    }))
  }

  const removeTimeBlock = (day: string, index: number) => {
    setAvailability((prev) => {
      const blocks = (prev[day] || []).filter((_, i) => i !== index)
      if (blocks.length === 0) {
        const { [day]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [day]: blocks }
    })
  }

  const updateTimeBlock = (day: string, index: number, field: 'start' | 'end', value: string) => {
    setAvailability((prev) => {
      const blocks = [...(prev[day] || [])]
      blocks[index] = { ...blocks[index], [field]: value }
      return { ...prev, [day]: blocks }
    })
  }

  const copyToAllDays = () => {
    const mondayBlocks = availability['monday']
    if (!mondayBlocks || mondayBlocks.length === 0) return
    const newAvailability: Availability = {}
    for (const day of DAYS) {
      newAvailability[day] = mondayBlocks.map((b) => ({ ...b }))
    }
    setAvailability(newAvailability)
  }

  if (userLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>User not found</p>
      </div>
    )
  }

  const hasAnyBlocks = Object.values(availability).some((blocks) => blocks.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/settings/team')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {user.firstName} {user.lastName} - Availability
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Set working hours for each day of the week
          </p>
        </div>
      </div>

      {hasAnyBlocks && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={copyToAllDays}>
            Copy Monday to all days
          </Button>
        </div>
      )}

      <div className="grid gap-4">
        {DAYS.map((day) => {
          const blocks = availability[day] || []
          return (
            <Card key={day}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{DAY_LABELS[day]}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => addTimeBlock(day)}>
                    <Plus className="h-4 w-4 mr-1" /> Add block
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {blocks.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Not working this day</p>
                ) : (
                  <div className="space-y-2">
                    {blocks.map((block, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 dark:text-gray-400">From</label>
                          <input
                            type="time"
                            value={block.start}
                            onChange={(e) => updateTimeBlock(day, idx, 'start', e.target.value)}
                            className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 dark:text-gray-400">To</label>
                          <input
                            type="time"
                            value={block.end}
                            onChange={(e) => updateTimeBlock(day, idx, 'end', e.target.value)}
                            className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-sm"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeBlock(day, idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={() => router.push('/settings/team')}>
          Cancel
        </Button>
        <Button onClick={() => updateMutation.mutate(availability)} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving...' : 'Save Availability'}
        </Button>
      </div>
    </div>
  )
}

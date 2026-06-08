'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { AvailabilityEditor } from '@/components/team/availability-editor'
import { ArrowLeft } from 'lucide-react'

type TimeBlock = { start: string; end: string }
type Availability = Record<string, TimeBlock[]>

export default function TechnicianAvailabilityPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const id = params.id as string

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const { data } = await api.get(`/users/${id}`)
      return data.data as any
    },
  })

  const { data: availability, isLoading: availLoading } = useQuery({
    queryKey: ['availability', id],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/users/${id}/availability`)
        const avail = data.data
        return (avail && typeof avail === 'object' ? avail : {}) as Availability
      } catch {
        return {} as Availability
      }
    },
    enabled: !!id,
    initialData: (user?.availability as Availability) || {},
  })

  if (isLoading) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/settings/team')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {user.firstName} {user.lastName} — Availability
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Set working hours for each day of the week. Click cells to toggle, or drag to paint.
          </p>
        </div>
      </div>

      <AvailabilityEditor userId={id} availability={availability} />
    </div>
  )
}
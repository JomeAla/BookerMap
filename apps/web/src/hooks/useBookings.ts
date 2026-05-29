'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Booking } from '@/types'

export function useBookings(params?: Record<string, string>) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['bookings', params],
    queryFn: async () => {
      const { data } = await api.get('/bookings', { params })
      return data.data as Booking[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Booking>) => {
      const { data } = await api.post('/bookings', payload)
      return data.data as Booking
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Booking> & { id: string }) => {
      const { data } = await api.patch(`/bookings/${id}`, payload)
      return data.data as Booking
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })

  return {
    bookings: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const { data } = await api.get(`/bookings/${id}`)
      return data.data as Booking
    },
    enabled: !!id,
  })
}

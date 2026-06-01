'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { isSameDay, format } from 'date-fns'
import { getStatusColor } from '@/lib/utils'
import type { Booking } from '@/types'

interface DayViewProps {
  currentDate: Date
  bookings: Booking[]
  onSlotClick?: (date: Date, time?: string) => void
}

const HOURS = Array.from({ length: 10 }, (_, i) => i + 7)

export function DayView({ currentDate, bookings, onSlotClick }: DayViewProps) {
  const router = useRouter()
  const dayBookings = bookings.filter((b) => isSameDay(new Date(b.startTime), currentDate))

  const getBookingStyle = (booking: Booking) => {
    const start = new Date(booking.startTime)
    const end = new Date(booking.endTime)
    const startMinutes = start.getHours() * 60 + start.getMinutes()
    const endMinutes = end.getHours() * 60 + end.getMinutes()
    const dayStart = 7 * 60
    const totalMinutes = 10 * 60
    const top = ((startMinutes - dayStart) / totalMinutes) * 100
    const height = Math.max(((endMinutes - startMinutes) / totalMinutes) * 100, 2.5)
    return { top: `${top}%`, height: `${height}%` }
  }

  return (
    <div className="overflow-auto">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h3>
        <p className="text-sm text-gray-500">{dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg">
        {HOURS.map((hour: number) => {
          const hourBookings = dayBookings.filter((b: Booking) => {
            const start = new Date(b.startTime)
            return start.getHours() === hour
          })
          return (
            <div key={hour} className="flex border-b border-gray-100 dark:border-gray-800 last:border-b-0 min-h-[60px]">
              <div className="w-20 flex-shrink-0 py-2 px-3 text-xs text-gray-400 border-r border-gray-100 dark:border-gray-800">
                {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
              </div>
              <div className="flex-1 py-1 px-2 space-y-1">
                {hourBookings.length === 0 && (
                  <div
                    onClick={() => onSlotClick?.(currentDate, `${String(hour).padStart(2, '0')}:00`)}
                    className="h-full min-h-[60px] cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors rounded"
                  />
                )}
                {hourBookings.map((booking) => {
                  const start = format(new Date(booking.startTime), 'h:mm a')
                  const end = format(new Date(booking.endTime), 'h:mm a')
                  return (
                    <div
                      key={booking.id}
                      data-booking
                      onClick={() => router.push(`/bookings/${booking.id}`)}
                      className={`rounded px-3 py-2 cursor-pointer transition-colors hover:opacity-80 ${getStatusColor(booking.status)}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{booking.service?.name}</span>
                        <span className="text-xs opacity-75">{start} - {end}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs opacity-75">
                          {booking.customer?.firstName} {booking.customer?.lastName}
                        </span>
                        {booking.technician && (
                          <span className="text-xs opacity-75">{booking.technician.firstName}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {dayBookings.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            No bookings for this day
          </div>
        )}
      </div>
    </div>
  )
}

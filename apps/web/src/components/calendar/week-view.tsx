'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday,
  format,
} from 'date-fns'
import { getStatusColor } from '@/lib/utils'
import type { Booking } from '@/types'

interface WeekViewProps {
  currentDate: Date
  bookings: Booking[]
}

const HOURS = Array.from({ length: 10 }, (_, i) => i + 7)

export function WeekView({ currentDate, bookings }: WeekViewProps) {
  const router = useRouter()
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const getBookingsForDay = (day: Date) => {
    return bookings.filter((b: Booking) => isSameDay(new Date(b.startTime), day))
  }

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
      <div className="grid grid-cols-8 min-w-[700px] border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700">
          Time
        </div>
        {days.map((day: Date) => (
          <div
            key={day.toISOString()}
            className={`p-2 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${
              isToday(day) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
          >
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{format(day, 'EEE')}</div>
            <div className={`text-sm font-semibold mt-0.5 ${isToday(day) ? 'text-blue-600' : 'text-gray-900 dark:text-white'}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-8 min-w-[700px] relative">
        <div className="border-r border-gray-200 dark:border-gray-700">
          {HOURS.map((hour: number) => (
            <div key={hour} className="h-[60px] border-b border-gray-100 dark:border-gray-800 px-2 text-xs text-gray-400 pt-0.5">
              {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
            </div>
          ))}
        </div>
        {days.map((day: Date) => {
          const dayBookings = getBookingsForDay(day)
          return (
            <div
              key={day.toISOString()}
              className={`relative border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${
                isToday(day) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
              }`}
            >
              {HOURS.map((hour: number) => (
                <div key={hour} className="h-[60px] border-b border-gray-100 dark:border-gray-800" />
              ))}
              {dayBookings.map((booking) => {
                const style = getBookingStyle(booking)
                return (
                  <div
                    key={booking.id}
                    onClick={() => router.push(`/bookings/${booking.id}`)}
                    className={`absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-xs overflow-hidden cursor-pointer border border-white/20 ${getStatusColor(booking.status)}`}
                    style={{ top: style.top, height: style.height }}
                    title={`${booking.customer?.firstName} ${booking.customer?.lastName} - ${booking.service?.name}`}
                  >
                    <div className="font-medium truncate">{booking.service?.name}</div>
                    <div className="truncate opacity-75">
                      {format(new Date(booking.startTime), 'h:mm a')}
                    </div>
                    {parseFloat(style.height) > 5 && (
                      <div className="truncate opacity-75">
                        {booking.customer?.firstName}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

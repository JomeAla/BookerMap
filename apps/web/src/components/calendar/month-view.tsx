'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, format,
} from 'date-fns'
import { getStatusColor } from '@/lib/utils'
import type { Booking } from '@/types'

interface MonthViewProps {
  currentDate: Date
  bookings: Booking[]
  onDateChange: (date: Date) => void
  onSlotClick?: (date: Date, time?: string) => void
}

export function MonthView({ currentDate, bookings, onDateChange, onSlotClick }: MonthViewProps) {
  const router = useRouter()
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const getBookingsForDay = (day: Date) => {
    return bookings.filter((b) => isSameDay(new Date(b.startTime), day))
  }

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day: Date, idx: number) => {
          const dayBookings = getBookingsForDay(day)
          return (
            <div
              key={idx}
              onClick={(e) => {
                const target = e.target as HTMLElement
                if (target.closest('[data-booking]')) return
                if (onSlotClick) onSlotClick(day, '09:00')
                else onDateChange(day)
              }}
              className={`min-h-[100px] p-1.5 border-r border-b border-gray-200 dark:border-gray-700 last:border-r-0 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                !isSameMonth(day, currentDate) ? 'bg-gray-50 dark:bg-gray-800/50' : ''
              }`}
            >
              <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                isToday(day) ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400'
              }`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayBookings.slice(0, 3).map((booking) => (
                  <div
                    key={booking.id}
                    data-booking
                    onClick={(e) => { e.stopPropagation(); router.push(`/bookings/${booking.id}`) }}
                    className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer ${getStatusColor(booking.status)}`}
                    title={`${booking.customer?.firstName} ${booking.customer?.lastName} - ${booking.service?.name} - ${format(new Date(booking.startTime), 'h:mm a')}`}
                  >
                    {format(new Date(booking.startTime), 'h:mm a')} {booking.service?.name}
                  </div>
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-xs text-gray-500 px-1">+{dayBookings.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

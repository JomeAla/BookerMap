'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MonthView } from '@/components/calendar/month-view'
import { WeekView } from '@/components/calendar/week-view'
import { DayView } from '@/components/calendar/day-view'
import type { Booking } from '@/types'

type ViewMode = 'month' | 'week' | 'day'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [view, setView] = React.useState<ViewMode>('month')

  const { start, end } = React.useMemo(() => {
    if (view === 'month') {
      const ms = startOfMonth(currentDate)
      const me = endOfMonth(currentDate)
      return { start: startOfWeek(ms), end: endOfWeek(me) }
    }
    if (view === 'week') {
      return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) }
    }
    return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) }
  }, [currentDate, view])

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['calendar-bookings', view, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data } = await api.get('/bookings', {
        params: { dateFrom: start.toISOString(), dateTo: end.toISOString() },
      })
      return data.data as Booking[]
    },
  })

  const navigatePrev = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1))
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1))
    else setCurrentDate(subDays(currentDate, 1))
  }

  const navigateNext = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1))
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1))
    else setCurrentDate(addDays(currentDate, 1))
  }

  const getTitle = () => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy')
    if (view === 'week') {
      const ws = startOfWeek(currentDate)
      const we = endOfWeek(currentDate)
      return `${format(ws, 'MMM d')} - ${format(we, 'MMM d, yyyy')}`
    }
    return format(currentDate, 'EEEE, MMMM d, yyyy')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View and manage your schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === v
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={navigatePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base">{getTitle()}</CardTitle>
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : view === 'month' ? (
            <MonthView currentDate={currentDate} bookings={bookings || []} onDateChange={(d) => { setCurrentDate(d); setView('day') }} />
          ) : view === 'week' ? (
            <WeekView currentDate={currentDate} bookings={bookings || []} />
          ) : (
            <DayView currentDate={currentDate} bookings={bookings || []} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

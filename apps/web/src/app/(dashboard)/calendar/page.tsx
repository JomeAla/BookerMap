'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventDropArg, EventClickArg, DateSelectArg, EventHoveringArg } from '@fullcalendar/core'
import { format } from 'date-fns'
import type { Booking, User } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#3B82F6',
  CONFIRMED: '#10B981',
  IN_PROGRESS: '#6366F1',
  COMPLETED: '#6B7280',
  CANCELLED: '#EF4444',
  NO_SHOW: '#9CA3AF',
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

interface ConfirmDialogState {
  open: boolean
  booking: Booking | null
  newStart: Date | null
  newEnd: Date | null
  action: 'drop' | 'resize'
}

interface TooltipState {
  show: boolean
  x: number
  y: number
  booking: Booking | null
}

export default function CalendarPage() {
  const calendarRef = React.useRef<FullCalendar>(null)
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [technicianId, setTechnicianId] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string[]>([])
  const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(null)
  const [confirmDialog, setConfirmDialog] = React.useState<ConfirmDialogState>({
    open: false, booking: null, newStart: null, newEnd: null, action: 'drop',
  })
  const [tooltip, setTooltip] = React.useState<TooltipState>({
    show: false, x: 0, y: 0, booking: null,
  })
  const [quickCreate, setQuickCreate] = React.useState<{
    open: boolean; startStr: string; endStr: string
  }>({ open: false, startStr: '', endStr: '' })
  const [revertDrop, setRevertDrop] = React.useState<(() => void) | null>(null)
  const [revertResize, setRevertResize] = React.useState<(() => void) | null>(null)

  const { data: bookingsRaw, isLoading } = useQuery({
    queryKey: ['calendar-bookings-full', technicianId, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (technicianId) params.technicianId = technicianId
      if (statusFilter.length === 1) params.status = statusFilter[0]
      const { data } = await api.get('/bookings', { params })
      return data.data as Booking[]
    },
  })

  const { data: usersRaw } = useQuery({
    queryKey: ['calendar-technicians'],
    queryFn: async () => {
      const { data } = await api.get('/users')
      return data.data as User[]
    },
  })

  const technicians = React.useMemo(
    () => (usersRaw || []).filter((u) => u.role === 'TECHNICIAN'),
    [usersRaw],
  )

  const bookings = bookingsRaw || []

  const events = React.useMemo(() => {
    let filtered = bookings
    if (statusFilter.length > 1) {
      filtered = bookings.filter((b) => statusFilter.includes(b.status))
    }
    return filtered.map((booking) => ({
      id: booking.id,
      title: `${booking.service?.name || 'No service'} - ${booking.customer?.firstName || ''} ${booking.customer?.lastName || ''}`,
      start: booking.startTime,
      end: booking.endTime,
      backgroundColor: STATUS_COLORS[booking.status] || '#6B7280',
      borderColor: STATUS_COLORS[booking.status] || '#6B7280',
      textColor: '#ffffff',
      extendedProps: { booking },
    }))
  }, [bookings, statusFilter])

  const rescheduleMutation = useMutation({
    mutationFn: async (params: { bookingId: string; newStart: string; newEnd?: string }) => {
      const body: Record<string, string> = { newStartTime: params.newStart }
      if (params.newEnd) body.newEndTime = params.newEnd
      await api.patch(`/bookings/${params.bookingId}/reschedule`, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-bookings-full'] })
      addToast('Booking rescheduled successfully', 'success')
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.message || 'Failed to reschedule', 'error')
    },
  })

  const toggleStatus = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    )
  }

  const handleEventDrop = async (info: EventDropArg) => {
    const booking = info.event.extendedProps.booking as Booking
    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      addToast('Only pending and confirmed bookings can be rescheduled', 'error')
      info.revert()
      return
    }
    const newStart = info.event.start
    const newEnd = info.event.end
    if (!newStart || !newEnd) {
      info.revert()
      return
    }
    setRevertDrop(() => info.revert)
    setConfirmDialog({
      open: true, booking, newStart, newEnd, action: 'drop',
    })
  }

  const handleEventResize = async (info: any) => {
    const booking = info.event.extendedProps.booking as Booking
    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      addToast('Only pending and confirmed bookings can be resized', 'error')
      info.revert()
      return
    }
    const newStart = info.event.start
    const newEnd = info.event.end
    if (!newStart || !newEnd) {
      info.revert()
      return
    }
    setRevertResize(() => info.revert)
    setConfirmDialog({
      open: true, booking, newStart, newEnd, action: 'resize',
    })
  }

  const handleConfirmAction = async () => {
    const { booking, newStart, newEnd, action } = confirmDialog
    if (!booking || !newStart || !newEnd) return

    try {
      const { data: slotCheck } = await api.get('/bookings/check-slot', {
        params: {
          bookingId: booking.id,
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
        },
      })

      if (!slotCheck.available) {
        const conflictNames = slotCheck.conflicts?.map((c: any) => c.customerName).join(', ') || 'another booking'
        addToast(`Technician not available — conflicts with ${conflictNames}`, 'error')
        if (action === 'drop' && revertDrop) revertDrop()
        if (action === 'resize' && revertResize) revertResize()
        setConfirmDialog({ open: false, booking: null, newStart: null, newEnd: null, action: 'drop' })
        return
      }

      await rescheduleMutation.mutateAsync({
        bookingId: booking.id,
        newStart: newStart.toISOString(),
        newEnd: action === 'resize' ? newEnd.toISOString() : undefined,
      })
    } catch {
      if (action === 'drop' && revertDrop) revertDrop()
      if (action === 'resize' && revertResize) revertResize()
    }

    setConfirmDialog({ open: false, booking: null, newStart: null, newEnd: null, action: 'drop' })
    setRevertDrop(null)
    setRevertResize(null)
  }

  const handleCancelAction = () => {
    if (confirmDialog.action === 'drop' && revertDrop) revertDrop()
    if (confirmDialog.action === 'resize' && revertResize) revertResize()
    setConfirmDialog({ open: false, booking: null, newStart: null, newEnd: null, action: 'drop' })
    setRevertDrop(null)
    setRevertResize(null)
  }

  const handleEventClick = (info: EventClickArg) => {
    const booking = info.event.extendedProps.booking as Booking
    setSelectedBooking(booking)
  }

  const handleDateSelect = (info: DateSelectArg) => {
    setQuickCreate({ open: true, startStr: info.startStr, endStr: info.endStr })
  }

  const handleEventMouseEnter = (info: EventHoveringArg) => {
    const rect = info.el.getBoundingClientRect()
    const booking = info.event.extendedProps.booking as Booking
    setTooltip({ show: true, x: rect.left + rect.width / 2, y: rect.top - 8, booking })
  }

  const handleEventMouseLeave = () => {
    setTooltip({ show: false, x: 0, y: 0, booking: null })
  }

  const getOldTime = () => {
    if (!confirmDialog.booking) return ''
    return format(new Date(confirmDialog.booking.startTime), 'MMM d, h:mm a')
  }

  const getNewTime = () => {
    if (!confirmDialog.newStart) return ''
    return format(confirmDialog.newStart, 'MMM d, h:mm a')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View and manage your schedule</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            options={[
              { value: '', label: 'All Technicians' },
              ...technicians.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` })),
            ]}
            value={technicianId}
            onChange={(e) => setTechnicianId(e.target.value)}
            className="w-48"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">Status:</span>
        {STATUS_OPTIONS.map((opt) => {
          const active = statusFilter.length === 0 || statusFilter.includes(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => toggleStatus(opt.value)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                active
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
        {statusFilter.length > 0 && (
          <button
            onClick={() => setStatusFilter([])}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-2"
          >
            Clear
          </button>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              events={events}
              editable={true}
              eventDurationEditable={true}
              eventStartEditable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              allDaySlot={false}
              height="auto"
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              eventClick={handleEventClick}
              select={handleDateSelect}
              eventMouseEnter={handleEventMouseEnter}
              eventMouseLeave={handleEventMouseLeave}
            />
          )}
        </CardContent>
      </Card>

      {tooltip.show && tooltip.booking && (
        <div
          className="fixed z-[60] pointer-events-none bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 shadow-lg -translate-x-1/2 -translate-y-full max-w-[240px]"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-medium mb-0.5">
            {tooltip.booking.service?.name || 'No service'}
          </div>
          <div className="opacity-80">
            {tooltip.booking.customer?.firstName} {tooltip.booking.customer?.lastName}
          </div>
          <div className="opacity-60">
            {format(new Date(tooltip.booking.startTime), 'h:mm a')} &ndash;{' '}
            {format(new Date(tooltip.booking.endTime), 'h:mm a')}
          </div>
        </div>
      )}

      <Dialog open={selectedBooking !== null} onOpenChange={(o) => { if (!o) setSelectedBooking(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Service</span>
                <span className="font-medium">{selectedBooking.service?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Customer</span>
                <span className="font-medium">
                  {selectedBooking.customer?.firstName} {selectedBooking.customer?.lastName}
                </span>
              </div>
              {selectedBooking.technician && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Technician</span>
                  <span className="font-medium">
                    {selectedBooking.technician.firstName} {selectedBooking.technician.lastName}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Start</span>
                <span className="font-medium">{format(new Date(selectedBooking.startTime), 'MMM d, yyyy h:mm a')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">End</span>
                <span className="font-medium">{format(new Date(selectedBooking.endTime), 'MMM d, yyyy h:mm a')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className="font-medium capitalize">{selectedBooking.status.toLowerCase()}</span>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    window.open(`/bookings/${selectedBooking.id}`, '_blank')
                    setSelectedBooking(null)
                  }}
                >
                  View Full Booking
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDialog.open} onOpenChange={(o) => { if (!o) handleCancelAction() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              Move <strong>{confirmDialog.booking?.service?.name}</strong> for{' '}
              <strong>
                {confirmDialog.booking?.customer?.firstName} {confirmDialog.booking?.customer?.lastName}
              </strong>
              ?
            </p>
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Current</div>
                <div className="font-medium">{getOldTime()}</div>
              </div>
              <div className="text-gray-400">&rarr;</div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">New</div>
                <div className="font-medium">{getNewTime()}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleCancelAction}>
                Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleConfirmAction}>
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={quickCreate.open}
        onOpenChange={(o) => setQuickCreate((prev) => ({ ...prev, open: o }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Create Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-gray-500 dark:text-gray-400">
              Slot selected: {quickCreate.startStr} &ndash; {quickCreate.endStr}
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              Use the full booking form to create a new booking for this time slot.
            </p>
            <div className="pt-2">
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => {
                  window.open(
                    `/bookings/new?startTime=${encodeURIComponent(quickCreate.startStr)}&endTime=${encodeURIComponent(quickCreate.endStr)}`,
                    '_blank',
                  )
                  setQuickCreate({ open: false, startStr: '', endStr: '' })
                }}
              >
                Open Booking Form
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

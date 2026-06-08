'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CalendarCheck, Search, Filter } from 'lucide-react'
import { RotateCcw } from 'lucide-react'
import type { Booking, BookingStatus } from '@/types'

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
]

export default function BookingsPage() {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const [dateFilter, setDateFilter] = React.useState('')
  const [page, setPage] = React.useState(1)
  const limit = 20

  React.useEffect(() => { setPage(1) }, [search, statusFilter, dateFilter])

  const params = React.useMemo(() => {
    const p: Record<string, string> = { page: String(page), limit: String(limit) }
    if (search) p.search = search
    if (statusFilter) p.status = statusFilter
    if (dateFilter) p.date = dateFilter
    return p
  }, [search, statusFilter, dateFilter, page])

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', params],
    queryFn: async () => {
      const { data: res } = await api.get('/bookings', { params })
      return { items: res.data as Booking[], meta: res.meta as { total: number; page: number; limit: number; totalPages: number } }
    },
  })

  const bookings = data?.items
  const meta = data?.meta
  const totalPages = meta?.totalPages ?? 1
  const total = meta?.total ?? 0
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bookings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage all bookings</p>
        </div>
        <div className="flex gap-2">
          <Link href="/bookings/recurring">
            <Button variant="outline"><RotateCcw className="h-4 w-4 mr-2" /> Recurring</Button>
          </Link>
          <Link href="/bookings/new">
            <Button><CalendarCheck className="h-4 w-4 mr-2" /> New Booking</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                placeholder="Search bookings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
              className="w-full sm:w-40"
            />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full sm:w-40 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={8} /></div>
          ) : !bookings?.length ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No bookings found</p>
              <p className="text-sm mt-1">Try adjusting your filters or create a new booking</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.customer?.firstName} {booking.customer?.lastName}
                      </TableCell>
                      <TableCell>{booking.service?.name}</TableCell>
                      <TableCell className="text-sm">{formatDate(booking.startTime, 'MMM d, yyyy h:mm a')}</TableCell>
                      <TableCell>{formatCurrency(booking.totalPrice)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {booking.technician ? `${booking.technician.firstName} ${booking.technician.lastName}` : '\u2014'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <StatusBadge status={booking.status} />
                          {booking.recurrenceId && (
                            <RotateCcw className="h-3.5 w-3.5 text-blue-500" title="Recurring" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/bookings/${booking.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {bookings && bookings.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {start}\u2013{end} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

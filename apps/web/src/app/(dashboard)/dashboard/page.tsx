'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/badge'
import { CardSkeleton, TableSkeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CalendarCheck, DollarSign, Users, FileText, TrendingUp, Sparkles } from 'lucide-react'
import type { Booking } from '@/types'

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/reports/dashboard-stats')
      return data.data as {
        todayBookings: number
        revenue: number
        totalCustomers: number
        pendingInvoices: number
      }
    },
  })

  const { data: recentBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['recent-bookings'],
    queryFn: async () => {
      const { data } = await api.get('/bookings', { params: { limit: '5', sort: '-createdAt' } })
      return data.data as Booking[]
    },
  })

  const statCards = [
    { label: "Today's Bookings", value: stats?.todayBookings ?? 0, icon: CalendarCheck, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Revenue', value: stats?.revenue ? formatCurrency(stats.revenue) : '₦0.00', icon: DollarSign, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
    { label: 'Customers', value: stats?.totalCustomers ?? 0, icon: Users, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
    { label: 'Pending Invoices', value: stats?.pendingInvoices ?? 0, icon: FileText, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of your business</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.label}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                      </div>
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Bookings</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Latest 5 bookings</p>
            </div>
            <Link href="/bookings" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <TableSkeleton rows={5} />
            ) : !recentBookings?.length ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No bookings yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          {booking.customer?.firstName} {booking.customer?.lastName}
                        </TableCell>
                        <TableCell>{booking.service?.name}</TableCell>
                        <TableCell>{formatDate(booking.startTime, 'MMM d, h:mm a')}</TableCell>
                        <TableCell>{formatCurrency(booking.totalPrice)}</TableCell>
                        <TableCell><StatusBadge status={booking.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">AI Insights</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Trending</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  Booking volume is up 23% this week compared to last.
                </p>
              </div>
              <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800 dark:text-purple-300">Suggestion</span>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-200">
                  3 customers haven&apos;t booked in 60+ days. Consider sending a re-engagement offer.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

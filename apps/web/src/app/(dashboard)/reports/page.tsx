'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DollarSign, CalendarCheck, Users, Wrench, TrendingUp, BarChart3 } from 'lucide-react'

function Tooltip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const [dateRange, setDateRange] = React.useState({ startDate: thirtyDaysAgo, endDate: today })
  const [groupBy, setGroupBy] = React.useState<'day' | 'week' | 'month'>('day')

  const params = { ...dateRange, groupBy }

  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ['reports-revenue', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/revenue', { params })
      return data.data as any
    },
  })

  const { data: bookingTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ['reports-bookings', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/bookings', { params })
      return data.data as any
    },
  })

  const { data: technicians, isLoading: techLoading } = useQuery({
    queryKey: ['reports-technicians', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/reports/technicians', { params: dateRange })
      return data.data as any[]
    },
  })

  const { data: topServices, isLoading: svcLoading } = useQuery({
    queryKey: ['reports-services', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/reports/services', { params: dateRange })
      return data.data as any[]
    },
  })

  const maxRevenue = Math.max(...(revenue?.data?.map((d: any) => d.revenue) || [1]), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Analytics and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base">Revenue</CardTitle>
              </div>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-xs"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {revenueLoading ? <Spinner /> : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-gray-500">Total Revenue</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatCurrency(revenue?.totalRevenue || 0)}</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <p className="text-xs text-gray-500">Fees</p>
                    <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{formatCurrency(revenue?.totalFees || 0)}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-gray-500">Transactions</p>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{revenue?.totalTransactions || 0}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {(revenue?.data || []).slice(-14).map((d: any) => (
                    <div key={d.date} className="flex items-center gap-2 text-xs">
                      <span className="w-24 text-right text-gray-500 shrink-0">{d.date.slice(5)}</span>
                      <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded transition-all"
                          style={{ width: `${(d.revenue / maxRevenue) * 100}%` }}
                        />
                      </div>
                      <span className="w-20 text-right font-medium">{formatCurrency(d.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Booking Trends</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {trendsLoading ? <Spinner /> : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{bookingTrends?.totalBookings || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-gray-500">Completed</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">{bookingTrends?.completedBookings || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-xs text-gray-500">Cancellation</p>
                    <p className="text-lg font-bold text-red-700 dark:text-red-300">{bookingTrends?.cancellationRate || '0'}%</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {(bookingTrends?.data || []).slice(-14).map((d: any) => (
                    <div key={d.date} className="flex items-center gap-2 text-xs">
                      <span className="w-24 text-right text-gray-500 shrink-0">{d.date.slice(5)}</span>
                      <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded transition-all"
                          style={{ width: `${Math.min((d.total / Math.max(...(bookingTrends?.data || []).map((x: any) => x.total), 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-medium">{d.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Technician Performance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {techLoading ? <Spinner /> : !technicians?.length ? (
              <div className="text-center py-8 text-sm text-gray-400">No data for this period</div>
            ) : (
              <div className="space-y-3">
                {technicians.map((tech: any) => (
                  <div key={tech.technicianId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{tech.technicianName}</p>
                      <p className="text-xs text-gray-500">{tech.completedJobs} of {tech.totalJobs} jobs completed</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(tech.revenue)}</p>
                      <p className="text-xs text-gray-500">
                        {tech.totalJobs > 0 ? Math.round(tech.completedJobs / tech.totalJobs * 100) : 0}% rate
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-base">Top Services</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {svcLoading ? <Spinner /> : !topServices?.length ? (
              <div className="text-center py-8 text-sm text-gray-400">No data for this period</div>
            ) : (
              <div className="space-y-3">
                {topServices.map((svc: any, idx: number) => (
                  <div key={svc.serviceId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-5">{idx + 1}.</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{svc.name}</p>
                        <p className="text-xs text-gray-500">{svc.bookings} bookings</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(svc.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

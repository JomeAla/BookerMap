'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { DollarSign, Users, Percent, TrendingUp, ChevronDown, ChevronRight, CalendarDays } from 'lucide-react'

function monthPresets() {
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const toStr = (d: Date) => d.toISOString().slice(0, 10)
  return {
    thisMonth: { startDate: toStr(thisMonthStart), endDate: toStr(now) },
    lastMonth: { startDate: toStr(lastMonthStart), endDate: toStr(lastMonthEnd) },
    last3Months: { startDate: toStr(threeMonthsAgo), endDate: toStr(now) },
  }
}

export default function CommissionsPage() {
  const searchParams = useSearchParams()
  const techId = searchParams.get('techId')
  const presets = monthPresets()
  const [dateRange, setDateRange] = React.useState(presets.thisMonth)
  const [expandedTech, setExpandedTech] = React.useState<string | null>(null)
  const [highlightedTech, setHighlightedTech] = React.useState<string | null>(null)
  const [activePreset, setActivePreset] = React.useState<string>('thisMonth')

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['commission-summary', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/commission/summary', { params: dateRange })
      return data.data as any
    },
  })

  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ['commissions', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/commission', { params: dateRange })
      return data.data as any[]
    },
  })

  const { data: singleTech } = useQuery({
    queryKey: ['commission-single', techId, dateRange],
    queryFn: async () => {
      const { data } = await api.get(`/commission/technician/${techId}`, { params: dateRange })
      return data.data as any
    },
    enabled: !!techId,
  })

  React.useEffect(() => {
    if (singleTech?.technician) {
      setExpandedTech(singleTech.technician)
      setHighlightedTech(singleTech.technician)
    }
  }, [singleTech])

  const applyPreset = (key: string) => {
    const range = (presets as any)[key]
    if (range) {
      setDateRange(range)
      setActivePreset(key)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Commission Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Per-technician commission tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
            {[
              { key: 'thisMonth', label: 'This Month' },
              { key: 'lastMonth', label: 'Last Month' },
              { key: 'last3Months', label: 'Last 3 Months' },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  activePreset === p.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => { setDateRange({ ...dateRange, startDate: e.target.value }); setActivePreset('') }}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => { setDateRange({ ...dateRange, endDate: e.target.value }); setActivePreset('') }}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              Total Commission
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summaryLoading ? '...' : formatCurrency(summary?.totalCommission || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Total Revenue
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summaryLoading ? '...' : formatCurrency(summary?.totalRevenue || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Percent className="h-4 w-4 text-purple-600" />
              Avg Commission Rate
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summaryLoading ? '...' : `${(summary?.averageCommissionRate || 0).toFixed(1)}%`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Users className="h-4 w-4 text-indigo-600" />
              Technicians
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summaryLoading ? '...' : summary?.technicians || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commission Details</CardTitle>
          <CardDescription>Individual technician commission breakdown</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {commissionsLoading ? (
            <div className="p-6"><Spinner /></div>
          ) : !commissions?.length ? (
            <div className="text-center py-12 text-sm text-gray-400">No commission data for this period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Technician</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Rate</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Bookings</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Revenue</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Commission</th>
                    <th className="w-10 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((tech: any) => (
                    <React.Fragment key={tech.technician}>
                      <tr
                        className={cn(
                          'border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer',
                          highlightedTech === tech.technician && 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800'
                        )}
                        onClick={() => setExpandedTech(expandedTech === tech.technician ? null : tech.technician)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{tech.technician}</td>
                        <td className="px-4 py-3 text-right">
                          {tech.type === 'FIXED' ? formatCurrency(tech.rate) : `${tech.rate}%`}
                        </td>
                        <td className="px-4 py-3 text-right">{tech.totalBookings}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(tech.totalRevenue)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(tech.commissionAmount)}</td>
                        <td className="px-4 py-3 text-right">
                          {expandedTech === tech.technician ? (
                            <ChevronDown className="h-4 w-4 text-gray-400 inline" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400 inline" />
                          )}
                        </td>
                      </tr>
                      {expandedTech === tech.technician && (
                        <tr>
                          <td colSpan={6} className="px-4 py-2 bg-gray-50 dark:bg-gray-800/30">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-500">
                                  <th className="text-left px-3 py-1">Date</th>
                                  <th className="text-left px-3 py-1">Service</th>
                                  <th className="text-right px-3 py-1">Revenue</th>
                                  <th className="text-right px-3 py-1">Commission</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(tech.details || []).map((d: any) => (
                                  <tr key={d.bookingId} className="border-t border-gray-100 dark:border-gray-800">
                                    <td className="px-3 py-1.5">{formatDate(d.date)}</td>
                                    <td className="px-3 py-1.5">{d.service || '—'}</td>
                                    <td className="px-3 py-1.5 text-right">{formatCurrency(d.revenue)}</td>
                                    <td className="px-3 py-1.5 text-right text-green-600">{formatCurrency(d.commission)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import { Truck, MapPin, Clock, Route, ChevronRight, Navigation, CheckCircle2, X } from 'lucide-react'
import type { Dispatch } from '@/types'

interface RouteResult {
  orderedDispatches: Dispatch[]
  totalDistance: number
  totalDuration: number
  origin: { lat: number; lng: number; label: string } | null
}

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'EN_ROUTE', label: 'En Route' },
  { value: 'STARTED', label: 'Started' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function DispatchesPage() {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [routeResult, setRouteResult] = React.useState<RouteResult | null>(null)
  const [optimizing, setOptimizing] = React.useState(false)
  const [applied, setApplied] = React.useState(false)

  const params = React.useMemo(() => {
    const p: Record<string, string> = {}
    if (search) p.search = search
    if (statusFilter) p.status = statusFilter
    return p
  }, [search, statusFilter])

  const { data: dispatches, isLoading } = useQuery({
    queryKey: ['dispatches', params],
    queryFn: async () => {
      const { data } = await api.get('/dispatches', { params })
      return data.data as Dispatch[]
    },
  })

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!dispatches) return
    if (selectedIds.size === dispatches.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(dispatches.map((d) => d.id)))
    }
  }

  const handleOptimize = async () => {
    if (selectedIds.size < 2) return
    setOptimizing(true)
    setApplied(false)
    try {
      const { data } = await api.post('/routing/optimize', {
        dispatchIds: Array.from(selectedIds),
      })
      setRouteResult(data.data as RouteResult)
    } catch (err) {
      console.error('Route optimization failed', err)
    } finally {
      setOptimizing(false)
    }
  }

  const handleApply = () => {
    setApplied(true)
  }

  const clearRoute = () => {
    setRouteResult(null)
    setApplied(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dispatches</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage technician dispatches and optimize routes</p>
        </div>
      </div>

      {routeResult && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Route className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {applied ? 'Route Applied' : 'Optimized Route'}
                </h3>
              </div>
              <Button variant="ghost" size="sm" onClick={clearRoute}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {(routeResult.totalDistance / 1000).toFixed(1)} km
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {Math.round(routeResult.totalDuration / 60)} min
              </span>
              <span className="flex items-center gap-1">
                <Navigation className="h-4 w-4" /> {routeResult.orderedDispatches.length} stop{routeResult.orderedDispatches.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-1.5">
              {routeResult.origin && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-500">S</span>
                  <span>{routeResult.origin.label}</span>
                </div>
              )}
              {routeResult.orderedDispatches.map((d, i) => (
                <div key={d.id} className="flex items-center gap-2 text-sm">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-xs font-medium text-blue-700 dark:text-blue-400">
                    {i + 1}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {d.booking?.customer?.firstName} {d.booking?.customer?.lastName}
                  </span>
                  <span className="text-gray-400">-</span>
                  <span className="text-gray-500">{d.booking?.service?.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
            {!applied && (
              <div className="mt-3">
                <Button size="sm" onClick={handleApply}>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Apply Route
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1">
              <input
                placeholder="Search dispatches..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-3 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Button
              onClick={handleOptimize}
              disabled={selectedIds.size < 2 || optimizing}
            >
              {optimizing ? (
                <>Optimizing...</>
              ) : (
                <><Route className="h-4 w-4 mr-1.5" /> Optimize Route ({selectedIds.size})</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={8} /></div>
          ) : !dispatches?.length ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Truck className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No dispatches found</p>
              <p className="text-sm mt-1">Dispatches appear when bookings are assigned to technicians</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={dispatches.length > 0 && selectedIds.size === dispatches.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dispatches.map((dispatch) => (
                    <TableRow
                      key={dispatch.id}
                      className={selectedIds.has(dispatch.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(dispatch.id)}
                          onChange={() => toggleSelect(dispatch.id)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {dispatch.booking?.customer?.firstName} {dispatch.booking?.customer?.lastName}
                      </TableCell>
                      <TableCell>{dispatch.booking?.service?.name}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(dispatch.booking?.startTime || dispatch.createdAt, 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {dispatch.assignedTo
                          ? `${dispatch.assignedTo.firstName} ${dispatch.assignedTo.lastName}`
                          : '\u2014'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={dispatch.status} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

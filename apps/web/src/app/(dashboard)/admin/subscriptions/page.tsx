'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Search, CreditCard } from 'lucide-react'

const STATUS_VARIANTS: Record<string, 'success' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'success',
  PAST_DUE: 'secondary',
  CANCELED: 'destructive',
  EXPIRED: 'destructive',
  TRIALING: 'secondary',
}

export default function AdminSubscriptionsPage() {
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [filterPlan, setFilterPlan] = React.useState('')
  const [filterStatus, setFilterStatus] = React.useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscriptions', page],
    queryFn: async () => {
      const { data } = await api.get('/subscriptions', { params: { page, limit: 20 } })
      return data.data as { data: any[]; meta: { total: number; page: number; limit: number; totalPages: number } }
    },
  })

  const filtered = React.useMemo(() => {
    if (!data?.data) return []
    return data.data.filter((sub: any) => {
      if (filterPlan && sub.plan !== filterPlan) return false
      if (filterStatus && sub.status !== filterStatus) return false
      if (search && !sub.tenant?.name?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [data, search, filterPlan, filterStatus])

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage all tenant subscriptions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by tenant name..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              <option value="">All Plans</option>
              <option value="FREE">Free</option>
              <option value="BASIC">Basic</option>
              <option value="PRO">Pro</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PAST_DUE">Past Due</option>
              <option value="CANCELED">Canceled</option>
              <option value="EXPIRED">Expired</option>
              <option value="TRIALING">Trialing</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Billing Cycle</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Period End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-gray-500" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {sub.tenant?.name || 'Unknown'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{sub.plan}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[sub.status] || 'secondary'}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{sub.billingCycle?.toLowerCase()}</TableCell>
                    <TableCell>{formatCurrency(sub.price / 100, 'NGN')}</TableCell>
                    <TableCell>{formatDate(sub.currentPeriodEnd, 'MMM d, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-gray-500">No subscriptions found.</p>
          )}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {(data.meta.page - 1) * data.meta.limit + 1}–{Math.min(data.meta.page * data.meta.limit, data.meta.total)} of {data.meta.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

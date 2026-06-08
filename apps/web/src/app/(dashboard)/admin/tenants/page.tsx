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
import { formatDate } from '@/lib/utils'
import { Search, Building2, Users, CalendarCheck } from 'lucide-react'
import Link from 'next/link'

export default function AdminTenantsPage() {
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants', page],
    queryFn: async () => {
      const { data } = await api.get('/tenants', { params: { page, limit: 20 } })
      return data.data as { data: any[]; meta: { total: number; page: number; limit: number; totalPages: number } }
    },
  })

  const filtered = React.useMemo(() => {
    if (!data?.data) return []
    return data.data.filter((t: any) => {
      if (search && !t.name?.toLowerCase().includes(search.toLowerCase()) && !t.slug?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [data, search])

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenants</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">All registered businesses on the platform</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or slug..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tenant: any) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-accent" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {tenant.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{tenant.slug}</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm">{tenant._count?.users ?? 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CalendarCheck className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm">{tenant._count?.bookings ?? 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(tenant.createdAt, 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/tenants/${tenant.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-gray-500">No tenants found.</p>
          )}
          {data?.meta && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {(data.meta.page - 1) * data.meta.limit + 1}–{Math.min(data.meta.page * data.meta.limit, data.meta.total)} of {data.meta.total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { formatDate, formatPhone } from '@/lib/utils'
import { Search, Plus, ChevronDown, UserPlus, Users, Phone, Mail, Calendar, Download, Upload } from 'lucide-react'
import Link from 'next/link'
import type { Customer } from '@/types'

export default function CustomersPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [search, setSearch] = React.useState('')
  const [tagFilter, setTagFilter] = React.useState('')
  const [page, setPage] = React.useState(1)
  const limit = 20

  React.useEffect(() => { setPage(1) }, [search, tagFilter])
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [importDialogOpen, setImportDialogOpen] = React.useState(false)
  const [csvContent, setCsvContent] = React.useState('')
  const [form, setForm] = React.useState({ firstName: '', lastName: '', email: '', phone: '', notes: '' })

  const handleExport = async () => {
    try {
      const res = await api.get('/customers/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'customers.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      addToast('Customers exported', 'success')
    } catch {
      addToast('Failed to export customers', 'error')
    }
  }

  const importMutation = useMutation({
    mutationFn: async (csv: string) => {
      const { data } = await api.post('/customers/import', { csv })
      return data.data
    },
    onSuccess: (result: { imported: number; updated: number; errors: string[] }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setImportDialogOpen(false)
      setCsvContent('')
      const msg = `Imported ${result.imported}, updated ${result.updated}`
      if (result.errors.length) {
        addToast(`${msg}, errors: ${result.errors.join('; ')}`, 'warning')
      } else {
        addToast(msg, 'success')
      }
    },
    onError: () => addToast('Failed to import customers', 'error'),
  })

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', search, tagFilter, page],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: String(limit) }
      if (search) params.search = search
      if (tagFilter) params.tag = tagFilter
      const { data } = await api.get('/customers', { params })
      return { items: data.data as Customer[], meta: data.meta as { total: number; page: number; limit: number; totalPages: number } }
    },
  })

  const customers = customersData?.items
  const meta = customersData?.meta
  const totalPages = meta?.totalPages ?? 1
  const total = meta?.total ?? 0
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  const { data: allTags } = useQuery({
    queryKey: ['customer-tags'],
    queryFn: async () => {
      const { data } = await api.get('/customers/tags')
      return data.data as string[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const { data } = await api.post('/customers', payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setDialogOpen(false)
      setForm({ firstName: '', lastName: '', email: '', phone: '', notes: '' })
      addToast('Customer created', 'success')
    },
    onError: () => addToast('Failed to create customer', 'error'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your customer base</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" /> Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Customers</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <textarea
                  placeholder="Paste CSV content here..."
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  rows={10}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => importMutation.mutate(csvContent)} disabled={!csvContent.trim() || importMutation.isPending}>
                    {importMutation.isPending ? 'Importing...' : 'Import'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Customer</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  createMutation.mutate(form)
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                  <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                </div>
                <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All tags</option>
              {allTags?.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={6} /></div>
          ) : !customers?.length ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No customers found</p>
              <p className="text-sm mt-1">{search ? 'Try a different search' : 'Add your first customer to get started'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.firstName} {customer.lastName}
                      </TableCell>
                      <TableCell className="text-gray-500">{customer.email || '—'}</TableCell>
                      <TableCell className="text-gray-500">{formatPhone(customer.phone)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {customer.tags?.length ? customer.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">{tag}</Badge>
                          )) : <span className="text-sm text-gray-400">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">{(customer as any)._count?.bookings ?? 0}</span>
                      </TableCell>
                      <TableCell className="text-gray-500">{formatDate(customer.createdAt, 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Link href={`/customers/${customer.id}`}>
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

      {customers && customers.length > 0 && (
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

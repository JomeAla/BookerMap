'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MapPin, Plus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import type { Location } from '@/types'

export default function LocationsSettingsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Location | null>(null)
  const [form, setForm] = React.useState({ name: '', address: '', phone: '', email: '', isActive: true })

  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await api.get('/locations')
      return data.data as Location[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/locations', form)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      setDialogOpen(false)
      resetForm()
      addToast('Location created', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to create location', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch(`/locations/${editing!.id}`, form)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      setDialogOpen(false)
      setEditing(null)
      resetForm()
      addToast('Location updated', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to update location', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/locations/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      addToast('Location deleted', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to delete location', 'error'),
  })

  function resetForm() {
    setForm({ name: '', address: '', phone: '', email: '', isActive: true })
  }

  function openCreate() {
    resetForm()
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(loc: Location) {
    setForm({ name: loc.name, address: loc.address || '', phone: loc.phone || '', email: loc.email || '', isActive: loc.isActive })
    setEditing(loc)
    setDialogOpen(true)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Locations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your business locations</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Location
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">All Locations</CardTitle>
          </div>
          <CardDescription>Locations are used to organize bookings, customers, and team members</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
              <Spinner size="sm" /> Loading locations...
            </div>
          ) : !locations?.length ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No locations yet. Click "Add Location" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-medium">{loc.name}</TableCell>
                    <TableCell className="text-gray-500">{loc.address || '-'}</TableCell>
                    <TableCell className="text-gray-500">{loc.phone || '-'}</TableCell>
                    <TableCell className="text-gray-500">{loc.email || '-'}</TableCell>
                    <TableCell>
                      {loc.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <XCircle className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(loc)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete this location?')) deleteMutation.mutate(loc.id) }}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Location' : 'Add Location'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); editing ? updateMutation.mutate() : createMutation.mutate() }} className="space-y-4">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Active</span>
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner size="sm" /> : editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

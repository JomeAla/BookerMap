'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MapPin, Plus, Pencil, Trash2, CheckCircle2, XCircle, Building2, Phone, Mail, Map, Wrench, Power, PowerOff } from 'lucide-react'
import type { Location, Service } from '@/types'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'

export default function LocationsSettingsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Location | null>(null)
  const [form, setForm] = React.useState({ name: '', address: '', phone: '', email: '', isActive: true })
  const [mapPreview, setMapPreview] = React.useState<{ lat: number; lng: number; displayName: string } | null>(null)
  const [geocoding, setGeocoding] = React.useState(false)

  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await api.get('/locations')
      return data.data as Location[]
    },
  })

  const { data: allServices } = useQuery({
    queryKey: ['all-services-for-locations'],
    queryFn: async () => {
      const { data } = await api.get('/services')
      return data.data as Service[]
    },
  })

  function getServiceCount(locationId: string) {
    return allServices?.filter((s) => s.locationId === locationId).length || 0
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { ...form }
      if (mapPreview) {
        payload.latitude = mapPreview.lat
        payload.longitude = mapPreview.lng
      }
      const { data } = await api.post('/locations', payload)
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
      const payload: any = { ...form }
      if (mapPreview) {
        payload.latitude = mapPreview.lat
        payload.longitude = mapPreview.lng
      }
      const { data } = await api.patch(`/locations/${editing!.id}`, payload)
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

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data } = await api.patch(`/locations/${id}`, { isActive })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      addToast('Location status updated', 'success')
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
    setMapPreview(null)
    setGeocoding(false)
  }

  function openCreate() {
    resetForm()
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(loc: Location) {
    setForm({ name: loc.name, address: loc.address || '', phone: loc.phone || '', email: loc.email || '', isActive: loc.isActive })
    setMapPreview(null)
    setEditing(loc)
    setDialogOpen(true)
  }

  async function geocodeAddress() {
    if (!form.address) return
    setGeocoding(true)
    try {
      const res = await fetch(`${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(form.address)}&limit=1`)
      const results = await res.json()
      if (results.length > 0) {
        setMapPreview({
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon),
          displayName: results[0].display_name,
        })
      } else {
        addToast('Could not geocode address', 'error')
      }
    } catch {
      addToast('Geocoding failed', 'error')
    } finally {
      setGeocoding(false)
    }
  }

  const activeCount = locations?.filter((l) => l.isActive).length || 0
  const totalCount = locations?.length || 0
  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Locations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your business branches and service locations</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Location
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Locations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Locations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
          <Spinner size="sm" /> Loading locations...
        </div>
      ) : !locations?.length ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <MapPin className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No locations yet</p>
            <p className="text-sm mt-1">Add your first business location to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <Card key={loc.id} className={!loc.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{loc.name}</CardTitle>
                    {loc.address && (
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Map className="h-3 w-3" />
                        {loc.address}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant={loc.isActive ? 'default' : 'secondary'}>
                    {loc.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(loc.phone || loc.email) && (
                  <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                    {loc.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        {loc.phone}
                      </div>
                    )}
                    {loc.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        {loc.email}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Wrench className="h-3.5 w-3.5" />
                  <span>{getServiceCount(loc.id)} service{getServiceCount(loc.id) !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(loc)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleMutation.mutate({ id: loc.id, isActive: !loc.isActive })}
                    title={loc.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {loc.isActive ? <PowerOff className="h-4 w-4 text-amber-500" /> : <Power className="h-4 w-4 text-green-500" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { if (confirm(`Delete "${loc.name}"?`)) deleteMutation.mutate(loc.id) }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); setEditing(null) } else { setDialogOpen(true) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Location' : 'Add Location'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); editing ? updateMutation.mutate() : createMutation.mutate() }} className="space-y-4">
            <Input label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <Button type="button" size="sm" variant="outline" onClick={geocodeAddress} disabled={geocoding || !form.address}>
                {geocoding ? <Spinner size="sm" /> : <Map className="h-4 w-4" />}
              </Button>
            </div>
            {mapPreview && (
              <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                <div className="p-2 text-xs text-gray-500 truncate">{mapPreview.displayName}</div>
                <div className="h-40 w-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 text-blue-500 mx-auto" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">({mapPreview.lat.toFixed(4)}, {mapPreview.lng.toFixed(4)})</p>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Active</span>
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); setEditing(null) }}>Cancel</Button>
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

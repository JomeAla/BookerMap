'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils'
import { Plus, Wrench, Clock, DollarSign, FolderOpen, Camera, MapPin, Pencil, Trash2 } from 'lucide-react'
import type { Service, ServiceCategory, Location } from '@/types'

export default function ServicesPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState({ name: '', description: '', duration: 60, price: 0, categoryId: '', locationId: '' })
  const [filterLocationId, setFilterLocationId] = React.useState('')
  const [editService, setEditService] = React.useState<Service | null>(null)
  const [editForm, setEditForm] = React.useState({ name: '', description: '', duration: 60, price: 0, priceType: 'fixed', isActive: true, categoryId: '', locationId: '' })
  const [deleteService, setDeleteService] = React.useState<Service | null>(null)

  const [imageUpload, setImageUpload] = React.useState<{ serviceId: string; file: File | null; preview: string } | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const { data: services, isLoading } = useQuery({
    queryKey: ['services', filterLocationId],
    queryFn: async () => {
      const { data } = await api.get('/services', { params: filterLocationId ? { locationId: filterLocationId } : {} })
      return data.data as Service[]
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data } = await api.get('/service-categories')
      return data.data as ServiceCategory[]
    },
  })

  const { data: locations } = useQuery({
    queryKey: ['locations-for-service-filter'],
    queryFn: async () => {
      const { data } = await api.get('/locations')
      return data.data as Location[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const { data } = await api.post('/services', payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      setDialogOpen(false)
      setForm({ name: '', description: '', duration: 60, price: 0, categoryId: '', locationId: '' })
      addToast('Service created', 'success')
    },
    onError: () => addToast('Failed to create service', 'error'),
  })

  const uploadImageMutation = useMutation({
    mutationFn: async ({ serviceId, imageUrl }: { serviceId: string; imageUrl: string }) => {
      const { data } = await api.patch(`/services/${serviceId}/image`, { imageUrl })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      setImageUpload(null)
      addToast('Image updated', 'success')
    },
    onError: () => addToast('Failed to upload image', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & Partial<typeof editForm>) => {
      const { data } = await api.patch(`/services/${id}`, payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      setEditService(null)
      addToast('Service updated', 'success')
    },
    onError: () => addToast('Failed to update service', 'error'),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data } = await api.patch(`/services/${id}`, { isActive })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
    },
    onError: () => addToast('Failed to toggle service', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/services/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      setDeleteService(null)
      addToast('Service deleted', 'success')
    },
    onError: () => addToast('Failed to delete service', 'error'),
  })

  const openEdit = (service: Service) => {
    setEditService(service)
    setEditForm({
      name: service.name,
      description: service.description || '',
      duration: service.duration,
      price: service.price,
      priceType: service.priceType || 'fixed',
      isActive: service.isActive,
      categoryId: service.categoryId || '',
      locationId: service.locationId || '',
    })
  }

  const grouped = React.useMemo(() => {
    const map: Record<string, Service[]> = { Uncategorized: [] }
    services?.forEach((s) => {
      const catName = s.category?.name || 'Uncategorized'
      if (!map[catName]) map[catName] = []
      map[catName].push(s)
    })
    return map
  }, [services])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      addToast('File too large. Max 2MB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImageUpload((prev) => prev ? { ...prev, file, preview: reader.result as string } : null)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Services</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your service catalog</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={filterLocationId}
            onChange={(e) => setFilterLocationId(e.target.value)}
            placeholder="All locations"
            options={[
              { value: '', label: 'All locations' },
              ...(locations?.map((l) => ({ value: l.id, label: l.name })) || []),
            ]}
          />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Service</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Service</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }} className="space-y-4">
                <Input label="Service Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Duration (min)" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} required />
                  <Input label="Price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
                </div>
                <Select
                  label="Category"
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  placeholder="Select category"
                  options={categories?.map((c) => ({ value: c.id, label: c.name })) || []}
                />
                <Select
                  label="Location"
                  value={form.locationId}
                  onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                  placeholder="All locations"
                  options={[
                    { value: '', label: 'All locations' },
                    ...(locations?.map((l) => ({ value: l.id, label: l.name })) || []),
                  ]}
                />
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>Create</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6"><TableSkeleton rows={6} /></div>
      ) : !services?.length ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <Wrench className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No services yet</p>
            <p className="text-sm mt-1">Add your first service to start accepting bookings</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, categoryServices]) => (
            <Card key={category}>
              <CardHeader className="flex flex-row items-center gap-2">
                <FolderOpen className="h-4 w-4 text-gray-400" />
                <CardTitle className="text-base">{category}</CardTitle>
                <Badge variant="secondary" className="ml-2">{categoryServices.length}</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {categoryServices.map((service) => (
<div key={service.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <button
                          onClick={() => setImageUpload({ serviceId: service.id, file: null, preview: '' })}
                          className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:ring-2 hover:ring-blue-500 transition-all group"
                        >
                          {service.imageUrl ? (
                            <img src={service.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Camera className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <Camera className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                        <div className="space-y-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white">{service.name}</p>
                          {service.description && <p className="text-sm text-gray-500 truncate">{service.description}</p>}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {service.duration} min</span>
                            <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {formatCurrency(service.price)}</span>
                            {service.location && (
                              <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                                <MapPin className="h-3 w-3" /> {service.location.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => toggleMutation.mutate({ id: service.id, isActive: !service.isActive })}
                          disabled={toggleMutation.isPending}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${service.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${service.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(service)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" onClick={() => setDeleteService(service)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {imageUpload && (
        <Dialog open={!!imageUpload} onOpenChange={(open) => { if (!open) setImageUpload(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Service Image</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
              >
                {imageUpload.preview ? (
                  <img src={imageUpload.preview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                ) : (
                  <div className="text-gray-500">
                    <Camera className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Click to select an image</p>
                    <p className="text-xs mt-1">Max 2MB</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setImageUpload(null)}>Cancel</Button>
                <Button
                  type="button"
                  disabled={!imageUpload.preview || uploadImageMutation.isPending}
                  onClick={() => {
                    if (imageUpload.preview) {
                      uploadImageMutation.mutate({ serviceId: imageUpload.serviceId, imageUrl: imageUpload.preview })
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {editService && (
        <Dialog open={!!editService} onOpenChange={(open) => { if (!open) setEditService(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Service</DialogTitle></DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault()
              const { isActive, ...rest } = editForm
              updateMutation.mutate({ id: editService.id, ...rest, isActive })
            }} className="space-y-4">
              <Input label="Service Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
              <Input label="Description" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Duration (min)" type="number" value={editForm.duration} onChange={(e) => setEditForm({ ...editForm, duration: Number(e.target.value) })} required />
                <Input label="Price" type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} required />
              </div>
              <Select
                label="Pricing Type"
                value={editForm.priceType}
                onChange={(e) => setEditForm({ ...editForm, priceType: e.target.value })}
                options={[
                  { value: 'fixed', label: 'Fixed' },
                  { value: 'hourly', label: 'Hourly' },
                  { value: 'variable', label: 'Variable' },
                ]}
              />
              <Select
                label="Category"
                value={editForm.categoryId}
                onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                placeholder="Select category"
                options={categories?.map((c) => ({ value: c.id, label: c.name })) || []}
              />
              <Select
                label="Location"
                value={editForm.locationId}
                onChange={(e) => setEditForm({ ...editForm, locationId: e.target.value })}
                placeholder="All locations"
                options={[
                  { value: '', label: 'All locations' },
                  ...(locations?.map((l) => ({ value: l.id, label: l.name })) || []),
                ]}
              />
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setEditService(null)}>Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending}>Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {deleteService && (
        <Dialog open={!!deleteService} onOpenChange={(open) => { if (!open) setDeleteService(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Delete Service</DialogTitle></DialogHeader>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">{deleteService.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setDeleteService(null)}>Cancel</Button>
              <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteService.id)}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

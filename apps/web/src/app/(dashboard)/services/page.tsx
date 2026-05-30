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
import { Plus, Wrench, Clock, DollarSign, FolderOpen, Camera } from 'lucide-react'
import type { Service, ServiceCategory } from '@/types'

export default function ServicesPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState({ name: '', description: '', duration: 60, price: 0, categoryId: '' })

  const [imageUpload, setImageUpload] = React.useState<{ serviceId: string; file: File | null; preview: string } | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const { data: services, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await api.get('/services')
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

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const { data } = await api.post('/services', payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      setDialogOpen(false)
      setForm({ name: '', description: '', duration: 60, price: 0, categoryId: '' })
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
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
                      <div className="flex items-center gap-4">
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
                        <div className="space-y-1">
                          <p className="font-medium text-gray-900 dark:text-white">{service.name}</p>
                          {service.description && <p className="text-sm text-gray-500">{service.description}</p>}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {service.duration} min</span>
                            <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {formatCurrency(service.price)}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={service.isActive ? 'default' : 'secondary'}>{service.isActive ? 'Active' : 'Inactive'}</Badge>
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
    </div>
  )
}

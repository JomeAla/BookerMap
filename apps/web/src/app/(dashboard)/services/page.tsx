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
import { Plus, Wrench, Clock, DollarSign, FolderOpen } from 'lucide-react'
import type { Service, ServiceCategory } from '@/types'

export default function ServicesPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState({ name: '', description: '', duration: 60, price: 0, categoryId: '' })

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

  const grouped = React.useMemo(() => {
    const map: Record<string, Service[]> = { Uncategorized: [] }
    services?.forEach((s) => {
      const catName = s.category?.name || 'Uncategorized'
      if (!map[catName]) map[catName] = []
      map[catName].push(s)
    })
    return map
  }, [services])

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
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900 dark:text-white">{service.name}</p>
                        {service.description && <p className="text-sm text-gray-500">{service.description}</p>}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {service.duration} min</span>
                          <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {formatCurrency(service.price)}</span>
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
    </div>
  )
}

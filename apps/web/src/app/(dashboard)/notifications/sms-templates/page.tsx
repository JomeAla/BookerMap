'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { Plus, MessageSquare, Trash2, Save, ToggleLeft, ToggleRight, Sparkles, Pencil } from 'lucide-react'
import type { SmsTemplate } from '@/types'

const TEMPLATE_TYPES = [
  { value: 'BOOKING_CONFIRMATION', label: 'Booking Confirmation' },
  { value: 'BOOKING_REMINDER', label: 'Booking Reminder' },
  { value: 'EN_ROUTE', label: 'En Route Notification' },
  { value: 'CUSTOM', label: 'Custom' },
]

const VARIABLE_HELP: Record<string, string[]> = {
  BOOKING_CONFIRMATION: ['{{serviceName}}', '{{startTime}}', '{{bookingId}}'],
  BOOKING_REMINDER: ['{{serviceName}}', '{{startTime}}', '{{address}}'],
  EN_ROUTE: ['{{technicianName}}', '{{eta}}'],
  CUSTOM: [],
}

type EditState = { id: string; name: string; body: string } | null

export default function SmsTemplatesPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showForm, setShowForm] = React.useState(false)
  const [form, setForm] = React.useState({ type: 'BOOKING_CONFIRMATION', name: '', body: '' })
  const [editState, setEditState] = React.useState<EditState>(null)

  const { data: templates, isLoading } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/sms-templates')
      return data.data as SmsTemplate[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (dto: { type: string; name: string; body: string }) => {
      const { data } = await api.post('/notifications/sms-templates', dto)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] })
      setShowForm(false)
      setForm({ type: 'BOOKING_CONFIRMATION', name: '', body: '' })
      addToast('SMS template created', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to create template', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: { name?: string; body?: string } }) => {
      const { data } = await api.put(`/notifications/sms-templates/${id}`, dto)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] })
      setEditState(null)
      addToast('SMS template updated', 'success')
    },
    onError: () => addToast('Failed to update template', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await api.delete(`/notifications/sms-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] })
      addToast('SMS template deleted', 'success')
    },
    onError: () => addToast('Failed to delete template', 'error'),
  })

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => await api.patch(`/notifications/sms-templates/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sms-templates'] }),
    onError: () => addToast('Failed to toggle template', 'error'),
  })

  const seedMutation = useMutation({
    mutationFn: async () => await api.post('/notifications/sms-templates/seed-defaults'),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] })
      addToast(`Seeded ${res.data?.created ?? 0} default templates`, 'success')
    },
    onError: () => addToast('Failed to seed defaults', 'error'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editState) return
    updateMutation.mutate({ id: editState.id, dto: { name: editState.name, body: editState.body } })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SMS Templates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Reusable message templates with <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">{'{{variables}}'}</code> placeholders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            <Sparkles className="h-4 w-4 mr-2" /> Seed Defaults
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" /> New Template
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create SMS Template</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
              <Select
                label="Type"
                value={form.type}
                onChange={(e) => {
                  const type = e.target.value
                  setForm({ ...form, type, name: TEMPLATE_TYPES.find((t) => t.value === type)?.label || '' })
                }}
                options={TEMPLATE_TYPES}
              />
              <Input
                label="Name"
                placeholder="Booking Confirmation Template"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message Body</label>
                <textarea
                  placeholder="Booking Confirmed! {{serviceName}} on {{startTime}}. Ref: {{bookingId}}"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  required
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500">{(form.body || '').length} / 1600 characters</p>
                {VARIABLE_HELP[form.type]?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {VARIABLE_HELP[form.type].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setForm({ ...form, body: form.body + ' ' + v })}
                        className="text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={createMutation.isPending}>Create Template</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? <Spinner /> : !templates?.length ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No SMS templates</p>
            <p className="text-sm mt-1">Create custom templates or seed the defaults to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                {editState?.id === t.id ? (
                  <form onSubmit={handleEditSubmit} className="space-y-3">
                    <Input
                      label="Name"
                      value={editState.name}
                      onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                      required
                    />
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message Body</label>
                      <textarea
                        value={editState.body}
                        onChange={(e) => setEditState({ ...editState, body: e.target.value })}
                        rows={3}
                        required
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                        <Save className="h-4 w-4 mr-1" /> Save
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditState(null)}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white">{t.name}</span>
                          <Badge variant="outline" className="text-xs">{t.type}</Badge>
                          <Badge variant={t.isActive ? 'success' : 'secondary'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 break-words">{t.body}</p>
                        <p className="text-xs text-gray-400 mt-1">Updated {formatDate(t.updatedAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => toggleMutation.mutate(t.id)} title={t.isActive ? 'Deactivate' : 'Activate'}>
                        {t.isActive
                          ? <ToggleRight className="h-5 w-5 text-green-500" />
                          : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditState({ id: t.id, name: t.name, body: t.body })} title="Edit">
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(t.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
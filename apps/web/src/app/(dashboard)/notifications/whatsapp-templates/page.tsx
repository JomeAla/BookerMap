'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { Plus, MessageCircle, Trash2, Save, ToggleLeft, ToggleRight, Pencil } from 'lucide-react'
import type { WhatsAppTemplate } from '@/types'

const CATEGORIES = [
  { value: 'UTILITY', label: 'Utility' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'AUTHENTICATION', label: 'Authentication' },
]

type EditState = { id: string; templateName: string; body: string; language: string; category: string; paramKeys: string } | null

export default function WhatsAppTemplatesPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showForm, setShowForm] = React.useState(false)
  const [form, setForm] = React.useState({ templateName: '', body: '', language: 'en', category: 'UTILITY', paramKeys: '' })
  const [editState, setEditState] = React.useState<EditState>(null)

  const { data: templates, isLoading } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/whatsapp-templates')
      return data.data as WhatsAppTemplate[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (dto: { templateName: string; body: string; language: string; category: string; paramKeys: string[] }) => {
      const { data } = await api.post('/notifications/whatsapp-templates', dto)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] })
      setShowForm(false)
      setForm({ templateName: '', body: '', language: 'en', category: 'UTILITY', paramKeys: '' })
      addToast('WhatsApp template created', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to create template', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: { templateName?: string; body?: string; language?: string; category?: string; paramKeys?: string[] } }) => {
      const { data } = await api.put(`/notifications/whatsapp-templates/${id}`, dto)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] })
      setEditState(null)
      addToast('WhatsApp template updated', 'success')
    },
    onError: () => addToast('Failed to update template', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await api.delete(`/notifications/whatsapp-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] })
      addToast('WhatsApp template deleted', 'success')
    },
    onError: () => addToast('Failed to delete template', 'error'),
  })

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => await api.patch(`/notifications/whatsapp-templates/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] }),
    onError: () => addToast('Failed to toggle template', 'error'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      paramKeys: form.paramKeys.split(',').map((k) => k.trim()).filter(Boolean),
    })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editState) return
    updateMutation.mutate({
      id: editState.id,
      dto: {
        templateName: editState.templateName,
        body: editState.body,
        language: editState.language,
        category: editState.category,
        paramKeys: editState.paramKeys.split(',').map((k) => k.trim()).filter(Boolean),
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WhatsApp Templates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage Meta-approved WhatsApp message templates with <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">{'{{1}} {{2}}'}</code> placeholders
          </p>
        </div>
        <div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" /> New Template
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create WhatsApp Template</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
              <Input
                label="Template Name"
                placeholder="booking_confirmation"
                value={form.templateName}
                onChange={(e) => setForm({ ...form, templateName: e.target.value })}
                required
              />
              <Select
                label="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                options={CATEGORIES}
              />
              <Input
                label="Language"
                placeholder="en"
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Template Body</label>
                <textarea
                  placeholder="Hi {{1}}, your booking {{2}} is confirmed!"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  required
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500">{(form.body || '').length} / 4096 characters</p>
              </div>
              <Input
                label="Parameter Keys (comma-separated)"
                placeholder="customerName, bookingId, serviceName"
                value={form.paramKeys}
                onChange={(e) => setForm({ ...form, paramKeys: e.target.value })}
              />
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
            <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No WhatsApp templates</p>
            <p className="text-sm mt-1">Add templates that correspond to Meta-approved WhatsApp template names</p>
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
                      label="Template Name"
                      value={editState.templateName}
                      onChange={(e) => setEditState({ ...editState, templateName: e.target.value })}
                      required
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label="Category"
                        value={editState.category}
                        onChange={(e) => setEditState({ ...editState, category: e.target.value })}
                        options={CATEGORIES}
                      />
                      <Input
                        label="Language"
                        value={editState.language}
                        onChange={(e) => setEditState({ ...editState, language: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Template Body</label>
                      <textarea
                        value={editState.body}
                        onChange={(e) => setEditState({ ...editState, body: e.target.value })}
                        rows={3}
                        required
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                      />
                    </div>
                    <Input
                      label="Parameter Keys (comma-separated)"
                      value={editState.paramKeys}
                      onChange={(e) => setEditState({ ...editState, paramKeys: e.target.value })}
                    />
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
                      <div className="h-10 w-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white">{t.templateName}</span>
                          <Badge variant="outline" className="text-xs">{t.category}</Badge>
                          <Badge variant={t.isActive ? 'success' : 'secondary'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 break-words">{t.body}</p>
                        {t.paramKeys?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {t.paramKeys.map((k) => (
                              <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{k}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">Updated {formatDate(t.updatedAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => toggleMutation.mutate(t.id)} title={t.isActive ? 'Deactivate' : 'Activate'}>
                        {t.isActive
                          ? <ToggleRight className="h-5 w-5 text-green-500" />
                          : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditState({ id: t.id, templateName: t.templateName, body: t.body, language: t.language, category: t.category, paramKeys: (t.paramKeys || []).join(', ') })} title="Edit">
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

'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { timeAgo } from '@/lib/utils'
import { Webhook as WebhookIcon, Plus, Copy, Edit2, Trash2, Play, Loader2, Terminal } from 'lucide-react'
import type { Webhook } from '@/types'

const WEBHOOK_EVENTS = [
  'booking.created',
  'booking.updated',
  'booking.canceled',
  'booking.completed',
  'customer.created',
  'customer.updated',
  'invoice.created',
  'invoice.paid',
  'invoice.overdue',
  'payment.completed',
  'payment.failed',
  'review.created',
  'review.updated',
]

const WEBHOOK_ACTIONS = [
  { value: 'trigger_ai', label: 'Trigger AI Agent', description: 'Send a message to the AI agent and get a response' },
  { value: 'check_availability', label: 'Check Availability', description: 'Check available time slots for a service and date' },
  { value: 'create_booking', label: 'Create Booking', description: 'Create a new booking' },
  { value: 'get_booking_status', label: 'Get Booking Status', description: 'Check a booking status by ID or reference' },
  { value: 'get_customer_info', label: 'Get Customer Info', description: 'Look up customer by phone or email' },
]

export default function WebhooksPage() {
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const { data } = await api.get('/webhooks')
      return data.data as Webhook[]
    },
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<Webhook | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Webhook | null>(null)
  const [form, setForm] = React.useState({ name: '', url: '', events: [] as string[], isActive: true })
  const [createdSecret, setCreatedSecret] = React.useState<string | null>(null)

  const resetForm = React.useCallback(() => {
    setForm({ name: '', url: '', events: [], isActive: true })
    setCreatedSecret(null)
    setEditTarget(null)
  }, [])

  const openCreate = React.useCallback(() => {
    resetForm()
    setDialogOpen(true)
  }, [resetForm])

  const openEdit = React.useCallback((webhook: Webhook) => {
    setForm({ name: webhook.name, url: webhook.url, events: webhook.events, isActive: webhook.isActive })
    setEditTarget(webhook)
    setCreatedSecret(null)
    setDialogOpen(true)
  }, [])

  const closeDialog = React.useCallback(() => {
    setDialogOpen(false)
    resetForm()
  }, [resetForm])

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/webhooks', form)
      return data.data as Webhook
    },
    onSuccess: (webhook) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setCreatedSecret(webhook.secret)
      addToast('Webhook created', 'success')
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to create webhook', 'error')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch(`/webhooks/${editTarget!.id}`, form)
      return data.data as Webhook
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      closeDialog()
      addToast('Webhook updated', 'success')
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to update webhook', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/webhooks/${deleteTarget!.id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setDeleteTarget(null)
      addToast('Webhook deleted', 'success')
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to delete webhook', 'error')
    },
  })

  const testMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const { data } = await api.post('/webhooks/test', { webhookId })
      return data
    },
    onSuccess: (response) => {
      addToast(response.message || 'Test sent successfully', response.success ? 'success' : 'warning')
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Test failed', 'error')
    },
  })

  const toggleActive = useMutation({
    mutationFn: async (webhook: Webhook) => {
      const { data } = await api.patch(`/webhooks/${webhook.id}`, { isActive: !webhook.isActive })
      return data.data as Webhook
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
    onError: (err: any) => {
      addToast(err.response?.data?.message || 'Failed to toggle status', 'error')
    },
  })

  const toggleEvent = (event: string) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }))
  }

  const isEditing = editTarget !== null
  const isPending = createMutation.isPending || updateMutation.isPending

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Webhooks</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage webhook endpoints for event notifications
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Webhook
        </Button>
      </div>

      {!webhooks || webhooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <WebhookIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-white">No webhooks configured</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Add a webhook to receive real-time event notifications
            </p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Add Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-gray-500" title={webhook.url}>
                      {webhook.url}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {webhook.events.slice(0, 3).map((event) => (
                          <Badge key={event} variant="outline" className="text-[10px]">
                            {event}
                          </Badge>
                        ))}
                        {webhook.events.length > 3 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{webhook.events.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={webhook.isActive ? 'success' : 'secondary'}>
                        {webhook.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {webhook.lastTriggeredAt ? timeAgo(webhook.lastTriggeredAt) : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(webhook)} title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => testMutation.mutate(webhook.id)}
                          disabled={testMutation.isPending}
                          title="Test"
                        >
                          {testMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActive.mutate(webhook)}
                          disabled={toggleActive.isPending}
                          title={webhook.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {webhook.isActive ? (
                            <Play className="h-4 w-4 text-green-600" />
                          ) : (
                            <Play className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(webhook)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Webhook' : 'Add Webhook'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (isEditing) {
                updateMutation.mutate()
              } else {
                createMutation.mutate()
              }
            }}
            className="space-y-4"
          >
            <Input
              label="Name"
              placeholder="e.g. Slack Notifications"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="URL"
              placeholder="https://hooks.example.com/webhook"
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              required
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Events</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                {WEBHOOK_EVENTS.map((event) => (
                  <label
                    key={event}
                    className="flex items-center gap-2 text-sm cursor-pointer text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <input
                      type="checkbox"
                      checked={form.events.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active
              </label>
            </div>

            {(createdSecret || (isEditing && editTarget?.secret)) && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Secret</label>
                <div className="flex gap-2">
                  <input
                    value={createdSecret || editTarget?.secret || ''}
                    readOnly
                    className="flex-1 h-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-1 text-sm font-mono text-gray-500"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(createdSecret || editTarget?.secret || '')
                      addToast('Secret copied to clipboard', 'success')
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || form.events.length === 0}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {isEditing ? 'Save Changes' : 'Create Webhook'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Webhook</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ExternalWebhookSection />
    </div>
  )
}

function ExternalWebhookSection() {
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = React.useState<'docs' | 'test'>('docs')
  const [selectedAction, setSelectedAction] = React.useState(WEBHOOK_ACTIONS[0].value)
  const [payloadText, setPayloadText] = React.useState('{\n  "message": "Book a service for tomorrow at 10am"\n}')
  const [responseText, setResponseText] = React.useState<string | null>(null)
  const [testLoading, setTestLoading] = React.useState(false)
  const [webhookSecret, setWebhookSecret] = React.useState('')
  const [tenantSlug, setTenantSlug] = React.useState('')

  const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/webhooks/external`

  const getActionPayload = (action: string) => {
    switch (action) {
      case 'trigger_ai':
        return '{\n  "message": "Book a service for tomorrow at 10am"\n}'
      case 'check_availability':
        return '{\n  "serviceId": "SERVICE_ID",\n  "date": "2026-06-15"\n}'
      case 'create_booking':
        return '{\n  "serviceId": "SERVICE_ID",\n  "startTime": "2026-06-15T10:00:00.000Z",\n  "customerPhone": "+2348012345678",\n  "customerFirstName": "John",\n  "customerLastName": "Doe"\n}'
      case 'get_booking_status':
        return '{\n  "bookingId": "BOOKING_ID"\n}'
      case 'get_customer_info':
        return '{\n  "phone": "+2348012345678"\n}'
      default:
        return '{}'
    }
  }

  const handleActionChange = (action: string) => {
    setSelectedAction(action)
    setPayloadText(getActionPayload(action))
    setResponseText(null)
  }

  const handleSendTest = async () => {
    if (!webhookSecret || !tenantSlug) {
      addToast('Please fill in webhook secret and tenant slug', 'error')
      return
    }

    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(payloadText)
    } catch {
      addToast('Invalid JSON payload', 'error')
      return
    }

    setTestLoading(true)
    setResponseText(null)

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': webhookSecret,
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({ action: selectedAction, payload }),
      })
      const data = await res.json()
      setResponseText(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setResponseText(JSON.stringify({ success: false, message: err.message }, null, 2))
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">External Webhook Triggers</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Allow external services to trigger AI actions via webhook. Use the endpoint below to send actions programmatically.
        </p>

        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3 py-1.5 text-sm font-medium rounded-t transition ${
              activeTab === 'docs'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Documentation
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-3 py-1.5 text-sm font-medium rounded-t transition ${
              activeTab === 'test'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Test Tool
          </button>
        </div>

        {activeTab === 'docs' && (
          <div className="space-y-3 text-sm">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Endpoint</h3>
              <code className="block mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs break-all">
                POST {webhookUrl}
              </code>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Required Headers</h3>
              <div className="mt-1 space-y-1">
                <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                  x-webhook-secret: your-webhook-secret
                </code>
                <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                  x-tenant-slug: your-tenant-slug
                </code>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Request Body</h3>
              <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">{`{
  "action": "trigger_ai | check_availability | create_booking | get_booking_status | get_customer_info",
  "payload": { ... }
}`}</pre>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Available Actions</h3>
              <div className="mt-1 space-y-2">
                {WEBHOOK_ACTIONS.map((act) => (
                  <div key={act.value} className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                    <span className="font-mono text-xs font-medium text-blue-600 dark:text-blue-400">{act.value}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{act.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'test' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Tenant Slug"
                placeholder="your-tenant-slug"
                value={tenantSlug}
                onChange={e => setTenantSlug(e.target.value)}
              />
              <Input
                label="Webhook Secret"
                placeholder="your-webhook-secret"
                type="password"
                value={webhookSecret}
                onChange={e => setWebhookSecret(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Action</label>
              <select
                value={selectedAction}
                onChange={e => handleActionChange(e.target.value)}
                className="mt-1 w-full h-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm"
              >
                {WEBHOOK_ACTIONS.map(act => (
                  <option key={act.value} value={act.value}>{act.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Payload (JSON)</label>
              <textarea
                value={payloadText}
                onChange={e => setPayloadText(e.target.value)}
                rows={6}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-mono"
              />
            </div>

            <Button onClick={handleSendTest} disabled={testLoading}>
              {testLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Send Test Request
            </Button>

            {responseText && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Response</label>
                <pre className="mt-1 p-3 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto">
                  {responseText}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

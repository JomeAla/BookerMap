'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Webhook, Plus, Pencil, Trash2, Send, CheckCircle2, XCircle, Key } from 'lucide-react'
import type { Webhook as WebhookType } from '@/types'

const ALL_EVENTS = [
  'booking.created',
  'booking.updated',
  'booking.cancelled',
  'booking.rescheduled',
  'customer.created',
  'customer.updated',
  'invoice.created',
  'invoice.paid',
  'invoice.overdue',
  'payment.completed',
  'payment.failed',
  'payment.refunded',
]

export default function WebhooksSettingsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<WebhookType | null>(null)
  const [form, setForm] = React.useState({ url: '', events: [] as string[], secret: '' })
  const [showSecret, setShowSecret] = React.useState(false)

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const { data } = await api.get('/webhooks')
      return data.data as WebhookType[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { url: form.url, events: form.events }
      if (form.secret) payload.secret = form.secret
      const { data } = await api.post('/webhooks', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setDialogOpen(false)
      resetForm()
      addToast('Webhook created', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to create webhook', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch(`/webhooks/${editing!.id}`, {
        url: form.url,
        events: form.events,
        ...(form.secret ? { secret: form.secret } : {}),
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setDialogOpen(false)
      setEditing(null)
      resetForm()
      addToast('Webhook updated', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to update webhook', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/webhooks/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      addToast('Webhook deleted', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to delete webhook', 'error'),
  })

  const testMutation = useMutation({
    mutationFn: async ({ webhookId, event }: { webhookId: string; event: string }) => {
      const { data } = await api.post('/webhooks/test', { webhookId, event })
      return data.data as { message: string; event: string; url: string }
    },
    onSuccess: (result) => {
      addToast(`Test sent to ${result.url}`, 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Test failed', 'error'),
  })

  function resetForm() {
    setForm({ url: '', events: [], secret: '' })
    setShowSecret(false)
  }

  function openCreate() {
    resetForm()
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(wh: WebhookType) {
    setForm({ url: wh.url, events: [...wh.events], secret: '' })
    setEditing(wh)
    setDialogOpen(true)
  }

  function toggleEvent(event: string) {
    setForm((f) => ({
      ...f,
      events: f.events.includes(event)
        ? f.events.filter((e) => e !== event)
        : [...f.events, event],
    }))
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Webhooks</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Send real-time event notifications to external URLs
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Webhook
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">All Webhooks</CardTitle>
          </div>
          <CardDescription>
            Each webhook is dispatched with HMAC-SHA256 signature header <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">X-Webhook-Signature</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
              <Spinner size="sm" /> Loading webhooks...
            </div>
          ) : !webhooks?.length ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No webhooks yet. Click "Add Webhook" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((wh) => (
                  <TableRow key={wh.id}>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs">
                      {wh.url}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {wh.events.slice(0, 3).map((ev) => (
                          <span key={ev} className="inline-flex text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                            {ev}
                          </span>
                        ))}
                        {wh.events.length > 3 && (
                          <span className="text-xs text-gray-400">+{wh.events.length - 3}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {wh.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <XCircle className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {wh.lastTriggeredAt
                        ? new Date(wh.lastTriggeredAt).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            testMutation.mutate({
                              webhookId: wh.id,
                              event: wh.events[0],
                            })
                          }
                          disabled={testMutation.isPending || !wh.isActive}
                          title="Send test"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(wh)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Delete this webhook?'))
                              deleteMutation.mutate(wh.id)
                          }}
                        >
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Webhook' : 'Add Webhook'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!form.events.length) {
                addToast('Select at least one event', 'error')
                return
              }
              editing ? updateMutation.mutate() : createMutation.mutate()
            }}
            className="space-y-4"
          >
            <Input
              label="Payload URL"
              type="url"
              placeholder="https://example.com/webhook"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              required
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Events <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                {ALL_EVENTS.map((event) => (
                  <label
                    key={event}
                    className="flex items-center gap-2 text-sm cursor-pointer px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={form.events.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-mono text-xs">{event}</span>
                  </label>
                ))}
              </div>
              {form.events.length === 0 && (
                <p className="text-xs text-amber-600">Select at least one event</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Key className="h-3.5 w-3.5" />
                Secret (optional)
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {showSecret ? 'Hide' : 'Show'}
                </button>
              </label>
              <input
                type={showSecret ? 'text' : 'password'}
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                placeholder="Leave blank to auto-generate"
                className="flex h-9 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-mono"
              />
              <p className="text-xs text-gray-400">
                Used to sign webhook payloads via HMAC-SHA256
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
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

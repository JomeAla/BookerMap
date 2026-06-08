'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { Send, Plus, Trash2, Eye, MessageSquare, Users, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

interface Campaign {
  id: string
  name: string
  message: string
  segment: any
  recipientCount: number
  sentCount: number
  failedCount: number
  totalCost: number
  status: string
  scheduledAt: string | null
  completedAt: string | null
  createdAt: string
  createdById: string | null
  createdBy?: { id: string; firstName: string; lastName: string } | null
  _count?: { recipients: number }
}

interface Recipient {
  id: string
  phone: string
  status: string
  sentAt: string | null
  errorMessage: string | null
  customer?: { id: string; firstName: string; lastName: string; phone: string } | null
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  SENDING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const recipientStatusColors: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  SENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default function BulkSmsPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showCreate, setShowCreate] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['bulk-sms-campaigns'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/bulk-sms')
      return (data.data as Campaign[]) ?? []
    },
  })

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['bulk-sms-campaign', selectedId],
    queryFn: async () => {
      const { data } = await api.get(`/notifications/bulk-sms/${selectedId}`)
      return data.data as Campaign & { recipients: Recipient[] }
    },
    enabled: !!selectedId,
  })

  const createMutation = useMutation({
    mutationFn: async (dto: { name: string; message: string; segment?: any }) => {
      const { data } = await api.post('/notifications/bulk-sms', dto)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulk-sms-campaigns'] })
      setShowCreate(false)
      addToast('Campaign created', 'success')
    },
    onError: () => {
      addToast('Failed to create campaign', 'error')
    },
  })

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/notifications/bulk-sms/${id}/send`)
      return data.data
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bulk-sms-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['bulk-sms-campaign', selectedId] })
      addToast(`Campaign sent: ${result.sentCount} delivered, ${result.failedCount} failed`, 'success')
    },
    onError: () => {
      addToast('Failed to send campaign', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/bulk-sms/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulk-sms-campaigns'] })
      addToast('Campaign deleted', 'success')
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (selectedId && detail) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{detail.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {detail.recipientCount} recipients &middot; <span className={statusColors[detail.status]?.split(' ')[1] || ''}>{detail.status}</span>
            </p>
          </div>
          {detail.status === 'DRAFT' && (
            <Button
              size="sm"
              onClick={() => sendMutation.mutate(detail.id)}
              disabled={sendMutation.isPending}
              className="ml-auto"
            >
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Send Campaign
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Message</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{detail.message}</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{detail.recipientCount}</p>
                <p className="text-xs text-gray-500">Recipients</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{detail.sentCount}</p>
                <p className="text-xs text-gray-500">Delivered</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{detail.failedCount}</p>
                <p className="text-xs text-gray-500">Failed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{detail.totalCost.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Cost (credits)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recipient Delivery Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Phone</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.recipients.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3 text-gray-700 dark:text-gray-300">
                        {r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : '—'}
                      </td>
                      <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{r.phone}</td>
                      <td className="py-2 px-3">
                        <Badge className={recipientStatusColors[r.status] || ''}>{r.status}</Badge>
                      </td>
                      <td className="py-2 px-3 text-red-500 dark:text-red-400 text-xs">{r.errorMessage || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk SMS Campaigns</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create and send SMS campaigns to your customers
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Campaign
        </Button>
      </div>

      {(!campaigns || campaigns.length === 0) ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No campaigns yet. Create your first one!</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Recipients</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Sent / Failed</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Created</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{c.name}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{c.recipientCount}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        <span className="text-emerald-600">{c.sentCount}</span>
                        {' / '}
                        <span className="text-red-600">{c.failedCount}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={statusColors[c.status] || ''}>{c.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">{timeAgo(c.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedId(c.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {c.status === 'DRAFT' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => sendMutation.mutate(c.id)}
                                disabled={sendMutation.isPending}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(c.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New SMS Campaign</DialogTitle>
          </DialogHeader>
          <CreateCampaignForm
            onSubmit={(dto) => createMutation.mutate(dto)}
            loading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CreateCampaignForm({ onSubmit, loading }: { onSubmit: (dto: { name: string; message: string; segment?: any }) => void; loading: boolean }) {
  const [name, setName] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [segmentType, setSegmentType] = React.useState<'ALL' | 'TAG' | 'RECENT'>('ALL')
  const [tag, setTag] = React.useState('')
  const [days, setDays] = React.useState('30')

  const estimatedSegments = Math.ceil(message.length / 160) || 1

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !message.trim()) return

    const segment = segmentType === 'ALL'
      ? undefined
      : segmentType === 'TAG'
        ? { type: 'TAG', tag }
        : { type: 'RECENT', days: parseInt(days) || 30 }

    onSubmit({ name: name.trim(), message: message.trim(), segment })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Campaign Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Weekend Promo"
          required
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your SMS message..."
          required
          rows={4}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">{message.length}/1600</span>
          <span className="text-xs text-gray-400">{estimatedSegments} SMS segment{estimatedSegments > 1 ? 's' : ''} per recipient</span>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Target Segment</label>
        <select
          value={segmentType}
          onChange={(e) => setSegmentType(e.target.value as any)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Customers</option>
          <option value="TAG">By Tag</option>
          <option value="RECENT">Recent Customers</option>
        </select>
      </div>

      {segmentType === 'TAG' && (
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Customer Tag</label>
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="e.g. vip, repeat"
            required
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {segmentType === 'RECENT' && (
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Customers from last N days</label>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            min="1"
            max="365"
            required
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading || !name.trim() || !message.trim()}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
          Create Draft
        </Button>
      </div>
    </form>
  )
}

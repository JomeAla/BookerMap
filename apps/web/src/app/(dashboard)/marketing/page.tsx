'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Megaphone, Play, Plus, Eye, Trash2 } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  subject: string
  body: string
  triggerDays: number
  discountPercent: number | null
  isActive: boolean
  sentCount: number
  lastSentAt: string | null
  createdAt: string
}

export default function MarketingPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showCreate, setShowCreate] = React.useState(false)
  const [lapsedDays, setLapsedDays] = React.useState('30')
  const [lapsedPreview, setLapsedPreview] = React.useState<any[] | null>(null)

  const formDefaults = { name: '', subject: '', body: '', triggerDays: 30, discountPercent: '', isActive: true }
  const [form, setForm] = React.useState(formDefaults)

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: async () => {
      const { data } = await api.get('/marketing/campaigns')
      return data.data as Campaign[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (dto: any) => {
      const { data } = await api.post('/marketing/campaigns', dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] })
      setShowCreate(false)
      setForm(formDefaults)
      addToast('Campaign created', 'success')
    },
    onError: () => addToast('Failed to create campaign', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/marketing/campaigns/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] })
      addToast('Campaign deleted', 'success')
    },
    onError: () => addToast('Failed to delete campaign', 'error'),
  })

  const runMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/marketing/campaigns/${id}/run`)
      return data
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] })
      addToast(`Campaign sent to ${result.data?.sent || 0} customers`, 'success')
    },
    onError: () => addToast('Failed to run campaign', 'error'),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.put(`/marketing/campaigns/${id}`, { isActive })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] })
    },
  })

  const previewLapsed = async () => {
    try {
      const { data } = await api.get('/marketing/lapsed', { params: { days: lapsedDays } })
      setLapsedPreview(data.data as any[])
    } catch {
      addToast('Failed to fetch lapsed customers', 'error')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      name: form.name,
      subject: form.subject,
      body: form.body,
      triggerDays: Number(form.triggerDays),
      discountPercent: form.discountPercent ? Number(form.discountPercent) : undefined,
      isActive: form.isActive,
    })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marketing Campaigns</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Automated email campaigns to re-engage customers
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Campaign Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Input
                label="Email Subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                required
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Body (HTML)</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={8}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  placeholder={'<p>Hi {{firstName}},</p><p>We miss you! Use code {{discountCode}} for {{discount}} off.</p>'}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Days Since Last Booking"
                  type="number"
                  value={form.triggerDays}
                  onChange={(e) => setForm({ ...form, triggerDays: Number(e.target.value) })}
                  min={1}
                  required
                />
                <Input
                  label="Discount % (optional)"
                  type="number"
                  value={form.discountPercent}
                  onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                  min={1}
                  max={100}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Active
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 mb-6">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Preview Lapsed Customers</h2>
        </div>
        <div className="p-4 flex items-center gap-3">
          <Input
            label="Days since last booking"
            type="number"
            value={lapsedDays}
            onChange={(e) => setLapsedDays(e.target.value)}
            min={1}
            className="w-40"
          />
          <Button variant="outline" onClick={previewLapsed} className="mt-5">
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
        </div>
        {lapsedPreview && (
          <div className="px-4 pb-4">
            <p className="text-sm text-gray-500 mb-2">{lapsedPreview.length} customer{lapsedPreview.length !== 1 ? 's' : ''} found</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {lapsedPreview.map((c: any) => (
                <div key={c.id} className="text-xs text-gray-600 dark:text-gray-400">
                  {c.firstName} {c.lastName} — {c.email} — Last booking: {c.bookings?.[0]?.startTime ? new Date(c.bookings[0].startTime).toLocaleDateString() : 'Never'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !campaigns?.length ? (
        <div className="text-center py-12">
          <Megaphone className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No campaigns yet</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Last Sent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c: Campaign) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.triggerDays} days</TableCell>
                  <TableCell>{c.discountPercent ? `${c.discountPercent}%` : '-'}</TableCell>
                  <TableCell>{c.sentCount}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {c.lastSentAt ? new Date(c.lastSentAt).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        c.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => runMutation.mutate(c.id)}
                        disabled={runMutation.isPending}
                        title="Run now"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(c.id)}
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
        </div>
      )}
    </div>
  )
}

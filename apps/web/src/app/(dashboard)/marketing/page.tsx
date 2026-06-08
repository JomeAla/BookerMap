'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { Megaphone, Play, Plus, Trash2, Pencil, Eye, ChevronDown, ChevronRight } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  subject: string
  body: string
  triggerDays: number
  triggerType: string | null
  discountPercent: number | null
  isActive: boolean
  sentCount: number
  lastSentAt: string | null
  createdAt: string
}

interface CampaignLog {
  id: string
  campaignId: string
  customerId: string
  email: string
  customerName: string | null
  status: string
  sentAt: string
}

const formDefaults = { name: '', subject: '', body: '', triggerDays: 30, discountPercent: '', isActive: true }

export default function MarketingPage() {
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showCreate, setShowCreate] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [logsCampaignId, setLogsCampaignId] = React.useState<string | null>(null)
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())

  const [form, setForm] = React.useState(formDefaults)

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: async () => {
      const { data } = await api.get('/marketing/campaigns')
      return data.data as Campaign[]
    },
  })

  const { data: lapsedData } = useQuery({
    queryKey: ['marketing-lapsed', '90'],
    queryFn: async () => {
      const { data } = await api.get('/marketing/lapsed', { params: { days: '90' } })
      return data.data as any[]
    },
  })

  const { data: logsData } = useQuery({
    queryKey: ['marketing-logs', logsCampaignId],
    queryFn: async () => {
      if (!logsCampaignId) return []
      const { data } = await api.get(`/marketing/campaigns/${logsCampaignId}/logs`)
      return data.data as CampaignLog[]
    },
    enabled: !!logsCampaignId,
  })

  const activeCampaigns = campaigns?.filter((c) => c.isActive).length ?? 0
  const totalSent = campaigns?.reduce((sum, c) => sum + (c.sentCount || 0), 0) ?? 0
  const lapsedCount = lapsedData?.length ?? 0
  const conversionEstimate = campaigns?.length && totalSent
    ? Math.round((campaigns.filter((c) => c.sentCount > 0).length / campaigns.length) * 100)
    : 0

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

  const updateMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: any }) => {
      const { data } = await api.put(`/marketing/campaigns/${id}`, dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] })
      setEditingId(null)
      setForm(formDefaults)
      addToast('Campaign updated', 'success')
    },
    onError: () => addToast('Failed to update campaign', 'error'),
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

  const openEdit = (c: Campaign) => {
    setForm({
      name: c.name,
      subject: c.subject,
      body: c.body,
      triggerDays: c.triggerDays,
      discountPercent: c.discountPercent != null ? String(c.discountPercent) : '',
      isActive: c.isActive,
    })
    setEditingId(c.id)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dto = {
      name: form.name,
      subject: form.subject,
      body: form.body,
      triggerDays: Number(form.triggerDays),
      discountPercent: form.discountPercent ? Number(form.discountPercent) : undefined,
      isActive: form.isActive,
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, dto })
    } else {
      createMutation.mutate(dto)
    }
  }

  const toggleRowExpand = (campaignId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(campaignId)) {
        next.delete(campaignId)
        if (logsCampaignId === campaignId) setLogsCampaignId(null)
      } else {
        next.add(campaignId)
        setLogsCampaignId(campaignId)
      }
      return next
    })
  }

  const isEditing = editingId !== null
  const isPending = createMutation.isPending || updateMutation.isPending

  const statCards = [
    { label: 'Active Campaigns', value: activeCampaigns, icon: Megaphone, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Total Sent', value: totalSent.toLocaleString(), icon: Play, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
    { label: 'Lapsed (90d)', value: lapsedCount, icon: Eye, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Sent Rate', value: `${conversionEstimate}%`, icon: Megaphone, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  ]

  const renderForm = () => (
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
          placeholder={'<p>Hi {{firstName}},</p><p>We miss you! Use code {{discountCode}} for {{discount}} off. Last booking: {{lastBookingDate}}</p>'}
          required
        />
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Variables: {'{{firstName}}'}, {'{{discount}}'}, {'{{discountCode}}'}, {'{{lastBookingDate}}'}
        </p>
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
          min={0}
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
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setShowCreate(false)
            setEditingId(null)
            setForm(formDefaults)
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marketing Campaigns</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Automated email campaigns to re-engage lapsed customers
          </p>
        </div>
        <Dialog open={showCreate || isEditing} onOpenChange={(open) => {
          if (!open) { setShowCreate(false); setEditingId(null); setForm(formDefaults) }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setShowCreate(true); setEditingId(null); setForm(formDefaults) }}>
              <Plus className="h-4 w-4 mr-1" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
            </DialogHeader>
            {renderForm()}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
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
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Last Sent</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c: Campaign) => {
                const isExpanded = expandedRows.has(c.id)
                return (
                  <React.Fragment key={c.id}>
                    <TableRow className="cursor-pointer" onClick={() => toggleRowExpand(c.id)}>
                      <TableCell>
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleMutation.mutate({ id: c.id, isActive: !c.isActive })
                          }}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                            c.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {c.isActive ? 'Active' : 'Paused'}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        After {c.triggerDays} days inactive
                      </TableCell>
                      <TableCell>{c.discountPercent ? `${c.discountPercent}%` : '—'}</TableCell>
                      <TableCell>{c.sentCount}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {c.lastSentAt ? new Date(c.lastSentAt).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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
                            onClick={() => openEdit(c)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
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
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-gray-50 dark:bg-gray-800/50 p-0">
                          <div className="p-4">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                              Campaign Logs
                            </h4>
                            {logsCampaignId === c.id && logsData === undefined ? (
                              <div className="flex justify-center py-4"><Spinner /></div>
                            ) : !logsData?.length ? (
                              <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
                                No emails sent yet
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Date</th>
                                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Email</th>
                                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Customer</th>
                                      <th className="text-left py-2 font-medium text-gray-500">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {logsData.map((log: CampaignLog) => (
                                      <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800">
                                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                                          {new Date(log.sentAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{log.email}</td>
                                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                                          {log.customerName || '—'}
                                        </td>
                                        <td className="py-2">
                                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                            log.status === 'CLICKED'
                                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                              : log.status === 'OPENED'
                                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                                          }`}>
                                            {log.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

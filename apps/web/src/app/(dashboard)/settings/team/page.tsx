'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { AvailabilityEditor } from '@/components/team/availability-editor'
import { SkillsEditor } from '@/components/team/skills-editor'
import { Users, UserPlus, Shield, Clock, Send, X, Plus, DollarSign, Wallet, Percent, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { User, UserRole, SplitPayment } from '@/types'

const roleOptions = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'TECHNICIAN', label: 'Technician' },
]

export default function TeamPage() {
  const { addToast } = useToast()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState({ email: '', firstName: '', lastName: '', role: 'TECHNICIAN' })
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [notifyDialogOpen, setNotifyDialogOpen] = React.useState(false)
  const [notifyForm, setNotifyForm] = React.useState({ title: '', body: '' })

  const { data: team, isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const { data } = await api.get('/users')
      return data.data as User[]
    },
  })

  const { data: commissionSummary } = useQuery({
    queryKey: ['commission-summary-team'],
    queryFn: async () => {
      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const todayStr = now.toISOString().slice(0, 10)
      const { data } = await api.get('/commission/summary', { params: { startDate: firstOfMonth, endDate: todayStr } })
      return data.data as { totalCommission: number; totalRevenue: number; technicians: number; averageCommissionRate: number }
    },
  })

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!team) return
    if (selectedIds.size === team.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(team.map((m) => m.id)))
    }
  }

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/notifications/send-team', {
        userIds: Array.from(selectedIds),
        title: notifyForm.title,
        body: notifyForm.body,
      })
      addToast('Notification sent', 'success')
      setNotifyDialogOpen(false)
      setNotifyForm({ title: '', body: '' })
      setSelectedIds(new Set())
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to send notification', 'error')
    }
  }

  const [skillsDialogOpen, setSkillsDialogOpen] = React.useState(false)
  const [editingSkillsUser, setEditingSkillsUser] = React.useState<User | null>(null)

  const [commissionDialogOpen, setCommissionDialogOpen] = React.useState(false)
  const [editingCommissionUser, setEditingCommissionUser] = React.useState<User | null>(null)
  const [commissionForm, setCommissionForm] = React.useState({ commissionRate: 0, commissionType: 'PERCENTAGE' })

  const [earningsDialogOpen, setEarningsDialogOpen] = React.useState(false)
  const [viewingEarningsUser, setViewingEarningsUser] = React.useState<User | null>(null)

  const [availabilityDialogOpen, setAvailabilityDialogOpen] = React.useState(false)
  const [editingAvailabilityUser, setEditingAvailabilityUser] = React.useState<User | null>(null)
  const [availabilityData, setAvailabilityData] = React.useState<Record<string, Array<{ start: string; end: string }>>>({})

  const { data: providerEarnings } = useQuery({
    queryKey: ['provider-earnings', viewingEarningsUser?.id],
    queryFn: async () => {
      const [summaryRes, paymentsRes] = await Promise.all([
        api.get(`/split-payments/provider/${viewingEarningsUser!.id}/earnings`),
        api.get(`/split-payments/provider/${viewingEarningsUser!.id}`),
      ])
      return {
        summary: summaryRes.data.data as { totalEarned: number; pending: number; released: number; onHold: number; totalTransactions: number },
        payments: paymentsRes.data.data.payments as SplitPayment[],
      }
    },
    enabled: !!viewingEarningsUser && earningsDialogOpen,
  })

  const openCommissionDialog = (member: User) => {
    setEditingCommissionUser(member)
    setCommissionForm({
      commissionRate: member.commissionRate ?? 0,
      commissionType: member.commissionType ?? 'PERCENTAGE',
    })
    setCommissionDialogOpen(true)
  }

  const openEarningsDialog = (member: User) => {
    setViewingEarningsUser(member)
    setEarningsDialogOpen(true)
  }

  const openAvailabilityDialog = async (member: User) => {
    setEditingAvailabilityUser(member)
    setAvailabilityData({})
    setAvailabilityDialogOpen(true)
    try {
      const { data } = await api.get(`/users/${member.id}/availability`)
      const avail = data.data
      setAvailabilityData((avail && typeof avail === 'object' ? avail : {}) as Record<string, Array<{ start: string; end: string }>>)
    } catch {
      setAvailabilityData({})
    }
  }

  const saveCommission = async () => {
    if (!editingCommissionUser) return
    try {
      await api.patch(`/users/${editingCommissionUser.id}`, {
        commissionRate: commissionForm.commissionRate || null,
        commissionType: commissionForm.commissionType,
      })
      addToast('Commission settings updated', 'success')
      setCommissionDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['team'] })
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to update commission', 'error')
    }
  }

  const openSkillsDialog = (member: User) => {
    setEditingSkillsUser(member)
    setSkillsDialogOpen(true)
  }

  const queryClient = useQueryClient()

  const inviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/users/invite', form)
      addToast('Invitation sent', 'success')
      setDialogOpen(false)
      setForm({ email: '', firstName: '', lastName: '', role: 'TECHNICIAN' })
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to invite user', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your team members</p>
        </div>
        <div className="flex items-center gap-3">
          <Button disabled={selectedIds.size === 0} onClick={() => setNotifyDialogOpen(true)}>
            <Send className="h-4 w-4 mr-2" /> Notify
            {selectedIds.size > 0 && <span className="ml-1">({selectedIds.size})</span>}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger>
              <Button><UserPlus className="h-4 w-4 mr-2" /> Invite Member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
              <form onSubmit={inviteUser} className="space-y-4">
                <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                  <Input label="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                </div>
                <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={roleOptions} />
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Send Invite</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Send Notification to Team</DialogTitle></DialogHeader>
            <form onSubmit={sendNotification} className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">
                  Sending to {selectedIds.size} member{selectedIds.size !== 1 ? 's' : ''}:
                </p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {team?.filter((m) => selectedIds.has(m.id)).map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                      {m.firstName} {m.lastName}
                    </span>
                  ))}
                </div>
              </div>
              <Input label="Title" value={notifyForm.title} onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })} required />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                <textarea
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  value={notifyForm.body}
                  onChange={(e) => setNotifyForm({ ...notifyForm, body: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setNotifyDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Send</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={skillsDialogOpen} onOpenChange={setSkillsDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Skills — {editingSkillsUser?.firstName} {editingSkillsUser?.lastName}</DialogTitle></DialogHeader>
            {editingSkillsUser && (
              <SkillsEditor userId={editingSkillsUser.id} skills={editingSkillsUser.skills || []} />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={commissionDialogOpen} onOpenChange={setCommissionDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Commission — {editingCommissionUser?.firstName} {editingCommissionUser?.lastName}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input
                label="Commission Rate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={commissionForm.commissionRate}
                onChange={(e) => setCommissionForm({ ...commissionForm, commissionRate: parseFloat(e.target.value) || 0 })}
              />
              <Select
                label="Commission Type"
                value={commissionForm.commissionType}
                onChange={(e) => setCommissionForm({ ...commissionForm, commissionType: e.target.value })}
                options={[
                  { value: 'PERCENTAGE', label: 'Percentage (%)' },
                  { value: 'FIXED', label: 'Fixed Amount' },
                ]}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setCommissionDialogOpen(false)}>Cancel</Button>
                <Button onClick={saveCommission}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              Total Commission Paid
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {commissionSummary ? formatCurrency(commissionSummary.totalCommission) : '...'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Percent className="h-4 w-4 text-purple-600" />
              Average Commission Rate
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {commissionSummary ? `${commissionSummary.averageCommissionRate.toFixed(1)}%` : '...'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Users className="h-4 w-4 text-indigo-600" />
              Active Technicians
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {team ? team.filter((m) => m.role === 'TECHNICIAN' && m.isActive).length : '...'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">On your team</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
          <CardDescription>{team?.length || 0} members on your team</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} /></div>
          ) : !team?.length ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No team members</p>
              <p className="text-sm mt-1">Invite your first team member</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={team ? selectedIds.size === team.length : false}
                          onChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {team.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={selectedIds.has(member.id)}
                          onChange={() => toggleSelect(member.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{member.firstName} {member.lastName}</TableCell>
                      <TableCell className="text-sm">{member.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.isActive ? 'default' : 'secondary'}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.role === 'TECHNICIAN' ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(member.skills || []).slice(0, 3).map((skill) => (
                              <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                            ))}
                            {(member.skills || []).length > 3 && (
                              <span className="text-xs text-gray-400">+{member.skills!.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {member.role === 'TECHNICIAN' ? (
                          member.commissionRate ? (
                            <Link href={`/reports/commissions?techId=${member.id}`}>
                              <Badge variant="secondary" className="text-xs cursor-pointer hover:opacity-80">
                                {member.commissionType === 'FIXED' ? `$${member.commissionRate}` : `${member.commissionRate}%`}
                              </Badge>
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        {member.role === 'TECHNICIAN' && (
                          <div className="flex items-center gap-1">
                            <Link href={`/settings/team/${member.id}/availability`}>
                              <Button variant="ghost" size="sm">
                                <Clock className="h-3.5 w-3.5 mr-1" /> Availability
                              </Button>
                            </Link>
                            <Button variant="ghost" size="sm" onClick={() => openSkillsDialog(member)}>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Skills
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openCommissionDialog(member)}>
                              <DollarSign className="h-3.5 w-3.5 mr-1" /> Commission
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEarningsDialog(member)}>
                              <Wallet className="h-3.5 w-3.5 mr-1" /> Earnings
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={earningsDialogOpen} onOpenChange={setEarningsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Earnings — {viewingEarningsUser?.firstName} {viewingEarningsUser?.lastName}</DialogTitle>
          </DialogHeader>
          {!providerEarnings ? (
            <div className="py-8 text-center text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Earned', value: formatCurrency(providerEarnings.summary.totalEarned), color: 'text-blue-600' },
                  { label: 'Pending', value: formatCurrency(providerEarnings.summary.pending), color: 'text-orange-600' },
                  { label: 'Released', value: formatCurrency(providerEarnings.summary.released), color: 'text-green-600' },
                  { label: 'On Hold', value: formatCurrency(providerEarnings.summary.onHold), color: 'text-red-600' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                    <p className={`text-lg font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Split Payments</h4>
                {providerEarnings.payments.length === 0 ? (
                  <p className="text-sm text-gray-400">No payments yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Booking</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Your Share</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {providerEarnings.payments.slice(0, 10).map((sp) => (
                          <TableRow key={sp.id}>
                            <TableCell className="text-sm">{sp.booking?.service?.name ?? sp.bookingId.slice(0, 8)}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(sp.totalAmount)}</TableCell>
                            <TableCell className="text-sm font-medium">{formatCurrency(sp.providerAmount)}</TableCell>
                            <TableCell><StatusBadge status={sp.status} /></TableCell>
                            <TableCell className="text-sm text-gray-500">{new Date(sp.createdAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <Link href={`/reports/commissions?techId=${viewingEarningsUser?.id}`}>
                  <Button variant="outline" size="sm">
                    <TrendingUp className="h-4 w-4 mr-2" /> View Full Commission Report
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={availabilityDialogOpen} onOpenChange={setAvailabilityDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Availability — {editingAvailabilityUser?.firstName} {editingAvailabilityUser?.lastName}</DialogTitle>
          </DialogHeader>
          {editingAvailabilityUser && (
            <AvailabilityEditor userId={editingAvailabilityUser.id} availability={availabilityData} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

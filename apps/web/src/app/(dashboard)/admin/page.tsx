'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import {
  Building2, Users, Plus, X, Trash2, Pause, Play, Tag, Search, Shield,
  TrendingUp, CalendarCheck, DollarSign, CreditCard, Globe, MessageSquare, Phone, Coins,
  AlertTriangle, FileText, CheckCircle2, XCircle, Clock, Eye, ChevronLeft, ChevronRight,
  ArrowRightLeft, AlertCircle, UserCheck, CheckCheck,
} from 'lucide-react'
import Link from 'next/link'

interface Tenant {
  id: string; name: string; slug: string; isActive: boolean; createdAt: string
  _count: { users: number; bookings: number }
}

const DISPUTE_STATUS_VARIANT: Record<string, 'warning' | 'info' | 'success' | 'secondary'> = {
  OPEN: 'warning',
  INVESTIGATING: 'info',
  RESOLVED: 'success',
  CLOSED: 'secondary',
}

const SETTLEMENT_STATUS_VARIANT: Record<string, 'warning' | 'info' | 'success' | 'destructive'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  COMPLETED: 'success',
  FAILED: 'destructive',
}

const SUB_STATUS_VARIANT: Record<string, 'success' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'success',
  PAST_DUE: 'secondary',
  CANCELED: 'destructive',
  EXPIRED: 'destructive',
  TRIALING: 'secondary',
}

function PlanPricingForm({ onSubmit, isLoading }: { onSubmit: (dto: any) => void; isLoading: boolean }) {
  const [form, setForm] = React.useState({
    plan: 'BASIC', billingCycle: 'MONTHLY', price: 4999, smsCredits: 100, whatsappCredits: 50, features: '[]',
  })
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Plan</label>
        <select className="w-full border rounded-md p-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
          <option value="FREE">Free</option>
          <option value="BASIC">Basic</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Billing Cycle</label>
        <select className="w-full border rounded-md p-2 text-sm dark:bg-gray-800 dark:border-gray-700" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
          <option value="MONTHLY">Monthly</option>
          <option value="YEARLY">Yearly</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Price (NGN)</label>
        <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">SMS Credits</label>
        <Input type="number" value={form.smsCredits} onChange={(e) => setForm({ ...form, smsCredits: parseInt(e.target.value) || 0 })} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">WhatsApp Credits</label>
        <Input type="number" value={form.whatsappCredits} onChange={(e) => setForm({ ...form, whatsappCredits: parseInt(e.target.value) || 0 })} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Features (JSON)</label>
        <Input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder='["feature1","feature2"]' />
      </div>
      <div className="col-span-full">
        <Button onClick={() => onSubmit({ ...form, features: JSON.parse(form.features || '[]') })} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Plan'}
        </Button>
      </div>
    </div>
  )
}

export default function AdminPlatformPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [tab, setTab] = React.useState('tenants')
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')

  const [showNewTenant, setShowNewTenant] = React.useState(false)
  const [newTenant, setNewTenant] = React.useState({ name: '', slug: '' })

  const [showNewUser, setShowNewUser] = React.useState(false)
  const [newUser, setNewUser] = React.useState({
    email: '', password: '', firstName: '', lastName: '', phone: '',
    role: 'OWNER' as string, tenantId: '',
  })

  const [showNewCoupon, setShowNewCoupon] = React.useState(false)
  const [newCoupon, setNewCoupon] = React.useState({
    code: '', type: 'percentage' as string, value: 10,
    tenantId: '', maxUses: 0, minAmount: 0,
  })

  // Dispute state
  const [disputeFilter, setDisputeFilter] = React.useState({ status: '', type: '' })
  const [selectedDispute, setSelectedDispute] = React.useState<any>(null)
  const [resolveDisputeForm, setResolveDisputeForm] = React.useState({ resolution: 'REFUND_FULL', note: '' })

  // Settlement state
  const [settlementFilter, setSettlementFilter] = React.useState({ status: '' })
  const [settleCompleteId, setSettleCompleteId] = React.useState<string | null>(null)
  const [settleCompleteForm, setSettleCompleteForm] = React.useState({ paymentMethod: 'bank_transfer', paymentReference: '' })
  const [settleFailId, setSettleFailId] = React.useState<string | null>(null)
  const [settleFailNote, setSettleFailNote] = React.useState('')

  // Subscription state
  const [subPage, setSubPage] = React.useState(1)
  const [subSearch, setSubSearch] = React.useState('')
  const [subFilterPlan, setSubFilterPlan] = React.useState('')
  const [subFilterStatus, setSubFilterStatus] = React.useState('')
  const [subInvoiceTenant, setSubInvoiceTenant] = React.useState<string | null>(null)
  const [changePlanSub, setChangePlanSub] = React.useState<any>(null)
  const [changePlanForm, setChangePlanForm] = React.useState({ plan: 'BASIC', billingCycle: 'MONTHLY' })
  const [cancelSubTenant, setCancelSubTenant] = React.useState<string | null>(null)

  // Tenants
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['admin-tenants', page],
    queryFn: async () => {
      const { data } = await api.get('/tenants', { params: { page, limit: 50 } })
      return data.data as { data: Tenant[]; meta: any }
    },
    enabled: tab === 'tenants',
  })

  const createTenant = useMutation({
    mutationFn: (dto: { name: string; slug: string }) => api.post('/tenants', dto),
    onSuccess: () => {
      toast({ title: 'Tenant created', variant: 'success' })
      setShowNewTenant(false)
      setNewTenant({ name: '', slug: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error', variant: 'destructive' }),
  })

  const toggleTenant = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/tenants/${id}/suspend`, { active }),
    onSuccess: () => { toast({ title: 'Tenant updated', variant: 'success' }); queryClient.invalidateQueries({ queryKey: ['admin-tenants'] }) },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error', variant: 'destructive' }),
  })

  const deleteTenant = useMutation({
    mutationFn: (id: string) => api.delete(`/tenants/${id}`),
    onSuccess: () => { toast({ title: 'Tenant deleted', variant: 'success' }); queryClient.invalidateQueries({ queryKey: ['admin-tenants'] }) },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error', variant: 'destructive' }),
  })

  // Users
  const createUser = useMutation({
    mutationFn: (dto: any) => api.post('/users/platform', dto),
    onSuccess: () => {
      toast({ title: 'User created', variant: 'success' })
      setShowNewUser(false)
      setNewUser({ email: '', password: '', firstName: '', lastName: '', phone: '', role: 'OWNER', tenantId: '' })
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error', variant: 'destructive' }),
  })

  // Coupons
  const createCoupon = useMutation({
    mutationFn: async (dto: any) => {
      const { data } = await api.post('/coupons', dto)
      return data
    },
    onSuccess: () => {
      toast({ title: 'Coupon created', variant: 'success' })
      setShowNewCoupon(false)
      setNewCoupon({ code: '', type: 'percentage', value: 10, tenantId: '', maxUses: 0, minAmount: 0 })
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error', variant: 'destructive' }),
  })

  // Disputes
  const { data: disputes, isLoading: disputesLoading } = useQuery({
    queryKey: ['admin-disputes', disputeFilter],
    queryFn: async () => {
      const params: any = {}
      if (disputeFilter.status) params.status = disputeFilter.status
      if (disputeFilter.type) params.type = disputeFilter.type
      const { data } = await api.get('/disputes', { params })
      return data.data as any[]
    },
    enabled: tab === 'disputes',
  })

  const { data: disputeDetail, isLoading: disputeDetailLoading } = useQuery({
    queryKey: ['admin-dispute-detail', selectedDispute],
    queryFn: async () => {
      const { data } = await api.get(`/disputes/${selectedDispute}`)
      return data.data as any
    },
    enabled: !!selectedDispute,
  })

  const updateDisputeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/disputes/${id}/status`, { status }),
    onSuccess: () => {
      toast({ title: 'Dispute status updated', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] })
      setSelectedDispute(null)
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error', variant: 'destructive' }),
  })

  const resolveDispute = useMutation({
    mutationFn: ({ id, resolution, note }: { id: string; resolution: string; note: string }) =>
      api.post(`/disputes/${id}/resolve`, { resolution, note }),
    onSuccess: () => {
      toast({ title: 'Dispute resolved', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] })
      setSelectedDispute(null)
      setResolveDisputeForm({ resolution: 'REFUND_FULL', note: '' })
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error', variant: 'destructive' }),
  })

  // Settlements
  const { data: settlements, isLoading: settlementsLoading } = useQuery({
    queryKey: ['admin-settlements', settlementFilter],
    queryFn: async () => {
      const params: any = {}
      if (settlementFilter.status) params.status = settlementFilter.status
      const { data } = await api.get('/settlements', { params })
      return data.data as any[]
    },
    enabled: tab === 'settlements',
  })

  const { data: settlementSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin-settlement-summary'],
    queryFn: async () => {
      const { data } = await api.get('/settlements/summary')
      return data.data as any
    },
    enabled: tab === 'settlements',
  })

  const markSettlementComplete = useMutation({
    mutationFn: ({ id, paymentMethod, paymentReference }: { id: string; paymentMethod: string; paymentReference: string }) =>
      api.patch(`/settlements/${id}/complete`, { paymentMethod, paymentReference }),
    onSuccess: () => {
      toast({ title: 'Settlement completed', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['admin-settlements'] })
      queryClient.invalidateQueries({ queryKey: ['admin-settlement-summary'] })
      setSettleCompleteId(null)
      setSettleCompleteForm({ paymentMethod: 'bank_transfer', paymentReference: '' })
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error', variant: 'destructive' }),
  })

  const markSettlementFailed = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      api.patch(`/settlements/${id}/fail`, { notes }),
    onSuccess: () => {
      toast({ title: 'Settlement marked as failed', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['admin-settlements'] })
      queryClient.invalidateQueries({ queryKey: ['admin-settlement-summary'] })
      setSettleFailId(null)
      setSettleFailNote('')
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error', variant: 'destructive' }),
  })

  const markSettlementProcessing = useMutation({
    mutationFn: (id: string) => api.patch(`/settlements/${id}/process`),
    onSuccess: () => {
      toast({ title: 'Settlement moved to processing', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['admin-settlements'] })
      queryClient.invalidateQueries({ queryKey: ['admin-settlement-summary'] })
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error', variant: 'destructive' }),
  })

  // Subscriptions
  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ['admin-subscriptions', subPage],
    queryFn: async () => {
      const { data } = await api.get('/subscriptions', { params: { page: subPage, limit: 20 } })
      return data.data as { data: any[]; meta: { total: number; page: number; limit: number; totalPages: number } }
    },
    enabled: tab === 'subscriptions',
  })

  const updatePlan = useMutation({
    mutationFn: ({ tenantId, plan, billingCycle }: { tenantId: string; plan: string; billingCycle: string }) =>
      api.patch(`/subscriptions/my/plan`, { plan, billingCycle }, { headers: { 'x-tenant-id': tenantId } }),
    onSuccess: () => {
      toast({ title: 'Plan updated', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      setChangePlanSub(null)
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error updating plan', variant: 'destructive' }),
  })

  const cancelSubscription = useMutation({
    mutationFn: ({ tenantId, immediate }: { tenantId: string; immediate: boolean }) =>
      api.post(`/subscriptions/my/cancel`, { immediate }, { headers: { 'x-tenant-id': tenantId } }),
    onSuccess: () => {
      toast({ title: 'Subscription cancelled', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] })
      setCancelSubTenant(null)
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error cancelling', variant: 'destructive' }),
  })

  const { data: subInvoices, isLoading: subInvoicesLoading } = useQuery({
    queryKey: ['admin-sub-invoices', subInvoiceTenant],
    queryFn: async () => {
      const { data } = await api.get(`/subscriptions/my/invoices`, { headers: { 'x-tenant-id': subInvoiceTenant! } })
      return data.data as any[]
    },
    enabled: !!subInvoiceTenant,
  })

  // SMS/WhatsApp settings
  const [smsSettings, setSmsSettings] = React.useState({ smsProvider: 'nigeria_bulk_sms', smsApiUsername: '', smsApiKey: '', smsApiSenderId: 'BookerMap', smsShortCode: '', smsPricePerUnit: 1.0, whatsappPricePerUnit: 1.5 })
  const [whatsappSettings, setWhatsappSettings] = React.useState({ whatsappProvider: 'meta', whatsappAccessToken: '', whatsappPhoneNumberId: '', whatsappBusinessId: '', whatsappWebhookVerifyToken: '' })
  const [creditGrant, setCreditGrant] = React.useState({ tenantId: '', amount: 100, description: '' })
  const [settingsTab, setSettingsTab] = React.useState('sms')
  const [planPricing, setPlanPricing] = React.useState<Array<{ id: string; plan: string; billingCycle: string; price: number; smsCredits: number; whatsappCredits: number; features: any; isActive: boolean }>>([])

  React.useEffect(() => {
    if (platformSettings?.data) {
      const s = platformSettings.data
      setSmsSettings(prev => ({
        ...prev,
        smsProvider: s.smsProvider || prev.smsProvider,
        smsApiUsername: s.smsApiUsername || prev.smsApiUsername,
        smsApiSenderId: s.smsApiSenderId || prev.smsApiSenderId,
        smsShortCode: s.smsShortCode || prev.smsShortCode,
        smsPricePerUnit: s.smsPricePerUnit ?? prev.smsPricePerUnit,
        whatsappPricePerUnit: s.whatsappPricePerUnit ?? prev.whatsappPricePerUnit,
      }))
      setWhatsappSettings(prev => ({
        ...prev,
        whatsappProvider: s.whatsappProvider || prev.whatsappProvider,
        whatsappPhoneNumberId: s.whatsappPhoneNumberId || prev.whatsappPhoneNumberId,
        whatsappBusinessId: s.whatsappBusinessId || prev.whatsappBusinessId,
      }))
    }
  }, [platformSettings])

  const { data: platformSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['platform-sms-settings'],
    queryFn: async () => { const { data } = await api.get('/notifications/platform-settings'); return data },
    enabled: tab === 'messaging',
  })

  const { data: creditBalance } = useQuery({
    queryKey: ['sms-credit-balance'],
    queryFn: async () => { const { data } = await api.get('/notifications/sms-credits/balance'); return data },
    enabled: tab === 'messaging',
  })

  const saveSmsSettings = useMutation({
    mutationFn: (dto: any) => api.post('/notifications/platform-settings/sms', dto),
    onSuccess: () => toast({ title: 'SMS settings saved', variant: 'success' }),
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error saving SMS settings', variant: 'destructive' }),
  })

  const saveWhatsappSettings = useMutation({
    mutationFn: (dto: any) => api.post('/notifications/platform-settings/whatsapp', dto),
    onSuccess: () => toast({ title: 'WhatsApp settings saved', variant: 'success' }),
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error saving WhatsApp settings', variant: 'destructive' }),
  })

  const testSms = useMutation({
    mutationFn: () => api.post('/notifications/platform-settings/test-sms'),
    onSuccess: (res: any) => toast({ title: res.data?.message || 'SMS connection test completed', variant: res.data?.success ? 'success' : 'destructive' }),
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'SMS test failed', variant: 'destructive' }),
  })

  const testWhatsapp = useMutation({
    mutationFn: () => api.post('/notifications/platform-settings/test-whatsapp'),
    onSuccess: (res: any) => toast({ title: res.data?.message || 'WhatsApp connection test completed', variant: res.data?.success ? 'success' : 'destructive' }),
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'WhatsApp test failed', variant: 'destructive' }),
  })

  const grantCredits = useMutation({
    mutationFn: (dto: any) => api.post('/notifications/sms-credits/grant', dto),
    onSuccess: () => { toast({ title: 'Credits granted', variant: 'success' }); setCreditGrant({ tenantId: '', amount: 100, description: '' }); queryClient.invalidateQueries({ queryKey: ['admin-tenants'] }) },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error granting credits', variant: 'destructive' }),
  })

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['plan-pricing'],
    queryFn: async () => { const { data } = await api.get('/plan-pricing'); return data },
    enabled: tab === 'messaging',
  })

  const savePlanPricing = useMutation({
    mutationFn: (dto: any) => api.post('/plan-pricing', dto),
    onSuccess: () => { toast({ title: 'Plan pricing saved', variant: 'success' }); queryClient.invalidateQueries({ queryKey: ['plan-pricing'] }) },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error saving plan', variant: 'destructive' }),
  })

  const seedPlans = useMutation({
    mutationFn: () => api.post('/plan-pricing/seed'),
    onSuccess: () => { toast({ title: 'Default plans seeded', variant: 'success' }); queryClient.invalidateQueries({ queryKey: ['plan-pricing'] }) },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error seeding plans', variant: 'destructive' }),
  })

  // Escalations / Alerts
  const [escStatusFilter, setEscStatusFilter] = React.useState('')
  const [assignEscId, setAssignEscId] = React.useState<string | null>(null)
  const [assignUserId, setAssignUserId] = React.useState('')
  const [resolveEscId, setResolveEscId] = React.useState<string | null>(null)
  const [resolveNote, setResolveNote] = React.useState('')

  const { data: escalations, isLoading: escalationsLoading } = useQuery({
    queryKey: ['admin-escalations', escStatusFilter],
    queryFn: async () => {
      const params: any = {}
      if (escStatusFilter) params.status = escStatusFilter
      const { data } = await api.get('/ai/escalations', { params })
      return data.data as { data: any[]; meta: any }
    },
    enabled: tab === 'alerts',
  })

  const { data: escOpenCount } = useQuery({
    queryKey: ['admin-escalations-open-count'],
    queryFn: async () => {
      const { data } = await api.get('/ai/escalations/stats/open-count')
      return data.data as { count: number }
    },
    enabled: tab === 'alerts',
  })

  const assignEscalation = useMutation({
    mutationFn: ({ id, agentUserId }: { id: string; agentUserId: string }) =>
      api.patch(`/ai/escalations/${id}/assign`, { agentUserId }),
    onSuccess: () => {
      toast({ title: 'Escalation assigned', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['admin-escalations'] })
      queryClient.invalidateQueries({ queryKey: ['admin-escalations-open-count'] })
      setAssignEscId(null)
      setAssignUserId('')
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error assigning', variant: 'destructive' }),
  })

  const resolveEscalation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      api.patch(`/ai/escalations/${id}/resolve`, { resolution }),
    onSuccess: () => {
      toast({ title: 'Escalation resolved', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['admin-escalations'] })
      queryClient.invalidateQueries({ queryKey: ['admin-escalations-open-count'] })
      setResolveEscId(null)
      setResolveNote('')
    },
    onError: (err: any) => toast({ title: err?.response?.data?.message || 'Error resolving', variant: 'destructive' }),
  })

  const ESC_STATUS_VARIANT: Record<string, 'warning' | 'info' | 'success' | 'secondary'> = {
    OPEN: 'warning',
    ASSIGNED: 'info',
    RESOLVED: 'success',
    CLOSED: 'secondary',
  }

  const filtered = React.useMemo(() => {
    if (!tenants?.data) return []
    return tenants.data.filter((t: Tenant) => {
      if (search && !t.name?.toLowerCase().includes(search.toLowerCase()) && !t.slug?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [tenants, search])

  const filteredSubs = React.useMemo(() => {
    if (!subscriptions?.data) return []
    return subscriptions.data.filter((sub: any) => {
      if (subFilterPlan && sub.plan !== subFilterPlan) return false
      if (subFilterStatus && sub.status !== subFilterStatus) return false
      if (subSearch && !sub.tenant?.name?.toLowerCase().includes(subSearch.toLowerCase())) return false
      return true
    })
  }, [subscriptions, subSearch, subFilterPlan, subFilterStatus])

  return (
    <div className="space-y-6 pb-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Administration</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage tenants, users, disputes, settlements, and subscriptions</p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="tenants"><Building2 className="h-4 w-4 mr-1" /> Tenants</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Users</TabsTrigger>
          <TabsTrigger value="disputes"><AlertTriangle className="h-4 w-4 mr-1" /> Disputes</TabsTrigger>
          <TabsTrigger value="settlements"><DollarSign className="h-4 w-4 mr-1" /> Settlements</TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4" /> Alerts
            {escOpenCount?.count !== undefined && escOpenCount.count > 0 && (
              <Badge variant="warning" className="ml-1 px-1.5 py-0 text-[10px]">{escOpenCount.count}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="coupons"><Tag className="h-4 w-4 mr-1" /> Coupons</TabsTrigger>
          <TabsTrigger value="subscriptions"><CreditCard className="h-4 w-4 mr-1" /> Subscriptions</TabsTrigger>
          <TabsTrigger value="messaging"><MessageSquare className="h-4 w-4 mr-1" /> SMS & WhatsApp</TabsTrigger>
          <TabsTrigger value="pricing"><Coins className="h-4 w-4 mr-1" /> Pricing</TabsTrigger>
          <Link href="/admin/editor" className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-800 transition-colors">
            <Globe className="h-4 w-4" /> Editor
          </Link>
        </TabsList>

        {/* TENANTS TAB */}
        <TabsContent value="tenants" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button onClick={() => setShowNewTenant(true)}><Plus className="h-4 w-4 mr-1" /> New Tenant</Button>
          </div>

          {showNewTenant && (
            <Card className="border-accent/30 bg-accent/5">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Create New Business</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowNewTenant(false)}><X className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Business Name" value={newTenant.name} onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })} />
                  <Input placeholder="Slug (url-name)" value={newTenant.slug} onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })} />
                </div>
                <Button className="mt-3" onClick={() => createTenant.mutate(newTenant)} disabled={!newTenant.name}>
                  {createTenant.isPending ? 'Creating...' : 'Create Tenant'}
                </Button>
              </CardContent>
            </Card>
          )}

          {tenantsLoading ? <Spinner /> : filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t: Tenant) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center"><Building2 className="h-4 w-4 text-accent" /></div>
                        <span className="font-medium">{t.name}</span>
                      </div>
                    </TableCell>
                    <TableCell><code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{t.slug}</code></TableCell>
                    <TableCell><span className="text-sm">{t._count?.users ?? 0}</span></TableCell>
                    <TableCell><span className="text-sm">{t._count?.bookings ?? 0}</span></TableCell>
                    <TableCell>
                      <Badge variant={t.isActive ? 'success' : 'destructive'}>
                        {t.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(t.createdAt, 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm"
                          onClick={() => toggleTenant.mutate({ id: t.id, active: !t.isActive })}
                          title={t.isActive ? 'Suspend' : 'Activate'}>
                          {t.isActive ? <Pause className="h-4 w-4 text-amber-500" /> : <Play className="h-4 w-4 text-green-500" />}
                        </Button>
                        <Button variant="ghost" size="sm"
                          onClick={() => { if (confirm(`Delete ${t.name}?`)) deleteTenant.mutate(t.id) }}
                          title="Delete">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-sm text-gray-500">No tenants found.</p>}
          {tenants?.meta && tenants.meta.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm text-gray-500">Page {page} of {tenants.meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= tenants.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </TabsContent>

        {/* USERS TAB */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <Button onClick={() => setShowNewUser(true)}><Plus className="h-4 w-4 mr-1" /> Create User</Button>

          {showNewUser && (
            <Card className="border-accent/30 bg-accent/5">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Create Platform User</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowNewUser(false)}><X className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                  <Input placeholder="Password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                  <Input placeholder="First Name" value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} />
                  <Input placeholder="Last Name" value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} />
                  <Input placeholder="Phone" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} />
                  <Input placeholder="Tenant ID" value={newUser.tenantId} onChange={(e) => setNewUser({ ...newUser, tenantId: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Role:</label>
                  <select className="rounded-md border px-2 py-1 text-sm" value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                    <option value="ADMIN">Platform Admin</option>
                    <option value="OWNER">Business Owner</option>
                    <option value="MANAGER">Manager</option>
                    <option value="TECHNICIAN">Technician</option>
                  </select>
                </div>
                <Button onClick={() => createUser.mutate(newUser)} disabled={!newUser.email || !newUser.password || !newUser.tenantId}>
                  {createUser.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="p-8 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Use the form above to create users in any tenant.</p>
            <p className="text-sm mt-1">For tenant user lists, visit the respective tenant page.</p>
          </div>
        </TabsContent>

        {/* DISPUTES TAB */}
        <TabsContent value="disputes" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <select
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={disputeFilter.status} onChange={(e) => setDisputeFilter({ ...disputeFilter, status: e.target.value })}>
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            <select
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={disputeFilter.type} onChange={(e) => setDisputeFilter({ ...disputeFilter, type: e.target.value })}>
              <option value="">All Types</option>
              <option value="CHARGEBACK">Chargeback</option>
              <option value="SERVICE_NOT_RENDERED">Service Not Rendered</option>
              <option value="SERVICE_DEFICIENT">Service Deficient</option>
              <option value="DAMAGES">Damages</option>
              <option value="BILLING_ERROR">Billing Error</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {disputesLoading ? <Spinner /> : disputes && disputes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell><code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{d.id.slice(0, 8)}</code></TableCell>
                    <TableCell className="text-sm">{d.customer?.firstName} {d.customer?.lastName}</TableCell>
                    <TableCell className="text-sm">{d.type?.replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                      <Badge variant={DISPUTE_STATUS_VARIANT[d.status] || 'secondary'}>
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(d.amount)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(d.createdAt, 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedDispute(d.id)} title="View details">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !disputesLoading && <p className="text-sm text-gray-500 py-8 text-center">No disputes found.</p>}

          {/* Dispute Detail Dialog */}
          <Dialog open={!!selectedDispute} onOpenChange={(open) => { if (!open) setSelectedDispute(null) }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Dispute Details
                </DialogTitle>
              </DialogHeader>
              {disputeDetailLoading ? <Spinner /> : disputeDetail && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <Badge variant={DISPUTE_STATUS_VARIANT[disputeDetail.status] || 'secondary'} className="text-sm">
                        {disputeDetail.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Type</p>
                      <p className="text-sm font-medium">{disputeDetail.type?.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Amount</p>
                      <p className="text-sm font-medium">{formatCurrency(disputeDetail.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Customer</p>
                      <p className="text-sm">{disputeDetail.customer?.firstName} {disputeDetail.customer?.lastName}</p>
                      <p className="text-xs text-gray-400">{disputeDetail.customer?.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="text-sm">{formatDate(disputeDetail.createdAt, 'MMM d, yyyy HH:mm')}</p>
                    </div>
                    {disputeDetail.resolvedAt && (
                      <div>
                        <p className="text-xs text-gray-500">Resolved</p>
                        <p className="text-sm">{formatDate(disputeDetail.resolvedAt, 'MMM d, yyyy HH:mm')}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Description</p>
                    <p className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md">{disputeDetail.description}</p>
                  </div>

                  {disputeDetail.booking && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Related Booking</p>
                      <p className="text-sm">{disputeDetail.booking.service?.name || 'N/A'} on {formatDate(disputeDetail.booking.startTime, 'MMM d, yyyy')}</p>
                    </div>
                  )}

                  {disputeDetail.evidence && disputeDetail.evidence.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Evidence ({disputeDetail.evidence.length})</p>
                      <div className="space-y-2">
                        {disputeDetail.evidence.map((ev: any) => (
                          <div key={ev.id} className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                            <span className="font-medium">{ev.fileName}</span>
                            <span className="text-gray-400 ml-2">({ev.fileType})</span>
                            {ev.description && <p className="text-gray-500 mt-1">{ev.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {disputeDetail.resolution && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Resolution</p>
                      <p className="text-sm font-medium">{disputeDetail.resolution?.replace(/_/g, ' ')}</p>
                      {disputeDetail.resolutionNote && <p className="text-sm text-gray-500">{disputeDetail.resolutionNote}</p>}
                    </div>
                  )}

                  {(disputeDetail.status === 'OPEN' || disputeDetail.status === 'INVESTIGATING') && (
                    <div className="border-t pt-4 space-y-3">
                      <p className="text-sm font-medium">Update Status</p>
                      <div className="flex gap-2">
                        {disputeDetail.status === 'OPEN' && (
                          <Button size="sm" variant="outline" onClick={() => updateDisputeStatus.mutate({ id: disputeDetail.id, status: 'INVESTIGATING' })}>
                            Start Investigating
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => { updateDisputeStatus.mutate({ id: disputeDetail.id, status: 'CLOSED' }) }}>
                          Close Dispute
                        </Button>
                      </div>

                      <div className="border-t pt-3">
                        <p className="text-sm font-medium mb-2">Resolve Dispute</p>
                        <div className="space-y-2">
                          <select className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                            value={resolveDisputeForm.resolution} onChange={(e) => setResolveDisputeForm({ ...resolveDisputeForm, resolution: e.target.value })}>
                            <option value="REFUND_FULL">Full Refund</option>
                            <option value="REFUND_PARTIAL">Partial Refund</option>
                            <option value="CREDIT">Credit</option>
                            <option value="DISMISSED">Dismissed</option>
                            <option value="OTHER">Other</option>
                          </select>
                          <Input placeholder="Resolution note (optional)" value={resolveDisputeForm.note}
                            onChange={(e) => setResolveDisputeForm({ ...resolveDisputeForm, note: e.target.value })} />
                          <Button size="sm" onClick={() => resolveDispute.mutate({ id: disputeDetail.id, ...resolveDisputeForm })}
                            disabled={resolveDispute.isPending}>
                            {resolveDispute.isPending ? 'Resolving...' : 'Resolve Dispute'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* SETTLEMENTS TAB */}
        <TabsContent value="settlements" className="space-y-4 mt-4">
          {/* Summary Cards */}
          {summaryLoading ? <Spinner /> : settlementSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Completed</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(settlementSummary.totalCompleted)}</p>
                      <p className="text-xs text-gray-400">{settlementSummary.completedCount} payouts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pending</p>
                      <p className="text-lg font-bold text-amber-600">{formatCurrency(settlementSummary.totalOutstanding)}</p>
                      <p className="text-xs text-gray-400">{settlementSummary.pendingCount} payouts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Processing</p>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(settlementSummary.totalProcessing)}</p>
                      <p className="text-xs text-gray-400">{settlementSummary.processingCount} payouts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Failed</p>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(settlementSummary.totalFailed)}</p>
                      <p className="text-xs text-gray-400">{settlementSummary.failedCount} payouts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex items-center gap-3">
            <select
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={settlementFilter.status} onChange={(e) => setSettlementFilter({ ...settlementFilter, status: e.target.value })}>
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {settlementsLoading ? <Spinner /> : settlements && settlements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Earned</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell><code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{s.id.slice(0, 8)}</code></TableCell>
                    <TableCell className="text-sm">{s.provider?.firstName} {s.provider?.lastName}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(s.periodStart, 'MMM d')} - {formatDate(s.periodEnd, 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm">{formatCurrency(s.totalEarned)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatCurrency(s.totalFee)}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(s.netAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={SETTLEMENT_STATUS_VARIANT[s.status] || 'secondary'}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {s.status === 'PENDING' && (
                          <Button size="sm" variant="outline" onClick={() => markSettlementProcessing.mutate(s.id)}
                            disabled={markSettlementProcessing.isPending}>
                            Process
                          </Button>
                        )}
                        {(s.status === 'PENDING' || s.status === 'PROCESSING') && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setSettleCompleteId(s.id)}
                              className="text-green-600 hover:text-green-700">
                              Complete
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setSettleFailId(s.id); setSettleFailNote('') }}
                              className="text-red-600 hover:text-red-700">
                              Fail
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !settlementsLoading && <p className="text-sm text-gray-500 py-8 text-center">No settlements found.</p>}

          {/* Complete Settlement Dialog */}
          <Dialog open={!!settleCompleteId} onOpenChange={(open) => { if (!open) setSettleCompleteId(null) }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Mark Settlement Complete
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Payment Method</label>
                  <select className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    value={settleCompleteForm.paymentMethod} onChange={(e) => setSettleCompleteForm({ ...settleCompleteForm, paymentMethod: e.target.value })}>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Payment Reference</label>
                  <Input placeholder="Transaction reference" value={settleCompleteForm.paymentReference}
                    onChange={(e) => setSettleCompleteForm({ ...settleCompleteForm, paymentReference: e.target.value })} />
                </div>
                <Button onClick={() => markSettlementComplete.mutate({ id: settleCompleteId!, ...settleCompleteForm })}
                  disabled={markSettlementComplete.isPending || !settleCompleteForm.paymentReference}>
                  {markSettlementComplete.isPending ? 'Completing...' : 'Confirm Completion'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Fail Settlement Dialog */}
          <Dialog open={!!settleFailId} onOpenChange={(open) => { if (!open) setSettleFailId(null) }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Mark Settlement Failed
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Reason / Notes</label>
                  <Input placeholder="Reason for failure" value={settleFailNote}
                    onChange={(e) => setSettleFailNote(e.target.value)} />
                </div>
                <Button variant="destructive" onClick={() => markSettlementFailed.mutate({ id: settleFailId!, notes: settleFailNote })}
                  disabled={markSettlementFailed.isPending}>
                  {markSettlementFailed.isPending ? 'Marking...' : 'Confirm Failure'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ALERTS / ESCALATIONS TAB */}
        <TabsContent value="alerts" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold">AI Escalations</h2>
              {escOpenCount?.count !== undefined && (
                <Badge variant={escOpenCount.count > 0 ? 'warning' : 'secondary'}>
                  {escOpenCount.count} open
                </Badge>
              )}
            </div>
            <select
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={escStatusFilter} onChange={(e) => setEscStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {escalationsLoading ? <Spinner /> : escalations?.data && escalations.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {escalations.data.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell><code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{e.id.slice(0, 8)}</code></TableCell>
                    <TableCell className="text-sm">
                      {e.customer ? `${e.customer.firstName} ${e.customer.lastName}` : (e.customerId ? e.customerId.slice(0, 8) : '—')}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate" title={e.reason || e.summary || ''}>
                      {e.reason || e.summary || e.category || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ESC_STATUS_VARIANT[e.status] || 'secondary'}>
                        {e.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {e.assignedTo ? `${e.assignedTo.firstName || ''} ${e.assignedTo.lastName || ''}`.trim() || e.assignedUserId?.slice(0, 8) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(e.createdAt, 'MMM d, yyyy HH:mm')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {e.status === 'OPEN' && (
                          <Button size="sm" variant="outline" onClick={() => { setAssignEscId(e.id); setAssignUserId('') }}
                            className="text-blue-600 hover:text-blue-700">
                            <UserCheck className="h-3 w-3 mr-1" /> Assign
                          </Button>
                        )}
                        {(e.status === 'OPEN' || e.status === 'ASSIGNED') && (
                          <Button size="sm" variant="outline" onClick={() => { setResolveEscId(e.id); setResolveNote('') }}
                            className="text-green-600 hover:text-green-700">
                            <CheckCheck className="h-3 w-3 mr-1" /> Resolve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !escalationsLoading && <p className="text-sm text-gray-500 py-8 text-center">No escalations found.</p>}

          {/* Assign Escalation Dialog */}
          <Dialog open={!!assignEscId} onOpenChange={(open) => { if (!open) { setAssignEscId(null); setAssignUserId('') } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-blue-500" />
                  Assign Escalation
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Agent User ID</label>
                  <Input placeholder="User ID to assign" value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)} />
                </div>
                <Button onClick={() => assignEscalation.mutate({ id: assignEscId!, agentUserId: assignUserId })}
                  disabled={!assignUserId || assignEscalation.isPending}>
                  {assignEscalation.isPending ? 'Assigning...' : 'Assign Agent'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Resolve Escalation Dialog */}
          <Dialog open={!!resolveEscId} onOpenChange={(open) => { if (!open) { setResolveEscId(null); setResolveNote('') } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCheck className="h-5 w-5 text-green-600" />
                  Resolve Escalation
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Resolution Note</label>
                  <Input placeholder="Describe how this was resolved" value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)} />
                </div>
                <Button onClick={() => resolveEscalation.mutate({ id: resolveEscId!, resolution: resolveNote })}
                  disabled={!resolveNote || resolveEscalation.isPending}>
                  {resolveEscalation.isPending ? 'Resolving...' : 'Mark Resolved'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* COUPONS TAB */}
        <TabsContent value="coupons" className="space-y-4 mt-4">
          <Button onClick={() => setShowNewCoupon(true)}><Plus className="h-4 w-4 mr-1" /> Create Coupon</Button>

          {showNewCoupon && (
            <Card className="border-accent/30 bg-accent/5">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Create Subscription Coupon</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowNewCoupon(false)}><X className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Coupon Code (e.g. SAVE20)" value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} />
                  <Input placeholder="Tenant ID" value={newCoupon.tenantId} onChange={(e) => setNewCoupon({ ...newCoupon, tenantId: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Discount Type</label>
                    <select className="w-full rounded-md border px-2 py-1.5 text-sm" value={newCoupon.type}
                      onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      {newCoupon.type === 'percentage' ? 'Percentage (%)' : 'Amount'}
                    </label>
                    <Input type="number" value={newCoupon.value} onChange={(e) => setNewCoupon({ ...newCoupon, value: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Max Uses (0 = unlimited)</label>
                    <Input type="number" value={newCoupon.maxUses} onChange={(e) => setNewCoupon({ ...newCoupon, maxUses: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Min Amount</label>
                    <Input type="number" value={newCoupon.minAmount} onChange={(e) => setNewCoupon({ ...newCoupon, minAmount: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <Button onClick={() => createCoupon.mutate(newCoupon)} disabled={!newCoupon.code || !newCoupon.tenantId}>
                  {createCoupon.isPending ? 'Creating...' : 'Create Coupon'}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="p-8 text-center text-gray-500">
            <Tag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Create discount coupons that businesses can use for subscriptions.</p>
            <p className="text-sm mt-1">Coupons are tenant-scoped — assign them to the right business.</p>
          </div>
        </TabsContent>

        {/* SUBSCRIPTIONS TAB */}
        <TabsContent value="subscriptions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Manage all tenant subscriptions — change plans, cancel, and view invoices.</p>
            <Link href="/admin/subscriptions">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-1" /> Full View
              </Button>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by tenant name..." className="pl-9" value={subSearch} onChange={(e) => setSubSearch(e.target.value)} />
            </div>
            <select
              value={subFilterPlan}
              onChange={(e) => setSubFilterPlan(e.target.value)}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm">
              <option value="">All Plans</option>
              <option value="FREE">Free</option>
              <option value="BASIC">Basic</option>
              <option value="PRO">Pro</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
            <select
              value={subFilterStatus}
              onChange={(e) => setSubFilterStatus(e.target.value)}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm">
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PAST_DUE">Past Due</option>
              <option value="CANCELED">Canceled</option>
              <option value="EXPIRED">Expired</option>
              <option value="TRIALING">Trialing</option>
            </select>
          </div>

          {subsLoading ? <Spinner /> : filteredSubs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Billing Cycle</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubs.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white block">{sub.tenant?.name || 'Unknown'}</span>
                          <span className="text-xs text-gray-400">{sub.tenantId.slice(0, 8)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="font-semibold">{sub.plan}</span></TableCell>
                    <TableCell>
                      <Badge variant={SUB_STATUS_VARIANT[sub.status] || 'secondary'}>{sub.status}</Badge>
                    </TableCell>
                    <TableCell className="capitalize">{sub.billingCycle?.toLowerCase()}</TableCell>
                    <TableCell>{formatCurrency(sub.price / 100, 'NGN')}</TableCell>
                    <TableCell className="text-sm text-gray-500">{formatDate(sub.currentPeriodEnd, 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setChangePlanSub(sub); setChangePlanForm({ plan: sub.plan, billingCycle: sub.billingCycle }) }}
                          title="Change Plan">
                          <ArrowRightLeft className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSubInvoiceTenant(sub.tenantId)}
                          title="View Invoices">
                          <FileText className="h-3 w-3" />
                        </Button>
                        {(sub.status === 'ACTIVE' || sub.status === 'PAST_DUE' || sub.status === 'TRIALING') && (
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700"
                            onClick={() => setCancelSubTenant(sub.tenantId)} title="Cancel">
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-sm text-gray-500 py-4">No subscriptions found.</p>}

          {subscriptions?.meta && subscriptions.meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(subscriptions.meta.page - 1) * subscriptions.meta.limit + 1}–{Math.min(subscriptions.meta.page * subscriptions.meta.limit, subscriptions.meta.total)} of {subscriptions.meta.total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={subPage <= 1} onClick={() => setSubPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-500 py-1">{subPage} / {subscriptions.meta.totalPages}</span>
                <Button variant="outline" size="sm" disabled={subPage >= subscriptions.meta.totalPages} onClick={() => setSubPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Change Plan Dialog */}
          <Dialog open={!!changePlanSub} onOpenChange={(open) => { if (!open) setChangePlanSub(null) }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                  Change Plan — {changePlanSub?.tenant?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Current plan: <strong>{changePlanSub?.plan}</strong> ({changePlanSub?.billingCycle})</p>
                <div>
                  <label className="text-sm font-medium mb-1 block">New Plan</label>
                  <select className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    value={changePlanForm.plan} onChange={(e) => setChangePlanForm({ ...changePlanForm, plan: e.target.value })}>
                    <option value="FREE">Free</option>
                    <option value="BASIC">Basic</option>
                    <option value="PRO">Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Billing Cycle</label>
                  <select className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    value={changePlanForm.billingCycle} onChange={(e) => setChangePlanForm({ ...changePlanForm, billingCycle: e.target.value })}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
                <Button onClick={() => updatePlan.mutate({ tenantId: changePlanSub.tenantId, ...changePlanForm })}
                  disabled={updatePlan.isPending}>
                  {updatePlan.isPending ? 'Updating...' : 'Update Plan'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Cancel Subscription Dialog */}
          <Dialog open={!!cancelSubTenant} onOpenChange={(open) => { if (!open) setCancelSubTenant(null) }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <X className="h-5 w-5" />
                  Cancel Subscription
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Are you sure you want to cancel this subscription?</p>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={() => cancelSubscription.mutate({ tenantId: cancelSubTenant!, immediate: true })}
                    disabled={cancelSubscription.isPending}>
                    Cancel Immediately
                  </Button>
                  <Button variant="outline" onClick={() => cancelSubscription.mutate({ tenantId: cancelSubTenant!, immediate: false })}
                    disabled={cancelSubscription.isPending}>
                    Cancel at Period End
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Subscription Invoices Dialog */}
          <Dialog open={!!subInvoiceTenant} onOpenChange={(open) => { if (!open) setSubInvoiceTenant(null) }}>
            <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Subscription Invoices
                </DialogTitle>
              </DialogHeader>
              {subInvoicesLoading ? <Spinner /> : subInvoices && subInvoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subInvoices.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="text-sm">{formatDate(inv.createdAt, 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-sm font-medium">{formatCurrency(inv.amount / 100, inv.currency || 'NGN')}</TableCell>
                        <TableCell>
                          <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'PENDING' ? 'warning' : 'destructive'}>
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{formatDate(inv.dueDate, 'MMM d, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-sm text-gray-500 py-4 text-center">No invoices found.</p>}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* SMS & WHATSAPP TAB */}
        <TabsContent value="messaging" className="space-y-6 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <button className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${settingsTab === 'sms' ? 'bg-accent text-white' : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`} onClick={() => setSettingsTab('sms')}>
              <Phone className="h-4 w-4 inline mr-1" /> SMS Gateway
            </button>
            <button className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${settingsTab === 'whatsapp' ? 'bg-accent text-white' : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`} onClick={() => setSettingsTab('whatsapp')}>
              <MessageSquare className="h-4 w-4 inline mr-1" /> WhatsApp
            </button>
            <button className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${settingsTab === 'credits' ? 'bg-accent text-white' : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`} onClick={() => setSettingsTab('credits')}>
              <Coins className="h-4 w-4 inline mr-1" /> SMS Credits
            </button>
          </div>

          {settingsTab === 'sms' && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Phone className="h-5 w-5 text-accent" /> SMS Gateway Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">Configure the platform SMS gateway. All tenants use these credentials — they purchase SMS credits from you.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">SMS Provider</label>
                    <select className="w-full rounded-md border px-2 py-1.5 text-sm" value={smsSettings.smsProvider} onChange={(e) => setSmsSettings({ ...smsSettings, smsProvider: e.target.value })}>
                      <option value="nigeria_bulk_sms">NigeriaBulkSMS</option>
                      <option value="africas_talking">Africa's Talking</option>
                      <option value="twilio">Twilio</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Sender ID</label>
                    <Input value={smsSettings.smsApiSenderId} onChange={(e) => setSmsSettings({ ...smsSettings, smsApiSenderId: e.target.value })} placeholder="BookerMap" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">{smsSettings.smsProvider === 'twilio' ? 'Account SID' : 'Username / Email'}</label>
                    <Input value={smsSettings.smsApiUsername} onChange={(e) => setSmsSettings({ ...smsSettings, smsApiUsername: e.target.value })} placeholder={smsSettings.smsProvider === 'twilio' ? 'ACxxxxxxxx' : 'your@email.com'} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">{smsSettings.smsProvider === 'twilio' ? 'Auth Token' : 'Password / API Key'}</label>
                    <Input type="password" value={smsSettings.smsApiKey} onChange={(e) => setSmsSettings({ ...smsSettings, smsApiKey: e.target.value })} placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Short Code</label>
                    <Input value={smsSettings.smsShortCode} onChange={(e) => setSmsSettings({ ...smsSettings, smsShortCode: e.target.value })} placeholder="Short code (optional)" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Price per SMS (NGN)</label>
                    <Input type="number" step="0.5" value={smsSettings.smsPricePerUnit} onChange={(e) => setSmsSettings({ ...smsSettings, smsPricePerUnit: parseFloat(e.target.value) || 0 })} placeholder="e.g. 2.5" />
                    <p className="text-xs text-gray-400 mt-1">Amount deducted from tenant credits per SMS sent</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Price per WhatsApp (NGN)</label>
                    <Input type="number" step="0.5" value={smsSettings.whatsappPricePerUnit} onChange={(e) => setSmsSettings({ ...smsSettings, whatsappPricePerUnit: parseFloat(e.target.value) || 0 })} placeholder="e.g. 3.0" />
                    <p className="text-xs text-gray-400 mt-1">Amount deducted from tenant credits per WhatsApp message</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => saveSmsSettings.mutate(smsSettings)} disabled={saveSmsSettings.isPending}>
                    {saveSmsSettings.isPending ? 'Saving...' : 'Save SMS Settings'}
                  </Button>
                  <Button variant="outline" onClick={() => testSms.mutate()} disabled={testSms.isPending}>
                    {testSms.isPending ? 'Testing...' : 'Test Connection'}
                  </Button>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-500">
                  <strong>Webhook URL for delivery receipts:</strong><br />
                  <code className="text-xs break-all">{typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/sms/delivery</code>
                </div>
              </CardContent>
            </Card>
          )}

          {settingsTab === 'whatsapp' && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-5 w-5 text-green-500" /> WhatsApp Business API Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">Configure the platform WhatsApp Business API. All tenants use these credentials — they purchase WhatsApp credits from you.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Phone Number ID</label>
                    <Input value={whatsappSettings.whatsappPhoneNumberId} onChange={(e) => setWhatsappSettings({ ...whatsappSettings, whatsappPhoneNumberId: e.target.value })} placeholder="123456789012345" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Business Account ID</label>
                    <Input value={whatsappSettings.whatsappBusinessId} onChange={(e) => setWhatsappSettings({ ...whatsappSettings, whatsappBusinessId: e.target.value })} placeholder="987654321098765" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Access Token</label>
                    <Input type="password" value={whatsappSettings.whatsappAccessToken} onChange={(e) => setWhatsappSettings({ ...whatsappSettings, whatsappAccessToken: e.target.value })} placeholder="EAAx..." />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Webhook Verify Token</label>
                    <Input type="password" value={whatsappSettings.whatsappWebhookVerifyToken} onChange={(e) => setWhatsappSettings({ ...whatsappSettings, webhookVerifyToken: e.target.value })} placeholder="Your verify token" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => saveWhatsappSettings.mutate(whatsappSettings)} disabled={saveWhatsappSettings.isPending}>
                    {saveWhatsappSettings.isPending ? 'Saving...' : 'Save WhatsApp Settings'}
                  </Button>
                  <Button variant="outline" onClick={() => testWhatsapp.mutate()} disabled={testWhatsapp.isPending}>
                    {testWhatsapp.isPending ? 'Testing...' : 'Test Connection'}
                  </Button>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-500">
                  <strong>Webhook URL for WhatsApp events:</strong><br />
                  <code className="text-xs break-all">{typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/notifications/whatsapp/webhook</code><br />
                  <strong className="mt-2 block">Verify Token:</strong> Set this in your Meta app dashboard under Webhooks.
                </div>
              </CardContent>
            </Card>
          )}

          {settingsTab === 'credits' && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Coins className="h-5 w-5 text-amber-500" /> SMS Credit Management</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">Tenants purchase SMS/WhatsApp credits from the platform. 1 credit = 1 SMS or 1 WhatsApp message.</p>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{creditBalance?.totalPurchased || 0}</p>
                    <p className="text-xs text-gray-500">Total Credits Granted</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{creditBalance?.balance || 0}</p>
                    <p className="text-xs text-gray-500">Current Balance</p>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-orange-600">{creditBalance?.totalUsed || 0}</p>
                    <p className="text-xs text-gray-500">Total Used</p>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-medium text-sm">Grant Credits to a Tenant</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <Input placeholder="Tenant ID" value={creditGrant.tenantId} onChange={(e) => setCreditGrant({ ...creditGrant, tenantId: e.target.value })} />
                    <Input type="number" placeholder="Amount (e.g. 100)" value={creditGrant.amount} onChange={(e) => setCreditGrant({ ...creditGrant, amount: parseInt(e.target.value) || 0 })} />
                    <Input placeholder="Description (optional)" value={creditGrant.description} onChange={(e) => setCreditGrant({ ...creditGrant, description: e.target.value })} />
                  </div>
                  <Button onClick={() => grantCredits.mutate(creditGrant)} disabled={!creditGrant.tenantId || creditGrant.amount <= 0 || grantCredits.isPending}>
                    {grantCredits.isPending ? 'Granting...' : 'Grant Credits'}
                  </Button>
                </div>

                {tenants?.data && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenants.data.map((t: Tenant) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell>{t.slug}</TableCell>
                          <TableCell><Badge variant={t.isActive ? 'success' : 'destructive'}>{t.isActive ? 'Active' : 'Suspended'}</Badge></TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => setCreditGrant({ tenantId: t.id, amount: 100, description: '' })}>
                              <Coins className="h-3 w-3 mr-1" /> Grant Credits
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PRICING TAB */}
        <TabsContent value="pricing" className="space-y-6 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Configure subscription plan pricing and SMS/WhatsApp credit allocations.</p>
            <Button variant="outline" onClick={() => seedPlans.mutate()} disabled={seedPlans.isPending}>
              {seedPlans.isPending ? 'Seeding...' : 'Seed Default Plans'}
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-5 w-5 text-emerald-500" /> Plan Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {plansLoading && <div className="flex justify-center py-8"><Spinner /></div>}
              {plans?.data && plans.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Billing</TableHead>
                      <TableHead>Price (NGN)</TableHead>
                      <TableHead>SMS Credits</TableHead>
                      <TableHead>WhatsApp Credits</TableHead>
                      <TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.data.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium capitalize">{p.plan}</TableCell>
                        <TableCell className="capitalize">{p.billingCycle}</TableCell>
                        <TableCell>{formatCurrency(p.price)}</TableCell>
                        <TableCell>{p.smsCredits}</TableCell>
                        <TableCell>{p.whatsappCredits}</TableCell>
                        <TableCell><Badge variant={p.isActive ? 'success' : 'destructive'}>{p.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                !plansLoading && <div className="text-center py-8 text-gray-400">No plans configured. Click "Seed Default Plans" to create starter plans.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Add / Edit Plan Pricing</CardTitle></CardHeader>
            <CardContent>
              <PlanPricingForm onSubmit={(dto) => savePlanPricing.mutate(dto)} isLoading={savePlanPricing.isPending} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
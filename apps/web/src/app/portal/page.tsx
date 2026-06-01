'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/ui/skeleton'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CalendarCheck, Clock, User, Building2, CreditCard, History, Save, Edit2, Navigation, MessageSquare, ShieldAlert } from 'lucide-react'
import { ChatWidget } from '@/components/chat/chat-widget'
import dynamic from 'next/dynamic'
import type { Booking, Dispute } from '@/types'
import { JobStatus, DisputeType } from '@/types'

const TechnicianTracker = dynamic(() => import('@/components/map/technician-tracker'), { ssr: false })

type Tab = 'bookings' | 'payments' | 'profile' | 'feedback' | 'disputes'

function PortalContent() {
  const [activeTab, setActiveTab] = React.useState<Tab>('bookings')
  const [editing, setEditing] = React.useState(false)
  const [form, setForm] = React.useState({ firstName: '', lastName: '', email: '', phone: '' })
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['portal-bookings'],
    queryFn: async () => {
      const { data } = await api.get('/portal/bookings')
      return data.data as Booking[]
    },
  })

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['portal-profile'],
    queryFn: async () => {
      const { data } = await api.get('/portal/profile')
      return data.data || data
    },
    enabled: activeTab === 'profile',
  })

  const { data: myDisputes, isLoading: disputesLoading } = useQuery({
    queryKey: ['portal-disputes'],
    queryFn: async () => {
      const { data } = await api.get('/disputes/my')
      return data.data as Dispute[]
    },
    enabled: activeTab === 'disputes',
  })

  const [disputeDialog, setDisputeDialog] = React.useState(false)
  const [disputeForm, setDisputeForm] = React.useState({
    type: 'BILLING_ERROR',
    description: '',
    amount: 0,
    bookingId: '',
  })

  const createDisputeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/disputes', {
        type: disputeForm.type,
        description: disputeForm.description,
        amount: disputeForm.amount,
        bookingId: disputeForm.bookingId || undefined,
      })
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-disputes'] })
      setDisputeDialog(false)
      setDisputeForm({ type: 'BILLING_ERROR', description: '', amount: 0, bookingId: '' })
      addToast('Dispute filed successfully', 'success')
    },
    onError: (err: any) => addToast(err.response?.data?.message || 'Failed to file dispute', 'error'),
  })

  React.useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
      })
    }
  }, [profile])

  const updateMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const { data } = await api.patch('/portal/profile', payload)
      return data.data || data
    },
    onSuccess: () => {
      addToast('Profile updated successfully', 'success')
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ['portal-profile'] })
    },
    onError: () => {
      addToast('Failed to update profile', 'error')
    },
  })

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'bookings', label: 'My Bookings', icon: CalendarCheck },
    { key: 'payments', label: 'Payment History', icon: History },
    { key: 'profile', label: 'My Profile', icon: User },
    { key: 'feedback', label: 'Feedback', icon: MessageSquare },
    { key: 'disputes', label: 'Disputes', icon: ShieldAlert },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          <span className="font-bold text-gray-900 dark:text-white">My Portal</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="border-b border-gray-200 dark:border-gray-800">
          <nav className="flex gap-6 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {activeTab === 'bookings' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Bookings</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View and manage your appointments</p>
              </div>
              <Button>Book New Service</Button>
            </div>

            {bookingsLoading ? (
              <TableSkeleton rows={4} />
            ) : !bookings?.length ? (
              <Card>
                <CardContent className="text-center py-12 text-gray-500">
                  <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No bookings yet</p>
                  <p className="text-sm mt-1">Book your first service to get started</p>
                  <Button className="mt-4">Book Now</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{booking.service?.name}</h3>
                            <StatusBadge status={booking.status} />
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <CalendarCheck className="h-4 w-4" />
                              {formatDate(booking.startTime, 'EEE, MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatDate(booking.startTime, 'h:mm a')}
                            </span>
                            <span className="flex items-center gap-1">
                              <CreditCard className="h-4 w-4" />
                              {formatCurrency(booking.totalPrice)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Button variant="outline" size="sm">View Details</Button>
                          {(booking.dispatch?.status === JobStatus.EN_ROUTE || booking.dispatch?.status === JobStatus.STARTED) && (
                            <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                              <Navigation className="h-3 w-3" />
                              Live Tracking
                            </span>
                          )}
                        </div>
                      </div>
                      {(booking.dispatch?.status === JobStatus.EN_ROUTE || booking.dispatch?.status === JobStatus.STARTED) && (
                        <div className="mt-4">
                          <TechnicianTracker
                            bookingId={booking.id}
                            customerLat={booking.customer?.addresses?.[0]?.latitude}
                            customerLng={booking.customer?.addresses?.[0]?.longitude}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'payments' && (
          <div className="text-center py-12 text-gray-500">
            <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Payment History</p>
            <p className="text-sm mt-1">Your payment history will appear here</p>
          </div>
        )}

        {activeTab === 'profile' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>Manage your personal information</CardDescription>
              </div>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm({ firstName: profile?.firstName || '', lastName: profile?.lastName || '', email: profile?.email || '', phone: profile?.phone || '' }) }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {profileLoading ? (
                <TableSkeleton rows={4} />
              ) : (
                <>
                  <Input
                    label="First Name"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    disabled={!editing}
                  />
                  <Input
                    label="Last Name"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    disabled={!editing}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    disabled={!editing}
                  />
                  <Input
                    label="Phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    disabled={!editing}
                  />
                </>
              )}
            </CardContent>
          </Card>
        )}
        {activeTab === 'feedback' && (
          <FeedbackForm
            bookings={bookings || []}
            onSubmit={async (data) => {
              try {
                await api.post('/satisfaction/survey', {
                  customerId: '',
                  touchpoint: 'GENERAL',
                  score: data.score,
                  scoreType: 'CSAT',
                  feedback: data.feedback,
                  category: data.category || undefined,
                  bookingId: data.bookingId || undefined,
                })
                addToast('Thank you for your feedback!', 'success')
              } catch {
                addToast('Failed to submit feedback', 'error')
              }
            }}
          />
        )}

        {activeTab === 'disputes' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Disputes</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and manage your disputes</p>
              </div>
              <Button onClick={() => setDisputeDialog(true)}>
                <ShieldAlert className="h-4 w-4 mr-2" /> File Dispute
              </Button>
            </div>

            {disputesLoading ? (
              <TableSkeleton rows={4} />
            ) : !myDisputes?.length ? (
              <Card>
                <CardContent className="text-center py-12 text-gray-500">
                  <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No disputes</p>
                  <p className="text-sm mt-1">You have no disputes on your account</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myDisputes.map((d) => {
                  const typeLabels: Record<string, string> = {
                    CHARGEBACK: 'Chargeback',
                    SERVICE_NOT_RENDERED: 'Not Rendered',
                    SERVICE_DEFICIENT: 'Deficient',
                    DAMAGES: 'Damages',
                    BILLING_ERROR: 'Billing Error',
                    OTHER: 'Other',
                  }
                  return (
                    <Card key={d.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">{typeLabels[d.type] || d.type}</h3>
                              <StatusBadge status={d.status} />
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{d.description}</p>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <CreditCard className="h-4 w-4" />
                                {formatCurrency(d.amount)}
                              </span>
                              {d.booking?.service && (
                                <span className="flex items-center gap-1">
                                  <CalendarCheck className="h-4 w-4" />
                                  {d.booking.service.name}
                                </span>
                              )}
                              <span className="text-xs text-gray-400">
                                {formatDate(d.createdAt, 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                        </div>
                        {d.resolution && (
                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-sm">
                              <span className="font-medium text-green-600 dark:text-green-400">Resolved: {d.resolution}</span>
                              {d.resolutionNote && <span className="text-gray-500 ml-2">- {d.resolutionNote}</span>}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            <Dialog open={disputeDialog} onOpenChange={setDisputeDialog}>
              <DialogContent>
                <DialogHeader><DialogTitle>File a Dispute</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createDisputeMutation.mutate() }} className="space-y-4">
                  <Select
                    label="Dispute Type"
                    value={disputeForm.type}
                    onChange={(e) => setDisputeForm({ ...disputeForm, type: e.target.value })}
                    options={[
                      { value: 'BILLING_ERROR', label: 'Billing Error' },
                      { value: 'SERVICE_NOT_RENDERED', label: 'Service Not Rendered' },
                      { value: 'SERVICE_DEFICIENT', label: 'Service Deficient' },
                      { value: 'DAMAGES', label: 'Damages' },
                      { value: 'CHARGEBACK', label: 'Chargeback' },
                      { value: 'OTHER', label: 'Other' },
                    ]}
                    required
                  />
                  <Input
                    label="Amount (in dispute)"
                    type="number"
                    value={disputeForm.amount}
                    onChange={(e) => setDisputeForm({ ...disputeForm, amount: Number(e.target.value) })}
                    min={0}
                    step="0.01"
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                      value={disputeForm.description}
                      onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })}
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-none"
                      placeholder="Describe what happened..."
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setDisputeDialog(false)}>Cancel</Button>
                    <Button type="submit" disabled={createDisputeMutation.isPending}>
                      {createDisputeMutation.isPending ? 'Submitting...' : 'File Dispute'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </>
        )}
      </main>
      <ChatWidget />
    </div>
  )
}

function FeedbackForm({ bookings, onSubmit }: {
  bookings: Booking[]
  onSubmit: (data: { score: number; feedback: string; category: string; bookingId: string }) => Promise<void>
}) {
  const [score, setScore] = React.useState(5)
  const [feedback, setFeedback] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [bookingId, setBookingId] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await onSubmit({ score, feedback, category, bookingId })
    setSubmitting(false)
    setScore(5)
    setFeedback('')
    setCategory('')
    setBookingId('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share Your Feedback</CardTitle>
        <CardDescription>Help us improve your experience</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setScore(n)}
                  className={`h-10 w-10 rounded-full text-sm font-bold transition-colors ${
                    n <= score
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category (optional)</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
            >
              <option value="">Select a category</option>
              {['cleanliness', 'punctuality', 'quality', 'communication', 'value'].map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          {bookings.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Related Booking (optional)</label>
              <select
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              >
                <option value="">General feedback</option>
                {bookings.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.service?.name} - {formatDate(b.startTime, 'MMM d, yyyy')}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Feedback</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-none"
              placeholder="Tell us about your experience..."
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function CustomerPortalPage() {
  const [queryClient] = React.useState(() => new QueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <PortalContent />
      </ToastProvider>
    </QueryClientProvider>
  )
}

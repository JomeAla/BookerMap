'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/ui/skeleton'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CalendarCheck, Clock, User, Building2, CreditCard, History, Save, Edit2 } from 'lucide-react'
import { ChatWidget } from '@/components/chat/chat-widget'
import type { Booking } from '@/types'

type Tab = 'bookings' | 'payments' | 'profile'

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
                        <div className="space-y-2">
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
                        <Button variant="outline" size="sm">View Details</Button>
                      </div>
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
      </main>
      <ChatWidget />
    </div>
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

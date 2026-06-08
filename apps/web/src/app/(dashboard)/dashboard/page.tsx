'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { CardSkeleton, TableSkeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate, getCurrencySymbol } from '@/lib/utils'
import {
  CalendarCheck,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  Plus,
  FileText,
  Bot,
} from 'lucide-react'
import type { Booking } from '@/types'
import { useTenantCurrency } from '@/hooks/useTenantCurrency'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 18 } },
}

function getUserName() {
  try {
    const user = JSON.parse(localStorage.getItem('bm_user') || '{}')
    return user.firstName || ''
  } catch {
    return ''
  }
}

function RevenueChart({ data, currency }: { data?: { date: string; revenue: number }[]; currency: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <TrendingUp className="h-8 w-8 mb-2 text-text-muted/40" />
        <p className="text-sm text-text-muted">Revenue data will appear here</p>
      </div>
    )
  }

  const values = data.map((d) => d.revenue)
  const max = Math.max(...values, 1)
  const labels = data.map((d) => {
    const date = new Date(d.date + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  })

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 h-32">
        {values.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(v / max) * 100}%` }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 80, damping: 15 }}
              className="w-full rounded-t-md bg-accent/80 hover:bg-accent transition-colors cursor-pointer relative"
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {formatCurrency(v, currency)}
              </div>
            </motion.div>
            <span className="text-[10px] text-text-muted">{labels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildInsights(stats: { todayBookings: number; revenue: number; totalCustomers: number; pendingInvoices: number } | undefined, currency: string) {
  if (!stats) return [{ icon: Bot as React.ComponentType<{ className?: string }>, text: 'Insights will appear as you get more data.' }]
  const list: { icon: React.ComponentType<{ className?: string }>; text: string }[] = []
  if (stats.todayBookings > 0) list.push({ icon: CalendarCheck, text: `You have ${stats.todayBookings} booking${stats.todayBookings > 1 ? 's' : ''} scheduled for today.` })
  if (stats.pendingInvoices > 0) list.push({ icon: FileText, text: `${stats.pendingInvoices} invoice${stats.pendingInvoices > 1 ? 's' : ''} awaiting payment.` })
  if (stats.revenue > 0) list.push({ icon: DollarSign, text: `Total revenue so far is ${formatCurrency(stats.revenue, currency)}.` })
  if (stats.totalCustomers > 0) list.push({ icon: Users, text: `${stats.totalCustomers} customer${stats.totalCustomers > 1 ? 's' : ''} in your database.` })
  return list.length > 0 ? list : [{ icon: Bot as React.ComponentType<{ className?: string }>, text: 'Insights will appear as you get more data.' }]
}

export default function DashboardPage() {
  const { currency } = useTenantCurrency()
  const firstName = getUserName()
  const [insightIndex, setInsightIndex] = React.useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setInsightIndex((prev) => (prev + 1) % insights.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/reports/dashboard-stats')
      return data.data as {
        todayBookings: number
        revenue: number
        totalCustomers: number
        pendingInvoices: number
      }
    },
  })

  const { data: recentBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['recent-bookings'],
    queryFn: async () => {
      const { data } = await api.get('/bookings', { params: { limit: '5', sort: '-createdAt' } })
      return data.data as Booking[]
    },
  })

  const { data: revenueData } = useQuery({
    queryKey: ['dashboard-revenue'],
    queryFn: async () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 6)
      const { data } = await api.get('/reports/revenue', {
        params: {
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          groupBy: 'day',
        },
      })
      return data.data as { data: { date: string; revenue: number }[] }
    },
  })

  const insights = buildInsights(stats, currency)

  const statCards = [
    { label: "Today's Bookings", value: stats?.todayBookings ?? 0, icon: CalendarCheck },
    { label: 'Monthly Revenue', value: stats?.revenue ? formatCurrency(stats.revenue, currency) : `${getCurrencySymbol(currency)}0.00`, icon: DollarSign },
    { label: 'Total Customers', value: stats?.totalCustomers ?? 0, icon: Users },
    { label: 'Pending Invoices', value: stats?.pendingInvoices ?? 0, icon: Clock },
  ]

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-8 pb-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/bookings/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-accent-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Booking
          </Link>
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-text-primary text-sm font-medium rounded-[var(--radius-button)] hover:bg-surface-secondary transition-colors"
          >
            <FileText className="h-4 w-4" />
            Create Invoice
          </Link>
        </div>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <motion.div key={stat.label} variants={item}>
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-accent" />
                        </div>
                      </div>
                      <p className="text-2xl font-semibold text-text-primary tracking-tight">{stat.value}</p>
                      <p className="text-sm text-text-muted mt-0.5">{stat.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">Upcoming Bookings</h2>
                  <p className="text-sm text-text-muted mt-0.5">Next 5 scheduled bookings</p>
                </div>
                <Link
                  href="/bookings"
                  className="text-sm font-medium text-accent hover:text-accent-dark transition-colors"
                >
                  View all
                </Link>
              </div>
              {bookingsLoading ? (
                <TableSkeleton rows={5} />
              ) : !recentBookings?.length ? (
                <div className="text-center py-12">
                  <CalendarCheck className="h-10 w-10 mx-auto mb-3 text-text-muted/50" />
                  <p className="text-text-secondary font-medium">No bookings yet</p>
                  <p className="text-sm text-text-muted mt-1">Create your first booking to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 pr-4 font-medium text-text-secondary">Customer</th>
                        <th className="text-left py-3 pr-4 font-medium text-text-secondary">Service</th>
                        <th className="text-left py-3 pr-4 font-medium text-text-secondary">Date</th>
                        <th className="text-left py-3 pr-4 font-medium text-text-secondary">Amount</th>
                        <th className="text-left py-3 font-medium text-text-secondary">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((booking) => (
                        <tr
                          key={booking.id}
                          className="border-b border-border/50 hover:bg-surface-secondary/50 transition-colors"
                        >
                          <td className="py-3 pr-4 text-text-primary font-medium">
                            {booking.customer?.firstName} {booking.customer?.lastName}
                          </td>
                          <td className="py-3 pr-4 text-text-secondary">{booking.service?.name}</td>
                          <td className="py-3 pr-4 text-text-secondary">
                            {formatDate(booking.startTime, 'MMM d, h:mm a')}
                          </td>
                          <td className="py-3 pr-4 text-text-primary font-medium">
                            {formatCurrency(booking.totalPrice)}
                          </td>
                          <td className="py-3">
                            <StatusBadge status={booking.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Bot className="h-5 w-5 text-accent" />
                <div>
                  <h2 className="text-base font-semibold text-text-primary">AI Insights</h2>
                  <p className="text-sm text-text-muted mt-0.5">Smart suggestions</p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl bg-accent/5 p-4 min-h-[120px]">
                <motion.div
                  key={insightIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                  className="flex items-start gap-3"
                >
                  {React.createElement(insights[insightIndex].icon, {
                    className: 'h-4 w-4 text-accent mt-0.5 flex-shrink-0',
                  })}
                  <p className="text-sm text-text-primary">{insights[insightIndex].text}</p>
                </motion.div>
              </div>
              <div className="mt-5 space-y-3">
                <RevenueChart data={revenueData?.data} currency={currency} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap gap-2"
      >
        {[
          { label: 'Pending Bookings', href: '/bookings?status=PENDING', count: stats?.todayBookings ?? 0, color: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'In Progress', href: '/dispatches', count: 0, color: 'bg-sky-50 text-sky-700 border-sky-200' },
          { label: 'Unpaid Invoices', href: '/invoices?status=SENT', count: stats?.pendingInvoices ?? 0, color: 'bg-rose-50 text-rose-700 border-rose-200' },
        ].map((section) => (
          <Link
            key={section.label}
            href={section.href}
            className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-full border text-sm font-medium transition-all ${section.color} hover:scale-[1.02]`}
          >
            {section.label}
            <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-white/60 text-xs font-bold">
              {section.count}
            </span>
          </Link>
        ))}
      </motion.div>
    </div>
  )
}

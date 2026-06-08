'use client'

import React, { useState, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight, ArrowLeft, Sparkles,
  CalendarCheck, Calendar, Clock, Users, Briefcase, MapPin, Truck, Navigation,
  Receipt, CreditCard, Wallet, BarChart3, TrendingUp, FileText, Shield, Zap,
  Bot, MessageSquare, Bell, Globe, Package, Megaphone, Star, Smile, AlertTriangle,
  Settings, Key, Webhook, Split, Handshake, ClipboardList, FileSpreadsheet, History,
  Layers, Code, QrCode, Headphones, UserCheck, Database, RefreshCw, Send, Lock
} from 'lucide-react'

const allFeatures = [
  {
    category: 'Booking & Scheduling',
    items: [
      { icon: CalendarCheck, title: 'Online Booking Widget', desc: 'Embeddable 4-step booking wizard (service, date/time, info, confirm). Customers book 24/7 with instant confirmation.' },
      { icon: Calendar, title: 'Smart Calendar', desc: 'Day, week, and month views with drag-and-drop rescheduling. FullCalendar integration with color-coded events by status.' },
      { icon: Clock, title: 'Availability Engine', desc: '30-minute interval slot generation with buffer time between jobs. Real-time conflict detection and overbooking prevention.' },
      { icon: RefreshCw, title: 'Recurring Bookings', desc: 'Set up daily, weekly, or monthly repeating bookings with automatic generation and discount support.' },
      { icon: QrCode, title: 'Embedded Widget', desc: 'Lightweight iframe widget with postMessage API. Drop a single script tag onto any website to accept bookings.' },
      { icon: History, title: 'Booking History', desc: 'Complete audit trail of every booking with status changes, reschedules, cancellations, and payment history.' },
    ],
  },
  {
    category: 'Dispatch & Routing',
    items: [
      { icon: Truck, title: 'Job Assignment', desc: 'Manual or automatic technician assignment with skills matching and load balancing. Job offer system for technician self-selection.' },
      { icon: Navigation, title: 'Route Optimization', desc: 'Optimize technician routes with one-click optimization. Haversine formula drive-time calculation between job sites.' },
      { icon: MapPin, title: 'Live GPS Tracking', desc: 'Real-time technician location sharing via WebSocket. Admin map dashboard with route history and geofencing arrival detection.' },
      { icon: ClipboardList, title: 'Status Workflow', desc: 'ASSIGNED, EN_ROUTE, STARTED, COMPLETED job lifecycle with timestamps and WebSocket notifications at each stage.' },
    ],
  },
  {
    category: 'Customer Management',
    items: [
      { icon: Users, title: 'Customer CRM', desc: 'Complete customer profiles with addresses, booking history, saved payment cards, and communication logs.' },
      { icon: Database, title: 'Import & Export', desc: 'Bulk customer import/export via CSV. Tag and group customers for segmentation and targeted marketing.' },
      { icon: Star, title: 'Reviews & Ratings', desc: 'Post-service star ratings and reviews. Public review display with admin moderation, reply, and verified booking badges.' },
      { icon: Smile, title: 'Satisfaction Surveys', desc: 'CSAT (1-5) and NPS (0-10) surveys with rule-based sentiment analysis. Trend tracking and category breakdowns.' },
    ],
  },
  {
    category: 'Payments & Invoicing',
    items: [
      { icon: Receipt, title: 'Automated Invoicing', desc: 'Auto-generated invoices on job completion with line items, tax, discounts, and partial payment tracking.' },
      { icon: CreditCard, title: 'Payment Gateways', desc: 'Paystack and Flutterwave integration with unified PaymentProvider interface. Initialize, verify, and refund payments.' },
      { icon: Wallet, title: 'POS & Terminal', desc: 'Paystack Terminal and Flutterwave POS support for on-site payments. Terminal status dashboard with real-time polling.' },
      { icon: FileText, title: 'PDF Invoices', desc: 'Professional PDF generation via pdfkit with A4 layout, line items table, payment history, and custom branding.' },
      { icon: Split, title: 'Split Payments', desc: 'Marketplace-style split payments with platform fee configuration. Auto-creation on completed bookings with paid invoices.' },
      { icon: Handshake, title: 'Settlement Reconciliation', desc: 'Automated daily reconciliation of provider settlements against local records. Match detection and auto-creation of discrepancies.' },
    ],
  },
  {
    category: 'AI Assistant',
    items: [
      { icon: Bot, title: 'Conversational AI', desc: 'Rule-based AI agent with 8 intent types (GREETING, BOOKING_CREATE, BOOKING_CANCEL, BOOKING_RESCHEDULE, etc.). No external AI API costs.' },
      { icon: MessageSquare, title: 'Chat Widget', desc: 'Floating chat bubble on customer-facing pages with quick reply buttons, voice input/output via Web Speech API, and payment action cards.' },
      { icon: Layers, title: 'Flow Builder', desc: 'Visual drag-and-drop conversation flow editor using ReactFlow. Build custom response paths with condition branching and template variables.' },
      { icon: Headphones, title: 'Escalation System', desc: 'Automatic detection of stuck conversations with human agent escalation queue. Priority levels and assignment workflow.' },
    ],
  },
  {
    category: 'Marketing & Growth',
    items: [
      { icon: Megaphone, title: 'Email Campaigns', desc: 'Automated re-engagement campaigns for lapsed customers with template variables, discount codes, and send tracking.' },
      { icon: Bell, title: 'Notifications', desc: 'In-app notification center with filter tabs, pagination, and mark-read. Email reminders and payment due alerts via cron jobs.' },
      { icon: TrendingUp, title: 'Commission Tracking', desc: 'Per-technician commission reports with FIXED and PERCENTAGE rate types. Revenue breakdowns and monthly summaries.' },
    ],
  },
  {
    category: 'Platform & Security',
    items: [
      { icon: Shield, title: 'Role-Based Access', desc: 'Five user roles (ADMIN, OWNER, MANAGER, TECHNICIAN, CUSTOMER) with JWT authentication and RolesGuard on all endpoints.' },
      { icon: Lock, title: 'Idempotency & Rate Limiting', desc: 'Idempotency-Key header support with 1-hour TTL and conflict detection. Global rate limiting at 60 req/min.' },
      { icon: Key, title: 'Public API', desc: 'Rate-limited REST API with API key authentication and scope-based access. Endpoints for services, bookings, customers, and availability.' },
      { icon: Webhook, title: 'Webhooks', desc: '13 supported event types with HMAC-SHA256 signed dispatch. External webhook triggers with action-based routing for automation.' },
      { icon: Globe, title: 'Multi-Location', desc: 'Support for multiple business locations per tenant. Location-scoped services, filtered availability, and branch-level management.' },
      { icon: Code, title: 'Multi-Tenant Architecture', desc: 'Tenant isolation via tenantId scoping on every record. JWT-secured with per-tenant settings, branding, and payment config.' },
    ],
  },
]

const colorClasses: Record<string, { bg: string; icon: string; hoverBg: string }> = {
  brand:   { bg: 'bg-brand-400/10',  icon: 'text-brand-400',  hoverBg: 'group-hover:bg-brand-400/20' },
  amber:   { bg: 'bg-amber-400/10',  icon: 'text-amber-400',  hoverBg: 'group-hover:bg-amber-400/20' },
  teal:    { bg: 'bg-teal-400/10',   icon: 'text-teal-400',   hoverBg: 'group-hover:bg-teal-400/20' },
  rose:    { bg: 'bg-rose-400/10',   icon: 'text-rose-400',   hoverBg: 'group-hover:bg-rose-400/20' },
  cyan:    { bg: 'bg-cyan-400/10',   icon: 'text-cyan-400',   hoverBg: 'group-hover:bg-cyan-400/20' },
  indigo:  { bg: 'bg-indigo-400/10', icon: 'text-indigo-400', hoverBg: 'group-hover:bg-indigo-400/20' },
}

function FeatureItem({ icon: Icon, title, desc, delay, color = 'brand' }: { icon: any; title: string; desc: string; delay: number; color?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const c = colorClasses[color] ?? colorClasses.brand
  return (
    <motion.div ref={ref}
      className="group relative rounded-xl bg-white border border-gray-300 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:scale-[1.02] hover:border-accent/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-300 cursor-default"
      initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay }}>
      <div className={`h-12 w-12 rounded-xl ${c.bg} flex items-center justify-center mb-4 ${c.hoverBg} transition-colors`}>
        <Icon className={`h-6 w-6 ${c.icon}`} />
      </div>
      <h3 className="font-bold text-base text-text mb-2">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
    </motion.div>
  )
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-surface text-text relative">
      <div className="relative z-10">
        <div className="sticky top-0 z-20 bg-surface/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-text-muted hover:text-text transition-colors text-sm font-medium">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
            <Link href="/register" className="text-sm bg-accent text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-accent-dark transition-colors">Start Free Trial</Link>
          </div>
        </div>

        <section className="pt-24 pb-8 md:pt-28 md:pb-10">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div className="max-w-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-flex items-center gap-2 text-accent font-semibold text-sm tracking-wide uppercase"><Sparkles className="h-4 w-4" /> Platform Features</span>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-3 text-text">
                Everything BookerMap can do
              </h1>
              <p className="mt-3 text-lg text-text-secondary">A complete tour of all 40+ features across booking, dispatch, payments, AI, and platform infrastructure.</p>
            </motion.div>
          </div>
        </section>

        {/* Feature categories */}
        {(() => {
          const colorKeys = ['brand', 'amber', 'teal', 'rose', 'cyan', 'indigo'] as const
          let globalIdx = 0
          return allFeatures.map((cat, ci) => (
          <section key={cat.category} className="pb-10 md:pb-14">
            <div className="max-w-7xl mx-auto px-6">
              <motion.div className="mb-5" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                <h2 className="text-2xl font-bold text-text">{cat.category}</h2>
              </motion.div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.items.map((item, idx) => {
                  const c = colorKeys[globalIdx % colorKeys.length]
                  globalIdx++
                  return (
                    <FeatureItem key={item.title} {...item} delay={idx * 0.06} color={c} />
                  )
                })}
              </div>
            </div>
          </section>
        ))})()}

        {/* CTA */}
        <section className="py-10 md:py-14 bg-gradient-to-br from-accent-dark via-accent to-accent-light text-center">
          <div className="max-w-xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-white">Ready to get started?</h2>
            <p className="mt-3 text-white/80">Start your free 14-day trial. No credit card required.</p>
            <Link href="/register" className="mt-5 group inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-sm bg-white text-accent hover:bg-accent-subtle transition-colors shadow-lg">
              Start Free Trial <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

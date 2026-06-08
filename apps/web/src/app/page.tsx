'use client'

import React from 'react'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion'
import { Menu, X, ArrowRight, Check, Star, ChevronLeft, ChevronRight, CalendarCheck, Zap, CreditCard, Users, BarChart3, Shield, Globe, Smartphone, Sparkles, Code, Bell } from 'lucide-react'
import { api } from '@/lib/api'

/* ═══════════════════════════════════════════════════════════
   ANIMATED MESH GRADIENT ORBS
   ═══════════════════════════════════════════════════════════ */
function GradientOrbs() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <motion.div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.25) 0%, rgba(52,211,153,0.1) 40%, transparent 70%)' }}
        animate={{ x: [0, 50, -30, 0], y: [0, -40, 30, 0], scale: [1, 1.15, 0.9, 1] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute -bottom-40 -left-20 w-[550px] h-[550px] rounded-full opacity-15 blur-[110px]"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.08) 40%, transparent 70%)' }}
        animate={{ x: [0, -60, 40, 0], y: [0, 30, -40, 0], scale: [1, 0.85, 1.1, 1] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 3 }} />
      <motion.div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] rounded-full opacity-12 blur-[90px]"
        style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.18) 0%, rgba(5,150,105,0.06) 50%, transparent 75%)' }}
        animate={{ scale: [1, 1.2, 1, 0.85, 1], x: [0, 40, -30, 0], y: [0, -20, 40, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 6 }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   GLASS NAVIGATION
   ═══════════════════════════════════════════════════════════ */
function NavBar() {
  const [open, setOpen] = useState(false)
  const { scrollY } = useScroll()
  const bgOpacity = useTransform(scrollY, [0, 80], [0, 0.88])
  return (
    <motion.header className="fixed top-0 left-0 right-0 z-50 h-16" style={{ background: `rgba(248,249,252,${bgOpacity.get()})`, borderBottom: `1px solid rgba(232,236,241,${bgOpacity.get()})`, backdropFilter: 'blur(24px)' }}>
      <nav className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center"><span className="text-white font-extrabold text-sm">B</span></div>
          <span className="font-bold text-lg text-text tracking-tight">BookerMap</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          {[
            { l: 'Features', h: '/features' },
            { l: 'How It Works', h: '#how-it-works' },
            { l: 'Pricing', h: '/pricing' },
            { l: 'API', h: '/api-docs' },
          ].map(i => <Link key={i.l} href={i.h} className="text-sm text-text-secondary hover:text-accent hover:bg-accent-subtle/30 px-2.5 py-1.5 rounded-lg font-medium transition-all">{i.l}</Link>)}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm text-text-secondary hover:text-text px-3 py-2 font-medium transition-colors">Login</Link>
          <Link href="/register" className="text-sm bg-accent text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-accent-dark transition-colors shadow-sm shadow-accent/20">Start Free Trial</Link>
        </div>
        <button className="md:hidden p-2 text-text" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </nav>
      <AnimatePresence>{open && (
        <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} className="md:hidden bg-surface/95 backdrop-blur-xl border-b border-border overflow-hidden">
          <div className="px-6 py-4 flex flex-col gap-2">
            {['Features','Pricing','How It Works','API Docs'].map(l => <Link key={l} href={l==='Features'?'/features':l==='Pricing'?'/pricing':l==='API Docs'?'/api-docs':`#${l.toLowerCase().replace(/\s+/g,'-')}`} className="text-sm text-text-secondary py-2" onClick={()=>setOpen(false)}>{l}</Link>)}
            <hr className="border-border" /><Link href="/login" className="text-sm text-text-secondary py-2" onClick={()=>setOpen(false)}>Login</Link>
            <Link href="/register" className="text-sm bg-accent text-white px-5 py-2.5 rounded-lg font-semibold text-center" onClick={()=>setOpen(false)}>Start Free Trial</Link>
          </div>
        </motion.div>
      )}</AnimatePresence>
    </motion.header>
  )
}

/* ═══════════════════════════════════════════════════════════
   LIQUID GLASS CARD
   ═══════════════════════════════════════════════════════════ */
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-2xl border border-border-glass bg-surface-glass backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.07),inset_0_1px_0_rgba(255,255,255,0.8)] p-7 ${className}`}>
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   COUNT UP
   ═══════════════════════════════════════════════════════════ */
function CountUp({ end, suffix = '', duration = 2.5 }: { end: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0); const ref = useRef<HTMLSpanElement>(null); const inView = useInView(ref, { once: true }); const started = useRef(false)
  useEffect(() => { if (!inView || started.current) return; started.current = true; const steps = 60; const inc = end / steps; let c = 0; let s = 0; const t = setInterval(() => { s++; c = Math.min(Math.round(inc * s), end); setVal(c); if (s >= steps) { setVal(end); clearInterval(t) } }, (duration * 1000) / steps); return () => clearInterval(t) }, [inView, end, duration])
  return <motion.span ref={ref} className="tabular-nums">{val.toLocaleString()}{suffix}</motion.span>
}

/* ═══════════════════════════════════════════════════════════
   BENTO FEATURE CARD
   ═══════════════════════════════════════════════════════════ */
function FeatureCard({ icon, title, desc, large, delay }: { icon: React.ReactNode; title: string; desc: string; large?: boolean; delay: number }) {
  const ref = useRef<HTMLDivElement>(null); const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.div ref={ref}       className={`group relative rounded-2xl border border-border-glass bg-surface-glass backdrop-blur-md p-7 shadow-[0_8px_24px_rgba(0,0,0,0.07),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-300 hover:shadow-[0_14px_40px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.95)] hover:-translate-y-0.5 cursor-default ${large ? 'lg:col-span-3' : ''}`}
      initial={{ opacity: 0, y: 32 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}>
      <div className="h-11 w-11 rounded-xl bg-accent-subtle flex items-center justify-center mb-5">{icon}</div>
      <h3 className="font-bold text-lg text-text mb-2.5">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════
   TESTIMONIAL CAROUSEL
   ═══════════════════════════════════════════════════════════ */
function TestimonialCarousel() {
  const [i, setI] = useState(0); const ref = useRef<HTMLDivElement>(null); const inView = useInView(ref, { once: true })
  const items = [
    { q: 'BookerMap transformed how we handle 200+ weekly bookings. The dispatch feature alone saved us hours every day.', n: 'Adebayo Ogunleye', b: 'Lagos Plumbing Pro', ini: 'AO' },
    { q: 'We tried three other platforms before BookerMap. Nothing else handles the complexity of a cleaning business with multiple teams as smoothly.', n: 'Ama Serwaa', b: 'Accra Clean Co', ini: 'AS' },
    { q: 'The automated invoicing and Paystack integration cut our payment collection time from weeks to hours.', n: 'Brian Mwangi', b: 'Nairobi Electric', ini: 'BM' },
  ]
  return (
    <motion.div ref={ref} className="max-w-3xl mx-auto" initial={{ opacity:0, y:20 }} animate={inView?{opacity:1,y:0}:{}} transition={{ duration:0.5 }}>
      <div className="relative overflow-hidden rounded-2xl border border-border-glass bg-surface-glass backdrop-blur-md p-8 md:p-10 min-h-[220px] shadow-[0_4px_16px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.7)]">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }} transition={{ type:'spring', stiffness:200, damping:25 }} className="flex flex-col items-center text-center">
            <div className="flex gap-1 mb-5">{Array.from({length:5}).map((_,j)=><Star key={j} className="h-5 w-5 fill-amber-400 text-amber-400" />)}</div>
            <p className="text-text text-lg leading-relaxed max-w-xl mb-4">{items[i].q}</p>
            <div className="h-11 w-11 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm mb-2">{items[i].ini}</div>
            <p className="font-semibold text-sm text-text">{items[i].n}</p>
            <p className="text-sm text-text-muted">{items[i].b}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-center gap-2 mt-4">
        <button onClick={()=>setI(i===0?items.length-1:i-1)} className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-text-muted hover:border-accent hover:text-accent transition-colors"><ChevronLeft className="h-4 w-4"/></button>
        {items.map((_,j)=><button key={j} onClick={()=>setI(j)} className={`h-2 rounded-full transition-all ${j===i?'w-7 bg-accent':'w-2 bg-border hover:bg-accent/30'}`} aria-label={`Testimonial ${j+1}`}/>)}
        <button onClick={()=>setI(i===items.length-1?0:i+1)} className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-text-muted hover:border-accent hover:text-accent transition-colors"><ChevronRight className="h-4 w-4"/></button>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
const features = [
  { icon: <CalendarCheck className="h-5 w-5 text-accent" />, title: 'Smart Booking Engine', desc: 'Accept bookings 24/7. Clients choose services, pick time slots, and receive instant confirmations. Calendar sync prevents double-bookings.', large: true },
  { icon: <Zap className="h-5 w-5 text-accent" />, title: 'Real-time Dispatch', desc: 'Assign jobs to the nearest technician. Live GPS tracking and route optimization built in.' },
  { icon: <CreditCard className="h-5 w-5 text-accent" />, title: 'Automated Payments', desc: 'Invoices generate on job completion. Paystack and Flutterwave integration with split payments.' },
  { icon: <Users className="h-5 w-5 text-accent" />, title: 'Customer CRM', desc: 'Centralized profiles with booking history, preferences, and communication logs.' },
  { icon: <Shield className="h-5 w-5 text-accent" />, title: 'AI Chat Assistant', desc: 'Built-in AI handles inquiries, booking changes, and FAQs 24/7. No external AI costs.' },
  { icon: <BarChart3 className="h-5 w-5 text-accent" />, title: 'Analytics & Reports', desc: 'Revenue trends, technician performance, customer retention, and exportable dashboards.', large: true },
  { icon: <Smartphone className="h-5 w-5 text-accent" />, title: 'Customer Mobile App', desc: 'Native React Native app for customers to book, track technicians, and manage their profile on the go.' },
  { icon: <Bell className="h-5 w-5 text-accent" />, title: 'Smart Notifications', desc: 'In-app, email, and SMS notifications with reminder crons. Payment due alerts and booking confirmations sent automatically.' },
  { icon: <Code className="h-5 w-5 text-accent" />, title: 'Public API & Webhooks', desc: 'Rate-limited REST API with API key auth. 13 webhook event types with HMAC-SHA256 signed dispatch for automation.' },
]

const steps = [
  { n:1, t:'Create Services', d:'Define your catalog with pricing, duration, and intake forms.' },
  { n:2, t:'Customers Book Online', d:'Share your booking page. Customers book 24/7.' },
  { n:3, t:'Techs Get Dispatched', d:'Real-time routing sends the right tech to the job.' },
  { n:4, t:'Get Paid Instantly', d:'Invoices generate and payments process automatically.' },
]

const trades = ['Plumbers','Electricians','Cleaners','Painters','AC Technicians','Phone Repair','Carpenters','Mechanics','Gardeners','Tailors','Caterers','Barbers','Photographers','Tutors','Movers','Welders','Pest Control','Laundry']

interface PublicStats {
  totalBookings: number
  totalBusinesses: number
  totalCustomers: number
  totalServices: number
}

const FALLBACK_STATS = [
  { value: 10000, suffix: '+', label: 'Bookings Monthly' },
  { value: 500, suffix: '+', label: 'Active Businesses' },
  { value: 98, suffix: '%', label: 'Satisfaction Rate' },
  { value: 4, suffix: '', label: 'Countries' },
]

function usePublicStats() {
  return useQuery({
    queryKey: ['public-stats'],
    queryFn: async () => {
      const { data } = await api.get('/public/stats')
      return data.data as PublicStats
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

function StatSkeleton() {
  return <div className="h-12 sm:h-14 mx-auto w-32 sm:w-40 rounded-md bg-white/10 animate-pulse" aria-hidden="true" />
}

export default function HomePage() {
  const { data: stats, isLoading: statsLoading, isError: statsError } = usePublicStats()

  const displayStats = stats && !statsError
    ? [
        { value: stats.totalBookings, suffix: '+', label: 'Bookings' },
        { value: stats.totalBusinesses, suffix: '+', label: 'Active Businesses' },
        { value: stats.totalCustomers, suffix: '+', label: 'Customers' },
        { value: stats.totalServices, suffix: '+', label: 'Services' },
      ]
    : FALLBACK_STATS

  return (
    <div className="min-h-screen text-text relative">
      <GradientOrbs />
      <div className="relative z-10">
        <NavBar />

        {/* ════ HERO ════ */}
        <section className="pt-22 pb-8 md:pt-26 md:pb-12" aria-labelledby="hero-h">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-10 items-center">
              <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.7 }}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-subtle border border-accent/10 text-accent-dark text-xs font-semibold mb-4 tracking-wide uppercase">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent/60"/><span className="relative inline-flex rounded-full h-2 w-2 bg-accent"/></span>
                  500+ businesses across Africa
                </div>
                <h1 id="hero-h" className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.06] text-text">
                  Schedule smarter.<br />
                  <span className="bg-gradient-to-r from-accent via-accent-light to-teal-400 bg-clip-text text-transparent animate-gradient">Grow faster.</span>
                </h1>
                <p className="mt-4 text-base text-text-secondary leading-relaxed max-w-lg">The all-in-one booking platform for African home service businesses. Manage bookings, dispatch technicians, and process payments — all in one place.</p>
                <div className="mt-3 flex flex-col sm:flex-row gap-2.5">
                  <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-accent text-white px-6 py-3.5 rounded-xl font-semibold text-sm hover:bg-accent-dark transition-colors shadow-sm shadow-accent/20">Start Free Trial <ArrowRight className="h-4 w-4" /></Link>
                  <Link href="/features" className="inline-flex items-center justify-center gap-2 border border-border text-text-secondary px-6 py-3.5 rounded-xl font-semibold text-sm hover:border-accent/30 hover:text-accent transition-colors bg-white/60 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)]">View features</Link>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-medium text-text-secondary">
                  {['Free 14-day trial','No credit card needed','Cancel anytime'].map(i=><span key={i} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" />{i}</span>)}
                </div>
              </motion.div>
              <motion.div className="hidden lg:block" initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.25, duration:0.7 }}>
                <GlassCard className="p-0 overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
                    <div className="flex gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-red-400/70"/><div className="h-2.5 w-2.5 rounded-full bg-amber-400/70"/><div className="h-2.5 w-2.5 rounded-full bg-emerald-400/70"/></div>
                     <span className="text-xs font-medium text-text-secondary ml-2">Calendar — June 2026</span>
                  </div>
                  <div className="p-5 space-y-2">
                    {[{d:'Mon 8',l:'Plumbing Repair',t:'9:00 AM',c:'border-l-accent bg-accent-subtle/50'},{d:'Tue 9',l:'Deep Cleaning',t:'11:00 AM',c:'border-l-teal-400 bg-teal-50/50'},{d:'Wed 10',l:'Electrical Fix',t:'2:00 PM',c:'border-l-accent bg-accent-subtle/50'},{d:'Thu 11',l:'AC Maintenance',t:'10:00 AM',c:'border-l-teal-400 bg-teal-50/50'},{d:'Fri 12',l:'Painting Job',t:'8:00 AM',c:'border-l-accent bg-accent-subtle/50'}].map((item,idx)=>(
                      <motion.div key={idx} className={`flex items-center gap-3 p-2.5 rounded-lg border border-l-2 border-border ${item.c}`} initial={{ opacity:0,x:-10 }} animate={{ opacity:1,x:0 }} transition={{ delay:0.5+idx*0.08 }}>
                        <span className="text-xs text-text-muted w-10 font-medium">{item.d}</span><span className="text-sm text-text font-medium flex-1">{item.l}</span><span className="text-xs text-text-muted">{item.t}</span>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
                <motion.div className="absolute -bottom-3 -right-3" animate={{ y:[0,-6,0] }} transition={{ duration:4, repeat:Infinity, ease:'easeInOut' }}>
                  <div className="rounded-xl border border-border-glass bg-surface-glass backdrop-blur-md p-3 shadow-[0_2px_12px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)] flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center"><Check className="h-4 w-4 text-white" /></div>
                    <div><p className="text-xs font-bold text-text">Booking Confirmed</p><p className="text-[10px] text-text-muted">Plumbing Repair — Mon 8</p></div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ════ FEATURES ════ */}
        <section id="features" className="py-8 md:py-12" aria-labelledby="feat-h">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div className="max-w-2xl mb-5" initial={{ opacity:0,y:16 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}>
              <span className="text-accent font-semibold text-sm tracking-wide uppercase"><Sparkles className="h-3.5 w-3.5 inline mr-1" /> Features</span>
              <h2 id="feat-h" className="text-4xl sm:text-5xl font-bold tracking-tight mt-3">Everything you need to run your business</h2>
              <p className="mt-3 text-lg text-text-secondary">From booking to payment — the complete service lifecycle.</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {features.slice(0, 6).map((f, idx) => <FeatureCard key={f.title} {...f} desc={f.desc} delay={idx * 0.07} />)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-4">
              {features.slice(6).map((f, idx) => <FeatureCard key={f.title} {...f} desc={f.desc} delay={(idx + 6) * 0.07} />)}
            </div>
            <div className="mt-8 text-center">
              <Link href="/features" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-accent text-white hover:bg-accent-dark transition-colors shadow-md shadow-accent/20">View All Features <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </section>

        {/* ════ MADE FOR ════ */}
        <section className="py-8 md:py-12" aria-labelledby="made-h">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div className="max-w-2xl mb-4" initial={{ opacity:0,y:16 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}>
              <span className="text-accent font-semibold text-sm tracking-wide uppercase"><Globe className="h-3.5 w-3.5 inline mr-1" /> Made For</span>
              <h2 id="made-h" className="text-4xl sm:text-5xl font-bold tracking-tight mt-3">Built for every trade</h2>
              <p className="mt-3 text-lg text-text-secondary">No matter your profession, BookerMap streamlines your operations.</p>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {trades.map((item, idx) => (
                <motion.div key={item} className="rounded-xl border border-gray-400 bg-surface-glass backdrop-blur-sm p-4 text-center shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:border-accent/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 transition-all duration-200 cursor-default"
                  initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay:idx*0.03 }}>
                  <p className="text-sm font-semibold text-text">{item}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ════ HOW IT WORKS ════ */}
        <section id="how-it-works" className="py-8 md:py-12" aria-labelledby="how-h">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div className="max-w-2xl mb-5" initial={{ opacity:0,y:16 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}>
              <span className="text-accent font-semibold text-sm tracking-wide uppercase">How It Works</span>
              <h2 id="how-h" className="text-4xl sm:text-5xl font-bold tracking-tight mt-3">Get started in minutes</h2>
              <p className="mt-3 text-lg text-text-secondary">No technical skills required. Four simple steps.</p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
              {steps.map((s, idx) => (
                <div key={s.n} className="relative">
                  {idx<3 && <div className="hidden lg:block absolute top-9 left-[calc(50%+24px)] w-[calc(100%-48px)] h-px bg-accent/15" />}
                  <div className="flex lg:flex-col items-start gap-4 lg:gap-5 pb-6 lg:pb-0 lg:pr-6">
                    <div className="flex-shrink-0 h-16 w-16 rounded-2xl bg-accent-subtle border border-accent/10 flex items-center justify-center"><span className="text-2xl font-extrabold text-accent">{s.n}</span></div>
                    <div><h3 className="font-bold text-lg text-text mb-1.5">{s.t}</h3><p className="text-sm text-text-secondary leading-relaxed">{s.d}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════ STATS ════ */}
        <section className="py-8 md:py-12 relative overflow-hidden" aria-label="Platform statistics">
          <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent-dark" />
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage:'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize:'40px 40px' }} />
          <div className="max-w-7xl mx-auto px-6 relative">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              {displayStats.map((s) => (
                <div key={s.label}>
                  {statsLoading ? (
                    <StatSkeleton />
                  ) : (
                    <p className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight"><CountUp end={s.value} suffix={s.suffix} /></p>
                  )}
                  <p className="mt-2 text-sm text-white/60 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════ TESTIMONIALS ════ */}
        <section id="testimonials" className="py-8 md:py-12" aria-labelledby="test-h">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div className="max-w-2xl mb-5" initial={{ opacity:0,y:16 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}>
              <span className="text-accent font-semibold text-sm tracking-wide uppercase"><Star className="h-3.5 w-3.5 inline mr-1" />Testimonials</span>
              <h2 id="test-h" className="text-4xl sm:text-5xl font-bold tracking-tight mt-3">Trusted across Africa</h2>
              <p className="mt-3 text-lg text-text-secondary">See how BookerMap helps businesses grow.</p>
            </motion.div>
            <TestimonialCarousel />
          </div>
        </section>

        {/* ════ CTA ════ */}
        <section className="py-8 md:py-12 relative overflow-hidden text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-accent to-accent-dark" />
          <div className="relative max-w-xl mx-auto px-6">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">Ready to transform your business?</h2>
            <p className="mt-3 text-lg text-white/70">Start your free 14-day trial. No credit card required.</p>
            <div className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 bg-white text-accent px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-accent-subtle transition-colors shadow-lg">Start Free Trial <ArrowRight className="h-4 w-4" /></Link>
              <Link href="mailto:sales@bookermap.com" className="text-white/60 hover:text-white px-5 py-3.5 font-medium text-sm transition-colors">Talk to sales</Link>
            </div>
          </div>
        </section>

        {/* ════ FOOTER ════ */}
        <footer className="border-t border-border bg-white/50 backdrop-blur-sm py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[{t:'Product',l:['Features','Pricing','How It Works','Free Trial']},{t:'Company',l:['About','Blog','Careers','Contact']},{t:'Legal',l:['Privacy Policy','Terms of Service','Cookie Policy','DPA']}].map(c=>
                <div key={c.t}><h3 className="font-semibold text-text mb-4">{c.t}</h3><ul className="space-y-2.5 text-sm">{c.l.map(l=><li key={l}><Link href="#" className="text-text-secondary hover:text-text transition-colors">{l}</Link></li>)}</ul></div>
              )}
              <div><h3 className="font-semibold text-text mb-4">Contact</h3><ul className="space-y-2.5 text-sm text-text-secondary"><li>Lagos, Nigeria</li><li><a href="mailto:hello@bookermap.com" className="hover:text-text transition-colors">hello@bookermap.com</a></li><li><a href="tel:+2348000000000" className="hover:text-text transition-colors">+234 800 000 0000</a></li></ul></div>
            </div>
            <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2"><div className="h-5 w-5 rounded bg-accent flex items-center justify-center"><span className="text-white font-bold text-[9px]">B</span></div><p className="text-sm text-text-muted">&copy; {new Date().getFullYear()} BookerMap.</p></div>
              <div className="flex gap-6"><Link href="#" className="text-sm text-text-muted hover:text-text">Twitter</Link><Link href="#" className="text-sm text-text-muted hover:text-text">LinkedIn</Link><Link href="#" className="text-sm text-text-muted hover:text-text">Facebook</Link></div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

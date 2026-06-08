'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowLeft, UserPlus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function RegisterPage() {
  const router = useRouter()
  const { register: doRegister } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', tenantSlug: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try { await doRegister(form); router.push('/dashboard') } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 order-1 lg:order-none">
        <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="lg:hidden mb-8">
            <Link href="/" className="text-slate-400 hover:text-white text-sm inline-flex items-center gap-1.5 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="mt-1 text-slate-400 text-sm">Start your 14-day free trial. No credit card required.</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">First Name</label>
                <input
                  type="text" required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-all"
                  placeholder="First name"
                  value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">Last Name</label>
                <input
                  type="text" required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-all"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Business Name</label>
              <input
                type="text" required
                className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-all"
                placeholder="Your business or brand name"
                value={form.tenantSlug}
                onChange={e => setForm({ ...form, tenantSlug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Email</label>
              <input
                type="email" required
                className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-all"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} required minLength={8}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-all pr-10"
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 transition-all duration-300 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {loading ? 'Creating account...' : (<><UserPlus className="h-4 w-4" /> Create Account</>)}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Sign in</Link>
          </p>
        </motion.div>
      </div>

      {/* Right brand panel (mirrored) */}
      <div className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 relative overflow-hidden order-none lg:order-1">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-20 -right-20 w-64 h-64 bg-brand-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -left-20 w-80 h-80 bg-brand-800/20 rounded-full blur-3xl" />
        <div className="relative flex flex-col justify-center px-12 w-full">
          <Link href="/" className="text-white/60 hover:text-white text-sm inline-flex items-center gap-1.5 mb-12 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <h2 className="text-3xl font-bold text-white leading-tight">Start your free trial</h2>
            <p className="mt-3 text-brand-100/80 leading-relaxed">Join 500+ home service businesses across Africa using BookerMap to streamline their operations and grow their revenue.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 p-5 rounded-xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm">
            <p className="text-white/75 text-sm italic leading-relaxed">&ldquo;BookerMap helped us reduce no-shows by 60% and double our monthly revenue.&rdquo;</p>
            <p className="mt-3 text-white/40 text-xs">Adebayo O., Lagos Plumbing Pro</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

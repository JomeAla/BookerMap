'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowLeft, LogIn } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const r = await login(form.email, form.password)
      if (r?.twoFactorRequired) { router.push(`/auth/2fa?userId=${r.userId}`); return }
      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left brand panel — white bg, black text */}
      <div className="hidden lg:flex lg:w-[42%] bg-white relative overflow-hidden border-r border-border">
        <div className="relative flex flex-col justify-center px-12 w-full">
          <Link href="/" className="text-text-muted hover:text-text text-sm inline-flex items-center gap-1.5 mb-12 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <h2 className="text-3xl font-bold text-text leading-tight">Smart booking for home services</h2>
            <p className="mt-3 text-text-secondary leading-relaxed">Manage bookings, dispatch technicians, and process payments — all from one powerful platform.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-12 p-5 rounded-xl bg-accent-subtle/30 border border-accent/10">
            <p className="text-text-secondary text-sm italic leading-relaxed">&ldquo;BookerMap cut our payment collection time from weeks to hours. Best decision we made for our electrical business.&rdquo;</p>
            <p className="mt-3 text-text-muted text-xs">Brian M., Nairobi Electric</p>
          </motion.div>
        </div>
      </div>

      {/* Right form panel — accent green bg */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gradient-to-br from-accent-dark via-accent to-accent-light">
        <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="lg:hidden mb-8">
            <Link href="/" className="text-white/70 hover:text-white text-sm inline-flex items-center gap-1.5 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="mt-1 text-white/70 text-sm">Sign in to your BookerMap account</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3 rounded-lg bg-red-500/20 border border-red-400/30 text-white text-sm">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Email</label>
              <input
                type="email" required
                className="w-full px-3.5 py-2.5 rounded-lg bg-white/15 border border-white/20 text-white placeholder:text-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white/15 border border-white/20 text-white placeholder:text-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all pr-10"
                  placeholder="Your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                  onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Link href="/forgot-password" className="text-sm text-white/80 hover:text-white font-medium transition-colors">
                Forgot password?
              </Link>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-sm text-accent bg-white hover:bg-accent-subtle transition-all duration-300 disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-md">
              {loading ? 'Signing in...' : (<><LogIn className="h-4 w-4" /> Sign In</>)}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/70">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-white hover:underline font-medium transition-colors">Sign up</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

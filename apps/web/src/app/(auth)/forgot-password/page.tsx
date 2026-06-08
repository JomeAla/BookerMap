'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Mail, CheckCircle, Send } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try { await forgotPassword(email); setSent(true) } catch (err: any) {
      setError(err?.response?.data?.message || 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6 py-12">
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div key="success" className="w-full max-w-md" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}>
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm p-8 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="h-14 w-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="h-7 w-7 text-green-400" />
              </motion.div>
              <h1 className="text-xl font-bold text-white">Check your email</h1>
              <p className="mt-2 text-slate-400 text-sm">
                We sent a reset link to <span className="font-medium text-slate-300">{email}</span>
              </p>
              <p className="mt-1 text-slate-500 text-xs">If you don&apos;t see it, check your spam folder.</p>
              <div className="mt-6 flex flex-col gap-2">
                <button onClick={() => { setSent(false); setEmail(''); setError('') }}
                  className="text-sm text-slate-400 hover:text-white transition-colors">
                  Try a different email
                </button>
                <Link href="/login" className="text-sm text-brand-400 hover:text-brand-300 font-medium transition-colors">
                  Return to sign in
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" className="w-full max-w-md" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.4 }}>
            <Link href="/login" className="text-slate-400 hover:text-white text-sm inline-flex items-center gap-1.5 mb-8 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>

            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm p-8">
              <div className="h-11 w-11 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-5">
                <Mail className="h-5 w-5 text-brand-400" />
              </div>
              <h1 className="text-xl font-bold text-white">Reset your password</h1>
              <p className="mt-1 text-slate-400 text-sm">Enter your email and we will send you a reset link.</p>

              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">Email</label>
                  <input
                    type="email" required
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-all"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 transition-all duration-300 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {loading ? 'Sending...' : (<><Send className="h-4 w-4" /> Send Reset Link</>)}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

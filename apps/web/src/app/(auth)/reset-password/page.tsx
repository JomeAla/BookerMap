'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, CheckCircle, AlertTriangle, Lock, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

function ResetPasswordForm() {
  const token = useSearchParams().get('token')
  const router = useRouter()
  const { resetPassword } = useAuth()
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (pass !== confirm) { setError('Passwords do not match'); return }
    if (pass.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      if (!token) { setError('Missing reset token'); return }
      await resetPassword(token, pass)
      setDone(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reset password')
    } finally { setLoading(false) }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6 py-12">
        <motion.div className="w-full max-w-md" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm p-8 text-center">
            <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="h-7 w-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Invalid reset link</h1>
            <p className="mt-2 text-slate-400 text-sm">This link is missing a token. Please request a new one.</p>
            <Link href="/forgot-password"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Request new link
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6 py-12">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="success" className="w-full max-w-md" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}>
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm p-8 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="h-14 w-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="h-7 w-7 text-green-400" />
              </motion.div>
              <h1 className="text-xl font-bold text-white">Password reset</h1>
              <p className="mt-2 text-slate-400 text-sm">Your password has been updated. Redirecting to sign in...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" className="w-full max-w-md" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.4 }}>
            <Link href="/login" className="text-slate-400 hover:text-white text-sm inline-flex items-center gap-1.5 mb-8 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>

            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm p-8">
              <div className="h-11 w-11 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-5">
                <Lock className="h-5 w-5 text-brand-400" />
              </div>
              <h1 className="text-xl font-bold text-white">Set new password</h1>
              <p className="mt-1 text-slate-400 text-sm">Enter your new password below.</p>

              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  {error}
                </motion.div>
              )}

              <form onSubmit={submit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={show ? 'text' : 'password'} required minLength={8}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-all pr-10"
                      placeholder="Min 8 characters"
                      value={pass}
                      onChange={e => setPass(e.target.value)}
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      onClick={() => setShow(!show)}>
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1.5">Confirm Password</label>
                  <input
                    type={show ? 'text' : 'password'} required
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-all"
                    placeholder="Re-enter your password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 transition-all duration-300 disabled:opacity-50">
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center px-6">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}

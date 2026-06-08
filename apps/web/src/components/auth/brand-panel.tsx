'use client'

import { motion } from 'framer-motion'

export function BrandPanel() {
  return (
    <div className="relative hidden lg:flex w-[45%] flex-col items-center justify-center bg-slate-900 px-12 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-800/50 via-transparent to-slate-950/50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 text-center"
      >
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4F46E5] shadow-lg shadow-indigo-500/30">
          <span className="text-white font-bold text-2xl tracking-tight">B</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-white" style={{ fontFamily: 'var(--font-geist-sans)' }}>
          BookerMap
        </h1>
        <p className="mt-3 text-lg text-slate-400">
          Smart booking for home service businesses
        </p>
      </motion.div>

      <motion.blockquote
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="absolute bottom-12 left-12 right-12 z-10 border-l-2 border-[#4F46E5] pl-4"
      >
        <p className="text-sm leading-relaxed text-slate-400 italic">
          &ldquo;BookerMap helped us reduce no-shows by 60% and double monthly revenue.&rdquo;
        </p>
        <footer className="mt-2 text-xs text-slate-500">
          Adebayo O., Lagos Plumbing Pro
        </footer>
      </motion.blockquote>
    </div>
  )
}

'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  LayoutDashboard,
  Calendar,
  CalendarCheck,
  Users,
  Briefcase,
  Truck,
  Receipt,
  CreditCard,
  Package,
  Megaphone,
  AlertTriangle,
  Star,
  Smile,
  BarChart3,
  Bell,
  Settings,
  Bot,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquare,
  MessageCircle,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badgeKey?: 'escalations' | 'disputes'
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/services', label: 'Services', icon: Briefcase },
  { href: '/dispatches', label: 'Dispatches', icon: Truck },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/disputes', label: 'Disputes', icon: AlertTriangle, badgeKey: 'disputes' },
  { href: '/reviews', label: 'Reviews', icon: Star },
  { href: '/satisfaction', label: 'Satisfaction', icon: Smile },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/notifications/bulk-sms', label: 'Bulk SMS', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/ai-agent', label: 'AI Agent', icon: Bot },
  { href: '/ai/feedback', label: 'AI Feedback', icon: MessageCircle },
]

const adminItems: NavItem[] = [
  { href: '/admin', label: 'Platform Admin', icon: Shield },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  open: boolean
  onClose: () => void
}

export function Sidebar({ collapsed, onToggle, open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  const { data: escalationCount } = useQuery({
    queryKey: ['escalation-count'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/ai/escalations/stats/open-count')
        return data.data?.count ?? 0
      } catch {
        return 0
      }
    },
    refetchInterval: 15000,
    enabled: !!user && ['ADMIN', 'MANAGER', 'OWNER'].includes(user.role),
  })

  const { data: disputeOpenCount } = useQuery({
    queryKey: ['dispute-open-count'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/disputes/stats')
        return data.data?.openCount ?? 0
      } catch {
        return 0
      }
    },
    refetchInterval: 15000,
    enabled: !!user && ['ADMIN', 'MANAGER', 'OWNER'].includes(user.role),
  })

  const getBadgeCount = (item: NavItem): number => {
    if (item.badgeKey === 'escalations') return escalationCount ?? 0
    if (item.badgeKey === 'disputes') return disputeOpenCount ?? 0
    return 0
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0F172A]">
      <div className={cn(
        'flex h-16 items-center border-b border-white/[0.06]',
        collapsed ? 'justify-center px-3' : 'px-5'
      )}>
        <div className="flex items-center gap-3 overflow-hidden">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            className="shrink-0"
          >
            <rect width="28" height="28" rx="8" fill="#4F46E5" />
            <path
              d="M7 10h14M7 14h10M7 18h6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <motion.span
            initial={false}
            animate={{
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : 'auto',
            }}
            transition={{ duration: 0.2 }}
            className="text-white font-semibold text-base whitespace-nowrap overflow-hidden"
          >
            BookerMap
          </motion.span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const badgeCount = getBadgeCount(item)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-indigo-600/20 text-white'
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
              )}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-[#4F46E5]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <div className="relative shrink-0">
                <Icon className="h-5 w-5" />
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              <motion.span
                initial={false}
                animate={{
                  opacity: collapsed ? 0 : 1,
                  width: collapsed ? 0 : 'auto',
                }}
                transition={{ duration: 0.2 }}
                className="whitespace-nowrap overflow-hidden"
              >
                {item.label}
              </motion.span>
              {badgeCount > 0 && !collapsed && (
                <span className="ml-auto h-5 min-w-[20px] flex items-center justify-center px-1.5 text-[10px] font-semibold text-white bg-red-500/90 rounded-full">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </Link>
          )
        })}

        {user && user.role === 'ADMIN' && (
          <>
            <div className="pt-3 pb-1 px-3">
              <motion.span
                initial={false}
                animate={{
                  opacity: collapsed ? 0 : 1,
                  height: collapsed ? 0 : 'auto',
                }}
                transition={{ duration: 0.2 }}
                className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest whitespace-nowrap overflow-hidden block"
              >
                Platform Admin
              </motion.span>
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-admin"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-amber-500"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <Icon className="h-5 w-5 shrink-0" />
                  <motion.span
                    initial={false}
                    animate={{
                      opacity: collapsed ? 0 : 1,
                      width: collapsed ? 0 : 'auto',
                    }}
                    transition={{ duration: 0.2 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="shrink-0 border-t border-white/[0.06]">
        <button
          onClick={onToggle}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-3 text-sm text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 transition-colors',
            collapsed ? 'justify-center' : ''
          )}
        >
          <div className="shrink-0">
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </div>
          <motion.span
            initial={false}
            animate={{
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : 'auto',
            }}
            transition={{ duration: 0.2 }}
            className="whitespace-nowrap overflow-hidden text-xs"
          >
            Collapse menu
          </motion.span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className={cn(
          'hidden md:block fixed inset-y-0 left-0 z-40 overflow-hidden',
        )}
      >
        {sidebarContent}
      </motion.aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] md:hidden"
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

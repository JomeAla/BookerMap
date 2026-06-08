'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  User as UserIcon,
  Menu,
  X,
} from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/calendar': 'Calendar',
  '/bookings': 'Bookings',
  '/customers': 'Customers',
  '/services': 'Services',
  '/dispatches': 'Dispatches',
  '/invoices': 'Invoices',
  '/inventory': 'Inventory',
  '/marketing': 'Marketing',
  '/disputes': 'Disputes',
  '/reviews': 'Reviews',
  '/satisfaction': 'Satisfaction',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/split-payments': 'Split Payments',
  '/settlements': 'Settlements',
}

interface HeaderProps {
  onMenuClick: () => void
  isSidebarOpen: boolean
}

export function Header({ onMenuClick, isSidebarOpen }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)
  const [notificationsOpen, setNotificationsOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  const currentPage = pageTitles[pathname] || pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard'

  const user = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('bm_user') || '{}')
    } catch {
      return {}
    }
  }, [])

  const unreadCount = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('bm_unread') || '0')
    } catch {
      return 0
    }
  }, [])

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('bm_token')
    localStorage.removeItem('bm_user')
    localStorage.removeItem('bm_refresh')
    router.push('/login')
  }

  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'U'

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-6 bg-surface/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-surface-secondary transition-colors"
          aria-label="Toggle menu"
        >
          {isSidebarOpen ? <X className="h-5 w-5 text-text-primary" /> : <Menu className="h-5 w-5 text-text-primary" />}
        </button>
        <div>
          <h1 className="text-lg font-semibold text-text-primary tracking-tight capitalize">
            {currentPage}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2" ref={menuRef}>
        <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-text-muted bg-surface-secondary rounded-lg border border-border hover:border-accent/30 hover:text-text-secondary transition-colors w-48">
          <Search className="h-4 w-4" />
          <span>Search...</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-border/50 text-text-muted">
            Ctrl+K
          </kbd>
        </button>

        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <Bell className="h-5 w-5 text-text-secondary" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] px-1 flex items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="absolute right-0 mt-2 w-80 bg-surface rounded-xl border border-border shadow-lg shadow-slate-900/5 p-4"
              >
                <p className="text-sm font-medium text-text-primary mb-3">Notifications</p>
                <div className="text-center py-6">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-text-muted/50" />
                  <p className="text-sm text-text-secondary">No new notifications</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-semibold">
              {initials}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium text-text-primary">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-text-muted">{user.email}</p>
            </div>
            <ChevronDown className="hidden lg:block h-4 w-4 text-text-muted" />
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="absolute right-0 mt-2 w-56 bg-surface rounded-xl border border-border shadow-lg shadow-slate-900/5 py-1"
              >
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium text-text-primary">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-text-muted truncate">{user.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-medium">
                    {user.role || 'ADMIN'}
                  </span>
                </div>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-secondary transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-danger hover:bg-danger/5 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { Bell, ChevronDown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { getUnreadCount } from '@/lib/notifications'
import { NotificationPanel } from '@/components/notifications/notification-panel'

const breadcrumbMap: Record<string, string> = {
  dashboard: 'Dashboard',
  bookings: 'Bookings',
  customers: 'Customers',
  services: 'Services',
  calendar: 'Calendar',
  invoices: 'Invoices',
  notifications: 'Notifications',
  reports: 'Reports',
  settings: 'Settings',
  payments: 'Payments',
  ai: 'AI Agent',
  team: 'Team',
}

export function Header() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [notifOpen, setNotifOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const notifRef = React.useRef<HTMLDivElement>(null)

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
  })

  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs = segments.map((seg: string, i: number) => ({
    label: breadcrumbMap[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
    href: '/' + segments.slice(0, i + 1).join('/'),
  }))

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6">
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        {breadcrumbs.map((crumb: { label: string; href: string }, i: number) => (
          <React.Fragment key={crumb.href}>
            {i > 0 && <span>/</span>}
            <span className={cn(i === breadcrumbs.length - 1 && 'text-gray-900 dark:text-white font-medium')}>
              {crumb.label}
            </span>
          </React.Fragment>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
              {user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'}
            </div>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
              <button
                onClick={() => { setDropdownOpen(false); window.location.href = '/settings' }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Settings
              </button>
              <button
                onClick={() => { setDropdownOpen(false); logout() }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

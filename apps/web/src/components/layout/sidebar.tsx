'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Wrench,
  Calendar,
  FileText,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  BarChart3,
  Truck,
  Bot,
  CreditCard,
  Package,
  Megaphone,
  Sun,
  Moon,
  Percent,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/services', label: 'Services', icon: Wrench },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/split-payments', label: 'Split Payments', icon: Percent },
  { href: '/dispatches', label: 'Dispatches', icon: Truck },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/ai/history', label: 'AI History', icon: Bot },
  { href: '/ai/escalations', label: 'Escalations', icon: AlertCircle },
  { href: '/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/settings/subscription', label: 'Subscription', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = React.useState(false)
  const [dark, setDark] = React.useState(false)

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

  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setDark(isDark)
  }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className="flex h-14 items-center border-b border-gray-200 dark:border-gray-800 px-4">
          <Building2 className="h-6 w-6 text-blue-600 shrink-0" />
          {!collapsed && (
            <span className="ml-3 font-bold text-lg text-gray-900 dark:text-white truncate">
              BookerMap
            </span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                )}
                title={collapsed ? item.label : undefined}
              >
                <div className="relative">
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.href === '/ai/escalations' && escalationCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {escalationCount > 99 ? '99+' : escalationCount}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <span className="flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.href === '/ai/escalations' && escalationCount > 0 && (
                      <span className="h-5 min-w-[20px] flex items-center justify-center px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                        {escalationCount > 99 ? '99+' : escalationCount}
                      </span>
                    )}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-200 dark:border-gray-800 p-3">
          {!collapsed && user && (
            <div className="mb-2 px-2 text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.firstName} {user.lastName}
            </div>
          )}
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            className="w-full justify-start gap-3 text-gray-600 dark:text-gray-400"
            onClick={toggleTheme}
          >
            {dark ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
            {!collapsed && <span>{dark ? 'Light' : 'Dark'} mode</span>}
          </Button>
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            className="w-full justify-start gap-3 text-gray-600 dark:text-gray-400"
            onClick={logout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </Button>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {collapsed && (
        <div className="w-16 shrink-0" />
      )}
    </>
  )
}

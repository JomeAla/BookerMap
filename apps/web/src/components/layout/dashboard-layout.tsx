'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { Header } from './header'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className={cn(
        'flex flex-1 flex-col overflow-hidden transition-[margin-left] duration-250',
        !collapsed ? 'md:ml-[260px]' : 'md:ml-[72px]'
      )}>
        <Header onMenuClick={() => setMobileOpen(true)} isSidebarOpen={mobileOpen} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Settings, Users, Sparkles, CreditCard, Tag, Calendar, MapPin, Webhook, Star, Shield, DollarSign, Percent, Globe, Key, BookOpen } from 'lucide-react'

const tabs = [
  { href: '/settings', label: 'General', icon: Settings },
  { href: '/settings/team', label: 'Team', icon: Users },
  { href: '/settings/ai', label: 'AI Agent', icon: Sparkles },
  { href: '/settings/payments', label: 'Payments', icon: CreditCard },
  { href: '/settings/coupons', label: 'Coupons', icon: Tag },
  { href: '/settings/calendar', label: 'Calendar', icon: Calendar },
  { href: '/settings/locations', label: 'Locations', icon: MapPin },
  { href: '/settings/reviews', label: 'Reviews', icon: Star },
  { href: '/settings/pricing', label: 'Pricing', icon: Percent },
  { href: '/settings/domain', label: 'Domain', icon: Globe },
  { href: '/settings/api-keys', label: 'API Keys', icon: Key },
  { href: '/settings/api-keys/docs', label: 'API Docs', icon: BookOpen },
  { href: '/settings/webhooks', label: 'Webhooks', icon: Webhook },
  { href: '/settings/subscription', label: 'Subscription', icon: DollarSign },
  { href: '/settings/security', label: 'Security', icon: Shield },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="flex gap-6 -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
      {children}
    </div>
  )
}

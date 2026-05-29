import * as React from 'react'
import { cn } from '@/lib/utils'
import { getStatusColor } from '@/lib/utils'

const Badge = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }
>(({ className, variant = 'default', ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        {
          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400': variant === 'default',
          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300': variant === 'secondary',
          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400': variant === 'destructive',
          'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  )
})
Badge.displayName = 'Badge'

const StatusBadge = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { status: string }
>(({ className, status, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        getStatusColor(status),
        className
      )}
      {...props}
    />
  )
})
StatusBadge.displayName = 'StatusBadge'

export { Badge, StatusBadge }

import * as React from 'react'
import { cn } from '@/lib/utils'
import { getStatusColor } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
  size?: 'sm' | 'default' | 'lg'
  dot?: boolean
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'default', dot, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-[var(--radius-full)] font-medium transition-colors',
          {
            'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300': variant === 'default',
            'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]': variant === 'secondary',
            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300': variant === 'destructive',
            'border border-[var(--color-border)] text-[var(--color-text-secondary)]': variant === 'outline',
            'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300': variant === 'success',
            'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300': variant === 'warning',
          },
          {
            'px-2 py-0.5 text-xs gap-1': size === 'sm',
            'px-2.5 py-0.5 text-xs gap-1': size === 'default',
            'px-3 py-1 text-sm gap-1.5': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {dot && (
          <span className={cn('inline-block rounded-full bg-current shrink-0', size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2')} />
        )}
        {children}
      </span>
    )
  }
)
Badge.displayName = 'Badge'

const StatusBadge = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { status: string; dot?: boolean }
>(({ className, status, dot, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium gap-1',
        getStatusColor(status),
        className
      )}
      {...props}
    >
      {dot && <span className="inline-block h-2 w-2 rounded-full bg-current shrink-0" />}
      {status}
    </span>
  )
})
StatusBadge.displayName = 'StatusBadge'

export { Badge, StatusBadge }

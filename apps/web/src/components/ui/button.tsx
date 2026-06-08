'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Spinner } from './spinner'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', loading, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-button)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-dark)] text-white shadow-sm shadow-indigo-500/25 hover:shadow-indigo-500/40': variant === 'primary',
            'bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]': variant === 'secondary',
            'border border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]': variant === 'outline',
            'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]': variant === 'ghost',
            'bg-[var(--color-danger)] text-white hover:bg-red-700 shadow-sm': variant === 'destructive',
          },
          {
            'h-9 px-4 py-2': size === 'default',
            'h-8 rounded-[calc(var(--radius-button)-0.125rem)] px-3 text-xs': size === 'sm',
            'h-11 px-8 text-base': size === 'lg',
            'h-9 w-9 p-0': size === 'icon',
          },
          className
        )}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
      >
        {loading && <Spinner size="sm" className="mr-2" />}
        {children}
      </motion.button>
    )
  }
)
Button.displayName = 'Button'

export { Button }

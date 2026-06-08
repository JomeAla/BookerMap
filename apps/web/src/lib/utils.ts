import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const CURRENCIES: Record<string, { symbol: string; name: string; decimals: number; locale: string }> = {
  NGN: { symbol: '₦', name: 'Nigerian Naira', decimals: 2, locale: 'en-NG' },
  KES: { symbol: 'KSh', name: 'Kenyan Shilling', decimals: 2, locale: 'en-KE' },
  GHS: { symbol: '₵', name: 'Ghanaian Cedi', decimals: 2, locale: 'en-GH' },
  ZAR: { symbol: 'R', name: 'South African Rand', decimals: 2, locale: 'en-ZA' },
  USD: { symbol: '$', name: 'US Dollar', decimals: 2, locale: 'en-US' },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2, locale: 'en-GB' },
  EUR: { symbol: '€', name: 'Euro', decimals: 2, locale: 'en-EU' },
}

export function getCurrencySymbol(currency: string = 'NGN'): string {
  return CURRENCIES[currency]?.symbol || '₦'
}

export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  const info = CURRENCIES[currency] || CURRENCIES.NGN
  try {
    return new Intl.NumberFormat(info.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: info.decimals,
      maximumFractionDigits: info.decimals,
    }).format(amount)
  } catch {
    return `${info.symbol}${amount.toFixed(info.decimals)}`
  }
}

export function formatDate(date: string | Date, formatStr: string = 'PPP'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatStr)
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `+234${cleaned.slice(1)}`
  }
  if (cleaned.length === 13 && cleaned.startsWith('234')) {
    return `+${cleaned}`
  }
  if (cleaned.startsWith('+')) return phone
  return `+234${cleaned}`
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    NO_SHOW: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    PAID: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    PARTIALLY_PAID: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    SUCCESS: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    ASSIGNED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    EN_ROUTE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    STARTED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }
  return map[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
}

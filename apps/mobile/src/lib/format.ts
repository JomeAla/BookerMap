const CURRENCIES: Record<string, { symbol: string; code: string }> = {
  NGN: { symbol: '₦', code: 'NGN' },
  GHS: { symbol: 'GH₵', code: 'GHS' },
  KES: { symbol: 'KSh', code: 'KES' },
  ZAR: { symbol: 'R', code: 'ZAR' },
  USD: { symbol: '$', code: 'USD' },
  GBP: { symbol: '£', code: 'GBP' },
  EUR: { symbol: '€', code: 'EUR' },
}

export function formatCurrency(amount: number, currency?: string | null): string {
  const c = CURRENCIES[currency || 'NGN'] || CURRENCIES.NGN
  return `${c.symbol}${Number(amount || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} at ${formatTime(iso)}`
}
export const CURRENCIES: Record<string, { symbol: string; name: string; decimals: number; locale: string }> = {
  NGN: { symbol: '₦', name: 'Nigerian Naira', decimals: 2, locale: 'en-NG' },
  KES: { symbol: 'KSh', name: 'Kenyan Shilling', decimals: 2, locale: 'en-KE' },
  GHS: { symbol: '₵', name: 'Ghanaian Cedi', decimals: 2, locale: 'en-GH' },
  ZAR: { symbol: 'R', name: 'South African Rand', decimals: 2, locale: 'en-ZA' },
  USD: { symbol: '$', name: 'US Dollar', decimals: 2, locale: 'en-US' },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2, locale: 'en-GB' },
  EUR: { symbol: '€', name: 'Euro', decimals: 2, locale: 'en-EU' },
};

export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  const info = CURRENCIES[currency] || CURRENCIES.NGN;
  try {
    return new Intl.NumberFormat(info.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: info.decimals,
      maximumFractionDigits: info.decimals,
    }).format(amount);
  } catch {
    return `${info.symbol}${amount.toFixed(info.decimals)}`;
  }
}

export function getCurrencySymbol(currency: string = 'NGN'): string {
  return CURRENCIES[currency]?.symbol || '₦';
}

export function isCurrencySupported(currency: string): boolean {
  return currency in CURRENCIES;
}
import { BookingStatus, PaymentProvider, UserRole } from '../types';

export const BOOKING_STATUSES = Object.values(BookingStatus);
export const PAYMENT_PROVIDERS = Object.values(PaymentProvider);
export const USER_ROLES = Object.values(UserRole);

export const DEFAULT_PAGE_SIZE = 20;

export const AFRICAN_CURRENCIES = {
  NGN: { symbol: '₦', name: 'Nigerian Naira', code: 'NGN' },
  GHS: { symbol: 'GH₵', name: 'Ghanaian Cedi', code: 'GHS' },
  KES: { symbol: 'KSh', name: 'Kenyan Shilling', code: 'KES' },
  ZAR: { symbol: 'R', name: 'South African Rand', code: 'ZAR' },
  USD: { symbol: '$', name: 'US Dollar', code: 'USD' },
} as const;

export type AfricanCurrencyCode = keyof typeof AFRICAN_CURRENCIES;

export const AFRICAN_COUNTRIES: {
  name: string;
  code: string;
  currency: AfricanCurrencyCode;
  phoneCode: string;
}[] = [
  { name: 'Nigeria', code: 'NG', currency: 'NGN', phoneCode: '+234' },
  { name: 'Ghana', code: 'GH', currency: 'GHS', phoneCode: '+233' },
  { name: 'Kenya', code: 'KE', currency: 'KES', phoneCode: '+254' },
  { name: 'South Africa', code: 'ZA', currency: 'ZAR', phoneCode: '+27' },
  { name: 'Tanzania', code: 'TZ', currency: 'KES', phoneCode: '+255' },
  { name: 'Uganda', code: 'UG', currency: 'KES', phoneCode: '+256' },
  { name: 'Rwanda', code: 'RW', currency: 'KES', phoneCode: '+250' },
  { name: 'Ethiopia', code: 'ET', currency: 'KES', phoneCode: '+251' },
  { name: 'Morocco', code: 'MA', currency: 'USD', phoneCode: '+212' },
  { name: 'Egypt', code: 'EG', currency: 'USD', phoneCode: '+20' },
];

export const BOOKING_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]: [BookingStatus.ASSIGNED, BookingStatus.CANCELLED],
  [BookingStatus.ASSIGNED]: [BookingStatus.IN_TRANSIT, BookingStatus.CANCELLED],
  [BookingStatus.IN_TRANSIT]: [BookingStatus.IN_SERVICE, BookingStatus.CANCELLED],
  [BookingStatus.IN_SERVICE]: [BookingStatus.COMPLETED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.NO_SHOW]: [],
};

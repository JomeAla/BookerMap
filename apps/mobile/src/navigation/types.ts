import type { Tenant, Service } from '../types'

export type RootStackParamList = {
  Main: undefined
  PhoneLogin: { tenantSlug: string; tenant?: Tenant | null }
  OtpVerify: { tenantSlug: string; phone: string }
  TenantServices: { tenant: Tenant }
  BookingFlow: { tenant: Tenant; service: Service }
  BookingConfirmation: { tenantSlug: string; reference: string }
  MyBookingsList: { tenantSlug?: string }
  BookingDetail: { tenantSlug?: string; reference: string }
  BookingLookup: { tenantSlug?: string }
  AiChat: { tenantSlug: string }
}

export type MainTabsParamList = {
  Home: undefined
  MyBookings: undefined
  Lookup: undefined
}
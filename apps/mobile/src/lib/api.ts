import Constants from 'expo-constants'
import axios from 'axios'
import { getToken, setToken, clearAuth } from './auth'
import type { Tenant, Service, Booking, Customer, OtpResponse, ApiResponse } from '../types'

const DEV_PORT = 4000
const DEV_PATH = '/api/v1'

function resolveBaseUrl(): string {
  const configured = Constants.expoConfig?.extra?.apiUrl as string | undefined
  if (configured) return configured

  const hostUri = Constants.expoConfig?.hostUri
  if (hostUri) {
    const host = hostUri.split(':')[0]
    return `http://${host}:${DEV_PORT}${DEV_PATH}`
  }

  return `http://localhost:${DEV_PORT}${DEV_PATH}`
}

export const API_URL = resolveBaseUrl()

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(async (config) => {
  const token = await getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearAuth()
      onUnauthorized?.()
    }
    return Promise.reject(error)
  },
)

function unwrap<T>(response: { data: ApiResponse<T> }): T {
  return response.data.data
}

export async function listTenants(): Promise<Tenant[]> {
  const res = await api.get<ApiResponse<Tenant[]>>('/public/tenants')
  return unwrap(res)
}

export async function getServices(tenantSlug: string): Promise<Service[]> {
  const res = await api.get<ApiResponse<Service[]>>(`/public/${tenantSlug}/services`)
  return unwrap(res)
}

export async function getSlots(
  tenantSlug: string,
  serviceId: string,
  date: string,
): Promise<string[]> {
  const res = await api.get<ApiResponse<string[]>>(
    `/public/${tenantSlug}/slots?serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}`,
  )
  return unwrap(res)
}

export interface CreateBookingPayload {
  serviceId: string
  startTime: string
  firstName: string
  lastName: string
  email?: string
  phone: string
  notes?: string
  locationId?: string
  website_url?: string
}

export async function createBooking(
  tenantSlug: string,
  payload: CreateBookingPayload,
): Promise<Booking> {
  const res = await api.post<ApiResponse<Booking>>(`/public/${tenantSlug}/bookings`, payload)
  return unwrap(res)
}

export interface RequestOtpPayload {
  phone: string
  email?: string
  channel?: 'SMS' | 'EMAIL' | 'BOTH'
  website_url?: string
}

export async function requestOtp(
  tenantSlug: string,
  payload: RequestOtpPayload,
): Promise<OtpResponse> {
  const res = await api.post<ApiResponse<OtpResponse>>(
    `/public/${tenantSlug}/customers/otp`,
    payload,
  )
  return unwrap(res)
}

export interface VerifyOtpPayload {
  phone: string
  code: string
  website_url?: string
}

export interface VerifyOtpResult {
  accessToken: string
  customer: Customer
}

export async function verifyOtp(
  tenantSlug: string,
  payload: VerifyOtpPayload,
): Promise<VerifyOtpResult> {
  const res = await api.post<ApiResponse<VerifyOtpResult>>(
    `/public/${tenantSlug}/customers/otp/verify`,
    payload,
  )
  const result = unwrap(res)
  if (result.accessToken) {
    await setToken(result.accessToken)
  }
  return result
}

export async function getMyBookings(tenantSlug: string): Promise<Booking[]> {
  const res = await api.get<ApiResponse<Booking[]>>(
    `/public/${tenantSlug}/customers/me/bookings`,
  )
  return unwrap(res)
}

export async function lookupBooking(
  tenantSlug: string,
  reference: string,
): Promise<Booking> {
  const res = await api.get<ApiResponse<Booking>>(
    `/public/${tenantSlug}/bookings/${encodeURIComponent(reference)}`,
  )
  return unwrap(res)
}

export interface ChatResult {
  reply: string
  conversationId?: string
  messageId?: string
}

export async function chat(
  tenantSlug: string,
  message: string,
  conversationId?: string,
): Promise<ChatResult> {
  const res = await api.post<ApiResponse<ChatResult>>('/ai/chat', {
    tenantSlug,
    message,
    conversationId,
  })
  return unwrap(res)
}
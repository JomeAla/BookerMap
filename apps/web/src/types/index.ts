export enum UserRole {
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  TECHNICIAN = 'TECHNICIAN',
  CUSTOMER = 'CUSTOMER',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentProvider {
  PAYSTACK = 'PAYSTACK',
  FLUTTERWAVE = 'FLUTTERWAVE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum JobStatus {
  ASSIGNED = 'ASSIGNED',
  EN_ROUTE = 'EN_ROUTE',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum NotificationType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export interface Tenant {
  id: string
  name: string
  slug: string
  domain?: string | null
  logo?: string | null
  primaryColor: string
  timezone: string
  currency: string
  trialEndsAt?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  role: UserRole
  isActive: boolean
  availability?: Record<string, Array<{ start: string; end: string }>> | null
  skills?: string[] | null
  avatarUrl?: string | null
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
  tenantId: string
}

export interface Customer {
  id: string
  email?: string | null
  firstName: string
  lastName: string
  phone: string
  notes?: string | null
  tags?: string[]
  createdAt: string
  updatedAt: string
  tenantId: string
  addresses?: CustomerAddress[]
  bookings?: Booking[]
  invoices?: Invoice[]
  _count?: { bookings?: number; invoices?: number }
}

export interface CustomerAddress {
  id: string
  label: string
  street: string
  city: string
  state: string
  zipCode?: string | null
  latitude?: number | null
  longitude?: number | null
  isDefault: boolean
  customerId: string
}

export interface Service {
  id: string
  name: string
  description?: string | null
  duration: number
  price: number
  priceType: string
  isActive: boolean
  imageUrl?: string | null
  createdAt: string
  updatedAt: string
  tenantId: string
  categoryId?: string | null
  category?: ServiceCategory | null
  modifiers?: ServiceModifier[]
  intakeFields?: IntakeField[]
}

export interface ServiceCategory {
  id: string
  name: string
  sortOrder: number
  createdAt: string
  tenantId: string
  services?: Service[]
}

export interface ServiceModifier {
  id: string
  name: string
  price: number
  isRequired: boolean
  serviceId: string
}

export interface IntakeField {
  id: string
  label: string
  type: string
  required: boolean
  options?: string | null
  sortOrder: number
  serviceId: string
}

export interface Territory {
  id: string
  name: string
  boundaries?: any
  isActive: boolean
  createdAt: string
  updatedAt: string
  tenantId: string
}

export interface Booking {
  id: string
  startTime: string
  endTime: string
  status: BookingStatus
  notes?: string | null
  intakeAnswers?: any
  totalPrice: number
  createdAt: string
  updatedAt: string
  tenantId: string
  locationId?: string | null
  customerId: string
  serviceId: string
  technicianId?: string | null
  recurrenceId?: string | null
  recurrence?: RecurringBooking | null
  customer?: Customer
  service?: Service
  technician?: User | null
  location?: Location | null
  invoices?: Invoice[]
  dispatch?: Dispatch | null
}

export interface RecurringBooking {
  id: string
  frequency: string
  interval: number
  dayOfWeek?: number | null
  dayOfMonth?: number | null
  startDate: string
  endDate?: string | null
  discount: number
  isActive: boolean
  createdAt: string
  tenantId: string
}

export interface Dispatch {
  id: string
  status: JobStatus
  startedAt?: string | null
  completedAt?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  bookingId: string
  assignedToId: string
  assignedTo?: User
  booking?: Booking
}

export interface Invoice {
  id: string
  invoiceNumber: string
  status: InvoiceStatus
  subtotal: number
  tax: number
  taxRate: number
  discount: number
  total: number
  dueDate: string
  paidAt?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  tenantId: string
  customerId: string
  bookingId?: string | null
  customer?: Customer
  booking?: Booking
  lineItems?: InvoiceLineItem[]
  payments?: Payment[]
}

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  invoiceId: string
}

export interface Payment {
  id: string
  amount: number
  currency: string
  status: PaymentStatus
  provider: PaymentProvider
  providerRef?: string | null
  providerData?: any
  fee?: number | null
  createdAt: string
  updatedAt: string
  invoiceId: string
}

export interface PaymentSettings {
  id: string
  provider: PaymentProvider
  publicKey: string
  secretKey: string
  encryptionKey?: string | null
  webhookSecret?: string | null
  isLive: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  tenantId: string
}

export interface Coupon {
  id: string
  code: string
  type: string
  value: number
  maxUses?: number | null
  usedCount: number
  minAmount?: number | null
  expiresAt?: string | null
  isActive: boolean
  createdAt: string
  tenantId: string
}

export interface AiConversation {
  id: string
  sessionId: string
  status: string
  metadata?: any
  createdAt: string
  updatedAt: string
  tenantId: string
}

export interface AiMessage {
  id: string
  role: string
  content: string
  intent?: string | null
  entities?: any
  createdAt: string
  conversationId: string
}

export interface Notification {
  id: string
  type: NotificationType
  channel: string
  recipient: string
  subject?: string | null
  body: string
  sentAt?: string | null
  readAt?: string | null
  status: string
  createdAt: string
  tenantId: string
  userId?: string | null
}

export interface Webhook {
  id: string
  url: string
  events: string[]
  secret: string | null
  isActive: boolean
  lastTriggeredAt: string | null
  createdAt: string
  updatedAt: string
  tenantId: string
}

export interface Location {
  id: string
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  tenantId: string
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface Review {
  id: string
  rating: number
  comment?: string | null
  adminReply?: string | null
  status: ReviewStatus
  createdAt: string
  updatedAt: string
  tenantId: string
  bookingId: string
  customerId: string
  technicianId?: string | null
  booking?: Booking & { service?: Service; customer?: Customer; technician?: User }
  customer?: Customer
  technician?: User
}

export interface AiResponse {
  id: string
  trigger: string
  response: string
  language: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  tenantId: string
}

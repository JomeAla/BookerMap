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
  WHATSAPP = 'WHATSAPP',
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
  customDomain?: string | null
  domainVerified: boolean
  domainVerifiedAt?: string | null
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
  commissionRate?: number | null
  commissionType?: string | null
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
  paidAmount: number
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
  whatsappPhoneNumberId?: string | null
  whatsappBusinessAccountId?: string | null
  whatsappAccessToken?: string | null
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
  name: string
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

export interface LocationUpdate {
  id: string
  tenantId: string
  userId: string
  bookingId?: string | null
  latitude: number
  longitude: number
  accuracy?: number | null
  speed?: number | null
  heading?: number | null
  timestamp: string
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

export interface SavedCard {
  id: string
  tenantId: string
  customerId: string
  authorizationCode: string
  last4: string
  brand: string
  expMonth?: number | null
  expYear?: number | null
  cardType?: string | null
  bank?: string | null
  reusable: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface Terminal {
  terminalId: string
  name: string
  status: string
}

export interface InventoryItem {
  id: string
  tenantId: string
  name: string
  description?: string | null
  sku?: string | null
  category?: string | null
  unit: string
  unitCost: number
  quantity: number
  lowStockThreshold: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface BookingInventory {
  id: string
  tenantId: string
  bookingId: string
  itemId: string
  quantityUsed: number
  unitCostAtTime: number
  createdAt: string
  item?: InventoryItem
  booking?: Booking
}

export interface BookingFile {
  id: string
  bookingId: string
  fileName: string
  fileType: string
  fileSize: number
  category: string
  data: string
  uploadedBy?: string | null
  createdAt: string
}

export enum SplitStatus {
  PENDING = 'PENDING',
  RELEASED = 'RELEASED',
  ON_HOLD = 'ON_HOLD',
  REFUNDED = 'REFUNDED',
}

export interface SplitPayment {
  id: string
  tenantId: string
  bookingId: string
  booking?: Booking & { customer?: Customer; service?: Service }
  invoiceId?: string | null
  invoice?: Invoice | null
  providerId: string
  provider?: { id: string; firstName: string; lastName: string; email?: string }
  totalAmount: number
  platformFee: number
  providerAmount: number
  platformRate: number
  status: SplitStatus
  releasedAt?: string | null
  createdAt: string
  updatedAt: string
}

export enum EscalationStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum EscalationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface Escalation {
  id: string
  tenantId: string
  conversationId: string
  customerId?: string | null
  customer?: { id: string; firstName: string; lastName: string; email?: string | null } | null
  assignedToId?: string | null
  assignedTo?: { id: string; firstName: string; lastName: string; email?: string | null } | null
  reason?: string | null
  status: EscalationStatus
  priority: EscalationPriority
  createdAt: string
  resolvedAt?: string | null
  resolution?: string | null
  messages?: AiMessage[]
}

export enum SettlementStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Settlement {
  id: string
  tenantId: string
  providerId: string
  provider?: { id: string; firstName: string; lastName: string; email?: string }
  periodStart: string
  periodEnd: string
  totalEarned: number
  totalFee: number
  netAmount: number
  status: SettlementStatus
  paidAt?: string | null
  paymentMethod?: string | null
  paymentReference?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  lineItems?: SettlementLineItem[]
  _count?: { lineItems: number }
}

export interface SettlementLineItem {
  id: string
  settlementId: string
  splitPaymentId?: string | null
  splitPayment?: { id: string; totalAmount: number; platformFee: number; providerAmount: number; status: string; createdAt: string }
  bookingId?: string | null
  booking?: { id: string; startTime: string; totalPrice: number; status: string; service?: { name: string }; customer?: { firstName: string; lastName: string } }
  amount: number
  description?: string | null
  createdAt: string
}

export interface ChatPaymentAction {
  type: 'pay_now' | 'pay_later' | 'payment_confirmed' | 'payment_failed';
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  paymentLink?: string;
  reference?: string;
  invoiceId?: string;
}

export type Touchpoint = 'BOOKING_CREATED' | 'SERVICE_COMPLETED' | 'PAYMENT_MADE' | 'GENERAL';
export type ScoreType = 'CSAT' | 'NPS' | 'CES';
export type PromoterType = 'DETRACTOR' | 'PASSIVE' | 'PROMOTER';
export type SatisfactionCategory = 'cleanliness' | 'punctuality' | 'quality' | 'communication' | 'value';

export interface SatisfactionSurvey {
  id: string
  tenantId: string
  bookingId?: string | null
  booking?: Booking & { service?: Service } | null
  customerId: string
  customer?: Customer
  touchpoint: Touchpoint
  score: number
  scoreType: ScoreType
  feedback?: string | null
  category?: SatisfactionCategory | null
  respondedAt: string
  createdAt: string
}

export interface NPSResponse {
  id: string
  tenantId: string
  customerId: string
  customer?: Customer
  score: number
  promoterType: PromoterType
  reason?: string | null
  createdAt: string
}

export interface CSATResult {
  average: number
  count: number
  total: number
}

export interface NPSResult {
  nps: number
  promoters: number
  passives: number
  detractors: number
  total: number
}

export interface TrendDataPoint {
  month: string
  averageScore: number
  responses: number
}

export interface FeedbackByCategory {
  category: string
  averageScore: number
  feedbackCount: number
  totalResponses: number
  feedbacks: string[]
}

export interface CustomerSatisfaction {
  surveys: SatisfactionSurvey[]
  npsResponses: NPSResponse[]
}

export interface ConversationFlow {
  id: string
  tenantId: string
  name: string
  description?: string | null
  trigger: string
  triggerValue: string
  nodes: any[]
  edges: any[]
  isActive: boolean
  version: number
  createdAt: string
  updatedAt: string
}

export interface FlowNode {
  id: string
  flowId: string
  nodeType: 'START' | 'MESSAGE' | 'CONDITION' | 'ACTION' | 'INPUT' | 'END'
  label?: string | null
  content?: any
  positionX: number
  positionY: number
  config?: any
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

export enum DisputeStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum DisputeType {
  CHARGEBACK = 'CHARGEBACK',
  SERVICE_NOT_RENDERED = 'SERVICE_NOT_RENDERED',
  SERVICE_DEFICIENT = 'SERVICE_DEFICIENT',
  DAMAGES = 'DAMAGES',
  BILLING_ERROR = 'BILLING_ERROR',
  OTHER = 'OTHER',
}

export enum DisputeResolution {
  REFUND_FULL = 'REFUND_FULL',
  REFUND_PARTIAL = 'REFUND_PARTIAL',
  CREDIT = 'CREDIT',
  DISMISSED = 'DISMISSED',
  OTHER = 'OTHER',
}

export interface DisputeEvidence {
  id: string
  disputeId: string
  fileName: string
  fileType: string
  fileData: string
  description?: string | null
  uploadedById: string
  uploadedBy?: { id: string; firstName: string; lastName: string }
  createdAt: string
}

export interface Dispute {
  id: string
  tenantId: string
  bookingId?: string | null
  booking?: Booking & { service?: Service }
  invoiceId?: string | null
  invoice?: Invoice | null
  customerId: string
  customer?: { id: string; firstName: string; lastName: string; email?: string; phone?: string }
  type: DisputeType
  status: DisputeStatus
  description: string
  amount: number
  resolution?: DisputeResolution | null
  resolutionNote?: string | null
  resolvedById?: string | null
  resolvedBy?: { id: string; firstName: string; lastName: string } | null
  resolvedAt?: string | null
  createdAt: string
  updatedAt: string
  evidence?: DisputeEvidence[]
}

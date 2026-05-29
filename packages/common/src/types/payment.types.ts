export enum PaymentProvider {
  STRIPE = 'STRIPE',
  PAYSTACK = 'PAYSTACK',
  FLUTTERWAVE = 'FLUTTERWAVE',
  SQUARE = 'SQUARE',
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  SENT = 'SENT',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export interface IPaymentSettings {
  id: string;
  tenantId: string;
  provider: PaymentProvider;
  isEnabled: boolean;
  publicKey?: string;
  privateKey?: string;
  webhookSecret?: string;
  environment: 'sandbox' | 'live';
  createdAt: string;
  updatedAt: string;
}

export interface IPayment {
  id: string;
  tenantId: string;
  invoiceId?: string;
  bookingId?: string;
  provider: PaymentProvider;
  providerPaymentId?: string;
  status: PaymentStatus;
  amount: number;
  fee?: number;
  netAmount?: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IInvoice {
  id: string;
  tenantId: string;
  bookingId?: string;
  customerId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: number;
  tax?: number;
  taxRate?: number;
  discount?: number;
  total: number;
  amountPaid: number;
  dueDate?: string;
  issuedAt: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IInvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  serviceId?: string;
}

export interface ICoupon {
  id: string;
  tenantId: string;
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxUses?: number;
  currentUses: number;
  minPurchase?: number;
  maxDiscount?: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentDto {
  invoiceId?: string;
  bookingId?: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateInvoiceDto {
  bookingId?: string;
  customerId: string;
  subtotal: number;
  tax?: number;
  taxRate?: number;
  discount?: number;
  dueDate?: string;
  notes?: string;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    serviceId?: string;
  }[];
}

export interface PaymentIntentDto {
  amount: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
}

export interface VerifyPaymentDto {
  provider: PaymentProvider;
  providerPaymentId: string;
}

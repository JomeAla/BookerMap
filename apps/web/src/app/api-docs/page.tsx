'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BookOpen, Lock, Key, Shield, Server, Users, Calendar, CreditCard, Bot, Bell, Globe, BarChart3, Copy, Check, Star } from 'lucide-react'

interface Endpoint {
  method: string
  path: string
  description: string
  auth: boolean
  params?: { name: string; type: string; required: boolean; description: string }[]
  request?: string
  response: string
}

interface ApiModule {
  name: string
  icon: React.ReactNode
  prefix: string
  endpoints: Endpoint[]
}

const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PUT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  PATCH: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

const modules: ApiModule[] = [
  {
    name: 'Authentication',
    icon: <Lock className="h-4 w-4" />,
    prefix: 'auth',
    endpoints: [
      {
        method: 'POST', path: '/auth/register', description: 'Register a new user and tenant', auth: false,
        params: [
          { name: 'firstName', type: 'string', required: true, description: 'First name' },
          { name: 'lastName', type: 'string', required: true, description: 'Last name' },
          { name: 'email', type: 'string', required: true, description: 'Email address' },
          { name: 'password', type: 'string', required: true, description: 'Password (min 8 chars)' },
          { name: 'businessName', type: 'string', required: true, description: 'Business name' },
        ],
        request: `{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "secureP@ss123",
  "businessName": "CleanPro Services"
}`,
        response: `{
  "success": true,
  "data": {
    "user": { "id": "clx...", "email": "john@example.com", "role": "OWNER" },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}`,
      },
      {
        method: 'POST', path: '/auth/login', description: 'Authenticate with email and password', auth: false,
        params: [
          { name: 'email', type: 'string', required: true, description: 'Email address' },
          { name: 'password', type: 'string', required: true, description: 'Password' },
        ],
        request: `{
  "email": "john@example.com",
  "password": "secureP@ss123"
}`,
        response: `{
  "success": true,
  "data": {
    "user": { "id": "clx...", "email": "john@example.com", "role": "OWNER", "tenantId": "clx..." },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}`,
      },
      {
        method: 'POST', path: '/auth/refresh', description: 'Exchange a refresh token for new tokens', auth: false,
        params: [
          { name: 'refreshToken', type: 'string', required: true, description: 'Refresh token' },
        ],
        request: `{
  "refreshToken": "eyJhbG..."
}`,
        response: `{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}`,
      },
      {
        method: 'POST', path: '/auth/logout', description: 'Invalidate refresh token', auth: true,
        params: [{ name: 'refreshToken', type: 'string', required: true, description: 'Refresh token to invalidate' }],
        request: `{ "refreshToken": "eyJhbG..." }`,
        response: `{ "success": true }`,
      },
      {
        method: 'POST', path: '/auth/forgot-password', description: 'Send password reset email', auth: false,
        params: [{ name: 'email', type: 'string', required: true, description: 'Account email' }],
        request: `{ "email": "john@example.com" }`,
        response: `{ "success": true, "message": "Reset email sent if account exists" }`,
      },
      {
        method: 'POST', path: '/auth/reset-password', description: 'Reset password using reset token', auth: false,
        params: [
          { name: 'token', type: 'string', required: true, description: 'Reset token from email' },
          { name: 'password', type: 'string', required: true, description: 'New password' },
        ],
        request: `{ "token": "reset-token-here", "password": "newSecureP@ss" }`,
        response: `{ "success": true }`,
      },
      {
        method: 'GET', path: '/auth/me', description: 'Get current user profile', auth: true,
        params: [],
        response: `{
  "id": "clx...",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "OWNER",
  "tenantId": "clx..."
}`,
      },
    ],
  },
  {
    name: 'Bookings',
    icon: <Calendar className="h-4 w-4" />,
    prefix: 'bookings',
    endpoints: [
      {
        method: 'POST', path: '/bookings', description: 'Create a new booking', auth: true,
        params: [
          { name: 'serviceId', type: 'string', required: true, description: 'Service ID' },
          { name: 'customerId', type: 'string', required: true, description: 'Customer ID' },
          { name: 'startTime', type: 'string', required: true, description: 'Start time (ISO 8601)' },
          { name: 'technicianId', type: 'string', required: false, description: 'Assigned technician' },
          { name: 'notes', type: 'string', required: false, description: 'Booking notes' },
        ],
        request: `{
  "serviceId": "clx...",
  "customerId": "clx...",
  "startTime": "2026-06-10T10:00:00.000Z",
  "notes": "Use the back entrance"
}`,
        response: `{
  "success": true,
  "data": {
    "id": "clx...",
    "startTime": "2026-06-10T10:00:00.000Z",
    "endTime": "2026-06-10T11:00:00.000Z",
    "status": "PENDING",
    "totalPrice": 5000
  }
}`,
      },
      {
        method: 'GET', path: '/bookings', description: 'List all bookings (with filters)', auth: true,
        params: [
          { name: 'status', type: 'string', required: false, description: 'Filter by status (PENDING, CONFIRMED, etc.)' },
          { name: 'dateFrom', type: 'string', required: false, description: 'Start date filter (ISO 8601)' },
          { name: 'dateTo', type: 'string', required: false, description: 'End date filter (ISO 8601)' },
          { name: 'technicianId', type: 'string', required: false, description: 'Filter by technician' },
        ],
        response: `{
  "success": true,
  "data": [{ "id": "clx...", "status": "PENDING", "startTime": "...", "service": { "name": "Deep Cleaning" } }],
  "meta": { "page": 1, "limit": 50, "total": 10 }
}`,
      },
      {
        method: 'GET', path: '/bookings/:id', description: 'Get booking by ID', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Booking ID' }],
        response: `{
  "success": true,
  "data": { "id": "clx...", "status": "CONFIRMED", "customer": { ... }, "service": { ... }, "technician": { ... } }
}`,
      },
      {
        method: 'PATCH', path: '/bookings/:id', description: 'Update booking status', auth: true,
        params: [
          { name: 'id', type: 'string', required: true, description: 'Booking ID' },
          { name: 'status', type: 'string', required: true, description: 'New status (PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED)' },
        ],
        request: `{ "status": "CONFIRMED" }`,
        response: `{ "success": true, "data": { "id": "clx...", "status": "CONFIRMED" } }`,
      },
      {
        method: 'PATCH', path: '/bookings/:id/cancel', description: 'Cancel a booking', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Booking ID' }],
        response: `{ "success": true, "data": { "id": "clx...", "status": "CANCELLED" } }`,
      },
      {
        method: 'PATCH', path: '/bookings/:id/reschedule', description: 'Reschedule a booking', auth: true,
        params: [
          { name: 'id', type: 'string', required: true, description: 'Booking ID' },
          { name: 'startTime', type: 'string', required: true, description: 'New start time (ISO 8601)' },
        ],
        request: `{ "startTime": "2026-06-15T14:00:00.000Z" }`,
        response: `{ "success": true, "data": { "id": "clx...", "startTime": "2026-06-15T14:00:00.000Z" } }`,
      },
      {
        method: 'POST', path: '/bookings/:id/dispatch', description: 'Dispatch technician to booking', auth: true,
        params: [
          { name: 'id', type: 'string', required: true, description: 'Booking ID' },
          { name: 'assignedToId', type: 'string', required: false, description: 'Technician user ID' },
        ],
        request: `{ "assignedToId": "user_clx..." }`,
        response: `{ "success": true, "data": { "id": "dispatch_clx...", "status": "ASSIGNED", "booking": { ... } } }`,
      },
      {
        method: 'GET', path: '/bookings/available-slots', description: 'Get available time slots for a service', auth: true,
        params: [
          { name: 'serviceId', type: 'string', required: true, description: 'Service ID' },
          { name: 'date', type: 'string', required: true, description: 'Date (YYYY-MM-DD)' },
        ],
        response: `{
  "success": true,
  "data": [{ "technicianId": "clx...", "startTime": "2026-06-10T09:00:00.000Z", "endTime": "2026-06-10T10:00:00.000Z" }]
}`,
      },
    ],
  },
  {
    name: 'Customers',
    icon: <Users className="h-4 w-4" />,
    prefix: 'customers',
    endpoints: [
      {
        method: 'GET', path: '/customers', description: 'List customers (paginated)', auth: true,
        params: [
          { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
          { name: 'limit', type: 'number', required: false, description: 'Items per page (max: 100)' },
          { name: 'search', type: 'string', required: false, description: 'Search by name, email, or phone' },
          { name: 'tag', type: 'string', required: false, description: 'Filter by tag' },
        ],
        response: `{
  "success": true,
  "data": [{ "id": "clx...", "firstName": "John", "lastName": "Doe", "email": "john@example.com", "phone": "+2348012345678" }],
  "meta": { "page": 1, "limit": 50, "total": 10 }
}`,
      },
      {
        method: 'POST', path: '/customers', description: 'Create a new customer', auth: true,
        params: [
          { name: 'firstName', type: 'string', required: true, description: 'First name' },
          { name: 'lastName', type: 'string', required: true, description: 'Last name' },
          { name: 'email', type: 'string', required: false, description: 'Email address' },
          { name: 'phone', type: 'string', required: true, description: 'Phone number' },
        ],
        request: `{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+2348012345679"
}`,
        response: `{
  "success": true,
  "data": { "id": "clx...", "firstName": "Jane", "lastName": "Smith" }
}`,
      },
      {
        method: 'GET', path: '/customers/:id', description: 'Get customer by ID', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Customer ID' }],
        response: `{ "success": true, "data": { "id": "clx...", "firstName": "Jane", "lastName": "Smith", "email": "..." } }`,
      },
      {
        method: 'PATCH', path: '/customers/:id', description: 'Update a customer', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Customer ID' }],
        request: `{ "firstName": "Janet", "phone": "+2348012345000" }`,
        response: `{ "success": true, "data": { "id": "clx...", "firstName": "Janet" } }`,
      },
      {
        method: 'DELETE', path: '/customers/:id', description: 'Delete a customer', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Customer ID' }],
        response: `{ "success": true }`,
      },
      {
        method: 'GET', path: '/customers/tags', description: 'Get all customer tags', auth: true,
        params: [],
        response: `{ "success": true, "data": ["VIP", "residential", "commercial"] }`,
      },
      {
        method: 'PATCH', path: '/customers/:id/tags', description: 'Update customer tags', auth: true,
        params: [
          { name: 'id', type: 'string', required: true, description: 'Customer ID' },
          { name: 'tags', type: 'string[]', required: true, description: 'Array of tag strings' },
        ],
        request: `{ "tags": ["VIP", "residential"] }`,
        response: `{ "success": true, "data": { "id": "clx...", "tags": ["VIP", "residential"] } }`,
      },
      {
        method: 'POST', path: '/customers/:id/addresses', description: 'Add address to customer', auth: true,
        params: [
          { name: 'id', type: 'string', required: true, description: 'Customer ID' },
          { name: 'address', type: 'string', required: true, description: 'Street address' },
          { name: 'city', type: 'string', required: true, description: 'City' },
          { name: 'isDefault', type: 'boolean', required: false, description: 'Set as default address' },
        ],
        request: `{ "address": "123 Main St", "city": "Lagos", "isDefault": true }`,
        response: `{ "success": true, "data": { "id": "addr_clx...", "address": "123 Main St", "city": "Lagos" } }`,
      },
      {
        method: 'GET', path: '/customers/export', description: 'Export customers as CSV', auth: true,
        params: [],
        response: '(CSV file download)',
      },
    ],
  },
  {
    name: 'Services',
    icon: <BookOpen className="h-4 w-4" />,
    prefix: 'services',
    endpoints: [
      {
        method: 'GET', path: '/services', description: 'List all active services', auth: true,
        params: [
          { name: 'categoryId', type: 'string', required: false, description: 'Filter by category' },
          { name: 'locationId', type: 'string', required: false, description: 'Filter by location' },
        ],
        response: `{
  "success": true,
  "data": [{ "id": "clx...", "name": "Deep Cleaning", "duration": 60, "price": 5000, "priceType": "flat" }]
}`,
      },
      {
        method: 'POST', path: '/services', description: 'Create a new service', auth: true,
        params: [
          { name: 'name', type: 'string', required: true, description: 'Service name' },
          { name: 'description', type: 'string', required: false, description: 'Service description' },
          { name: 'duration', type: 'number', required: true, description: 'Duration in minutes' },
          { name: 'price', type: 'number', required: true, description: 'Price in kobo/cents' },
          { name: 'priceType', type: 'string', required: true, description: 'flat or hourly' },
        ],
        request: `{
  "name": "Deep Cleaning",
  "description": "Professional deep cleaning service",
  "duration": 60,
  "price": 5000,
  "priceType": "flat"
}`,
        response: `{ "success": true, "data": { "id": "clx...", "name": "Deep Cleaning" } }`,
      },
      {
        method: 'GET', path: '/services/:id', description: 'Get service by ID', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Service ID' }],
        response: `{ "success": true, "data": { "id": "clx...", "name": "Deep Cleaning", "duration": 60 } }`,
      },
      {
        method: 'PATCH', path: '/services/:id', description: 'Update a service', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Service ID' }],
        request: `{ "name": "Premium Deep Cleaning", "price": 7000 }`,
        response: `{ "success": true, "data": { "id": "clx...", "name": "Premium Deep Cleaning" } }`,
      },
      {
        method: 'DELETE', path: '/services/:id', description: 'Delete a service', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Service ID' }],
        response: '(204 No Content)',
      },
      {
        method: 'GET', path: '/services/categories/all', description: 'Get all service categories', auth: true,
        params: [],
        response: `{ "success": true, "data": [{ "id": "cat_clx...", "name": "Cleaning", "sortOrder": 0 }] }`,
      },
      {
        method: 'POST', path: '/services/categories', description: 'Create a service category', auth: true,
        params: [
          { name: 'name', type: 'string', required: true, description: 'Category name' },
          { name: 'sortOrder', type: 'number', required: false, description: 'Sort order' },
        ],
        request: `{ "name": "Cleaning", "sortOrder": 0 }`,
        response: `{ "success": true, "data": { "id": "cat_clx...", "name": "Cleaning" } }`,
      },
      {
        method: 'PATCH', path: '/services/:id/image', description: 'Update service image URL', auth: true,
        params: [
          { name: 'id', type: 'string', required: true, description: 'Service ID' },
          { name: 'imageUrl', type: 'string', required: true, description: 'Image URL' },
        ],
        request: `{ "imageUrl": "https://example.com/image.jpg" }`,
        response: `{ "success": true, "data": { "id": "clx...", "imageUrl": "https://example.com/image.jpg" } }`,
      },
      {
        method: 'POST', path: '/services/:id/image/upload', description: 'Upload service image file (multipart)', auth: true,
        params: [{ name: 'image', type: 'file', required: true, description: 'Image file (multipart form-data)' }],
        response: `{ "success": true, "data": { "id": "clx...", "imageUrl": "uploads/services/123-image.jpg" } }`,
      },
    ],
  },
  {
    name: 'Invoices',
    icon: <Server className="h-4 w-4" />,
    prefix: 'invoices',
    endpoints: [
      {
        method: 'GET', path: '/invoices', description: 'List all invoices', auth: true,
        params: [
          { name: 'customerId', type: 'string', required: false, description: 'Filter by customer' },
          { name: 'status', type: 'string', required: false, description: 'Filter by status' },
          { name: 'dateFrom', type: 'string', required: false, description: 'Start date filter' },
          { name: 'dateTo', type: 'string', required: false, description: 'End date filter' },
        ],
        response: `{
  "success": true,
  "data": [{ "id": "clx...", "invoiceNumber": "INV-001", "total": 5000, "status": "DRAFT", "customer": { ... } }],
  "meta": { "page": 1, "limit": 50, "total": 5 }
}`,
      },
      {
        method: 'POST', path: '/invoices', description: 'Create a new invoice', auth: true,
        params: [
          { name: 'customerId', type: 'string', required: true, description: 'Customer ID' },
          { name: 'dueDate', type: 'string', required: true, description: 'Due date' },
          { name: 'lineItems', type: 'array', required: true, description: 'Array of line items' },
          { name: 'taxRate', type: 'number', required: false, description: 'Tax rate percentage' },
          { name: 'discount', type: 'number', required: false, description: 'Discount amount' },
        ],
        request: `{
  "customerId": "clx...",
  "dueDate": "2026-07-01",
  "lineItems": [
    { "description": "Deep Cleaning", "quantity": 1, "unitPrice": 5000 }
  ],
  "taxRate": 7.5
}`,
        response: `{ "success": true, "data": { "id": "clx...", "invoiceNumber": "INV-002", "status": "DRAFT", "total": 5375 } }`,
      },
      {
        method: 'GET', path: '/invoices/:id', description: 'Get invoice by ID', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Invoice ID' }],
        response: `{ "success": true, "data": { "id": "clx...", "invoiceNumber": "INV-001", "lineItems": [...], "customer": {...} } }`,
      },
      {
        method: 'PATCH', path: '/invoices/:id', description: 'Update an invoice', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Invoice ID' }],
        request: `{ "status": "SENT" }`,
        response: `{ "success": true, "data": { "id": "clx...", "status": "SENT" } }`,
      },
      {
        method: 'DELETE', path: '/invoices/:id', description: 'Delete an invoice', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Invoice ID' }],
        response: '(204 No Content)',
      },
      {
        method: 'POST', path: '/invoices/:id/send', description: 'Send invoice email to customer', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Invoice ID' }],
        response: `{ "success": true, "message": "Invoice sent" }`,
      },
      {
        method: 'POST', path: '/invoices/:id/pay', description: 'Mark invoice as paid', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Invoice ID' }],
        response: `{ "success": true, "data": { "id": "clx...", "status": "PAID" } }`,
      },
      {
        method: 'GET', path: '/invoices/:id/payments', description: 'Get payments for an invoice', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Invoice ID' }],
        response: `{ "success": true, "data": [{ "id": "clx...", "amount": 5000, "status": "SUCCESS", "provider": "PAYSTACK" }] }`,
      },
      {
        method: 'GET', path: '/invoices/:id/pdf', description: 'Download invoice as PDF', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Invoice ID' }],
        response: '(PDF file download)',
      },
    ],
  },
  {
    name: 'Payments',
    icon: <CreditCard className="h-4 w-4" />,
    prefix: 'payments',
    endpoints: [
      {
        method: 'POST', path: '/payments/initialize', description: 'Initialize payment (Paystack/Flutterwave)', auth: true,
        params: [
          { name: 'invoiceId', type: 'string', required: true, description: 'Invoice ID' },
          { name: 'provider', type: 'string', required: false, description: 'paystack or flutterwave' },
          { name: 'amount', type: 'number', required: false, description: 'Amount (for partial payments)' },
        ],
        request: `{ "invoiceId": "clx...", "provider": "paystack" }`,
        response: `{
  "success": true,
  "data": { "authorizationUrl": "https://checkout.paystack.com/...", "reference": "BMR-CLX-INV-001-..." }
}`,
      },
      {
        method: 'POST', path: '/payments/verify/:reference', description: 'Verify payment by reference', auth: true,
        params: [{ name: 'reference', type: 'string', required: true, description: 'Payment provider reference' }],
        response: `{ "success": true, "data": { "id": "clx...", "status": "SUCCESS", "amount": 5000 } }`,
      },
      {
        method: 'GET', path: '/payments', description: 'List payments', auth: true,
        params: [
          { name: 'invoiceId', type: 'string', required: false, description: 'Filter by invoice' },
          { name: 'status', type: 'string', required: false, description: 'PENDING, SUCCESS, or FAILED' },
          { name: 'provider', type: 'string', required: false, description: 'PAYSTACK or FLUTTERWAVE' },
          { name: 'page', type: 'number', required: false, description: 'Page number' },
          { name: 'limit', type: 'number', required: false, description: 'Items per page' },
        ],
        response: `{ "success": true, "data": [{ "id": "clx...", "amount": 5000, "status": "SUCCESS" }], "meta": { ... } }`,
      },
      {
        method: 'GET', path: '/payments/:id', description: 'Get payment by ID', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Payment ID' }],
        response: `{ "success": true, "data": { "id": "clx...", "amount": 5000, "status": "SUCCESS", "provider": "PAYSTACK" } }`,
      },
      {
        method: 'POST', path: '/payments/refund', description: 'Refund a payment', auth: true,
        params: [
          { name: 'paymentId', type: 'string', required: true, description: 'Payment ID' },
          { name: 'amount', type: 'number', required: false, description: 'Partial refund amount' },
        ],
        request: `{ "paymentId": "clx...", "amount": 5000 }`,
        response: `{ "success": true, "data": { "refundStatus": "processing" } }`,
      },
      {
        method: 'GET', path: '/payments/cards/:customerId', description: 'List saved cards for a customer', auth: true,
        params: [{ name: 'customerId', type: 'string', required: true, description: 'Customer ID' }],
        response: `{ "success": true, "data": [{ "id": "clx...", "last4": "1234", "brand": "visa", "cardType": "credit" }] }`,
      },
      {
        method: 'POST', path: '/payments/cards', description: 'Save a card for future payments', auth: true,
        params: [
          { name: 'customerId', type: 'string', required: true, description: 'Customer ID' },
          { name: 'authorizationCode', type: 'string', required: true, description: 'Authorization code from provider' },
          { name: 'last4', type: 'string', required: true, description: 'Last 4 digits' },
          { name: 'brand', type: 'string', required: true, description: 'Card brand (visa, mastercard, etc.)' },
        ],
        request: `{ "customerId": "clx...", "authorizationCode": "AUTH_xxx", "last4": "1234", "brand": "visa" }`,
        response: `{ "success": true, "data": { "id": "clx...", "last4": "1234", "brand": "visa" } }`,
      },
      {
        method: 'POST', path: '/payments/pos/initialize', description: 'Initialize POS payment', auth: true,
        params: [
          { name: 'invoiceId', type: 'string', required: true, description: 'Invoice ID' },
          { name: 'amount', type: 'number', required: true, description: 'Payment amount' },
          { name: 'provider', type: 'string', required: false, description: 'paystack or flutterwave' },
        ],
        request: `{ "invoiceId": "clx...", "amount": 5000, "provider": "paystack" }`,
        response: `{ "success": true, "data": { "reference": "BMR-POS-..." } }`,
      },
    ],
  },
  {
    name: 'AI Agent',
    icon: <Bot className="h-4 w-4" />,
    prefix: 'ai',
    endpoints: [
      {
        method: 'POST', path: '/ai/chat', description: 'Send message to AI agent (public, no auth)', auth: false,
        params: [
          { name: 'message', type: 'string', required: true, description: 'User message' },
          { name: 'conversationId', type: 'string', required: false, description: 'Conversation ID for context' },
          { name: 'tenantSlug', type: 'string', required: false, description: 'Tenant slug for multi-tenant' },
        ],
        request: `{ "message": "What services do you offer?", "tenantSlug": "cleanpro" }`,
        response: `{
  "reply": "We offer deep cleaning, regular cleaning, and specialized services...",
  "conversationId": "conv_clx...",
  "messageId": "msg_clx..."
}`,
      },
      {
        method: 'GET', path: '/ai/conversations', description: 'List AI conversations', auth: true,
        params: [],
        response: `{ "success": true, "data": [{ "id": "conv_clx...", "createdAt": "...", "messages": [...] }] }`,
      },
      {
        method: 'GET', path: '/ai/conversations/:id/messages', description: 'Get conversation messages', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Conversation ID' }],
        response: `{ "success": true, "data": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }] }`,
      },
      {
        method: 'GET', path: '/ai/settings', description: 'Get AI agent settings', auth: true,
        params: [],
        response: `{ "success": true, "data": { "greeting": "Hi!", "tone": "friendly", "autoRespond": true, ... } }`,
      },
      {
        method: 'PUT', path: '/ai/settings', description: 'Update AI agent settings', auth: true,
        params: [
          { name: 'greeting', type: 'string', required: false, description: 'Greeting message' },
          { name: 'tone', type: 'string', required: false, description: 'Tone (friendly, professional, casual)' },
          { name: 'autoRespond', type: 'boolean', required: false, description: 'Auto-respond to queries' },
        ],
        request: `{ "greeting": "Hello! How can I help?", "tone": "friendly", "autoRespond": true }`,
        response: `{ "success": true, "data": { "greeting": "Hello!", "tone": "friendly" } }`,
      },
      {
        method: 'POST', path: '/ai/responses', description: 'Create custom automated response', auth: true,
        params: [
          { name: 'trigger', type: 'string', required: true, description: 'Trigger phrase' },
          { name: 'response', type: 'string', required: true, description: 'Response text' },
          { name: 'language', type: 'string', required: false, description: 'Language code' },
        ],
        request: `{ "trigger": "pricing", "response": "Our prices start at 5,000..." }`,
        response: `{ "success": true, "data": { "id": "clx...", "trigger": "pricing", "response": "..." } }`,
      },
      {
        method: 'GET', path: '/ai/analytics/stats', description: 'Get AI conversation statistics', auth: true,
        params: [
          { name: 'startDate', type: 'string', required: true, description: 'Start date (YYYY-MM-DD)' },
          { name: 'endDate', type: 'string', required: true, description: 'End date (YYYY-MM-DD)' },
        ],
        response: `{ "success": true, "data": { "totalConversations": 150, "avgResponseTime": 1.2 } }`,
      },
      {
        method: 'POST', path: '/ai/escalate', description: 'Escalate conversation to human agent', auth: true,
        params: [
          { name: 'conversationId', type: 'string', required: true, description: 'Conversation ID' },
          { name: 'reason', type: 'string', required: false, description: 'Escalation reason' },
          { name: 'priority', type: 'string', required: false, description: 'LOW, MEDIUM, HIGH' },
        ],
        request: `{ "conversationId": "conv_clx...", "reason": "Customer requests refund", "priority": "HIGH" }`,
        response: `{ "success": true, "data": { "id": "esc_clx...", "status": "OPEN" } }`,
      },
    ],
  },
  {
    name: 'Notifications',
    icon: <Bell className="h-4 w-4" />,
    prefix: 'notifications',
    endpoints: [
      {
        method: 'GET', path: '/notifications', description: 'List user notifications', auth: true,
        params: [
          { name: 'status', type: 'string', required: false, description: 'PENDING or SENT' },
          { name: 'type', type: 'string', required: false, description: 'EMAIL, SMS, IN_APP, or PUSH' },
          { name: 'page', type: 'number', required: false, description: 'Page number' },
          { name: 'limit', type: 'number', required: false, description: 'Items per page' },
        ],
        response: `{ "success": true, "data": [{ "id": "clx...", "subject": "New Booking", "body": "...", "type": "IN_APP" }], "meta": { ... } }`,
      },
      {
        method: 'GET', path: '/notifications/unread-count', description: 'Get unread notification count', auth: true,
        params: [],
        response: `{ "count": 5 }`,
      },
      {
        method: 'PATCH', path: '/notifications/:id/read', description: 'Mark notification as read', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Notification ID' }],
        response: `{ "success": true, "data": { "id": "clx...", "readAt": "2026-06-08T..." } }`,
      },
      {
        method: 'GET', path: '/notifications/push/vapid-key', description: 'Get VAPID public key for push notifications', auth: false,
        params: [],
        response: `{ "publicKey": "BFxx..." }`,
      },
      {
        method: 'POST', path: '/notifications/push/subscribe', description: 'Subscribe to push notifications', auth: true,
        params: [
          { name: 'endpoint', type: 'string', required: true, description: 'Push subscription endpoint' },
          { name: 'keys.p256dh', type: 'string', required: true, description: 'P256DH key' },
          { name: 'keys.auth', type: 'string', required: true, description: 'Auth key' },
        ],
        request: `{ "endpoint": "https://fcm.googleapis.com/...", "keys": { "p256dh": "...", "auth": "..." } }`,
        response: `{ "success": true }`,
      },
      {
        method: 'DELETE', path: '/notifications/push/subscribe', description: 'Unsubscribe from push notifications', auth: true,
        params: [{ name: 'endpoint', type: 'string', required: true, description: 'Push endpoint to remove' }],
        request: `{ "endpoint": "https://fcm.googleapis.com/..." }`,
        response: `{ "success": true }`,
      },
      {
        method: 'POST', path: '/notifications/test-email', description: 'Test email configuration', auth: true,
        params: [
          { name: 'recipient', type: 'string', required: true, description: 'Email address' },
          { name: 'subject', type: 'string', required: true, description: 'Email subject' },
          { name: 'message', type: 'string', required: true, description: 'Email body' },
        ],
        request: `{ "recipient": "test@example.com", "subject": "Test", "message": "Hello" }`,
        response: `{ "success": true, "message": "Email sent" }`,
      },
      {
        method: 'POST', path: '/notifications/send-team', description: 'Send notification to team members', auth: true,
        params: [
          { name: 'userIds', type: 'string[]', required: true, description: 'Array of user IDs' },
          { name: 'title', type: 'string', required: true, description: 'Notification title' },
          { name: 'body', type: 'string', required: true, description: 'Notification body' },
        ],
        request: `{ "userIds": ["user1", "user2"], "title": "New Booking", "body": "A new booking has been made" }`,
        response: `{ "success": true, "sent": 2 }`,
      },
      {
        method: 'POST', path: '/notifications/test-sms', description: 'Test SMS configuration', auth: true,
        params: [
          { name: 'recipient', type: 'string', required: true, description: 'Phone number' },
          { name: 'message', type: 'string', required: true, description: 'SMS message' },
        ],
        request: `{ "recipient": "+2348012345678", "message": "Test SMS" }`,
        response: `{ "success": true, "message": "SMS sent" }`,
      },
      {
        method: 'GET', path: '/notifications/sms-credits/balance', description: 'Get SMS credit balance', auth: true,
        params: [],
        response: `{ "balance": 500, "tenantId": "clx..." }`,
      },
      {
        method: 'POST', path: '/notifications/sms-credits/grant', description: 'Grant SMS credits (admin only)', auth: true,
        params: [
          { name: 'tenantId', type: 'string', required: true, description: 'Tenant ID' },
          { name: 'amount', type: 'number', required: true, description: 'Credits to grant' },
          { name: 'description', type: 'string', required: false, description: 'Reason for granting' },
        ],
        request: `{ "tenantId": "clx...", "amount": 100, "description": "Monthly allocation" }`,
        response: `{ "success": true, "data": { "balance": 600 } }`,
      },
      {
        method: 'GET', path: '/notifications/sms-credits/transactions', description: 'Get SMS credit transaction history', auth: true,
        params: [
          { name: 'page', type: 'number', required: false, description: 'Page number' },
          { name: 'limit', type: 'number', required: false, description: 'Items per page' },
        ],
        response: `{ "success": true, "data": [{ "id": "clx...", "amount": -1, "type": "usage", "createdAt": "..." }] }`,
      },
      {
        method: 'GET', path: '/notifications/platform-settings', description: 'Get platform SMS/WhatsApp settings (admin)', auth: true,
        params: [],
        response: `{ "smsActive": true, "whatsappActive": false, ... }`,
      },
    ],
  },
  {
    name: 'Satisfaction',
    icon: <Star className="h-4 w-4" />,
    prefix: 'satisfaction',
    endpoints: [
      {
        method: 'POST', path: '/satisfaction/survey', description: 'Submit a satisfaction survey', auth: true,
        params: [
          { name: 'customerId', type: 'string', required: true, description: 'Customer ID' },
          { name: 'touchpoint', type: 'string', required: true, description: 'Touchpoint (e.g. SERVICE_COMPLETED)' },
          { name: 'score', type: 'number', required: true, description: 'Score (1-5)' },
          { name: 'feedback', type: 'string', required: false, description: 'Optional feedback text' },
          { name: 'bookingId', type: 'string', required: false, description: 'Booking ID' },
        ],
        request: `{ "customerId": "clx...", "touchpoint": "SERVICE_COMPLETED", "score": 5, "feedback": "Great service!" }`,
        response: `{ "success": true, "data": { "id": "clx...", "score": 5, "sentimentLabel": "positive" } }`,
      },
      {
        method: 'POST', path: '/satisfaction/nps', description: 'Submit an NPS response', auth: true,
        params: [
          { name: 'customerId', type: 'string', required: true, description: 'Customer ID' },
          { name: 'score', type: 'number', required: true, description: 'NPS score (0-10)' },
          { name: 'reason', type: 'string', required: false, description: 'Reason for score' },
        ],
        request: `{ "customerId": "clx...", "score": 9, "reason": "Excellent service quality" }`,
        response: `{ "success": true, "data": { "id": "clx...", "score": 9, "promoterType": "PROMOTER" } }`,
      },
      {
        method: 'GET', path: '/satisfaction/csat', description: 'Get CSAT score', auth: true,
        params: [
          { name: 'startDate', type: 'string', required: false, description: 'Start date filter' },
          { name: 'endDate', type: 'string', required: false, description: 'End date filter' },
        ],
        response: `{ "success": true, "data": { "average": 4.2, "count": 150 } }`,
      },
      {
        method: 'GET', path: '/satisfaction/nps', description: 'Get NPS score', auth: true,
        params: [
          { name: 'startDate', type: 'string', required: false, description: 'Start date filter' },
          { name: 'endDate', type: 'string', required: false, description: 'End date filter' },
        ],
        response: `{ "success": true, "data": { "nps": 42, "promoters": 60, "passives": 25, "detractors": 15, "total": 100 } }`,
      },
      {
        method: 'GET', path: '/satisfaction/trend', description: 'Get monthly satisfaction trend', auth: true,
        params: [{ name: 'months', type: 'number', required: false, description: 'Number of months (default: 6)' }],
        response: `{
  "success": true,
  "data": [{ "month": "2026-01", "averageScore": 4.2, "responses": 25 }, ...]
}`,
      },
      {
        method: 'GET', path: '/satisfaction/surveys', description: 'List all surveys', auth: true,
        params: [
          { name: 'touchpoint', type: 'string', required: false, description: 'Filter by touchpoint' },
          { name: 'startDate', type: 'string', required: false, description: 'Start date filter' },
          { name: 'endDate', type: 'string', required: false, description: 'End date filter' },
        ],
        response: `{
  "success": true,
  "data": [{ "id": "clx...", "score": 5, "sentimentLabel": "positive", "feedback": "Great!" }]
}`,
      },
      {
        method: 'GET', path: '/satisfaction/sentiment/trend', description: 'Get sentiment trend over time', auth: true,
        params: [
          { name: 'startDate', type: 'string', required: false, description: 'Start date (YYYY-MM-DD)' },
          { name: 'endDate', type: 'string', required: false, description: 'End date (YYYY-MM-DD)' },
        ],
        response: `{
  "success": true,
  "data": { "positivePct": 60, "neutralPct": 25, "negativePct": 15, "total": 100, "trend": [{ "date": "2026-06-01", "score": 0.45 }] }
}`,
      },
      {
        method: 'GET', path: '/satisfaction/sentiment/categories', description: 'Get sentiment breakdown by category', auth: true,
        params: [],
        response: `{
  "success": true,
  "data": [{ "category": "cleanliness", "positiveCount": 10, "neutralCount": 5, "negativeCount": 2, "averageScore": 0.35, "total": 17 }]
}`,
      },
      {
        method: 'GET', path: '/satisfaction/sentiment/keywords', description: 'Get most frequent keywords', auth: true,
        params: [{ name: 'type', type: 'string', required: false, description: 'positive, negative, or all' }],
        response: `{
  "success": true,
  "data": [{ "keyword": "great", "count": 15 }, { "keyword": "professional", "count": 12 }]
}`,
      },
      {
        method: 'POST', path: '/satisfaction/sentiment/analyze/:surveyId', description: 'Re-run sentiment analysis on a survey', auth: true,
        params: [{ name: 'surveyId', type: 'string', required: true, description: 'Survey ID' }],
        response: `{ "success": true, "data": { "score": 0.75, "label": "positive", "keywords": ["great", "professional"], "confidence": 0.8 } }`,
      },
    ],
  },
  {
    name: 'Webhooks',
    icon: <Globe className="h-4 w-4" />,
    prefix: 'webhooks',
    endpoints: [
      {
        method: 'GET', path: '/webhooks', description: 'List all webhooks for tenant', auth: true,
        params: [],
        response: `{ "success": true, "data": [{ "id": "clx...", "url": "https://example.com/webhook", "events": ["booking.created"] }] }`,
      },
      {
        method: 'GET', path: '/webhooks/events', description: 'List available webhook event types', auth: true,
        params: [],
        response: `["booking.created", "booking.cancelled", "payment.completed", "invoice.paid", "dispatch.assigned"]`,
      },
      {
        method: 'POST', path: '/webhooks', description: 'Register a new webhook', auth: true,
        params: [
          { name: 'url', type: 'string', required: true, description: 'Webhook URL endpoint' },
          { name: 'events', type: 'string[]', required: true, description: 'Array of event types to listen for' },
          { name: 'secret', type: 'string', required: false, description: 'Webhook signing secret' },
        ],
        request: `{
  "url": "https://example.com/webhook",
  "events": ["booking.created", "payment.completed"],
  "secret": "whsec_..."
}`,
        response: `{ "success": true, "data": { "id": "clx...", "url": "https://example.com/webhook", "events": [...] } }`,
      },
      {
        method: 'PATCH', path: '/webhooks/:id', description: 'Update a webhook', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Webhook ID' }],
        request: `{ "events": ["booking.created", "booking.cancelled", "payment.completed"] }`,
        response: `{ "success": true, "data": { "id": "clx...", "events": [...] } }`,
      },
      {
        method: 'DELETE', path: '/webhooks/:id', description: 'Delete a webhook', auth: true,
        params: [{ name: 'id', type: 'string', required: true, description: 'Webhook ID' }],
        response: `{ "success": true }`,
      },
      {
        method: 'GET', path: '/webhooks/deliveries', description: 'List webhook deliveries', auth: true,
        params: [
          { name: 'event', type: 'string', required: false, description: 'Filter by event type' },
          { name: 'status', type: 'string', required: false, description: 'Filter by delivery status' },
          { name: 'page', type: 'number', required: false, description: 'Page number' },
          { name: 'limit', type: 'number', required: false, description: 'Items per page' },
        ],
        response: `{ "success": true, "data": [{ "id": "clx...", "event": "booking.created", "status": "DELIVERED", "statusCode": 200 }] }`,
      },
      {
        method: 'POST', path: '/webhooks/test', description: 'Test a webhook dispatch', auth: true,
        params: [
          { name: 'webhookId', type: 'string', required: true, description: 'Webhook ID to test' },
          { name: 'event', type: 'string', required: true, description: 'Event type to test' },
        ],
        request: `{ "webhookId": "clx...", "event": "booking.created" }`,
        response: `{ "message": "Test webhook dispatched", "event": "booking.created", "url": "https://example.com/webhook" }`,
      },
    ],
  },
  {
    name: 'Reports',
    icon: <BarChart3 className="h-4 w-4" />,
    prefix: 'reports',
    endpoints: [
      {
        method: 'GET', path: '/reports/dashboard-stats', description: 'Get dashboard summary statistics', auth: true,
        params: [],
        response: `{
  "success": true,
  "data": { "totalBookings": 150, "totalRevenue": 750000, "activeCustomers": 80, "pendingBookings": 12 }
}`,
      },
      {
        method: 'GET', path: '/reports/revenue', description: 'Get revenue report', auth: true,
        params: [
          { name: 'startDate', type: 'string', required: true, description: 'Start date (YYYY-MM-DD)' },
          { name: 'endDate', type: 'string', required: true, description: 'End date (YYYY-MM-DD)' },
          { name: 'groupBy', type: 'string', required: false, description: 'day, week, or month' },
        ],
        response: `{
  "success": true,
  "data": [{ "date": "2026-06-01", "revenue": 50000, "count": 10 }]
}`,
      },
      {
        method: 'GET', path: '/reports/bookings', description: 'Get booking trends', auth: true,
        params: [
          { name: 'startDate', type: 'string', required: true, description: 'Start date (YYYY-MM-DD)' },
          { name: 'endDate', type: 'string', required: true, description: 'End date (YYYY-MM-DD)' },
          { name: 'groupBy', type: 'string', required: false, description: 'day, week, or month' },
        ],
        response: `{
  "success": true,
  "data": [{ "date": "2026-06-01", "total": 10, "completed": 8, "cancelled": 1 }]
}`,
      },
      {
        method: 'GET', path: '/reports/technicians', description: 'Get technician performance', auth: true,
        params: [
          { name: 'startDate', type: 'string', required: true, description: 'Start date (YYYY-MM-DD)' },
          { name: 'endDate', type: 'string', required: true, description: 'End date (YYYY-MM-DD)' },
        ],
        response: `{
  "success": true,
  "data": [{ "id": "clx...", "name": "John Tech", "completedBookings": 45, "rating": 4.8 }]
}`,
      },
      {
        method: 'GET', path: '/reports/services', description: 'Get top services report', auth: true,
        params: [
          { name: 'startDate', type: 'string', required: true, description: 'Start date (YYYY-MM-DD)' },
          { name: 'endDate', type: 'string', required: true, description: 'End date (YYYY-MM-DD)' },
        ],
        response: `{
  "success": true,
  "data": [{ "id": "clx...", "name": "Deep Cleaning", "bookingCount": 30, "revenue": 150000 }]
}`,
      },
    ],
  },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Copy to clipboard">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function EndpointCard({ ep }: { ep: Endpoint }) {
  const [expanded, setExpanded] = React.useState(false)
  const curlCmd = `curl -X ${ep.method} ${baseUrl}${ep.path}${ep.auth ? ` \\\n  -H "Authorization: Bearer YOUR_TOKEN"` : ''}${ep.method !== 'GET' && ep.request ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${ep.request.replace(/\n/g, '')}'` : ''}`

  return (
    <Card className="mb-4">
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${methodColors[ep.method] || 'bg-gray-100 text-gray-800'}`}>
            {ep.method}
          </span>
          <code className="text-sm font-mono text-gray-900 dark:text-white">{ep.path}</code>
          {ep.auth && (
            <Badge variant="outline" className="text-[10px] ml-1">
              <Lock className="h-3 w-3 mr-1" />Auth
            </Badge>
          )}
          <span className="text-xs text-gray-400 ml-auto hidden sm:inline">{ep.description}</span>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4 pt-0">
          <p className="text-sm text-gray-600 dark:text-gray-400">{ep.description}</p>

          {ep.params && ep.params.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Parameters</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-1 pr-4 font-medium text-gray-500">Name</th>
                    <th className="text-left py-1 pr-4 font-medium text-gray-500">Type</th>
                    <th className="text-left py-1 pr-4 font-medium text-gray-500">Required</th>
                    <th className="text-left py-1 font-medium text-gray-500">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ep.params.map((p, j) => (
                    <tr key={j} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-1 pr-4 font-mono text-xs">{p.name}</td>
                      <td className="py-1 pr-4 text-xs text-gray-500">{p.type}</td>
                      <td className="py-1 pr-4">
                        {p.required ? (
                          <Badge variant="destructive" className="text-[10px]">Required</Badge>
                        ) : (
                          <span className="text-xs text-gray-400">Optional</span>
                        )}
                      </td>
                      <td className="py-1 text-xs text-gray-500">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ep.request && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Request Body</h4>
              <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs font-mono overflow-x-auto border border-gray-200 dark:border-gray-700">
                {ep.request}
              </pre>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Response</h4>
            <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs font-mono overflow-x-auto border border-gray-200 dark:border-gray-700">
              {ep.response}
            </pre>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">cURL</h4>
              <CopyButton text={curlCmd} />
            </div>
            <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs font-mono overflow-x-auto border border-gray-200 dark:border-gray-700 whitespace-pre-wrap break-all">
              {curlCmd}
            </pre>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default function ApiDocsPage() {
  const [activeTab, setActiveTab] = React.useState(modules[0].name)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Documentation</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Comprehensive reference for the BookerMap REST API — {modules.reduce((sum, m) => sum + m.endpoints.length, 0)} endpoints across {modules.length} modules
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {modules.map((m) => (
          <button
            key={m.name}
            onClick={() => setActiveTab(m.name)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === m.name
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {m.icon}
            <span>{m.name}</span>
            <Badge variant="secondary" className="text-[10px] ml-auto">{m.endpoints.length}</Badge>
          </button>
        ))}
      </div>

      {modules.map((m) => (
        <div key={m.name} className={activeTab === m.name ? 'block' : 'hidden'}>
          <div className="flex items-center gap-2 mb-4">
            {m.icon}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{m.name}</h2>
            <span className="text-sm text-gray-400">/{m.prefix}</span>
          </div>
          {m.endpoints.map((ep, i) => (
            <EndpointCard key={i} ep={ep} />
          ))}
        </div>
      ))}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Authentication</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-1">JWT Bearer Token</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Most endpoints require a JWT token obtained from <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">POST /auth/login</code>.
              Include it in the Authorization header:
            </p>
            <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs font-mono border border-gray-200 dark:border-gray-700">
              Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
            </pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1">API Keys</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              API keys can be generated from the API Keys settings page for integrations. They use the same Authorization header format:
            </p>
            <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs font-mono border border-gray-200 dark:border-gray-700">
              Authorization: Bearer bmap_a1b2c3d4e5f6...
            </pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1">Tenant Isolation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              All authenticated endpoints are scoped to the tenant encoded in the JWT. Cross-tenant data access is not permitted.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1">Rate Limiting</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Each API key has a configurable rate limit (requests per minute). When exceeded, the API returns HTTP 429 with a Retry-After header. Auth endpoints are limited to 5 requests per minute.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1">Base URL</h3>
            <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs font-mono border border-gray-200 dark:border-gray-700">
              {baseUrl}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Error Handling</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            All errors follow a consistent format:
          </p>
          <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs font-mono border border-gray-200 dark:border-gray-700">
{`{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description"
  }
}`}
          </pre>
          <div>
            <h3 className="text-sm font-semibold mb-2">Common Error Codes</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-1 pr-4 font-medium text-gray-500">HTTP Status</th>
                  <th className="text-left py-1 pr-4 font-medium text-gray-500">Code</th>
                  <th className="text-left py-1 font-medium text-gray-500">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['400', 'BAD_REQUEST', 'Invalid request body or parameters'],
                  ['401', 'UNAUTHORIZED', 'Missing or invalid authentication token'],
                  ['403', 'FORBIDDEN', 'Insufficient permissions for this action'],
                  ['404', 'NOT_FOUND', 'Requested resource not found'],
                  ['409', 'CONFLICT', 'Resource already exists or state conflict'],
                  ['429', 'RATE_LIMITED', 'Rate limit exceeded — retry after header'],
                  ['500', 'INTERNAL_ERROR', 'Unexpected server error'],
                ].map(([status, code, desc]) => (
                  <tr key={code} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-1 pr-4"><Badge variant="destructive" className="text-[10px]">{status}</Badge></td>
                    <td className="py-1 pr-4 font-mono text-xs">{code}</td>
                    <td className="py-1 text-xs text-gray-500">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
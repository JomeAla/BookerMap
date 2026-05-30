# AI Agent Task List: Build BookerMap from Scratch

## Progress Legend
- `[x]` — Complete
- `[~]` — Partially built / needs finishing
- `[ ]` — Not started

---

## Pre-requisites Check
- [x] Verify Node.js v18+ installed
- [x] Verify PostgreSQL available
- [ ] Get Paystack API keys (test and live) — ⏳ can be set via admin UI later
- [ ] Get Flutterwave API credentials (test and live) — ⏳ can be set via admin UI later

---

## SECTION 1: PROJECT SETUP (Tasks 1-25)

### Task 1: Initialize Project Repository
- [x] Project directory created
- [x] Git initialized
- [x] Monorepo structure with apps/api, apps/web

### Task 2: Set Up Backend Package (NestJS)
- [x] NestJS application generated in apps/api
- [x] Core dependencies installed (Prisma, JWT, Passport, bcrypt, etc.)
- [x] Dev dependencies installed

### Task 3: Configure TypeScript for Backend
- [x] tsconfig.json configured with decorators, paths, strict mode

### Task 4: Set Up Frontend Package (Next.js)
- [x] Next.js app in apps/web
- [x] Dependencies: TanStack Query, Axios, lucide-react, tailwind-merge, clsx

### Task 5: Create Shared Packages
- [x] Shared types defined in apps/web/src/types/index.ts
- [x] Types include: Tenant, User, Customer, Address, Service, Booking, Invoice, Payment, etc.

### Task 7: Set Up Prisma Schema
- [x] Prisma initialized
- [x] Full schema with 19 tables: tenants, users, customers, addresses, services, modifiers, intake_fields, territories, territory_services, bookings, recurring_bookings, dispatches, invoices, invoice_line_items, payments, payment_settings, coupons, notifications, webhooks, ai_conversations, ai_messages, ai_responses, refresh_tokens

### Task 8: Configure Environment Variables
- [x] apps/api/.env configured (DB, JWT, Paystack, Flutterwave, SMTP)
- [x] apps/web/.env.local configured (API_URL)

### Task 9: Create Database Migration
- [x] Prisma migration applied (schema in sync with DB)

### Task 10: Build Auth Module - Core Structure
- [x] AuthModule generated
- [x] AuthController + AuthService created

### Task 11: Implement JWT Authentication
- [x] JWT strategy
- [x] JWT auth guard
- [x] Login, register, refresh token
- [x] Password reset (forgot + reset)

### Task 12: Implement RBAC
- [x] UserRole enum: ADMIN, OWNER, MANAGER, TECHNICIAN, CUSTOMER
- [x] Roles decorator
- [x] Roles guard

### Task 13: Build Tenant Module
- [x] TenantModule with controller + service
- [x] Create tenant, get by slug, update

### Task 14: Set Up Global Error Handling
- [x] HTTP exception filter
- [x] Logging interceptor
- [x] Transform interceptor (wraps in { success, data })

### Task 15: Set Up API Documentation (Swagger)
- [ ] Not implemented

### Task 16: Build User Module
- [x] CRUD operations
- [x] Invite team member
- [x] Update role

### Task 17: Build Customer Module
- [x] CRUD operations
- [x] Address management
- [x] Search/filter
- [x] Import/export

### Task 18: Build Service Module
- [x] CRUD services
- [x] Categories
- [x] Modifiers
- [x] Intake fields

### Task 19: Build Territory Module
- [x] CRUD territories
- [x] Service linking
- [x] Geographic boundaries

### Task 20: Build Booking Module
- [x] Create booking (with conflict detection)
- [x] Cancel booking
- [x] Reschedule booking
- [x] Webhook dispatch

### Task 21: Build Scheduling Engine
- [x] getAvailableSlots (30-min intervals, 8am-5pm)
- [x] checkConflict (with buffer)
- [x] calculateEndTime (from service duration)
- [x] Drive-time calculation

### Task 22: Build Dispatch Module
- [x] Assign job to technician
- [x] Job status tracking (ASSIGNED → EN_ROUTE → STARTED → COMPLETED)
- [x] List jobs by technician
- [x] Auto-assignment rules
- [ ] Job offer system — not started

### Task 23: Build Invoice Module
- [x] Create invoice (line items, tax, discount)
- [x] Send invoice (via EmailService)
- [x] Mark as paid
- [x] PDF generation

### Task 24: Build Notification Module
- [x] EmailService (SMTP + console fallback)
- [x] SmsService (stub)
- [x] NotificationService (in-app records)
- [x] NotificationPanel dropdown + /notifications page (filter tabs, pagination, mark read)
- [x] Email templates (confirmation, reminder, invoice, feedback, password reset)
- [x] Reminder cron — ReminderCronService runs hourly via @nestjs/schedule, sends 24h-before reminders with dedup

### Task 25: Set Up Webhook Module
- [x] Webhook CRUD
- [x] 12 supported events
- [x] HMAC-SHA256 signed dispatch
- [ ] Webhook management UI in admin panel — not started

---

## SECTION 2: PAYMENT INTEGRATION (Tasks 26-40)

### Task 26: Create Payment Module Structure
- [x] PaymentModule generated
- [x] PaymentService created

### Task 27: Implement Paystack Service
- [x] initializeTransaction
- [x] verifyTransaction
- [x] createCustomer
- [x] chargeAuthorization
- [x] createRefund
- [x] createTransferRecipient
- [x] initiateTransfer

### Task 28: Implement Flutterwave Service
- [x] getAccessToken
- [x] createCustomer
- [x] createPaymentMethod
- [x] initiateCharge
- [x] verifyTransaction
- [x] createTransferRecipient
- [x] initiateTransfer

### Task 29: Create Unified Payment Interface
- [x] PaymentProvider interface
- [x] PaystackService implements it
- [x] FlutterwaveService implements it

### Task 30: Implement Payment Webhooks
- [x] Paystack webhook (charge.success, charge.failed)
- [x] Flutterwave webhook (charge.completed, charge.failed, transfer.completed)
- [x] Dispatch webhook events on payment completed/failed

### Task 31: Create Payment Controller
- [x] POST /payments/initialize
- [x] POST /payments/verify/:reference
- [x] GET /payments/:id
- [x] GET /payments
- [x] POST /payments/refund

### Task 32: Handle Recurring Payments
- [ ] Not started

### Task 33: Implement Refund System
- [x] Refund in PaystackService
- [x] Refund in FlutterwaveService
- [x] POST /payments/refund endpoint
- [x] Partial refund (backend + UI)

### Task 34: Add Payment to Invoice Module
- [x] Payment link generation (via initializePayment)
- [x] Payment status tracking (via webhooks)
- [x] Payment reminders (cron)
- [ ] Partial payments — not implemented

### Task 35: Create Payment UI Components
- [ ] Not started (Paystack/Flutterwave popups handle UI)

### Task 36: Implement Saved Cards Feature
- [x] Saved cards (tokenization) for Paystack

### Task 37: Add Currency Handling
- [x] NGN, KES, GHS, ZAR, USD, GBP, EUR supported in settings
- [x] Intl.NumberFormat used for display
- [x] Amount-to-subunit conversion in provider services

### Task 38: Implement Split Payments (Marketplace)
- [ ] Not started

### Task 39: Payment Testing
- [ ] Not started (waiting for real keys)

### Task 40: Payment Security
- [x] Webhook signature verification (HMAC-SHA512 for Paystack, HMAC-SHA256 for Flutterwave)
- [x] Encrypted credential storage (AES-256-GCM)
- [ ] Rate limiting — not implemented
- [ ] Idempotency — not implemented

### Task 40b: Tenant Payment Configuration Backend
- [x] PaymentSettingsController (GET, POST Paystack, POST Flutterwave, validate, PUT, DELETE)
- [x] AES-256-GCM encryption for stored keys

### Task 40c: Payment Settings API Endpoints
- [x] GET /payments/settings
- [x] POST /payments/settings/paystack
- [x] POST /payments/settings/flutterwave
- [x] POST /payments/settings/validate
- [x] PUT /payments/settings
- [x] DELETE /payments/settings/:provider

### Task 40d: Payment Settings Admin UI
- [x] Paystack key input fields
- [x] Flutterwave key input fields
- [x] Test connection button
- [x] Save button wired
- [ ] Webhook URL display — not started

---

## SECTION 3: CUSTOM AI AGENT (Tasks 41-55)

### Task 41: Set Up AI Agent Module
- [x] AiAgentModule generated
- [x] Services: ChatService, ConversationEngine, ResponseService, TaskExecutor, AnalyticsService

### Task 42: Create AI Conversation Engine
- [x] Intent recognition (GREETING, BOOKING_CREATE, BOOKING_CANCEL, BOOKING_RESCHEDULE, BOOKING_STATUS, PAYMENT_INQUIRY, PRICE_INQUIRY, FALLBACK)
- [x] Entity extraction (date, time, service, name, phone, email, bookingId)
- [x] Multi-turn context management
- [x] State machine for conversation flows

### Task 43: Build Response Management System
- [x] Response template storage (DB + 17+ predefined)
- [x] Dynamic variable substitution ({{varName}})
- [x] Multi-language support
- [x] Fallback responses
- [x] Random variation for natural feel

### Task 44: Implement Task Execution Engine
- [x] CreateBookingHandler — looks up service, creates customer, creates booking
- [x] CancelBookingHandler — cancels by booking ID or phone
- [x] RescheduleBookingHandler — reschedules by ID or phone
- [x] GetStatusHandler — returns booking status
- [x] GetPriceHandler — returns service price
- [x] GetPaymentHandler — checks outstanding invoices
- [ ] MakePaymentHandler — not implemented

### Task 45: Create AI Chat Service
- [x] Process message → detect intent → extract entities → execute → respond
- [x] Save conversation history

### Task 46: Build Chat Interface (Frontend)
- [x] Floating chat widget — ChatWidget component with bubble button + slide-up panel
- [x] Chat window with messages — user/assistant bubbles with left/right alignment
- [x] Typing indicator — Loader2 spinner while AI responds
- [x] Quick action buttons — rendered below assistant messages
- [x] Chat history viewer

### Task 47: Admin Configuration Interface
- [x] Response template editor (settings/ai page)
- [x] FAQ builder (trigger + response pairs)
- [x] Language selection
- [x] Response style (Professional, Friendly, Casual)
- [x] Business hours for AI
- [ ] Fallback to human agent — not started

### Task 48: Conversation Analytics
- [x] Conversation stats (total, resolved, resolution rate, avg duration)
- [x] Common query patterns (top intents)
- [x] Failed conversation identification
- [ ] Customer satisfaction tracking — not started

### Task 49: Webhook for External Triggers
- [ ] Not started

### Task 50: WhatsApp AI Integration
- [x] Booking confirmations/reminders via WhatsApp Business API
- [x] Delivery status tracking + webhook

### Task 51: Voice AI (Optional Future)
- [ ] Not started

---

## SECTION 4: FRONTEND DEVELOPMENT (Tasks 52-70)

### Task 52: Set Up Next.js Project Structure
- [x] Folder structure created
- [x] Route groups (auth), (dashboard)

### Task 53: Create Base UI Components
- [x] Button, Input, Select, Card, Dialog, Table
- [x] Badge, StatusBadge, Spinner, Skeleton
- [x] Toast notification system

### Task 54: Build Authentication Pages
- [x] /login
- [x] /register
- [x] /forgot-password
- [x] /reset-password

### Task 55: Build Admin Dashboard Layout
- [x] Sidebar navigation (7 links, collapsible)
- [x] Top header (breadcrumbs, notifications, user menu)
- [x] Mobile responsive

### Task 56: Build Dashboard Home
- [x] Stat cards (today's bookings, revenue, customers, pending invoices)
- [x] Recent bookings table
- [x] AI insights panel

### Task 57: Build Customer Management Pages
- [x] Customer list with search/filter
- [x] Customer detail with addresses + booking history
- [x] Add customer dialog

### Task 58: Build Service Management Pages
- [x] Service list grouped by category
- [x] Add service dialog

### Task 59: Build Booking Calendar
- [x] Month view — grid with booking chips, +N more, click to navigate
- [x] Week view — horizontal timeline with absolute-positioned booking blocks
- [x] Day view — vertical hourly timeline with booking details
- [ ] Drag and drop — not started
- [ ] Click to create booking — not started

### Task 60: Build Booking Page (Customer-Facing)
- [x] 4-step wizard (service → date/time → info → confirm)
- [x] Available slot generation
- [x] Public booking at /booking/[tenantSlug]

### Task 61: Build Invoice Management
- [x] Invoice list with status filter
- [x] Create invoice dialog (customer, line items, tax, discount)
- [x] Invoice detail page (send, mark paid, payments table)

### Task 62: Build Payment Integration UI
- [ ] Payment form — not started (relies on provider popups)

### Task 63: Build Settings Pages
- [x] General settings (name, timezone, currency)
- [x] Team settings (list + invite dialog)
- [x] AI settings (language, style, templates)
- [x] Payment settings (key inputs + test)
- [x] Settings sub-navigation tabs
- [x] Payment settings save — Paystack/Flutterwave save, test, toggle all functional

### Task 64: Build Technician Mobile View
- [x] Today's jobs list
- [x] Job status actions (En Route, Start, Complete, Cancel)
- [x] Customer info display

### Task 65: Build Customer Portal
- [x] Booking list view
- [x] Payment history
- [x] Update profile

### Task 66: Implement Real-time Features
- [ ] Not started

### Task 67: Add Dark/Light Theme
- [x] Dark mode supported via Tailwind dark: variants
- [x] Theme toggle UI

### Task 68: Responsive Design
- [x] Collapsible sidebar
- [x] Mobile-responsive tables (overflow-x-auto)
- [x] Responsive grid layouts

### Task 69: Add Loading States
- [x] TableSkeleton, CardSkeleton
- [x] Spinner, PageLoader
- [x] Loading states in queries

### Task 70: Add Error Handling
- [x] Toast notifications for errors
- [x] Error display in forms
- [x] 401 auto-redirect to login

---

## REMAINING TASKS

- [x] **Route optimization** — dispatches list page with checkboxes + Optimize Route button via POST /routing/optimize
- [x] **SMS/email reminders** — ReminderCronService runs hourly, sends 24h-before reminders via EmailService + SmsService with dedup
- [x] **Reports page** — revenue, booking trends, technician performance, top services
- [x] **Recurring bookings UI** — list page + create form with frequency/interval/discount
- [x] **Coupon/promo codes UI** — admin CRUD + checkout validation with discount application
- [x] **Payment settings save** — Paystack/Flutterwave save, test, toggle all functional
- [x] **Test suite** — 43 unit tests across auth (10), booking (17), invoice (16) all passing
- [x] **Calendar week/day views** — proper day/week layouts with time-slot positioning
- [ ] **Customer mobile app** — React Native app for booking + tracking
- [x] **Google Calendar sync** — OAuth 2.0 connect/disconnect, manual sync future bookings via settings/calendar UI
- [x] **Review & rating system** — post-service feedback collection + admin moderation + public display
- [x] **Multi-location per tenant** — single business manages multiple branches
- [ ] **Inventory management** — track materials/products used per job
- [ ] **Commission tracking** — per-technician commission reports
- [ ] **Automated marketing** — email campaigns for re-engaging lapsed customers
- [x] **WhatsApp integration** — booking confirmations/reminders via WhatsApp Business API
- [x] **POS / on-site payment** — Paystack Terminal / Flutterwave POS
- [ ] **Dynamic pricing** — surge pricing for same-day, discounts for off-peak
- [x] **Technician availability settings**
- [x] **Service images upload** — base64 image upload + thumbnail preview on service card
- [x] **Embedded booking widget** — script tag for any website, injects floating button + iframe with compact 4-step booking flow
- [x] **Chat widget UI** on customer-facing pages
- [x] **Customer tags and groups** — tag CRUD, filter UI, inline editor on detail page
- [x] **Import/export customers** — CSV export download + CSV import upsert
- [x] **Invoice PDF generation**
- [x] **Webhook management UI** in admin panel
- [x] **In-app notification viewer**
- [x] **Team notifications** — multi-select team members + send in-app notification
- [x] **Saved cards (tokenization)** for Paystack
- [x] **Subscription management** (tenant billing)
- [x] **Skill tagging** for technicians — skills JSON field, editor UI + autocomplete
- [ ] **Auto-assignment rules** for dispatches
- [ ] **Job offer system** (techs claim jobs)
- [x] **SMS/WhatsApp delivery tracking**
- [ ] **Drive-time calculation** in scheduling
- [ ] **Tenant custom domain setup**
- [x] **OAuth** (Google, Microsoft login)
- [x] **Two-factor authentication**
- [ ] **Real-time location tracking** — technician GPS on map
- [ ] **Settlement tracking** — reconcile payments with provider settlements
- [ ] **Customer satisfaction tracking** — AI-powered sentiment analysis
- [ ] **Public API** — rate-limited REST API for third-party integrations
- [ ] **File management** — before/after photos, document storage per job
- [ ] **Dispute management** — handle chargebacks and disputes
- [ ] **Conversation flow builder** — visual editor for AI response flows
- [ ] **PWA support** — installable mobile web app

---

## COMPLETION CHECKLIST

- [ ] All critical services have unit tests
- [ ] Tests passing
- [ ] Payments working (test mode)
- [ ] All pages loading
- [ ] Mobile responsive
- [ ] SSL working
- [ ] Documentation complete
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Security hardening done

---

*Task List Version: 2.0*
*Last Updated: May 2026*

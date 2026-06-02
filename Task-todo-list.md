# AI Agent Task List: Build BookerMap from Scratch

## Progress Legend
- `[x]` — Complete
- `[~]` — Partially built / needs finishing
- `[ ]` — Not started

---

## Pre-requisites Check
- [x] Verify Node.js v18+ installed
- [x] Verify PostgreSQL available
- [ ] Get Paystack API keys (test and live) — will provide after this session; enter in Settings > Payments > Paystack
- [ ] Get Flutterwave API credentials (test and live) — will provide after this session; enter in Settings > Payments > Flutterwave

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
- [x] Full schema with 30+ models: tenants, users, customers, addresses, services, modifiers, intake_fields, territories, territory_services, bookings, recurring_bookings, dispatches, invoices, invoice_line_items, payments, payment_settings, coupons, notifications, webhooks, ai_conversations, ai_messages, ai_responses, refresh_tokens, reviews, saved_cards, subscriptions, subscription_invoices, pricing_rules, inventory_items, booking_inventory, booking_files, campaigns, campaign_logs, split_payments, settlements, settlement_line_items, disputes, dispute_evidence, satisfaction_surveys, nps_responses, conversation_flows, flow_nodes, location_updates, api_keys, escalations, idempotency_keys

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
- [x] OAuth (Google, Microsoft login)
- [x] Two-factor authentication (TOTP via speakeasy)

### Task 12: Implement RBAC
- [x] UserRole enum: ADMIN, OWNER, MANAGER, TECHNICIAN, CUSTOMER
- [x] Roles decorator
- [x] Roles guard

### Task 13: Build Tenant Module
- [x] TenantModule with controller + service
- [x] Create tenant, get by slug, update
- [x] Custom domain support (add/verify/remove, DNS config)

### Task 14: Set Up Global Error Handling
- [x] HTTP exception filter
- [x] Logging interceptor
- [x] Transform interceptor (wraps in { success, data })

### Task 15: Set Up API Documentation (Swagger)
- [x] @ApiTags/@ApiOperation/@ApiResponse on all controllers
- [x] Swagger UI at /api/docs

### Task 16: Build User Module
- [x] CRUD operations
- [x] Invite team member
- [x] Update role
- [x] Skills tagging (JSON field + autocomplete editor)
- [x] Commission tracking (rate + type per user)

### Task 17: Build Customer Module
- [x] CRUD operations
- [x] Address management
- [x] Search/filter
- [x] Import/export (CSV)
- [x] Tags & groups (comma-separated, filter/sort/edit)

### Task 18: Build Service Module
- [x] CRUD services
- [x] Categories
- [x] Modifiers
- [x] Intake fields
- [x] Service images upload (base64 PATCH)

### Task 19: Build Territory Module
- [x] CRUD territories
- [x] Service linking
- [x] Geographic boundaries

### Task 20: Build Booking Module
- [x] Create booking (with conflict detection)
- [x] Cancel booking
- [x] Reschedule booking
- [x] Webhook dispatch
- [x] Auto-create split payments on completion
- [x] Satisfaction survey auto-trigger on completion

### Task 21: Build Scheduling Engine
- [x] getAvailableSlots (30-min intervals, 8am-5pm)
- [x] checkConflict (with buffer)
- [x] calculateEndTime (from service duration)
- [x] Drive-time calculation (haversine formula)
- [x] Check slot availability for rescheduling

### Task 22: Build Dispatch Module
- [x] Assign job to technician
- [x] Job status tracking (ASSIGNED → EN_ROUTE → STARTED → COMPLETED)
- [x] List jobs by technician
- [x] Auto-assignment rules (skills + load balancing)
- [x] Job offer system (offer to multiple techs, accept by one)

### Task 23: Build Invoice Module
- [x] Create invoice (line items, tax, discount)
- [x] Send invoice (via EmailService)
- [x] Mark as paid
- [x] PDF generation
- [x] Partial payments (paidAmount tracking, progress bar, PARTIALLY_PAID status)
- [x] Invoice status filter pills (All/Draft/Sent/Paid/Overdue/Cancelled/Refunded/Partially Paid)
- [x] Partial refund UI

### Task 24: Build Notification Module
- [x] EmailService (SMTP + console fallback)
- [x] SmsService (stub)
- [x] NotificationService (in-app records)
- [x] NotificationPanel dropdown + /notifications page (filter tabs, pagination, mark read)
- [x] Email templates (confirmation, reminder, invoice, feedback, password reset)
- [x] Reminder cron — ReminderCronService runs via @nestjs/schedule, 24h-before with dedup
- [x] Payment reminders cron (daily 8am overdue invoices with dedup)
- [x] Team notifications (batch by user list, multi-select + dialog)
- [x] WhatsApp integration — stub service, booking reminder cron, webhook verification/delivery

### Task 25: Set Up Webhook Module
- [x] Webhook CRUD
- [x] 13 supported events
- [x] HMAC-SHA256 signed dispatch
- [x] Webhook management UI (add/edit/test/delete with secret management)
- [x] External webhook triggers (POST /webhooks/external with action-based dispatch)

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
- [x] POST /payments/pos/initialize (Paystack Terminal + Flutterwave POS)
- [x] POST /payments/pos/verify/:reference

### Task 32: Handle Recurring Payments
- [x] RecurringPayment + RecurringPaymentLog models
- [x] CRUD endpoints
- [x] Auto-charge cron
- [x] Frontend management page

### Task 33: Implement Refund System
- [x] Refund in PaystackService
- [x] Refund in FlutterwaveService
- [x] POST /payments/refund endpoint
- [x] Partial refund (backend + UI)

### Task 34: Add Payment to Invoice Module
- [x] Payment link generation (via initializePayment)
- [x] Payment status tracking (via webhooks)
- [x] Payment reminders (cron)
- [x] Partial payments (paidAmount tracking, installments)

### Task 35: Create Payment UI Components
- [x] Paystack/Flutterwave popup integration
- [x] POS button on booking/invoice detail
- [x] Payment history table on invoice detail

### Task 36: Implement Saved Cards Feature
- [x] SavedCard model + CardService (save/list/delete/default/charge)
- [x] Customer cards section in UI

### Task 37: Add Currency Handling
- [x] NGN, KES, GHS, ZAR, USD, GBP, EUR supported in settings
- [x] Intl.NumberFormat used for display
- [x] Amount-to-subunit conversion in provider services

### Task 38: Implement Split Payments (Marketplace)
- [x] SplitPayment model + service + controller
- [x] Auto-create on completed booking with paid invoice
- [x] Platform fee rate per tenant
- [x] Splits page with summary cards, filter pills, release/hold actions

### Task 39: Payment Testing
- [ ] Not started (waiting for real keys)

### Task 40: Payment Security
- [x] Webhook signature verification (HMAC-SHA512 Paystack, HMAC-SHA256 Flutterwave)
- [x] Encrypted credential storage (AES-256-GCM)
- [x] Rate limiting — @nestjs/throttler (60 req/min default, 5/min auth, 10/min public)
- [x] Idempotency — Idempotency-Key header, 1hr TTL, conflict detection

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
- [x] Webhook URL display

---

## SECTION 3: CUSTOM AI AGENT (Tasks 41-55)

### Task 41: Set Up AI Agent Module
- [x] AiAgentModule generated
- [x] Services: ChatService, ConversationEngine, ResponseService, TaskExecutor, AnalyticsService, EscalationService, FlowService

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
- [x] MakePaymentHandler — AI chatbot payment flow (Pay Now card in chat)

### Task 45: Create AI Chat Service
- [x] Process message → detect intent → extract entities → execute → respond
- [x] Save conversation history
- [x] Flow builder integration (active flows checked before default responses)

### Task 46: Build Chat Interface (Frontend)
- [x] Floating chat widget — ChatWidget component with bubble button + slide-up panel
- [x] Chat window with messages — user/assistant bubbles with left/right alignment
- [x] Typing indicator — Loader2 spinner while AI responds
- [x] Quick action buttons — rendered below assistant messages
- [x] Chat history viewer
- [x] Voice input (Speech-to-text mic button via Web Speech API)
- [x] Voice output (TTS toggle, speaks AI responses aloud)
- [x] Payment action card rendering (Pay Now button)

### Task 47: Admin Configuration Interface
- [x] Response template editor (settings/ai page)
- [x] FAQ builder (trigger + response pairs)
- [x] Language selection
- [x] Response style (Professional, Friendly, Casual)
- [x] Business hours for AI
- [x] Fallback to human agent — escalation system (auto-detect stuck conversations, escalate queue)

### Task 48: Conversation Analytics
- [x] Conversation stats (total, resolved, resolution rate, avg duration)
- [x] Common query patterns (top intents)
- [x] Failed conversation identification
- [x] Customer satisfaction tracking (CSAT 1-5, NPS 0-10, touchpoint surveys, admin dashboard)

### Task 49: Webhook for External Triggers
- [x] External webhook action handler (trigger_ai, check_availability, create_booking, get_booking_status, get_customer_info)
- [x] Authenticated via x-webhook-secret + x-tenant-slug headers
- [x] Test tool in webhook settings UI

### Task 50: WhatsApp AI Integration
- [x] Booking confirmations/reminders via WhatsApp Business API
- [x] Delivery status tracking + webhook

### Task 51: Voice AI (Optional Future)
- [x] Browser-native Speech-to-text (SpeechRecognition API)
- [x] Text-to-Speech output (SpeechSynthesis API)
- [x] Voice input button + voice output toggle in chat

---

## SECTION 4: FRONTEND DEVELOPMENT (Tasks 52-70)

### Task 52: Set Up Next.js Project Structure
- [x] Folder structure created
- [x] Route groups (auth), (dashboard)

### Task 53: Create Base UI Components
- [x] Button, Input, Select, Card, Dialog, Table
- [x] Badge, StatusBadge, Tabs, Spinner, Skeleton
- [x] Toast notification system

### Task 54: Build Authentication Pages
- [x] /login (with OAuth buttons + 2FA flow)
- [x] /register
- [x] /forgot-password
- [x] /reset-password
- [x] /auth/callback (OAuth callback)
- [x] /auth/2fa-setup (QR setup page)

### Task 55: Build Admin Dashboard Layout
- [x] Sidebar navigation (collapsible, 15+ links)
- [x] Top header (breadcrumbs, notifications, user menu)
- [x] Mobile responsive
- [x] Theme toggle (sun/moon, localStorage + system preference)

### Task 56: Build Dashboard Home
- [x] Stat cards (today's bookings, revenue, customers, pending invoices)
- [x] Recent bookings table
- [x] AI insights panel

### Task 57: Build Customer Management Pages
- [x] Customer list with search/filter/sort
- [x] Customer detail with addresses, booking history, saved cards, recurring payments
- [x] Add customer dialog
- [x] Import/export CSV

### Task 58: Build Service Management Pages
- [x] Service list grouped by category
- [x] Add service dialog
- [x] Service images

### Task 59: Build Booking Calendar
- [x] Month view — grid with booking chips, +N more, click to navigate
- [x] Week view — horizontal timeline with absolute-positioned booking blocks
- [x] Day view — vertical hourly timeline with booking details
- [x] FullCalendar integration (dayGridMonth, timeGridWeek, timeGridDay)
- [x] Drag and drop — drag events to reschedule with confirmation + availability check
- [x] Click to create booking — quick booking modal with pre-filled time
- [x] Color-coded events by status

### Task 60: Build Booking Page (Customer-Facing)
- [x] 4-step wizard (service → date/time → info → confirm)
- [x] Available slot generation
- [x] Public booking at /booking/[tenantSlug]
- [x] Embedded booking widget (widget.js + iframe, postMessage API)

### Task 61: Build Invoice Management
- [x] Invoice list with status filter (All/Draft/Sent/Paid/Overdue/Cancelled/Refunded/Partially Paid)
- [x] Create invoice dialog (customer, line items, tax, discount)
- [x] Invoice detail page (send, mark paid, payments table, partial payment dialog)
- [x] Payment progress bar (paidAmount / total)

### Task 62: Build Payment Integration UI
- [x] Paystack/Flutterwave popup integration
- [x] POS button on booking/invoice detail
- [x] Saved cards section
- [x] Subscription management page
- [x] Split payments page with summary cards
- [x] Disputes page with evidence upload
- [x] Settlement tracking page

### Task 63: Build Settings Pages
- [x] General settings (name, timezone, currency)
- [x] Team settings (list + invite dialog, commission fields, earnings dialog)
- [x] AI settings (language, style, templates, business hours)
- [x] Payment settings (key inputs + test + webhook URL)
- [x] Webhook management (CRUD + test + external webhook tool)
- [x] Custom domain settings (add, verify, DNS config)
- [x] API keys management (generate, revoke, scopes)
- [x] Settings sub-navigation tabs (General, Team, AI, Payments, Webhooks, Domain, API Keys)

### Task 64: Build Technician Mobile View
- [x] Today's jobs list (with tabs for offered/accepted/started)
- [x] Job status actions (En Route, Start, Complete, Cancel)
- [x] Customer info display
- [x] Accept job buttons for offered jobs
- [x] Location sharing toggle (auto-starts on En Route, sends via WebSocket)

### Task 65: Build Customer Portal
- [x] Booking list view
- [x] Payment history
- [x] Update profile
- [x] Feedback/satisfaction survey submission
- [x] Disputes tab (view + create)
- [x] Real-time technician tracking map

### Task 66: Implement Real-time Features
- [x] BookingGateway (socket.io namespace /ws, tenant rooms, booking/dispatch/notification events)
- [x] LocationGateway (socket.io namespace /location, live GPS updates)
- [x] Frontend socket provider (useSocket hook)

### Task 67: Add Dark/Light Theme
- [x] Dark mode supported via Tailwind dark: variants
- [x] Theme toggle UI (sun/moon in sidebar)

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

## REMAINING TASKS (Not Yet Started)

### Platform Core
- [ ] **Customer mobile app** — React Native app for booking + tracking
- [ ] **Payment testing** — needs real Paystack/Flutterwave API keys

### Feature Gaps
- [ ] **Customer mobile app** — React Native app for booking + tracking

### Payment Testing
- [ ] **Payment testing** — enter real API keys in Settings > Payments > Paystack/Flutterwave in admin panel, then test initialize/verify/refund flows
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

*Task List Version: 4.0*
*Last Updated: June 2026*

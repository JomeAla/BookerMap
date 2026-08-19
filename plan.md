# Detailed Technical Plan: BookerMap SaaS

## Project Overview
- **Project Name**: BookerMap
- **Type**: Multi-tenant SaaS Booking & Scheduling Platform
- **Core Functionality**: Online booking, scheduling, dispatch, invoicing, and payments for home service businesses
- **Target Market**: Africa (Nigeria, Ghana, Kenya, South Africa) with global capability
- **Competitive Advantage**: Custom rule-based AI agent (no external API dependency) + African payment methods (Paystack/Flutterwave)
- **Current Phase**: Pre-launch - core modules built (~90% complete), polishing remaining features. Plan docs reconciled with source code July 2026.

---

## Progress Legend
- `[x]` - Complete
- `[~]` - Partially built / needs finishing
- `[ ]` - Not started

---

## Phase 1: Foundation & Infrastructure

### 1.1 Project Setup
- [x] Initialize monorepo with Git
- [x] Set up project structure (apps/api, apps/web)
- [x] Configure TypeScript across all projects
- [x] Set up ESLint and Prettier
- [x] Set up development, staging, production environments

### 1.2 Database Design (PostgreSQL)
- [x] Design multi-tenant schema
- [x] Create Prisma schema with all entities
- [x] Implement tenant isolation (row-level security via tenantId scoping)
- [x] Set up database migrations
- [x] Create database seeds for development

### 1.3 Core Backend Architecture (NestJS)
- [x] Set up NestJS application
- [x] Configure Prisma connection
- [x] Implement multi-tenant middleware (JWT tenantId extraction)
- [x] Set up JWT authentication
- [x] Implement RBAC (Role-Based Access Control via RolesGuard)
- [x] Create API versioning strategy (/api/v1 prefix)

### 1.4 Frontend Setup (Next.js)
- [x] Initialize Next.js 14 with TypeScript
- [x] Configure Tailwind CSS
- [x] Set up authentication pages (login, register)
- [x] Create dashboard layout (sidebar + header)
- [x] Implement dark/light theme

---

## Phase 2: Core Modules Development

### 2.1 Authentication Module
- [x] User registration with email
- [x] Login with JWT tokens
- [x] Refresh token mechanism
- [x] Password reset flow (forgot + reset with email)
- [x] OAuth (Google, Microsoft) — strategies fixed, callback URLs use env var
- [x] Two-factor authentication — TOTP via speakeasy + setup page + backup codes

### 2.2 Tenant Management Module
- [x] Tenant registration (business signup)
- [x] Subdomain/slug setup
- [x] Custom domain configuration — architecture supports it
- [x] Tenant settings (branding, timezone, currency)
- [x] Subscription management — plans, billing cycles, invoices, frontend settings page

### 2.3 User & Team Module
- [x] Team member invitation system
- [x] Role management (Admin, Owner, Manager, Technician, Customer)
- [x] Permission system (JwtAuthGuard + RolesGuard)
- [x] Team member profiles
- [x] Availability management — weekly calendar editor + wired into booking/dispatch
- [x] Skill tagging system — JSON field + autocomplete editor

### 2.4 Customer Module (CRM)
- [x] Customer CRUD operations
- [x] Customer addresses management
- [x] Customer notes
- [x] Customer history (past jobs via booking relation)
- [x] Customer tags and groups — comma-separated, filter/sort/edit
- [x] Import/export customers — CSV import/export

---

## Phase 3: Booking & Scheduling

### 3.1 Service Module
- [x] Service creation (name, description, duration)
- [x] Service categories
- [x] Service pricing (flat, hourly, custom)
- [x] Service modifiers (add-ons)
- [x] Intake questions builder
- [x] Service images and attachments — PATCH endpoint + POST upload with multer

### 3.2 Territory Module
- [x] Territory creation
- [x] Geographic boundary definition (Json field)
- [x] Territory-specific pricing
- [x] Territory-specific services
- [x] Territory availability settings - per-territory hours JSON + availability logic wired into BookingService.create

### 3.3 Booking Module
- [x] Online booking widget (4-step: service → time → info → confirm)
- [x] Embeddable booking page (/booking/[tenantSlug])
- [x] Real-time availability checking
- [x] Service selection flow
- [x] Intake form handling
- [x] Booking confirmation
- [x] Booking modification/cancellation
- [x] Recurring booking setup — list + create with frequency/interval/discount

### 3.4 Scheduling Engine
- [x] Calendar view (day, week, month) — month grid, week timeline, day vertical
- [x] Time slot generation (30-min intervals, 8am-5pm)
- [x] Buffer time between jobs
- [x] Drive-time calculation — haversine formula in scheduling engine
- [x] Overbooking prevention
- [x] Conflict detection

### 3.5 Dispatch Module
- [x] Job assignment interface
- [x] Auto-assignment rules — skills + load balancing
- [x] Job offer system (techs claim jobs) — offer/accept flow
- [x] Job status tracking (assigned, en-route, started, completed)
- [x] Technician job view
  - [x] Route optimization — dispatches list + route optimization panel consuming POST /routing/optimize
- [x] Real-time location tracking - DONE (location gateway via Socket.io, LocationUpdate model, tracking page with Leaflet map + live markers + route polyline)

---

## Phase 4: Payments & Invoicing

### 4.1 Invoice Module
- [x] Invoice creation (with line items, auto-generation of invoice number)
- [x] Line items management
- [x] Tax calculation
- [x] Discount application
- [x] Invoice templates — PDF generation via pdfkit, download endpoint
- [x] PDF generation — pdfkit with A4 layout, tables, totals
- [x] Invoice sending (via EmailService)

### 4.2 Paystack Integration
- [x] Paystack API client setup
- [x] Transaction initialization
- [x] Payment verification webhook
- [x] Customer creation
- [x] Saved cards (tokenization) — SavedCard model + CardService + UI
- [x] Recurring charges (Paystack) - DONE (RecurringPaymentService with @Cron(EVERY_HOUR), processes due payments via chargeCustomer, creates invoice + payment + log)
- [x] Refunds handling
- [x] Dispute management — full CRUD, evidence, resolution with auto-refund

### 4.3 Flutterwave Integration
- [x] OAuth token management
- [x] Customer creation
- [x] Payment method handling
- [x] Charge initiation
- [x] 3DS/OTP handling
- [x] Webhook processing
- [x] Recurring payments (Flutterwave) - DONE (RecurringPaymentService processes Flutterwave charges; same cron as Paystack)
- [x] Transfers to providers

### 4.4 Payment Module (Unified)
- [x] Payment gateway abstraction (PaymentProvider interface)
- [x] Payment method selection (Paystack/Flutterwave)
- [x] Currency handling
- [x] Fee calculation
- [x] Settlement tracking — SettlementCronService daily reconciliation, admin UI with process/complete/fail
- [x] Payment reporting - DONE (GET /reports/payment-methods endpoint + payment-method-breakdown card on Reports page with provider revenue/fees/transactions/percentage)

### 4.5 Tenant Payment Configuration (Admin Panel)
- [x] Settings page for payment credentials
- [x] Paystack API key input (secret key, public key)
- [x] Flutterwave API key input (public key, secret key, encryption key)
- [x] API key validation (test connection button)
- [x] Secure credential storage (AES-256-GCM encrypted in DB)
- [x] Save buttons wired to correct endpoints — Paystack/Flutterwave save, test, toggle all functional

---

## Phase 5: Notifications

### 5.1 Email Notifications
- [x] Email template system (in EmailService)
- [x] Booking confirmation emails
- [x] Invoice emails
- [x] Feedback request emails
- [x] Password reset emails
- [x] Reminder emails — ReminderCronService runs hourly via @nestjs/schedule
- [x] Team notifications — batch by user list, multi-select + dialog

### 5.2 SMS Notifications
- [x] SMS gateway service (SmsService with NigeriaBulkSMS SDK integration)
- [x] SMS provider integration — NigeriaBulkSMS platform-level credentials, tenants purchase credits
- [x] Platform admin SMS gateway credentials UI (Messaging tab in admin panel)
- [x] Tenant SMS credit system (SmsCredit model, balance tracking, admin grant, per-message deduction with dynamic pricing)
- [x] SMS templates - DONE (SmsTemplate model + CRUD service/controller + renderTemplate + wired into SmsService.sendBookingConfirmation/Reminder/EnRoute + frontend CRUD page)
- [x] Booking confirmation SMS — wired through SmsService
- [x] Booking reminder SMS — ReminderCronService sends SMS + email with dedup
- [x] Bulk SMS campaigns — BulkSmsCampaign/Recipient models, segment filtering, credit deduction
- [x] SMS delivery tracking — delivery receipt webhook endpoint updates Notification status
- [x] Notification retry mechanism — WebhookDelivery model, 15-min cron, exponential backoff (max 5)

### 5.3 WhatsApp Integration
- [x] WhatsApp Business API integration — Meta API with platform-level credentials (accessToken, phoneNumberId, businessId)
- [x] Platform admin WhatsApp credentials UI (Messaging tab in admin panel)
- [x] WhatsApp delivery tracking — Meta webhook parsing, persist delivery status per message
- [x] WhatsApp message templates - DONE (WhatsAppTemplate Prisma model + CRUD service/controller + render with {{1}} placeholders + frontend admin UI at /notifications/whatsapp-templates)

### 5.4 Push Notifications
- [x] Browser push notifications — WebPushService, PushSubscription model, VAPID keys, 3 controller endpoints, PWA subscription
- [x] Mobile push notifications — MobilePushService (Firebase Admin SDK), MobileDevice model, device registration, broadcast endpoint
- [x] In-app notifications — NotificationPanel dropdown + /notifications page with filter/pagination

---

## Phase 6: Custom AI Agent (No External APIs)

### 6.1 AI Agent Core Engine
- [x] Rule-based conversation engine
- [x] Intent recognition system (GREETING, BOOKING_CREATE, BOOKING_CANCEL, BOOKING_RESCHEDULE, BOOKING_STATUS, PAYMENT_INQUIRY, PRICE_INQUIRY, FALLBACK)
- [x] Response template management (17+ predefined + custom)
- [x] Conversation context handling
- [x] Session management

### 6.2 AI Chat Interface
- [x] Chat backend API (POST /ai/chat)
- [x] Chat widget UI on customer-facing pages — floating chat on /booking/[tenantSlug] and /portal
- [x] Chat history viewer - DONE (/ai/history page with conversation list + expandable messages, fetches /ai/conversations and /ai/conversations/:id/messages)
- [x] Typing indicators — spinner while AI responds
- [x] Quick reply buttons — rendered after assistant messages

### 6.3 AI Task Execution
- [x] Booking creation via chat (looks up service, creates customer)
- [x] Booking cancellation via chat
- [x] Booking rescheduling via chat
- [x] Invoice payment initiation via chat - DONE (PaymentHandler.handlePaymentIntent/handlePaymentConfirmation wired into chat.service.ts + task-executor.service.ts)
- [x] Appointment status queries
- [x] FAQ responses (custom trigger/response)

### 6.4 AI Admin Configuration
- [x] Response templates editor (settings/ai page)
- [x] Custom FAQ builder
- [x] AI behavior settings (language, response style)
- [x] Response time configuration - DONE (enableResponseDelay/responseDelayMs/enableTypingIndicator/typingDurationMs in AiSettingsDto; delay applied in ai-agent.controller.ts chat())
- [x] Conversation flow builder — visual drag-and-drop ReactFlow editor + execution engine

### 6.5 AI Analytics
- [x] Conversation tracking (stats, resolution rate, avg duration)
- [x] Common queries analysis (top intents with count)
- [x] Failed/unresolved conversation detection
- [x] Customer satisfaction tracking — SatisfactionSurvey sentiment fields, SentimentService, 4-tab dashboard

---

## Phase 7: Frontend Development

### 7.1 Customer-Facing Pages
- [x] Public booking page (/booking/[tenantSlug])
- [x] Customer portal (view bookings at /portal)
- [x] Cancellation/rescheduling flow (via AI chat)
- [x] Embedded booking widget (script tag) — widget.js + iframe + postMessage API

### 7.2 Admin Dashboard
- [x] Dashboard overview (stats + recent bookings + AI insights)
- [x] Calendar management (month view with navigation)
- [x] Customer management (list + detail)
- [x] Service management (list + create)
- [x] Team management (list + invite)
- [x] Invoice management (list + create + detail)
- [x] Settings & branding (general, team, AI, payments)
- [x] Settings sub-navigation tabs
- [x] Reports & analytics — revenue, booking trends, technician performance, top services

### 7.3 Technician App (Mobile Web)
- [x] Job list view (today's jobs)
- [x] Job details
- [x] Status updates (En Route → Start → Complete → Cancel)
- [x] Customer info
- [x] Navigation integration - DONE (RoutingService.getRoute() via OSRM + GET /routing/route endpoint + NavigationPanel component with Leaflet map, route polyline, turn-by-turn steps, active step tracking, ETA/distance + Navigate button on technician job cards)
- [x] Availability settings — weekly calendar editor + wired into booking/dispatch

---

## Phase 8: Webhooks & Integrations

### 8.1 Webhook Engine
- [x] Webhook CRUD (register, update, delete, list)
- [x] 12 supported events (booking.*, invoice.*, payment.*, customer.*)
- [x] HMAC-SHA256 signed dispatch
- [x] Webhook management UI (backend controller exists)
- [x] Webhook management UI in admin panel — CRUD + test + external webhook tool

---

## Remaining Tasks

- [x] **Route optimization** — dispatches list page with checkboxes + Optimize Route button via POST /routing/optimize
- [x] **SMS/email reminders** — ReminderCronService runs hourly, sends 24h-before reminders via EmailService + SmsService with dedup
- [x] **Reports page** — revenue reports, booking trends, technician performance, top services
- [x] **Recurring bookings UI** — list page + create form with frequency/interval/discount
- [x] **Coupon/promo codes UI** — admin CRUD + checkout validation with discount application
- [x] **Payment settings save** — Paystack/Flutterwave save, test, toggle all functional
- [x] **Test suite** — 43 unit tests across auth (10), booking (17), invoice (16) all passing
- [x] **Calendar week/day views** — proper day/week layouts with time-slot positioning
- [ ] **Customer mobile app (React Native)** - no mobile project exists; largest remaining item
- [x] **Google Calendar sync** — one-way sync (booking → Google Calendar) via OAuth 2.0, with connect/disconnect/sync in settings UI
- [x] **Review & rating system** � admin dashboard + public display + booking review form
- [x] **Multi-location per tenant** � Service.locationId + location management page + filters
- [x] **Inventory management** � full frontend page + stock adjustments + usage reporting
- [x] **Commission tracking** — per-technician commission reports + team stat cards
- [x] **Automated marketing** � campaign CRUD page + daily cron scheduler
- [x] **WhatsApp integration** � Meta WhatsApp Business API with platform-level credentials, booking reminders via cron
- [x] **POS / on-site payment** � Flutterwave POS API + Paystack terminals + POS dashboard page
- [x] **Dynamic pricing** � pricing rules page + applyPricing wired into booking creation
- [x] **Technician availability settings** � weekly calendar editor + wired into booking/dispatch
- [x] **Service images upload** � multer disk storage
- [x] **Embedded booking widget** (script tag for any website) � widget.js + iframe + postMessage API
- [x] **Chat widget UI** on customer-facing pages
- [x] **Customer tags and groups** � comma-separated, filter/sort/edit
- [x] **Import/export customers** � CSV import/export
- [x] **Invoice PDF generation**
- [x] **Webhook management UI** in admin panel � CRUD + test + external webhook tool
- [x] **In-app notification viewer**
- [x] **Team notifications** � batch by user list, multi-select + dialog
- [x] **Saved cards (tokenization)** for Paystack � SavedCard model + CardService + UI
- [x] **Subscription management** (tenant billing) � plans, billing cycles, frontend page
- [x] **Skill tagging** for technicians � JSON field + autocomplete editor
- [x] **Auto-assignment rules** for dispatches � skills + load balancing
- [x] **Job offer system** (techs claim jobs) � offer/accept flow
- [x] **SMS provider integration** — NigeriaBulkSMS SDK, platform-level credentials, tenants purchase SMS credits
- [x] **WhatsApp Business API integration** — Meta API, platform-level credentials, WhatsApp message sending
- [x] **Platform admin SMS/WhatsApp credentials UI** — Messaging tab with SMS/WhatsApp settings + test connection + toggle
- [x] **Tenant SMS credit system** — SmsCredit model, balance tracking, admin grants credits, per-message deduction with dynamic pricing
- [x] **SMS delivery tracking** — delivery receipt webhooks update Notification status
- [x] **Webhook delivery retry** — WebhookDelivery model with exponential backoff (2^attempts min, max 5), 15-min cron
- [x] **Mobile push notifications** — MobilePushService (Firebase Admin SDK), device registration, broadcast, auto-deactivation of invalid tokens
- [x] **Browser push notifications** — WebPushService, VAPID keys, PushSubscription model, subscription endpoints
- [x] **Bulk SMS campaigns** — BulkSmsCampaign/Recipient models, segment filtering (ALL/TAG/RECENT), credit deduction, batch sending, delivery tracking
- [x] **AI feedback/rating** — star rating widget in chat, /ai/feedback page with stats (avg rating, positive/negative %), rated message history
- [x] **Sentiment analysis** — SatisfactionSurvey sentiment fields (score + label), SentimentService (rule-based with keyword matching + negation), 4-tab dashboard (trend, categories, keywords, feedback)
- [x] **HTML email templates** — 12 branded templates with Handlebars substitution, inline CSS, responsive layout, plain-text fallbacks
- [x] **Multi-currency support** — currency field on Invoice, CURRENCIES utility (NGN/KES/GHS/ZAR/USD/GBP/EUR), formatCurrency helper, tenant currency-config endpoint
- [x] **Plan pricing system** — PlanPricing model with @@unique([plan, billingCycle]), 7 default plans seeded, admin UI for CRUD management
- [x] **Dynamic SMS pricing** — smsPricePerUnit/whatsappPricePerUnit from PlatformSmsSettings, admin configurable per-unit pricing
- [x] **Settlement cron** — SettlementCronService runs daily at 2am, reconciles Paystack/Flutterwave settlements with local records
- [x] **Email service** — Nodemailer SMTP with 12 template methods + generic sendTemplate router, fallback to console logging
- [x] **Drive-time calculation** in scheduling — haversine formula
- [x] **Tenant custom domain setup** — add/verify/remove + DNS config UI
- [x] **OAuth** (Google, Microsoft login) � strategies fixed, FRONTEND_URL env var
- [x] **Two-factor authentication** � TOTP + setup page + backup codes
- [x] **Real-time location tracking** - DONE (location gateway via Socket.io + tracking page with Leaflet map, live markers, route polyline)
- [x] **Settlement tracking** — SettlementCronService daily reconciliation, admin UI with process/complete/fail
- [x] **Customer satisfaction tracking** — SatisfactionSurvey sentiment fields, SentimentService, 4-tab dashboard
- [x] **Public API** - DONE (public-api module with ApiKeyGuard, ApiThrottleGuard, scopes, 10+ endpoints: bookings, services, customers, availability, territories, technicians)
- [x] **File management** � FilesModule with BookingFile model
- [x] **Dispute management** � full CRUD + evidence + resolution with auto-refund
- [x] **Conversation flow builder** � visual drag-and-drop ReactFlow editor + execution engine
- [x] **PWA support** - DONE (manifest.json + sw.js service worker with cache-first/network-first strategies, offline fallback, push handler; /offline page)

### Remaining (genuinely not started - verified July 2026)
- [ ] **Customer mobile app (React Native)** - no mobile project exists; largest remaining item
- [ ] **Payment testing with real API keys** - needs real Paystack/Flutterwave keys in Settings
- [ ] **SSL** - deployment-level (Certbot per DEPLOYMENT.md)

### Partially implemented (need finishing)
*(All previously-partial items are now complete - July 2026)*

---

## Completed Features Summary

### Backend (100+ API endpoints across 43 controllers)
| Module | Endpoints | Status |
|--------|-----------|--------|
| Auth | 7 | ? register, login, refresh, logout, forgot-password, reset-password, me |
| Tenant | 4 | ? CRUD + slug lookup + currency config |
| User | 5 | ? list, get, invite, update, delete |
| Customer | 6 | ? CRUD + addresses + import/export |
| Service | 8 | ? CRUD + categories + modifiers + intake fields + location |
| Territory | 7 | ? CRUD + service linking |
| Booking | 6 | ? CRUD + cancel + reschedule + available-slots |
| Dispatch | 6 | ? CRUD + status + assign + accept + route optimization |
| Invoice | 7 | ? CRUD + send + PDF + mark paid |
| Payment | 11 | ? initialize, verify, refund, history + settings CRUD + 2 webhooks + POS |
| Notification | 20+ | ? SMS, WhatsApp, email, push, platform settings, credits, bulk SMS, webhooks, mobile push |
| Webhook | 6 | ? CRUD + events list + test + delivery retry |
| AI Agent | 9 | ? chat, conversations, settings, responses, analytics + feedback |
| Satisfaction | 6 | ? CRUD + sentiment analysis + NPS |
| Subscription | 4 | ? plan pricing CRUD + seed defaults |
| Settlement | 4 | ? CRUD + reconciliation + daily cron |
| Dispute | 5 | ? CRUD + evidence + resolution |
| **Total** | **100+ endpoints** | |


### Frontend (69 pages across 60+ routes)
All pages built and functional. Key routes: dashboard, bookings, calendar, customers, invoices, services, dispatches, marketing, notifications, reviews, satisfaction, disputes, settlements, inventory, settings (general/team/ai/payments/domain/coupons/webhooks/subscription/pricing/locations/security/api-keys/calendar), AI agent (chat/flows/history/feedback/escalations), admin (tenants/editor/subscriptions), reports, POS payment, split payments, recurring bookings, plus auth pages, customer portal, technician app, public booking widget, API docs.

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend (Port 3000)             │
│   pages: dashboard, bookings, customers, invoices, etc.     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (Axios)
┌──────────────────────────▼──────────────────────────────────┐
│                  NestJS Backend (Port 4000)                  │
│                  /api/v1 — 94 endpoints                      │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐  │
│  │Auth  │User  │Cust  │Svc   │Bkg   │Inv   │Pay   │ AI   │  │
│  │Tenant│Team  │Addr  │Terr  │Disp  │Notif │WH    │Chat  │  │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ Prisma ORM
┌──────────────────────────▼──────────────────────────────────┐
│                  PostgreSQL (Port 5432)                      │
│   19 tables: tenants, users, customers, addresses,           │
│   services, modifiers, intake_fields, territories,           │
│   territory_services, bookings, recurring_bookings,          │
│   dispatches, invoices, invoice_line_items, payments,        │
│   payment_settings, coupons, notifications, webhooks,        │
│   ai_conversations, ai_messages, ai_responses,               │
│   refresh_tokens                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Module Dependency Graph

```
Auth / Tenant (Core)
    │
    ├──► User Module
    ├──► Customer Module
    ├──► Service Module ──► Territory Module
    │         │
    │         └──► Booking Module ──► Scheduling Engine
    │                                        │
    │                                        └──► Dispatch Module
    │
    ├──► Invoice Module ──► Payment Module (Paystack / Flutterwave)
    │
    ├──► Notification Module (Email + SMS)
    │
    ├──► Webhook Module
    │
    └──► AI Agent Module (rule-based, no external APIs)
```

---

*Last Updated: July 2026 (reconciled with source code; SMS templates, AI response time, territory availability, recurring charges, payment reporting, WhatsApp templates, multi-currency all complete)*
*Plan Version: 7.0*

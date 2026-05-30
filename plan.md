# Detailed Technical Plan: BookerMap SaaS

## Project Overview
- **Project Name**: BookerMap
- **Type**: Multi-tenant SaaS Booking & Scheduling Platform
- **Core Functionality**: Online booking, scheduling, dispatch, invoicing, and payments for home service businesses
- **Target Market**: Africa (Nigeria, Ghana, Kenya, South Africa) with global capability
- **Competitive Advantage**: Custom rule-based AI agent (no external API dependency) + African payment methods (Paystack/Flutterwave)
- **Current Phase**: Pre-launch — core modules built, polishing remaining features

---

## Progress Legend
- `[x]` — Complete
- `[~]` — Partially built / needs finishing
- `[ ]` — Not started

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
- [ ] OAuth (Google, Microsoft) — optional
- [ ] Two-factor authentication — optional

### 2.2 Tenant Management Module
- [x] Tenant registration (business signup)
- [x] Subdomain/slug setup
- [x] Custom domain configuration — architecture supports it
- [x] Tenant settings (branding, timezone, currency)
- [ ] Subscription management — not started

### 2.3 User & Team Module
- [x] Team member invitation system
- [x] Role management (Admin, Owner, Manager, Technician, Customer)
- [x] Permission system (JwtAuthGuard + RolesGuard)
- [x] Team member profiles
- [ ] Availability management — not started
- [ ] Skill tagging system — not started

### 2.4 Customer Module (CRM)
- [x] Customer CRUD operations
- [x] Customer addresses management
- [x] Customer notes
- [x] Customer history (past jobs via booking relation)
- [ ] Customer tags and groups — not started
- [ ] Import/export customers — not started

---

## Phase 3: Booking & Scheduling

### 3.1 Service Module
- [x] Service creation (name, description, duration)
- [x] Service categories
- [x] Service pricing (flat, hourly, custom)
- [x] Service modifiers (add-ons)
- [x] Intake questions builder
- [ ] Service images and attachments — not started

### 3.2 Territory Module
- [x] Territory creation
- [x] Geographic boundary definition (Json field)
- [x] Territory-specific pricing
- [x] Territory-specific services
- [ ] Territory availability settings — not started

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
- [ ] Drive-time calculation — not started
- [x] Overbooking prevention
- [x] Conflict detection

### 3.5 Dispatch Module
- [x] Job assignment interface
- [ ] Auto-assignment rules — not started
- [ ] Job offer system (techs claim jobs) — not started
- [x] Job status tracking (assigned, en-route, started, completed)
- [x] Technician job view
  - [x] Route optimization — dispatches list + route optimization panel consuming POST /routing/optimize
- [ ] Real-time location tracking — optional

---

## Phase 4: Payments & Invoicing

### 4.1 Invoice Module
- [x] Invoice creation (with line items, auto-generation of invoice number)
- [x] Line items management
- [x] Tax calculation
- [x] Discount application
- [ ] Invoice templates — not started
- [ ] PDF generation — not started
- [x] Invoice sending (via EmailService)

### 4.2 Paystack Integration
- [x] Paystack API client setup
- [x] Transaction initialization
- [x] Payment verification webhook
- [x] Customer creation
- [ ] Saved cards (tokenization) — not started
- [ ] Recurring charges — not started
- [x] Refunds handling
- [ ] Dispute management — not started

### 4.3 Flutterwave Integration
- [x] OAuth token management
- [x] Customer creation
- [x] Payment method handling
- [x] Charge initiation
- [x] 3DS/OTP handling
- [x] Webhook processing
- [ ] Recurring payments — not started
- [x] Transfers to providers

### 4.4 Payment Module (Unified)
- [x] Payment gateway abstraction (PaymentProvider interface)
- [x] Payment method selection (Paystack/Flutterwave)
- [x] Currency handling
- [x] Fee calculation
- [ ] Settlement tracking — not started
- [ ] Payment reporting — not started

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
- [ ] Team notifications — not started

### 5.2 SMS Notifications
- [~] SMS gateway service (SmsService exists, uses stub/console)
- [ ] SMS templates — not started
- [~] Booking confirmation SMS — stub exists
- [~] Booking reminder SMS — stub exists
- [ ] Bulk SMS — not started
- [ ] SMS delivery tracking — not started

### 5.3 Push Notifications
- [ ] Push notification setup — not started
- [x] In-app notifications — NotificationPanel dropdown + /notifications page with filter/pagination
- [ ] Browser push notifications — not started
- [ ] Mobile push notifications — not started

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
- [ ] Chat history viewer — not started
- [x] Typing indicators — spinner while AI responds
- [x] Quick reply buttons — rendered after assistant messages

### 6.3 AI Task Execution
- [x] Booking creation via chat (looks up service, creates customer)
- [x] Booking cancellation via chat
- [x] Booking rescheduling via chat
- [ ] Invoice payment initiation via chat — not started
- [x] Appointment status queries
- [x] FAQ responses (custom trigger/response)

### 6.4 AI Admin Configuration
- [x] Response templates editor (settings/ai page)
- [x] Custom FAQ builder
- [x] AI behavior settings (language, response style)
- [ ] Response time configuration — not started
- [ ] Conversation flow builder — not started

### 6.5 AI Analytics
- [x] Conversation tracking (stats, resolution rate, avg duration)
- [x] Common queries analysis (top intents with count)
- [x] Failed/unresolved conversation detection
- [ ] Customer satisfaction tracking — not started

---

## Phase 7: Frontend Development

### 7.1 Customer-Facing Pages
- [x] Public booking page (/booking/[tenantSlug])
- [x] Customer portal (view bookings at /portal)
- [x] Cancellation/rescheduling flow (via AI chat)
- [ ] Embedded booking widget (iframe/script) — not started

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
- [ ] Navigation integration — not started
- [ ] Availability settings — not started

---

## Phase 8: Webhooks & Integrations

### 8.1 Webhook Engine
- [x] Webhook CRUD (register, update, delete, list)
- [x] 12 supported events (booking.*, invoice.*, payment.*, customer.*)
- [x] HMAC-SHA256 signed dispatch
- [x] Webhook management UI (backend controller exists)
- [ ] Webhook management UI in admin panel — frontend not started

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
- [ ] **Customer mobile app** — React Native app for booking + tracking
- [x] **Google Calendar sync** — one-way sync (booking → Google Calendar) via OAuth 2.0, with connect/disconnect/sync in settings UI
- [ ] **Review & rating system** — post-service feedback collection + public display
- [ ] **Multi-location per tenant** — single business manages multiple branches
- [ ] **Inventory management** — track materials/products used per job
- [ ] **Commission tracking** — per-technician commission reports
- [ ] **Automated marketing** — email campaigns for re-engaging lapsed customers
- [ ] **WhatsApp integration** — booking confirmations/reminders via WhatsApp Business API
- [ ] **POS / on-site payment** — Paystack Terminal / Flutterwave POS
- [ ] **Dynamic pricing** — surge pricing for same-day, discounts for off-peak
- [ ] **Technician availability settings**
- [ ] **Service images upload**
- [ ] **Embedded booking widget** (script tag for any website)
- [x] **Chat widget UI** on customer-facing pages
- [ ] **Customer tags and groups**
- [ ] **Import/export customers**
- [x] **Invoice PDF generation**
- [ ] **Webhook management UI** in admin panel
- [x] **In-app notification viewer**
- [ ] **Team notifications**
- [ ] **Saved cards (tokenization)** for Paystack
- [ ] **Subscription management** (tenant billing)
- [ ] **Skill tagging** for technicians
- [ ] **Auto-assignment rules** for dispatches
- [ ] **Job offer system** (techs claim jobs)
- [ ] **SMS/WhatsApp delivery tracking**
- [ ] **Drive-time calculation** in scheduling
- [ ] **Tenant custom domain setup**
- [ ] **OAuth** (Google, Microsoft login)
- [ ] **Two-factor authentication**
- [ ] **Real-time location tracking** — technician GPS on map
- [ ] **Settlement tracking** — reconcile payments with provider settlements
- [ ] **Customer satisfaction tracking** — AI-powered sentiment analysis
- [ ] **Public API** — rate-limited REST API for third-party integrations
- [ ] **File management** — before/after photos, document storage per job
- [ ] **Dispute management** — handle chargebacks and disputes
- [ ] **Conversation flow builder** — visual editor for AI response flows
- [ ] **PWA support** — installable mobile web app

---

## Completed Features Summary

### Backend (94 API endpoints across 13 modules)
| Module | Endpoints | Status |
|--------|-----------|--------|
| Auth | 7 | ✅ register, login, refresh, logout, forgot-password, reset-password, me |
| Tenant | 4 | ✅ CRUD + slug lookup |
| User | 5 | ✅ list, get, invite, update, delete |
| Customer | 6 | ✅ CRUD + addresses |
| Service | 8 | ✅ CRUD + categories + modifiers + intake fields |
| Territory | 7 | ✅ CRUD + service linking |
| Booking | 6 | ✅ CRUD + cancel + reschedule + available-slots |
| Dispatch | 6 | ✅ CRUD + status + assign + technician lookup |
| Invoice | 7 | ✅ CRUD + send + mark paid |
| Payment | 11 | ✅ initialize, verify, refund, history + settings CRUD + 2 webhooks |
| Notification | 5 | ✅ list, unread count, mark read, test email/sms |
| Webhook | 6 | ✅ CRUD + events list + test |
| AI Agent | 9 | ✅ chat, conversations, settings, responses, analytics |
| **Total** | **94 endpoints** | |

### Frontend (24 pages across 22 routes)
| Route | Page | Status |
|-------|------|--------|
| `/` | Landing page | ✅ |
| `/login` | Login | ✅ |
| `/register` | Registration | ✅ |
| `/forgot-password` | Forgot password | ✅ |
| `/reset-password` | Reset password | ✅ |
| `/dashboard` | Dashboard overview | ✅ |
| `/bookings` | Bookings list | ✅ |
| `/bookings/new` | New booking form | ✅ |
| `/bookings/[id]` | Booking detail | ✅ |
| `/calendar` | Calendar view | ✅ month view; ⏳ week/day |
| `/customers` | Customers list | ✅ |
| `/customers/[id]` | Customer detail | ✅ |
| `/invoices` | Invoices list | ✅ |
| `/invoices/[id]` | Invoice detail | ✅ |
| `/notifications` | Notification list | ✅ |
| `/services` | Services catalog | ✅ |
| `/settings` | General settings | ✅ |
| `/settings/team` | Team management | ✅ |
| `/settings/ai` | AI agent settings | ✅ |
| `/settings/payments` | Payment settings | ✅ |
| `/portal` | Customer portal | ✅ |
| `/technician` | Technician app | ✅ |
| `/booking/[tenantSlug]` | Public booking widget | ✅ |
| `/dispatches` | Dispatches list + route optimization | ✅ |

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

*Plan Version: 2.0*
*Last Updated: May 2026*

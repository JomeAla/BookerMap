# AGENTS.md — BookerMap Project Context

## What is BookerMap?
Multi-tenant SaaS booking platform for African home service businesses. Built with NestJS + Next.js + PostgreSQL. Has a custom rule-based AI agent (no external AI APIs). Paystack and Flutterwave for payments.

## Constraints
- **NO Docker or Contabo deployment** — run natively on Node.js + PostgreSQL
- **NO external AI APIs** (no OpenAI, no ML models) — AI agent is entirely rule-based
- All development in `C:\Users\jomea\booking software`
- Backend: NestJS on port 4000, Frontend: Next.js on port 3000, PostgreSQL on port 5432
- TypeScript 5.7.3 is the working version (TS 6.x breaks `npx nest build` — emits zero JS)

## Current State (May 2026)
- **94 backend API endpoints** across 13 modules — all built and compiling cleanly
- **22 frontend pages** across 20 routes — all built
- Backend server running in PowerShell background job on port 4000
- Frontend dev server on port 3000
- PostgreSQL running on port 5432

## Key Architecture Decisions
- Tenant isolation via `tenantId` on every record (scoped in service layer, not RLS)
- JWT contains `{ sub, email, tenantId, role }`
- Refresh tokens stored in DB (not JWTs)
- AI settings stored as JSON column on Tenant model
- Payment provider keys encrypted with AES-256-GCM in the database
- Webhook dispatch is fire-and-forget with `.catch()`
- API responses wrapped in `{ success, data }` via transform interceptor

## Completed in Previous Sessions
- **Auth 404 fix**: AuthModule was missing controller/service declarations — fixed
- **AI agent security**: JwtAuthGuard added to 7 admin endpoints; chat endpoint left public
- **AI updateSettings**: Now persists to Tenant.aiSettings JSON column
- **Invoice sendInvoice**: Now actually calls EmailService.sendInvoiceEmail()
- **Dispatch technician lookup**: Added GET /dispatches/technician/:technicianId
- **Webhook wiring**: dispatchEvent called from BookingService, InvoiceService, PaymentService, PaystackWebhookController, FlutterwaveWebhookController
- **PostgreSQL crash recovery**: killed stale processes, deleted postmaster.pid
- **Invoice detail page**: Created `invoices/[id]/page.tsx` with line items, payments, totals
- **Create Invoice dialog**: Added to invoices list page with customer select + line items
- **New Booking form**: Created `bookings/new/page.tsx` with customer/service/technician selects
- **Settings sub-navigation**: Tab bar on settings page (General, Team, AI, Payments)
- **Forgot/reset password**: Backend endpoints + frontend pages
- **Webhook dispatch in payment handlers**: Paystack + Flutterwave webhook controllers now fire payment.completed/payment.failed events
- **plan.md** and **Task-todo-list.md** updated with progress and new feature suggestions

## Remaining Tasks (all tracked in plan.md and Task-todo-list.md)
46 items total — see plan.md "Remaining Tasks" section for full list. Highlights:
- Route optimization, SMS/email reminder cron, reports page, recurring bookings UI, coupon codes UI, payment settings wiring, test suite, calendar week/day views all partially built
- Customer mobile app, Google Calendar sync, review system, multi-location, inventory, commissions, marketing, WhatsApp, POS, dynamic pricing, and 28 more not yet started

## Relevant Commands
```powershell
# Start backend
cd C:\Users\jomea\booking software\apps\api; npm run start:dev

# Start frontend
cd C:\Users\jomea\booking software\apps\web; npm run dev

# TypeScript check
cd C:\Users\jomea\booking software\apps\api; npx tsc --noEmit

# Apply Prisma schema changes
cd C:\Users\jomea\booking software\apps\api; npx prisma db push
```

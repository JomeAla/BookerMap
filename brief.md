# Platform Research Brief: BookerMap - Booking Platform with Built-in AI Agent

## Executive Summary

This document outlines a comprehensive plan to build **BookerMap**, a multi-tenant SaaS booking and scheduling platform for home service businesses, targeting the African market. The platform will be an enhanced alternative to ZenBooker with a **custom-built AI Agent** integrated directly into the code (no external AI API costs), using Paystack and Flutterwave for African payment processing. Each tenant can configure their own payment credentials via the admin panel.

---

## 1. ZenBooker Platform Analysis

### 1.1 Core Product Overview
**ZenBooker** is an online booking and scheduling software designed specifically for home service businesses. It enables businesses to take bookings, send quotes, and schedule jobs in real-time while managing dispatch and payments.

- **Target Users**: Home service businesses (cleaning, plumbing, HVAC, appliance repair, etc.)
- **Business Model**: SaaS subscription (14-day free trial, no credit card required)
- **Tech Stack**: Built on Bubble (no-code platform)

### 1.2 Key Features (Comprehensive)

#### Online Booking System
- **Instant Booking**: Customers can book services based on real-time availability
- **Service Requests**: Customers can request preferred times
- **Quote Requests**: Custom quotes that customers can review and book
- **Embeddable Widgets**: Embed booking widgets on any website
- **Fully Branded**: Customize colors, pricing, intake questions
- **Demo Booking**: Experience booking with demo companies

#### Service Management
- **Service Territories**: Define geographic regions, block scheduling outside areas
- **Customizable Availability by Location**: Set different hours per area
- **Geographic Pricing Rules**: Auto-adjust prices based on location
- **Service Modifiers**: Dynamic pricing based on options selected
- **Intake Questions**: Custom fields (checkboxes, dropdowns, text, images)
- **Recurring Bookings**: Weekly, bi-weekly, monthly plans with discounts

#### Scheduling & Dispatch
- **Job Assignment**: One-click assignment to team members
- **Auto-Assign**: Automatically assign jobs to available/qualified techs
- **Skill Tags**: Match services to provider skills
- **Job Offers**: Auto-offer jobs to available field techs for claiming
- **Self-Managed Availability**: Contractors control their own schedules
- **Drive-Time Aware Scheduling**: Account for travel time between jobs

#### Customer Management (CRM)
- **Customer Profiles**: Full history, past/upcoming jobs, notes
- **Customer Database**: Contact info, addresses, payment methods
- **Automatic Details**: Auto-populate details for repeat customers
- **Internal Notes**: Save notes and files to customer profiles

#### Payments & Invoicing
- **Credit Card Capture**: Securely store payment details
- **Stripe Integration**: Payment processing (to be replaced with Paystack/Flutterwave)
- **Invoice Payment Links**: Send invoices with online payment
- **Professional Invoices**: Branded invoices and receipts
- **Deposits**: Charge deposits for bookings

#### Notifications
- **SMS & Email Notifications**: Automated confirmations and reminders
- **Customizable Messages**: Text, language, colors matching brand
- **En-Route Notifications**: "On my way" texts with real-time ETA
- **Post-Job Follow-ups**: Automated feedback requests

#### Reviews & Feedback
- **Customer Feedback Requests**: Post-job rating collection
- **Review Invites**: Request reviews on popular platforms

#### Field Service App
- **Mobile Web App**: View schedules, jobs, customer info on smartphone
- **Job Status Tracking**: Mark jobs as en-route, started, complete
- **Android/iOS Support**: PWA approach with push notifications

#### Additional Features
- **Coupon Codes**: Create and share discounts
- **Cancel/Reschedule Online**: Customer self-service with notice settings
- **Unlimited Team Members**: No per-user pricing
- **User Permissions**: Granular access control
- **API Access**: RESTful API with webhooks

### 1.3 ZenBooker API Capabilities

#### Core API Resources
- **Jobs**: Create, retrieve, list, cancel, reschedule, assign providers, mark status
- **Customers**: CRUD operations, notes, addresses
- **Recurring Bookings**: List, retrieve, assign providers, notes
- **Invoices**: List, retrieve
- **Transactions**: List, retrieve
- **Team**: List, retrieve team members
- **Territories**: CRUD operations
- **Services**: List, retrieve
- **Coupons**: Create

#### Scheduling APIs
- **Check Service Area**: Validate if address is in service territory
- **Retrieve Timeslots**: Get available booking times

#### Webhooks
- Real-time event notifications for jobs, customers, invoices, etc.

---

## 2. Payment Gateway Integration Requirements

### 2.1 Paystack (Nigeria-Focused)

#### Overview
- Leading payment processor in Nigeria
- Supports NGN, USD, GHS, ZAR, KES, XOF currencies
- Minimum transaction: ₦50 (NGN)

#### Authentication
- API Base URL: `https://api.paystack.co`
- Authorization: Bearer token with secret key
- Test/Live environments with separate keys

#### Payment Channels
- Card payments
- Bank transfers (Pay with Transfer)
- USSD (*#* banks)
- Mobile money (Ghana, Kenya)
- QR codes
- Bank account payments

#### Key API Endpoints
```
POST /transaction/initialize    - Start payment
POST /transaction/charge        - Direct charge
GET  /transaction/verify/:ref   - Verify payment
POST /customer                  - Create customer
POST /paymentrequest            - Create payment request
POST /transfer/recipient        - Create transfer recipient
POST /transfer/initiate         - Make transfers
```

#### Integration Requirements
1. Initialize transaction with email, amount, reference
2. Redirect customer to payment page or use inline popup
3. Verify transaction via webhook or manual verification
4. Store authorization_code for recurring charges

### 2.2 Flutterwave (Pan-Africa)

#### Overview
- Active in 30+ African countries
- Supports 30+ currencies
- OAuth 2.0 authentication

#### Authentication
- Token endpoint: `https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token`
- Requires client_id, client_secret, grant_type
- Access token needed for all API calls

#### Payment Methods
- Cards (Visa, Mastercard, Verve, Amex)
- Mobile money (MTN, AirtelTigo, etc.)
- Bank transfers
- USSD
- QR codes
- Wallets (OPay, PalmPay)

#### Key API Endpoints
```
POST /customers                 - Create customer
POST /payment-methods          - Create payment method
POST /charges                  - Initiate charge
POST /transfers/recipients     - Create recipient
POST /transfers                - Make transfer
GET  /transactions/:id/verify  - Verify transaction
```

#### Integration Requirements
1. Generate OAuth access token
2. Create customer
3. Create payment method (card, mobile money)
4. Initiate charge
5. Handle authentication (3DS, OTP, PIN)
6. Verify via webhook

---

## 3. Technology Stack Recommendation

### 3.1 Backend
- **Framework**: Node.js with TypeScript (NestJS)
- **Database**: PostgreSQL (user has locally installed)
- **ORM**: Prisma
- **API**: RESTful + GraphQL for complex queries

### 3.2 Frontend
- **Web App**: Next.js 14 (React) with TypeScript
- **Mobile**: React Native (cross-platform)
- **State Management**: Zustand or TanStack Query
- **UI Library**: Shadcn/ui + Tailwind CSS

### 3.3 Additional Services
- **Authentication**: JWT + Refresh tokens
- **Email**: SendGrid or AWS SES
- **SMS**: Twilio or Africa's Talking
- **File Storage**: AWS S3 or MinIO
- **AI Agent**: Custom-coded AI agent built into the platform (no external API costs)

---

## 4. Competitive Advantages Over ZenBooker

### 4.1 Custom-Built AI Agent (No External AI APIs)
- **Rule-Based Booking Assistant**: Intelligent chatbot that helps customers book services via chat
- **Task Automation**: AI agent executes tasks (reschedule, cancel, inquire) based on customer commands
- **Smart Responses**: Natural language understanding for common queries
- **Workflow Automation**: Auto-handle booking modifications, refunds, complaints
- **Learning System**: Improves responses based on common patterns (no ML training costs)
- **Cost-Free**: All AI functionality built with custom code, no per-request API costs

### 4.2 Africa-Specific Features
- **Multi-Country Support**: Nigeria, Ghana, Kenya, South Africa
- **Local Payment Methods**: Paystack + Flutterwave native
- **Mobile Money Integration**: MTN, AirtelTigo, etc.
- **USSD Support**: Feature phone accessibility
- **Local Language Support**: Swahili, Yoruba, Hausa, Igbo

### 4.3 Enhanced Features
- **WhatsApp Integration**: Booking via WhatsApp Business
- **Offline Mode**: PWA with offline capability
- **POS Integration**: Point of sale for on-site payments
- **Inventory Management**: Track supplies and materials
- **Employee Management**: Payroll, commissions, tips

### 4.4 Tenant Payment Configuration (Admin Panel)
- **Self-Service Setup**: Each business enters their own Paystack/Flutterwave API keys
- **Admin Interface**: Settings page to input and save payment credentials
- **Test Mode**: Toggle between test/live credentials
- **Credential Validation**: Verify API keys work before saving
- **Multi-Provider Support**: Enable/disable Paystack and/or Flutterwave
- **Per-Tenant Isolation**: Each tenant's payments processed through their own account
- **No Platform Fees**: Direct integration, platform doesn't handle money

---

## 5. Multi-Tenant SaaS Architecture

### 5.1 Tenant Isolation
- **Database Schema**: Shared database, separate schemas per tenant
- **Subdomain**: tenant.platform.com
- **Custom Domains**: business.com -> platform

### 5.2 Subscription Management
- **Plans**: Free, Starter, Professional, Enterprise
- **Usage Limits**: Bookings, team members, customers
- **Billing**: Monthly/annual with prorating
- **Trial Period**: 14-day free trial

---

## 5. Module Structure (Modular Architecture)

### Core Modules
1. **Auth Module** - User authentication, roles, permissions
2. **Tenant Module** - Multi-tenant management
3. **User Module** - Team members, roles
4. **Customer Module** - CRM functionality
5. **Service Module** - Services, modifiers, pricing
6. **Booking Module** - Scheduling, availability
7. **Dispatch Module** - Job assignment, routing
8. **Invoice Module** - Billing, payments
9. **Notification Module** - Email, SMS, push
10. **Review Module** - Feedback, ratings
11. **AI Agent Module** - Custom-coded AI agent for booking assistance, task automation, smart responses
12. **Payment Module** - Paystack/Flutterwave integration
13. **Webhook Module** - External integrations
14. **Report Module** - Analytics, exports

---

## 7. Research Findings Summary

| Aspect | ZenBooker | BookerMap |
|--------|-----------|-----------|
| Target Market | Global | Africa-focused |
| Payment | Stripe (global) | Paystack + Flutterwave (tenant-configured) |
| AI | None | Custom-built AI Agent (no API costs) |
| Payment Config | Fixed | Per-tenant admin panel config |
| Mobile | PWA | React Native app |

---

## 8. Next Steps

1. Review and approve this brief
2. Build MVP with core features
3. Integrate payment gateways
4. Launch beta program

---

*Document Version: 1.0*
*Created: March 2026*

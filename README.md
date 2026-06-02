# BookerMap

Multi-tenant SaaS booking and scheduling platform for home service businesses. Built for the African market with Paystack and Flutterwave payment integration.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS 11, TypeScript 5.7 |
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4 |
| **Database** | PostgreSQL with Prisma ORM |
| **Real-time** | Socket.io (WebSocket gateways) |
| **Payments** | Paystack, Flutterwave |
| **Auth** | JWT, Passport, bcryptjs |
| **Docs** | Swagger / OpenAPI |

## Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- npm >= 9

## Quick Start

```powershell
# 1. Install dependencies
cd apps/api; npm install
cd ../web; npm install

# 2. Set up environment
# Edit apps/api/.env with your database URL and API keys

# 3. Push Prisma schema to database
cd apps/api; npx prisma db push

# 4. Start development servers
# Terminal 1 - Backend (port 4000)
cd apps/api; npm run start:dev

# Terminal 2 - Frontend (port 3000)
cd apps/web; npm run dev
```

## Project Structure

```
bookermap/
├── apps/
│   ├── api/                    # NestJS backend (port 4000)
│   │   └── src/
│   │       ├── auth/           # Authentication module
│   │       ├── booking/        # Booking & scheduling
│   │       ├── common/         # Shared interceptors, guards, filters
│   │       ├── customer/       # CRM module
│   │       ├── dispatch/       # Job dispatch & assignment
│   │       ├── gateway/        # WebSocket gateways
│   │       ├── health/         # Health check endpoints
│   │       ├── invoice/        # Invoicing module
│   │       ├── payment/        # Paystack & Flutterwave
│   │       ├── prisma/         # Database service
│   │       └── webhook/        # Webhook engine
│   └── web/                    # Next.js frontend (port 3000)
│       ├── src/
│       │   ├── app/            # Pages & routes
│       │   ├── components/     # UI components
│       │   ├── hooks/          # Custom hooks
│       │   ├── lib/            # Utilities & API client
│       │   └── types/          # TypeScript definitions
├── packages/
│   ├── common/                 # Shared types & constants
│   ├── config/                 # Shared config
│   └── database/               # Database utilities
├── scripts/
│   └── backup.ps1              # Database backup script
└── DEPLOYMENT.md               # Production deployment guide
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:api` | Start API dev server with watch mode |
| `npm run dev:web` | Start frontend dev server |
| `npm run build:api` | Build API for production |
| `npm run build:web` | Build frontend for production |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:push` | Push schema to database |

## API Documentation

Swagger UI is available at `/api/docs` when the API server is running.

All API endpoints are prefixed with `/api/v1`. Responses follow the format:

```json
{
  "success": true,
  "data": { ... }
}
```

## Key Features

- **Multi-tenant architecture** — Tenant isolation via `tenantId` scoping
- **Online booking widget** — Embeddable booking flow (service → time → info → confirm)
- **Calendar management** — Day, week, and month views with drag-and-drop rescheduling
- **Dispatch & routing** — Assign technicians, track job status, optimize routes
- **Invoicing** — Create, send, and manage invoices with partial payments
- **Payments** — Paystack and Flutterwave with webhook verification
- **AI agent** — Rule-based chatbot for booking management (no external APIs)
- **Real-time updates** — Socket.io for live booking and location updates
- **Webhook engine** — 13 events with HMAC-SHA256 signed dispatch
- **Notifications** — Email, SMS, and in-app notifications
- **Recurring bookings** — Automated repeat booking schedules
- **Coupon system** — Promo codes with percentage or fixed discounts
- **Split payments** — Marketplace-style payment splitting
- **Settlements** — Track payment provider settlements

## Authentication

The platform uses JWT-based authentication with refresh tokens:

- **JWT payload**: `{ sub, email, tenantId, role }`
- **Roles**: `ADMIN`, `OWNER`, `MANAGER`, `TECHNICIAN`, `CUSTOMER`
- **Endpoints**: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`
- **Password reset**: Forgot/reset flow via email

## Payment Setup

### Paystack
1. Get API keys from [Paystack Dashboard](https://dashboard.paystack.com)
2. Set `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_WEBHOOK_SECRET` in `.env`
3. Configure webhook URL: `https://your-domain.com/api/v1/payments/paystack/webhook`

### Flutterwave
1. Get API keys from [Flutterwave Dashboard](https://dashboard.flutterwave.com)
2. Set `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_ENCRYPTION_KEY` in `.env`
3. Configure webhook URL: `https://your-domain.com/api/v1/payments/flutterwave/webhook`

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full production deployment instructions.

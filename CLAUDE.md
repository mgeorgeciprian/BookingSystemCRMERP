# BookingCRM SaaS - Project Memory

## Project Overview
- **Type**: Multi-vertical SaaS booking + CRM + ERP platform for Romania
- **Stack**: Next.js 14 (App Router) + FastAPI async + Cloud SQL PostgreSQL + Cloud Memorystore Redis
- **Cloud**: Google Cloud (europe-central2, Warsaw)
- **Repo**: https://github.com/mgeorgeciprian/BookingSystemCRMERP
- **Frontend**: `src/frontend/` (Tailwind, Zustand, Radix UI, Recharts)
- **Backend**: `src/backend/` (SQLAlchemy async, Alembic, bcrypt, JWT, Infobip)
- **Separate from**: FiscalGuard.ro (different product, same owner)

## Architecture

```
Cloud CDN -> Cloud Load Balancer -> Cloud Run (Next.js SSR + FastAPI)
                                          |
                               Cloud SQL PostgreSQL (Warsaw)
                               Cloud Memorystore Redis
                               Cloud Tasks + Cloud Scheduler
                               Infobip (WhatsApp/SMS/Email)
```

## Key Patterns
- Romanian UI text, English code names
- Brand colors: navy `#0f172a`, blue `#2563eb`
- Fonts: Inter (sans), JetBrains Mono (mono)
- API client: `apiFetch<T>()` in `src/frontend/src/lib/api.ts`
- Auth store: Zustand with persist, localStorage key `bcr_token`
- Multi-tenant: all entities scoped by `business_id`
- Public booking: no auth, by business slug at `/api/v1/book/{slug}`
- Notification strategy: WhatsApp -> SMS -> Email (fallback order, Viber not popular in RO)

## Key Files
- **Backend entry**: `src/backend/app/main.py`
- **Config**: `src/backend/app/core/config.py` (pydantic-settings)
- **Database**: `src/backend/app/core/database.py` (Cloud SQL connector)
- **Auth**: `src/backend/app/core/security.py` (JWT + bcrypt)
- **Models**: `app/models/{user,business,employee,service,client,appointment,notification,ical_source,invoice}.py`
- **API endpoints**: `app/api/v1/{auth,businesses,services,employees,clients,appointments,public_booking,invoices,ical,notifications}.py`
- **Services**: `app/services/{notification,ical_sync,efactura}.py`
- **Celery tasks**: `app/tasks/{celery_app,reminders,ical_tasks}.py`
- **Frontend API**: `src/frontend/src/lib/api.ts`
- **Frontend store**: `src/frontend/src/lib/store.ts`

## Verticals Supported
salon | dental | therapy | fitness | massage | tutor | medical | other

## API Endpoints (~40)
- `/api/v1/auth` — register, login, refresh, me
- `/api/v1/businesses` — CRUD
- `/api/v1/businesses/{id}/services` — CRUD + categories
- `/api/v1/businesses/{id}/employees` — CRUD + service assignments
- `/api/v1/businesses/{id}/clients` — CRUD + search + stats
- `/api/v1/businesses/{id}/appointments` — CRUD + availability + cancel + status transitions
- `/api/v1/businesses/{id}/invoices` — CRUD + mark-paid + auto-generate from appointment
- `/api/v1/businesses/{id}/ical` — sources CRUD + manual sync
- `/api/v1/businesses/{id}/notifications` — log + send
- `/api/v1/book/{slug}` — public profile, services, employees, availability, book

## Database Models (10)
User, Business, Employee, EmployeeService, ServiceCategory, Service, Client, Appointment, NotificationLog, ICalSource, Invoice

## Celery Beat Tasks
- send_upcoming_reminders (24h) — hourly
- send_upcoming_reminders (1h) — every 15min
- sync_all_ical_sources — every 15min
- mark_no_shows — daily at 00:30

## Pricing Tiers
- Starter: 29 RON/luna (1 angajat, 100 SMS)
- Professional: 59 RON/luna (5 angajati, 500 SMS, e-Factura, iCal)
- Enterprise: 99 RON/luna (nelimitat, API, suport prioritar)

## Competitors
- MERO: 30-54 EUR/luna, no e-Factura, no WhatsApp, no AI, beauty-only
- Stailer: 35 EUR/luna + credits, unreliable sync, beauty-only
- Us: 5-10 EUR/luna, multi-vertical, e-Factura, WhatsApp, Airbnb sync

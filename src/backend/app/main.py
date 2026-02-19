"""BookingCRM SaaS -- FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, businesses, services, employees, clients, appointments, public_booking, invoices, ical, notifications, dashboard
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="SaaS Booking + CRM + ERP platform for Romanian businesses",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}


# API v1 routes
API_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=f"{API_PREFIX}/auth", tags=["Auth"])
app.include_router(businesses.router, prefix=f"{API_PREFIX}/businesses", tags=["Businesses"])
app.include_router(services.router, prefix=f"{API_PREFIX}/businesses/{{business_id}}/services", tags=["Services"])
app.include_router(employees.router, prefix=f"{API_PREFIX}/businesses/{{business_id}}/employees", tags=["Employees"])
app.include_router(clients.router, prefix=f"{API_PREFIX}/businesses/{{business_id}}/clients", tags=["Clients"])
app.include_router(appointments.router, prefix=f"{API_PREFIX}/businesses/{{business_id}}/appointments", tags=["Appointments"])
app.include_router(invoices.router, prefix=f"{API_PREFIX}/businesses/{{business_id}}/invoices", tags=["Invoices"])
app.include_router(ical.router, prefix=f"{API_PREFIX}/businesses/{{business_id}}/ical", tags=["iCal Sync"])
app.include_router(notifications.router, prefix=f"{API_PREFIX}/businesses/{{business_id}}/notifications", tags=["Notifications"])
app.include_router(dashboard.router, prefix=f"{API_PREFIX}/businesses/{{business_id}}/dashboard", tags=["Dashboard"])

# Public routes (no auth)
app.include_router(public_booking.router, prefix=f"{API_PREFIX}/book", tags=["Public Booking"])

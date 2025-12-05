"""SmartMoney FastAPI application."""
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from .config import settings as app_settings
from .database import SessionLocal, init_db
from .routes import accounts, analytics, auth, budgets, credits, dashboard, goals, receipts, settings, tags, transactions, upload, exchange_rates
from .services.exchange_rate_service import ExchangeRateService

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()

# Initialize FastAPI app
app = FastAPI(
    title=app_settings.app_name,
    description="Personal finance cashflow tracker API",
    version="0.1.0",
    debug=app_settings.debug,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handlers
@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Database error occurred", "error": str(exc)},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )


# Scheduled jobs
def scheduled_rate_update():
    """Background job to update exchange rates daily."""
    db = SessionLocal()
    try:
        result = ExchangeRateService.fetch_and_update_rates(db)
        logger.info(f"Scheduled rate update: {result}")
    except Exception as e:
        logger.error(f"Scheduled rate update failed: {e}")
    finally:
        db.close()


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database and start scheduler on startup."""
    init_db()

    # Schedule daily exchange rate updates at 4 AM UTC
    scheduler.add_job(
        scheduled_rate_update,
        trigger="cron",
        hour=4,
        minute=0,
        id="exchange_rate_update",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Exchange rate scheduler started (daily at 4 AM UTC)")


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown scheduler on app shutdown."""
    scheduler.shutdown()
    logger.info("Exchange rate scheduler stopped")


# Include routers
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(tags.router)
app.include_router(transactions.router)
app.include_router(analytics.router)
app.include_router(dashboard.router)
app.include_router(goals.router)
app.include_router(settings.router)
app.include_router(upload.router)
app.include_router(exchange_rates.router)
app.include_router(budgets.router)
app.include_router(credits.router)
app.include_router(receipts.router)


# Root endpoints
@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": f"Welcome to {app_settings.app_name} API",
        "status": "healthy",
        "version": "0.1.0"
    }


@app.get("/api/health")
async def health_check():
    """API health check."""
    return {"status": "ok"}

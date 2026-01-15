"""SmartMoney FastAPI application."""

import logging
import os

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import SQLAlchemyError

from .config import settings as app_settings
from .database import SessionLocal, init_db
from .routes import (
    accounts,
    ai_categorization,
    analytics,
    auth,
    budgets,
    categories,
    category_rules,
    challenges,
    chat,
    credits,
    crypto,
    dashboard,
    gamification,
    goals,
    proxy,
    receipts,
    recurring,
    reports,
    settings,
    social_learning,
    rewards,
    tags,
    transactions,
    transfers,
    upload,
    exchange_rates,
    user_categories,
)
from .services.exchange_rate_service import ExchangeRateService
from .services.recurring_service import RecurringTransactionService
from .services.defi_snapshot_service import DefiSnapshotService

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


def scheduled_recurring_transactions():
    """Background job to process due recurring transactions daily."""
    db = SessionLocal()
    try:
        created = RecurringTransactionService.process_due_recurring(db)
        logger.info(f"Scheduled recurring processing: created {created} transactions")
    except Exception as e:
        logger.error(f"Scheduled recurring processing failed: {e}")
    finally:
        db.close()


def scheduled_defi_snapshots():
    """Background job to capture DeFi position snapshots daily."""
    import asyncio

    db = SessionLocal()
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        stats = loop.run_until_complete(DefiSnapshotService.capture_all_snapshots(db))
        loop.close()
        logger.info(f"DeFi snapshots captured: {stats}")
    except Exception as e:
        logger.error(f"DeFi snapshot capture failed: {e}")
    finally:
        db.close()


def scheduled_snapshot_cleanup():
    """Weekly cleanup of old DeFi snapshots (>365 days)."""
    db = SessionLocal()
    try:
        deleted = DefiSnapshotService.cleanup_old_snapshots(db, retention_days=365)
        logger.info(f"Snapshot cleanup: deleted {deleted} old records")
    except Exception as e:
        logger.error(f"Snapshot cleanup failed: {e}")
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

    # Schedule daily recurring transaction processing at 00:05 JST (15:05 UTC previous day)
    scheduler.add_job(
        scheduled_recurring_transactions,
        trigger="cron",
        hour=15,
        minute=5,
        id="recurring_transactions",
        replace_existing=True,
    )

    # Schedule daily DeFi position snapshots at 00:30 UTC
    scheduler.add_job(
        scheduled_defi_snapshots,
        trigger="cron",
        hour=0,
        minute=30,
        id="defi_snapshots",
        replace_existing=True,
    )

    # Weekly cleanup of old snapshots (Sundays at 3 AM UTC)
    scheduler.add_job(
        scheduled_snapshot_cleanup,
        trigger="cron",
        day_of_week="sun",
        hour=3,
        minute=0,
        id="snapshot_cleanup",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(
        "Schedulers started (rates: 4 AM UTC, recurring: 00:05 JST, defi: 00:30 UTC, cleanup: Sun 3 AM UTC)"
    )


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
app.include_router(recurring.router)
app.include_router(category_rules.router)
app.include_router(challenges.router)
app.include_router(user_categories.router)
app.include_router(categories.router)
app.include_router(ai_categorization.router)
app.include_router(chat.router)
app.include_router(transfers.router)
app.include_router(crypto.router)
app.include_router(proxy.router)
app.include_router(reports.router)
app.include_router(gamification.router)
app.include_router(social_learning.router)
app.include_router(rewards.router)


# Root endpoints
@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": f"Welcome to {app_settings.app_name} API",
        "status": "healthy",
        "version": "0.1.0",
    }


@app.get("/api/health")
async def health_check():
    """API health check."""
    return {"status": "ok"}


# Mount uploads directory for development (production uses nginx)
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
if os.path.exists(uploads_dir):
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

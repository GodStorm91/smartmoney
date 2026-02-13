"""SmartMoney FastAPI application."""

import logging
import os
from urllib.parse import urlparse

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import SQLAlchemyError
from fastapi.exceptions import RequestValidationError

from .config import settings as app_settings
from .database import SessionLocal, init_db
from .routes.accounts import router as accounts_router
from .routes.ai_categorization import router as ai_categorization_router
from .routes.analytics import router as analytics_router
from .routes.anomalies import router as anomalies_router
from .routes.auth import router as auth_router
from .routes.budgets import router as budgets_router
from .routes.budget_alerts import router as budget_alerts_router
from .routes.bills import router as bills_router
from .routes.categories import router as categories_router
from .routes.category_rules import router as category_rules_router
from .routes.challenges import router as challenges_router
from .routes.chat import router as chat_router
from .routes.credits import router as credits_router
from .routes.crypto import router as crypto_router
from .routes.dashboard import router as dashboard_router
from .routes.gamification import router as gamification_router
from .routes.goals import router as goals_router
from .routes.insights import router as insights_router
from .routes.notifications import router as notifications_router
from .routes.proxy import router as proxy_router
from .routes.receipts import router as receipts_router
from .routes.recurring import router as recurring_router
from .routes.relocation import router as relocation_router
from .routes.report_ai_summary import router as report_ai_router
from .routes.reports import router as reports_router
from .routes.savings import router as savings_router
from .routes.settings import router as settings_router
from .routes.social_learning import router as social_learning_router
from .routes.rewards import router as rewards_router
from .routes.tags import router as tags_router
from .routes.transactions import router as transactions_router
from .routes.transfers import router as transfers_router
from .routes.upload import router as upload_router
from .routes.exchange_rates import router as exchange_rates_router
from .routes.user_categories import router as user_categories_router
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
    redirect_slashes=False,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Middleware to handle X-Forwarded-Proto for proper HTTPS redirects
@app.middleware("http")
async def handle_x_forwarded_proto(request: Request, call_next):
    """Check X-Forwarded-Proto header and update request url for proper redirect generation."""
    forwarded_proto = request.headers.get("X-Forwarded-Proto", "http")
    if forwarded_proto == "https":
        # Override the URL scheme in the request scope
        # This affects how FastAPI generates redirect URLs
        request.scope["scheme"] = "https"
        # Also update the full URL
        if "url" in request.scope:
            url_str = request.scope["url"]
            if url_str.startswith("http://"):
                request.scope["url"] = "https://" + url_str[7:]
    response = await call_next(request)
    return response


# Global exception handlers
@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors."""
    logger.error(f"[DB Error] Path: {request.url.path}, Error: {str(exc)}")
    content = {"detail": "DATABASE_ERROR"}
    if app_settings.debug:
        content["error"] = str(exc)
    return JSONResponse(
        status_code=500,
        content=content,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with field-level detail for frontend form mapping."""
    logger.error(f"[Validation Error] Path: {request.url.path}, Errors: {exc.errors()}")
    field_errors = []
    for err in exc.errors():
        loc = err.get("loc", ())
        # Extract field name from location tuple (skip 'body', 'query', etc.)
        field = str(loc[-1]) if loc else "unknown"
        field_errors.append({
            "field": field,
            "message": err.get("msg", "Validation error"),
            "type": err.get("type", "value_error"),
        })
    return JSONResponse(
        status_code=422,
        content={"detail": field_errors},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"[General Error] Path: {request.url.path}, Error: {str(exc)}")
    content = {"detail": "INTERNAL_SERVER_ERROR"}
    if app_settings.debug:
        content["error"] = str(exc)
    return JSONResponse(
        status_code=500,
        content=content,
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


def scheduled_anomaly_scan():
    """Background job to scan for transaction anomalies daily."""
    from sqlalchemy.orm import Session
    from .models.user import User
    from .models.transaction import Transaction
    from .services.anomaly_detection_service import AnomalyDetectionService
    from datetime import datetime, timedelta

    db = SessionLocal()
    try:
        users = db.query(User).filter(User.is_active == True).all()
        for user in users:
            try:
                service = AnomalyDetectionService(db)
                transactions = (
                    db.query(Transaction)
                    .filter(
                        Transaction.user_id == user.id,
                        Transaction.date >= (datetime.utcnow() - timedelta(days=90)).date(),
                    )
                    .all()
                )
                tx_dicts = [
                    {
                        "id": tx.id,
                        "date": tx.date.isoformat(),
                        "description": tx.description,
                        "amount": tx.amount,
                        "category": tx.category,
                    }
                    for tx in transactions
                ]
                anomalies = service.detect_user_anomalies(user.id, tx_dicts)
                if anomalies:
                    service.save_anomalies(user.id, anomalies)
                    logger.info(
                        f"Anomaly scan for user {user.id}: {len(anomalies)} anomalies detected"
                    )
            except Exception as e:
                logger.error(f"Anomaly scan failed for user {user.id}: {e}")
    except Exception as e:
        logger.error(f"Scheduled anomaly scan job failed: {e}")
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


def scheduled_budget_monitoring():
    """Background job to monitor budget thresholds."""
    db = SessionLocal()
    try:
        from .services.budget_monitoring_job import BudgetMonitoringJob

        job = BudgetMonitoringJob()
        result = job.check_all_budgets(db)
        logger.info(f"Budget monitoring: {result}")
    except Exception as e:
        logger.error(f"Budget monitoring failed: {e}")
    finally:
        db.close()


def scheduled_queued_notifications():
    """Process queued notifications every 10 minutes."""
    db = SessionLocal()
    try:
        from .services.queued_notification_job import QueuedNotificationJob

        job = QueuedNotificationJob()
        result = job.process_queue(db)
        if result["processed"] > 0 or result["failed"] > 0:
            logger.info(f"Queued notifications: {result}")
    except Exception as e:
        logger.error(f"Queued notification processing failed: {e}")
    finally:
        db.close()


def scheduled_bill_reminders():
    """Process bill reminder notifications hourly."""
    db = SessionLocal()
    try:
        from .services.bill_reminder_job import BillReminderJob

        job = BillReminderJob()
        result = job.process_reminders(db)
        if result["notified"] > 0 or result["errors"] > 0:
            logger.info(f"Bill reminders: {result}")
    except Exception as e:
        logger.error(f"Bill reminder processing failed: {e}")
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

    # Schedule daily anomaly detection scan at 2 AM UTC
    scheduler.add_job(
        scheduled_anomaly_scan,
        trigger="cron",
        hour=2,
        minute=0,
        id="anomaly_scan",
        replace_existing=True,
    )

    # Schedule budget monitoring every 15 minutes
    scheduler.add_job(
        scheduled_budget_monitoring,
        trigger="cron",
        hour="*",
        minute="*/15",
        id="budget_monitoring",
        replace_existing=True,
        max_instances=1,
    )
    logger.info("Budget monitoring scheduled (every 15 minutes)")

    # Schedule queued notification processing every 10 minutes
    scheduler.add_job(
        scheduled_queued_notifications,
        trigger="cron",
        minute="*/10",
        id="queued_notifications",
        replace_existing=True,
    )
    logger.info("Queued notification processing scheduled (every 10 minutes)")

    # Schedule bill reminder processing every hour at minute 0
    scheduler.add_job(
        scheduled_bill_reminders,
        trigger="cron",
        minute=0,
        id="bill_reminders",
        replace_existing=True,
    )
    logger.info("Bill reminder processing scheduled (hourly)")

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
app.include_router(auth_router)
app.include_router(accounts_router)
app.include_router(anomalies_router)
app.include_router(tags_router)
app.include_router(transactions_router)
app.include_router(analytics_router)
app.include_router(dashboard_router)
app.include_router(goals_router)
app.include_router(settings_router)
app.include_router(upload_router)
app.include_router(exchange_rates_router)
app.include_router(budgets_router)
app.include_router(budget_alerts_router)
app.include_router(bills_router)
app.include_router(credits_router)
app.include_router(receipts_router)
app.include_router(recurring_router)
app.include_router(category_rules_router)
app.include_router(challenges_router)
app.include_router(user_categories_router)
app.include_router(categories_router)
app.include_router(ai_categorization_router)
app.include_router(chat_router)
app.include_router(transfers_router)
app.include_router(crypto_router)
app.include_router(proxy_router)
app.include_router(reports_router)
app.include_router(report_ai_router)
app.include_router(gamification_router)
app.include_router(social_learning_router)
app.include_router(rewards_router)
app.include_router(insights_router)
app.include_router(savings_router)
app.include_router(notifications_router)
app.include_router(relocation_router)


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


# Mount uploads directory - accessible via /api/uploads due to nginx proxy
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
if os.path.exists(uploads_dir):
    app.mount("/api/uploads", StaticFiles(directory=uploads_dir), name="uploads")

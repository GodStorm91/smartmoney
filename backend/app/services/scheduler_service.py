"""Background scheduler for processing recurring transactions."""
import logging
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from .recurring_service import RecurringTransactionService

logger = logging.getLogger(__name__)


class SchedulerService:
    """Service for scheduling and processing recurring transactions."""

    _instance: Optional["SchedulerService"] = None
    _scheduler = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._scheduler is None:
            self._initialize_scheduler()

    def _initialize_scheduler(self):
        """Initialize the background scheduler."""
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from apscheduler.triggers.cron import CronTrigger

            self._scheduler = BackgroundScheduler()
            self._scheduler.add_job(
                self._process_due_transactions,
                CronTrigger(hour=0, minute=0),  # Run at midnight daily
                id="process_recurring",
                name="Process due recurring transactions",
                replace_existing=True,
            )
            logger.info("Scheduler initialized with midnight job")
        except ImportError:
            logger.warning("APScheduler not installed, scheduler will not run automatically")
            self._scheduler = None

    def start(self):
        """Start the scheduler."""
        if self._scheduler and not self._scheduler.running:
            self._scheduler.start()
            logger.info("Scheduler started")

    def stop(self):
        """Stop the scheduler."""
        if self._scheduler and self._scheduler.running:
            self._scheduler.shutdown(wait=False)
            logger.info("Scheduler stopped")

    def _process_due_transactions(self):
        """Internal method called by scheduler."""
        from ..database import SessionLocal

        db = SessionLocal()
        try:
            count = RecurringTransactionService.process_due_recurring(db)
            if count > 0:
                logger.info(f"Created {count} transaction(s) from recurring")
        finally:
            db.close()

    def process_now(self, db: Session, target_date: Optional[date] = None) -> int:
        """Manually trigger processing of due recurring transactions.

        Args:
            db: Database session
            target_date: Date to process (defaults to today)

        Returns:
            Number of transactions created
        """
        return RecurringTransactionService.process_due_recurring(db, target_date)


# Global scheduler instance
scheduler = SchedulerService()


def get_scheduler() -> SchedulerService:
    """Get the global scheduler instance."""
    return scheduler

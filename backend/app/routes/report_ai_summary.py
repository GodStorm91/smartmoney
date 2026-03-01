"""AI report summary endpoints (Phase 2 & 3)."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.report import AIReportSummary
from ..services.credit_service import InsufficientCreditsError
from ..services.monthly_report_service import MonthlyReportService
from ..services.report_ai_service import ReportAIService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reports", tags=["reports"])

_ai_service = ReportAIService()


@router.post(
    "/monthly/{year}/{month}/ai-summary",
    response_model=AIReportSummary,
)
async def generate_ai_summary(
    year: int = Path(..., ge=2020, le=2100),
    month: int = Path(..., ge=1, le=12),
    language: str = Query("en"),
    force_regenerate: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AIReportSummary:
    """Generate or return cached AI summary for a monthly report."""
    # Return cache if available and not forcing
    if not force_regenerate:
        cached = _ai_service.get_cached(
            db, current_user.id, year, month, language,
        )
        if cached:
            return cached

    # Generate report data for AI context
    report = MonthlyReportService.generate_report(
        db, current_user.id, year, month,
    )

    try:
        result = _ai_service.generate(
            db, current_user.id, year, month, language, report,
            force=force_regenerate,
        )
        db.commit()
        return result
    except InsufficientCreditsError:
        raise HTTPException(status_code=402, detail="Insufficient credits")
    except Exception:
        logger.exception("AI summary generation failed")
        db.rollback()
        # Return rule-based fallback (no credits charged)
        from ..services.report_ai_service import _rule_based_fallback
        return _rule_based_fallback(report, year, month)


@router.get(
    "/monthly/{year}/{month}/ai-summary",
    response_model=AIReportSummary,
)
async def get_ai_summary(
    year: int = Path(..., ge=2020, le=2100),
    month: int = Path(..., ge=1, le=12),
    language: str = Query("en"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AIReportSummary:
    """Return cached AI summary or 404 if none exists."""
    cached = _ai_service.get_cached(
        db, current_user.id, year, month, language,
    )
    if not cached:
        raise HTTPException(status_code=404, detail="No cached summary")
    return cached

"""Exchange rates API routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.user import User
from ..schemas.exchange_rate import ExchangeRatesResponse
from ..services.exchange_rate_service import ExchangeRateService

router = APIRouter(prefix="/api/exchange-rates", tags=["exchange-rates"])


@router.get("", response_model=ExchangeRatesResponse)
async def get_exchange_rates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get cached exchange rates from database.

    Returns:
        Exchange rates with metadata (updated_at, base_currency)
    """
    return ExchangeRateService.get_rates_with_metadata(db=db)

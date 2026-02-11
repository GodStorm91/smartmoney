"""Report generation API routes."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..database import get_db
from ..models.transaction import Transaction
from ..models.user import User
from ..schemas.report import MonthlyUsageReportData
from ..services.monthly_report_service import MonthlyReportService
from ..services.monthly_report_pdf_service import get_monthly_report_pdf_service
from ..services.report_service import get_pdf_service
from ..services.exchange_rate_service import ExchangeRateService
from ..utils.currency_utils import convert_to_jpy

router = APIRouter(prefix="/api/reports", tags=["reports"])


def get_month_key(year: int, month: int) -> str:
    """Generate month key for querying."""
    return f"{year}-{month:02d}"


@router.get("/monthly-usage/{year}/{month}", response_model=MonthlyUsageReportData)
async def get_monthly_usage_report(
    year: int = Path(..., ge=2020, le=2100),
    month: int = Path(..., ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get comprehensive monthly usage report data."""
    return MonthlyReportService.generate_report(db, current_user.id, year, month)


@router.get("/monthly-usage/{year}/{month}/pdf")
async def download_monthly_usage_pdf(
    year: int = Path(..., ge=2020, le=2100),
    month: int = Path(..., ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download monthly usage report as PDF."""
    data = MonthlyReportService.generate_report(db, current_user.id, year, month)
    pdf_bytes = get_monthly_report_pdf_service().generate_monthly_usage_pdf(data)

    from fastapi.responses import Response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="monthly_report_{year}_{month:02d}.pdf"'
            )
        },
    )


@router.get("/yearly")
async def generate_yearly_report(
    year: int = Query(..., ge=2020, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate yearly financial report PDF.

    Returns:
        PDF file download
    """
    # Get all transactions for the year
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.month_key.startswith(str(year)),
        )
        .order_by(Transaction.date.desc())
        .all()
    )

    # Convert amounts to JPY before aggregating
    rates = ExchangeRateService.get_cached_rates(db)

    total_income = sum(
        convert_to_jpy(tx.amount, tx.currency, rates)
        for tx in transactions if tx.is_income
    )
    total_expense = sum(
        convert_to_jpy(abs(tx.amount), tx.currency, rates)
        for tx in transactions if not tx.is_income
    )
    net = total_income - total_expense

    # Category breakdown with currency conversion
    categories = {}
    for tx in transactions:
        if not tx.is_income:
            cat = tx.category
            categories[cat] = categories.get(cat, 0) + convert_to_jpy(abs(tx.amount), tx.currency, rates)

    categories_sorted = sorted(categories.items(), key=lambda x: x[1], reverse=True)

    # Convert to dict format for PDF service (amounts pre-converted to JPY)
    tx_dicts = [
        {
            'date': tx.date.isoformat(),
            'description': tx.description,
            'amount': convert_to_jpy(tx.amount, tx.currency, rates),
            'is_income': tx.is_income,
            'category': tx.category,
        }
        for tx in transactions
    ]

    totals = {
        'income': total_income,
        'expense': total_expense,
        'net': net,
    }

    # Generate PDF
    pdf_bytes = get_pdf_service().generate_yearly_report(
        user_id=current_user.id,
        year=year,
        transactions=tx_dicts,
        totals=totals,
        categories=categories_sorted,
    )

    from fastapi.responses import Response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="yearly_report_{year}.pdf"'
        },
    )


@router.get("/monthly")
async def generate_monthly_report(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate monthly financial report PDF.

    Returns:
        PDF file download
    """
    month_key = get_month_key(year, month)

    # Get transactions for the month
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.month_key == month_key,
        )
        .order_by(Transaction.date.desc())
        .all()
    )

    # Convert amounts to JPY before aggregating
    rates = ExchangeRateService.get_cached_rates(db)

    total_income = sum(
        convert_to_jpy(tx.amount, tx.currency, rates)
        for tx in transactions if tx.is_income
    )
    total_expense = sum(
        convert_to_jpy(abs(tx.amount), tx.currency, rates)
        for tx in transactions if not tx.is_income
    )
    net = total_income - total_expense

    # Category breakdown with currency conversion
    categories = {}
    for tx in transactions:
        if not tx.is_income:
            cat = tx.category
            categories[cat] = categories.get(cat, 0) + convert_to_jpy(abs(tx.amount), tx.currency, rates)

    categories_sorted = sorted(categories.items(), key=lambda x: x[1], reverse=True)

    # Convert to dict format (amounts pre-converted to JPY)
    tx_dicts = [
        {
            'date': tx.date.isoformat(),
            'description': tx.description,
            'amount': convert_to_jpy(tx.amount, tx.currency, rates),
            'is_income': tx.is_income,
            'category': tx.category,
        }
        for tx in transactions
    ]

    totals = {
        'income': total_income,
        'expense': total_expense,
        'net': net,
    }

    # Generate PDF (reuse yearly report for single month)
    pdf_bytes = get_pdf_service().generate_yearly_report(
        user_id=current_user.id,
        year=year,
        transactions=tx_dicts,
        totals=totals,
        categories=categories_sorted,
    )

    from fastapi.responses import Response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="monthly_report_{year}_{month:02d}.pdf"'
        },
    )


@router.get("/deductible")
async def generate_deductible_report(
    year: int = Query(..., ge=2020, le=2100),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate deductible expenses report for tax purposes.

    Returns:
        PDF file download
    """
    # Common deductible categories (can be customized)
    DEDUCTIBLE_CATEGORIES = [
        '医療費',
        'Medical',
        '、交通費',
        'Transport',
        '書籍',
        'Books',
        '新聞',
        'Newspaper',
        '水道',
        'Utilities',
    ]

    # Get transactions for the year
    query = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.month_key.startswith(str(year)),
        Transaction.is_income == False,
    )

    if category:
        query = query.filter(Transaction.category == category)

    transactions = query.order_by(Transaction.date.desc()).all()

    # Convert amounts to JPY for deductible report
    rates = ExchangeRateService.get_cached_rates(db)

    # Filter deductible categories (contains keyword), amounts pre-converted to JPY
    deductible = [
        {
            'date': tx.date.isoformat(),
            'description': tx.description,
            'amount': convert_to_jpy(tx.amount, tx.currency, rates),
            'category': tx.category,
        }
        for tx in transactions
        if any(cat in tx.category for cat in DEDUCTIBLE_CATEGORIES)
    ]

    pdf_bytes = get_pdf_service().generate_deductible_report(
        user_id=current_user.id,
        year=year,
        deductible_expenses=deductible,
    )

    from fastapi.responses import Response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="deductible_report_{year}.pdf"'
        },
    )


@router.get("/transactions/csv")
async def export_transactions_csv(
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export transactions to CSV format.

    Returns:
        CSV file download
    """
    import csv
    from io import StringIO

    query = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
    )

    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)

    transactions = query.order_by(Transaction.date.desc()).all()

    # Generate CSV
    output = StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow(['Date', 'Description', 'Amount', 'Currency', 'Category', 'Source', 'Type'])

    # Rows
    for tx in transactions:
        amount = tx.amount if tx.is_income else -tx.amount
        writer.writerow([
            tx.date.isoformat(),
            tx.description,
            amount,
            tx.currency,
            tx.category,
            tx.source,
            'Income' if tx.is_income else 'Expense',
        ])

    from fastapi.responses import Response
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="transactions_export.csv"'
        },
    )

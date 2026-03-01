"""AI-powered report summary generation service."""
import json
import logging
from datetime import UTC, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from ..models.report_ai_summary import ReportAISummary
from ..schemas.report import AIReportSummary, MonthlyUsageReportData
from ..services.claude_ai_service import ClaudeAIService
from ..services.credit_service import CreditService

logger = logging.getLogger(__name__)

# Cost rates per token (same as budget AI)
INPUT_RATE = Decimal("0.000001")
OUTPUT_RATE = Decimal("0.000005")


class ReportAIService:
    """Generate and cache AI report summaries."""

    def __init__(self) -> None:
        self.ai = ClaudeAIService()

    def get_cached(
        self, db: Session, user_id: int, year: int, month: int, language: str
    ) -> Optional[AIReportSummary]:
        """Return cached summary or None."""
        row = (
            db.query(ReportAISummary)
            .filter_by(user_id=user_id, year=year, month=month, language=language)
            .first()
        )
        if not row:
            return None
        return AIReportSummary(
            year=row.year, month=row.month,
            win=row.win, warning=row.warning, trend=row.trend,
            generated_at=row.created_at, is_cached=True,
            credits_used=row.credits_used,
        )

    def generate(
        self, db: Session, user_id: int, year: int, month: int,
        language: str, report: MonthlyUsageReportData,
        force: bool = False,
    ) -> AIReportSummary:
        """Generate AI summary, cache it, and deduct credits.

        Args:
            db: Database session.
            user_id: User ID.
            year: Report year.
            month: Report month.
            language: Output language code.
            report: Full report data for prompt context.
            force: Delete existing cache and regenerate.

        Returns:
            AIReportSummary with generated bullets.
        """
        if force:
            db.query(ReportAISummary).filter_by(
                user_id=user_id, year=year, month=month, language=language,
            ).delete()
            db.flush()

        prompt = _build_prompt(report, language)

        try:
            response = self.ai.client.messages.create(
                model=self.ai.model, max_tokens=512,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}],
            )
            usage = {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            }
            parsed = _parse_response(response.content[0].text)
        except Exception:
            logger.exception("AI summary generation failed, using fallback")
            return _rule_based_fallback(report, year, month)

        # Deduct credits
        cost = (
            INPUT_RATE * usage["input_tokens"]
            + OUTPUT_RATE * usage["output_tokens"]
        )
        CreditService(db).deduct_credits(
            user_id, cost, "usage",
            description=f"AI report summary {year}-{month:02d}",
        )

        # Cache result
        row = ReportAISummary(
            user_id=user_id, year=year, month=month, language=language,
            win=parsed["win"], warning=parsed["warning"],
            trend=parsed["trend"], credits_used=float(cost),
        )
        db.add(row)
        db.flush()

        return AIReportSummary(
            year=year, month=month,
            win=parsed["win"], warning=parsed["warning"],
            trend=parsed["trend"],
            generated_at=datetime.now(UTC), is_cached=False,
            credits_used=float(cost),
        )


def _build_prompt(report: MonthlyUsageReportData, language: str) -> str:
    """Build the AI prompt from report data."""
    lang_map = {"ja": "Japanese", "en": "English", "vi": "Vietnamese"}
    lang_name = lang_map.get(language, "English")
    s = report.summary

    focus_lines = ""
    if report.budget_adherence and report.budget_adherence.focus_areas:
        for fa in report.budget_adherence.focus_areas[:3]:
            focus_lines += (
                f"  - {fa.category}: {fa.percentage:.0f}% of budget "
                f"({fa.status})\n"
            )

    return (
        f"You are a financial advisor summarizing a monthly report.\n"
        f"Respond in {lang_name}. Return ONLY a JSON object.\n\n"
        f"DATA (all amounts in JPY):\n"
        f"- Income: ¥{s.total_income:,} ({s.income_change:+.1f}%)\n"
        f"- Expenses: ¥{s.total_expense:,} ({s.expense_change:+.1f}%)\n"
        f"- Savings rate: {s.savings_rate}%\n"
        f"- Focus areas:\n{focus_lines}\n"
        f'Return JSON: {{"win":"one positive insight",'
        f'"warning":"one concern","trend":"one trend observation"}}\n\n'
        f"Rules:\n- Each field max 80 characters\n"
        f"- Be specific with numbers\n- Be actionable\n"
    )


def _parse_response(text: str) -> dict:
    """Extract JSON object from AI response text."""
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError("No JSON object in AI response")
    data = json.loads(text[start:end])
    for key in ("win", "warning", "trend"):
        if key not in data:
            raise ValueError(f"Missing key: {key}")
    return data


def _rule_based_fallback(
    report: MonthlyUsageReportData, year: int, month: int,
) -> AIReportSummary:
    """Generate rule-based 3-bullet fallback when AI is unavailable."""
    s = report.summary

    # Win: best metric
    if s.savings_rate > 0:
        win = f"Savings rate at {s.savings_rate}%"
    elif s.expense_change < 0:
        win = f"Expenses decreased by {abs(s.expense_change):.1f}%"
    else:
        win = "Income recorded for the month"

    # Warning: top focus area
    warning = "No budget concerns this month"
    if report.budget_adherence and report.budget_adherence.focus_areas:
        fa = report.budget_adherence.focus_areas[0]
        warning = f"{fa.category} at {fa.percentage:.0f}% of budget"

    # Trend: net change
    direction = "up" if s.net_change >= 0 else "down"
    trend = f"Net cashflow {direction} {abs(s.net_change):.1f}% vs last month"

    return AIReportSummary(
        year=year, month=month,
        win=win, warning=warning, trend=trend,
        generated_at=datetime.now(UTC), is_cached=False,
        credits_used=0.0,
    )

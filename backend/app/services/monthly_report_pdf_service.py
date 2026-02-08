"""PDF generation service for monthly usage reports."""
from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from ..schemas.report import MonthlyUsageReportData

# Register CID font for Japanese text
pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))

_FONT = "HeiseiKakuGo-W5"
_HEADER_BG = colors.HexColor("#2563EB")
_SECTION_BG = colors.HexColor("#EFF6FF")
_OVER_COLOR = colors.HexColor("#DC2626")
_OK_COLOR = colors.HexColor("#16A34A")
_WARN_COLOR = colors.HexColor("#D97706")


class MonthlyReportPDFService:
    """Generate comprehensive monthly usage report PDFs."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()

    def _create_custom_styles(self):
        self.styles.add(ParagraphStyle(
            name="PDFTitle", parent=self.styles["Heading1"],
            fontName=_FONT, fontSize=18, alignment=TA_CENTER, spaceAfter=20,
        ))
        self.styles.add(ParagraphStyle(
            name="Section", parent=self.styles["Heading2"],
            fontName=_FONT, fontSize=13, spaceBefore=15, spaceAfter=8,
            textColor=colors.HexColor("#1E40AF"),
        ))
        self.styles.add(ParagraphStyle(
            name="RAlign", parent=self.styles["Normal"],
            fontName=_FONT, alignment=TA_RIGHT, fontSize=8,
        ))
        self.styles.add(ParagraphStyle(
            name="Body", parent=self.styles["Normal"],
            fontName=_FONT, fontSize=9,
        ))

    # ── helpers ──────────────────────────────────────────────
    @staticmethod
    def _fmt(amount: int) -> str:
        return f"¥{amount:,}"

    @staticmethod
    def _pct(val: float) -> str:
        sign = "+" if val > 0 else ""
        return f"{sign}{val:.1f}%"

    def _header_style(self):
        return TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), _HEADER_BG),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, -1), _FONT),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("TOPPADDING", (0, 1), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
        ])

    # ── public API ───────────────────────────────────────────
    def generate_monthly_usage_pdf(self, data: MonthlyUsageReportData) -> bytes:
        buf = BytesIO()
        doc = SimpleDocTemplate(
            buf, pagesize=A4,
            rightMargin=0.5 * inch, leftMargin=0.5 * inch,
            topMargin=0.5 * inch, bottomMargin=0.5 * inch,
        )
        elems: list = []

        self._add_title(elems, data)
        self._add_summary(elems, data)
        self._add_category_breakdown(elems, data)
        if data.budget_adherence and data.budget_adherence.category_status:
            self._add_budget_adherence(elems, data)
        if data.goal_progress:
            self._add_goal_progress(elems, data)
        if data.account_summary:
            self._add_account_summary(elems, data)
        if data.insights:
            self._add_insights(elems, data)
        self._add_footer(elems)

        doc.build(elems)
        return buf.getvalue()

    # ── sections ─────────────────────────────────────────────
    def _add_title(self, elems, data):
        elems.append(Paragraph(
            f"{data.month_label} — Monthly Report",
            self.styles["PDFTitle"],
        ))
        elems.append(Paragraph(
            f"Generated: {data.generated_at.strftime('%Y-%m-%d %H:%M')}",
            self.styles["RAlign"],
        ))
        elems.append(Spacer(1, 10))

    def _add_summary(self, elems, data):
        elems.append(Paragraph("Summary", self.styles["Section"]))
        s = data.summary
        rows = [
            ["", "Amount", "MoM Change"],
            ["Income", self._fmt(s.total_income), self._pct(s.income_change)],
            ["Expense", self._fmt(s.total_expense), self._pct(s.expense_change)],
            ["Net Cash Flow", self._fmt(s.net_cashflow), self._pct(s.net_change)],
            ["Savings Rate", f"{s.savings_rate:.1f}%", ""],
        ]
        t = Table(rows, colWidths=[2.2 * inch, 1.8 * inch, 1.5 * inch])
        t.setStyle(self._header_style())
        elems.append(t)
        elems.append(Spacer(1, 12))

    def _add_category_breakdown(self, elems, data):
        if not data.category_breakdown:
            return
        elems.append(Paragraph("Category Breakdown", self.styles["Section"]))
        rows = [["Category", "Amount", "%"]]
        total = sum(c.get("amount", 0) for c in data.category_breakdown) or 1
        for c in data.category_breakdown:
            amt = c.get("amount", 0)
            pct = (amt / total) * 100
            rows.append([c.get("category", ""), self._fmt(amt), f"{pct:.1f}%"])
        t = Table(rows, colWidths=[2.5 * inch, 1.8 * inch, 1.2 * inch])
        t.setStyle(self._header_style())
        elems.append(t)
        elems.append(Spacer(1, 12))

    def _add_budget_adherence(self, elems, data):
        ba = data.budget_adherence
        elems.append(Paragraph("Budget Adherence", self.styles["Section"]))
        rows = [["Category", "Budget", "Spent", "% Used", "Status"]]
        for cs in ba.category_status:
            rows.append([
                cs.category,
                self._fmt(cs.budget_amount),
                self._fmt(cs.spent),
                f"{cs.percentage:.0f}%",
                cs.status.replace("_", " ").title(),
            ])
        widths = [1.6 * inch, 1.2 * inch, 1.2 * inch, 0.8 * inch, 1.0 * inch]
        t = Table(rows, colWidths=widths)
        style = self._header_style()
        # Color status cells
        for i, cs in enumerate(ba.category_status, start=1):
            if cs.status == "over_budget":
                style.add("TEXTCOLOR", (4, i), (4, i), _OVER_COLOR)
            elif cs.status == "threshold_80":
                style.add("TEXTCOLOR", (4, i), (4, i), _WARN_COLOR)
            else:
                style.add("TEXTCOLOR", (4, i), (4, i), _OK_COLOR)
        t.setStyle(style)
        elems.append(t)
        elems.append(Spacer(1, 12))

    def _add_goal_progress(self, elems, data):
        elems.append(Paragraph("Goal Progress", self.styles["Section"]))
        rows = [["Goal", "Target", "Saved", "Progress", "Status"]]
        for g in data.goal_progress:
            rows.append([
                f"{g.years}-Year Goal",
                self._fmt(g.target_amount),
                self._fmt(g.total_saved),
                f"{g.progress_percentage:.1f}%",
                g.status.replace("_", " ").title(),
            ])
        widths = [1.4 * inch, 1.3 * inch, 1.3 * inch, 0.9 * inch, 0.9 * inch]
        t = Table(rows, colWidths=widths)
        style = self._header_style()
        for i, g in enumerate(data.goal_progress, start=1):
            clr = _OK_COLOR if g.status == "ahead" else (
                _WARN_COLOR if g.status == "on_track" else _OVER_COLOR
            )
            style.add("TEXTCOLOR", (4, i), (4, i), clr)
        t.setStyle(style)
        elems.append(t)
        elems.append(Spacer(1, 12))

    def _add_account_summary(self, elems, data):
        elems.append(Paragraph("Account Summary", self.styles["Section"]))
        rows = [["Account", "Type", "Balance", "Currency"]]
        for a in data.account_summary:
            rows.append([
                a.account_name,
                a.account_type.replace("_", " ").title(),
                self._fmt(a.balance),
                a.currency,
            ])
        # Net worth total row
        rows.append(["Total Net Worth", "", self._fmt(data.total_net_worth), ""])
        widths = [2.0 * inch, 1.2 * inch, 1.5 * inch, 1.0 * inch]
        t = Table(rows, colWidths=widths)
        style = self._header_style()
        last = len(rows) - 1
        style.add("BACKGROUND", (0, last), (-1, last), _SECTION_BG)
        style.add("FONTSIZE", (0, last), (-1, last), 10)
        t.setStyle(style)
        elems.append(t)
        elems.append(Spacer(1, 12))

    def _add_insights(self, elems, data):
        elems.append(Paragraph("Key Insights", self.styles["Section"]))
        for ins in data.insights:
            severity_color = {
                "critical": "#DC2626",
                "warning": "#D97706",
                "info": "#2563EB",
            }.get(ins.severity, "#374151")
            text = (
                f'<font color="{severity_color}">●</font> '
                f"<b>{ins.title}</b> — {ins.message}"
            )
            elems.append(Paragraph(text, self.styles["Body"]))
            elems.append(Spacer(1, 4))
        elems.append(Spacer(1, 8))

    def _add_footer(self, elems):
        elems.append(Spacer(1, 20))
        elems.append(Paragraph(
            f"Generated by SmartMoney — {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            self.styles["RAlign"],
        ))


# Singleton
_service = MonthlyReportPDFService()


def get_monthly_report_pdf_service() -> MonthlyReportPDFService:
    return _service

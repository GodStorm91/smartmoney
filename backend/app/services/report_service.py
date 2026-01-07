"""PDF report generation service for tax reports and summaries."""
import os
from datetime import datetime
from io import BytesIO
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    PageBreak,
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT


class PDFReportService:
    """Service for generating PDF reports."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()

    def _create_custom_styles(self):
        """Create custom paragraph styles."""
        self.styles.add(
            ParagraphStyle(
                name='ReportTitle',
                parent=self.styles['Heading1'],
                fontSize=18,
                alignment=TA_CENTER,
                spaceAfter=20,
            )
        )
        self.styles.add(
            ParagraphStyle(
                name='SectionTitle',
                parent=self.styles['Heading2'],
                fontSize=14,
                spaceBefore=15,
                spaceAfter=10,
            )
        )
        self.styles.add(
            ParagraphStyle(
                name='RightAlign',
                parent=self.styles['Normal'],
                alignment=TA_RIGHT,
            )
        )

    def generate_yearly_report(
        self,
        user_id: int,
        year: int,
        transactions: list,
        totals: dict,
        categories: list,
    ) -> bytes:
        """Generate yearly financial report PDF.

        Args:
            user_id: User ID (for filename)
            year: Year for the report
            transactions: List of transaction dicts
            totals: Dict with income, expense, net totals
            categories: List of (category, amount) tuples

        Returns:
            PDF bytes
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.5 * inch,
            leftMargin=0.5 * inch,
            topMargin=0.5 * inch,
            bottomMargin=0.5 * inch,
        )

        elements = []

        # Title
        elements.append(
            Paragraph(f'{year}年 収支報告書', self.styles['ReportTitle'])
        )
        elements.append(Spacer(1, 20))

        # Summary Section
        elements.append(Paragraph('収支サマリー', self.styles['SectionTitle']))

        summary_data = [
            ['項目', '金額'],
            ['总收入 (Income)', f'¥{totals.get("income", 0):,}'],
            ['総支出 (Expense)', f'¥{totals.get("expense", 0):,}'],
            ['差額 (Net)', f'¥{totals.get("net", 0):,}'],
        ]

        summary_table = Table(summary_data, colWidths=[2.5 * inch, 2 * inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))

        # Category Breakdown
        elements.append(Paragraph('支出内訳', self.styles['SectionTitle']))

        cat_data = [['カテゴリー', '金額', '比率']]
        total_expense = totals.get('expense', 1)  # Avoid division by zero
        for cat, amount in categories:
            if amount > 0:
                ratio = (amount / total_expense) * 100
                cat_data.append([cat, f'¥{amount:,}', f'{ratio:.1f}%'])

        cat_table = Table(cat_data, colWidths=[2.5 * inch, 1.5 * inch, 1 * inch])
        cat_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ]))
        elements.append(cat_table)

        # Monthly Summary
        elements.append(Spacer(1, 15))
        elements.append(Paragraph('月別推移', self.styles['SectionTitle']))

        # Build monthly data
        monthly_data = [['月', '収入', '支出', '収支']]
        monthly_totals = {}
        for tx in transactions:
            month = tx.get('date', '')[:7]  # YYYY-MM
            if month not in monthly_totals:
                monthly_totals[month] = {'income': 0, 'expense': 0}
            if tx.get('is_income'):
                monthly_totals[month]['income'] += tx.get('amount', 0)
            else:
                monthly_totals[month]['expense'] += abs(tx.get('amount', 0))

        for month in sorted(monthly_totals.keys()):
            data = monthly_totals[month]
            net = data['income'] - data['expense']
            monthly_data.append([
                month,
                f'¥{data["income"]:,}',
                f'¥{data["expense"]:,}',
                f'¥{net:,}'
            ])

        monthly_table = Table(monthly_data, colWidths=[1 * inch, 1.5 * inch, 1.5 * inch, 1.5 * inch])
        monthly_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgreen),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(monthly_table)

        # Transaction List (last 50)
        elements.append(PageBreak())
        elements.append(Paragraph('取引一覧 (直近50件)', self.styles['SectionTitle']))

        tx_data = [['日付', '説明', '金額']]
        for tx in transactions[:50]:
            amount = tx.get('amount', 0)
            if not tx.get('is_income'):
                amount = -amount
            tx_data.append([
                tx.get('date', '')[:10],
                tx.get('description', '')[:30],
                f'¥{amount:,}'
            ])

        tx_table = Table(tx_data, colWidths=[1.2 * inch, 3 * inch, 1.5 * inch])
        tx_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ]))
        elements.append(tx_table)

        # Footer
        elements.append(Spacer(1, 30))
        elements.append(
            Paragraph(
                f'作成日: {datetime.now().strftime("%Y-%m-%d %H:%M")}',
                self.styles['RightAlign']
            )
        )

        doc.build(elements)
        return buffer.getvalue()

    def generate_deductible_report(
        self,
        user_id: int,
        year: int,
        deductible_expenses: list,
    ) -> bytes:
        """Generate deductible expenses report for tax purposes.

        Args:
            user_id: User ID (for filename)
            year: Year for the report
            deductible_expenses: List of deductible expense transactions

        Returns:
            PDF bytes
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.5 * inch,
            leftMargin=0.5 * inch,
            topMargin=0.5 * inch,
            bottomMargin=0.5 * inch,
        )

        elements = []

        # Title
        elements.append(
            Paragraph(f'{year}年 控除対象経費一覧', self.styles['ReportTitle'])
        )
        elements.append(Spacer(1, 20))

        # Summary
        total = sum(abs(tx.get('amount', 0)) for tx in deductible_expenses)
        elements.append(Paragraph(f'控除対象経費: ¥{total:,}', self.styles['SectionTitle']))
        elements.append(Spacer(1, 10))

        # Table
        data = [['日付', '内容', 'カテゴリー', '金額']]
        for tx in deductible_expenses:
            data.append([
                tx.get('date', '')[:10],
                tx.get('description', '')[:40],
                tx.get('category', ''),
                f'¥{abs(tx.get("amount", 0)):,}'
            ])

        table = Table(data, colWidths=[1.2 * inch, 2.5 * inch, 1.5 * inch, 1.5 * inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
            ('ALIGN', (3, 0), (3, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ]))
        elements.append(table)

        # Footer
        elements.append(Spacer(1, 30))
        elements.append(
            Paragraph(
                f'作成日: {datetime.now().strftime("%Y-%m-%d %H:%M")}',
                self.styles['RightAlign']
            )
        )

        doc.build(elements)
        return buffer.getvalue()


# Singleton instance
pdf_service = PDFReportService()


def get_pdf_service() -> PDFReportService:
    """Get PDF service instance."""
    return pdf_service

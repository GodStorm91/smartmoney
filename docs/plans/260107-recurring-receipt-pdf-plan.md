# Implementation Plan: Recurring Templates, Receipt OCR, PDF Export

**Created:** 2026-01-07
**Version:** 1.0
**Status:** Ready for Implementation

---

## Executive Summary

Three high-impact features to improve user experience and tax preparation:

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| Recurring Templates | High | 2-3 days | High |
| Receipt OCR | High | 3-4 days | High |
| PDF Tax Export | High | 2-3 days | High |

**Total Estimated:** 7-10 days

---

## Phase 1: Recurring Transaction Templates

### 1.1 Database Schema

**File:** `backend/app/models/transaction_template.py`

```python
class TransactionTemplate(Base):
    id: int
    user_id: int
    description: str
    amount: int  # BIGINT, positive for income, negative for expense
    currency: str = 'JPY'
    category: str
    source: str
    type: str  # 'income' or 'expense'

    # Schedule
    frequency: str  # 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'
    day_of_week: Optional[int]  # 0=Monday, 6=Sunday (for weekly)
    day_of_month: Optional[int]  # 1-31 (for monthly)
    month_of_year: Optional[int]  # 1-12 (for yearly)

    # Execution
    start_date: date
    end_date: Optional[date]
    last_run_date: Optional[date]
    next_run_date: date
    is_active: bool = True

    # Auto-categorization settings
    auto_submit: bool = False  # Create without user confirmation
```

**Migration:** `alembic/versions/260107_xxxx_add_transaction_templates.py`

---

### 1.2 Backend API

**File:** `backend/app/routes/transaction_templates.py`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/templates | List all templates |
| POST | /api/templates | Create template |
| GET | /api/templates/{id} | Get single template |
| PUT | /api/templates/{id} | Update template |
| DELETE | /api/templates/{id} | Delete template |
| POST | /api/templates/{id}/run | Manually trigger |
| GET | /api/templates/due | Get templates due today |

**Service:** `backend/app/services/template_service.py`

```python
def calculate_next_run_date(template: TransactionTemplate) -> date:
    """Calculate next execution date based on frequency."""
    if template.frequency == 'daily':
        return template.next_run_date + timedelta(days=1)
    elif template.frequency == 'weekly':
        return template.next_run_date + timedelta(weeks=1)
    elif template.frequency == 'monthly':
        # Handle month overflow (Jan 31 → Feb 28)
        try:
            return template.next_run_date.replace(
                month=(template.next_run_date.month % 12) + 1
            )
        except ValueError:
            return last_day_of_month(next_month)
```

---

### 1.3 Background Scheduler

**Option A:** Celery (recommended for production)
**Option B:** APScheduler (simpler, self-contained)

Using APScheduler for simplicity:

```python
# backend/app/services/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger

scheduler = BackgroundScheduler()

def run_pending_templates():
    """Run all templates due today."""
    due_templates = get_templates_due_today()
    for template in due_templates:
        create_transaction_from_template(template)
        update_template_next_run(template)

scheduler.add_job(run_pending_templates, 'cron', hour=0, minute=0)
scheduler.start()
```

---

### 1.4 Frontend Components

**Files:**
- `frontend/src/pages/Templates.tsx` - List view
- `frontend/src/components/templates/TemplateFormModal.tsx` - Create/Edit
- `frontend/src/components/templates/TemplateCard.tsx` - Display card

**UI Design:**
- Card-based layout (similar to Goals)
- Toggle active/inactive
- "Run now" button
- Visual schedule preview

**Translation Keys:**
```json
{
  "templates": {
    "title": "Recurring Transactions",
    "create": "Create Template",
    "frequency": "Frequency",
    "daily": "Daily",
    "weekly": "Weekly",
    "monthly": "Monthly",
    "yearly": "Yearly",
    "nextRun": "Next Run",
    "lastRun": "Last Run",
    "active": "Active",
    "runNow": "Run Now"
  }
}
```

---

## Phase 2: Receipt Image Upload + OCR

### 2.1 Backend Architecture

**File Upload Flow:**
```
Frontend → POST /api/receipts/upload → Validate → Save → OCR → Return data
```

**Storage:**
- Local: `/root/smartmoney/backend/uploads/receipts/{user_id}/{filename}`
- Max size: 10MB
- Allowed: jpg, png, pdf

**OCR Service:**

```python
# backend/app/services/ocr_service.py
import pytesseract
from PIL import Image
import re

def extract_receipt_data(image_path: str) -> dict:
    """Extract merchant, amount, date from receipt image."""
    text = pytesseract.image_to_string(Image.open(image_path), lang='jpn+eng')

    # Extract amount (looks for ¥数字 or 数字円)
    amount_pattern = r'[¥￥]?([0-9,]+)'
    amounts = re.findall(amount_pattern, text)
    max_amount = max([int(a.replace(',', '')) for a in amounts]) if amounts else 0

    # Extract date (YYYY-MM-DD, YYYY年MM月DD日, etc.)
    date_patterns = [
        r'(\d{4})[-\/年](\d{1,2})[-\/月](\d{1,2})',
        r'(\d{1,2})[-\/月](\d{1,2})[-\/日](\d{4})',
    ]

    # Extract merchant (first non-empty line usually)
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    merchant = lines[0] if lines else 'Unknown'

    return {
        'merchant': merchant,
        'amount': max_amount,
        'date': parse_date(text),
        'raw_text': text
    }
```

**Tesseract Installation:**
```bash
# On server
apt-get install tesseract-ocr tesseract-ocr-jpn
```

---

### 2.2 Database Schema

**File:** `backend/app/models/receipt.py`

```python
class Receipt(Base):
    id: int
    user_id: int
    transaction_id: Optional[int]  # FK to transaction if linked
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    uploaded_at: datetime
    ocr_text: Optional[str]
    extracted_merchant: Optional[str]
    extracted_amount: Optional[int]
    extracted_date: Optional[date]
    is_processed: bool = False
```

---

### 2.3 Frontend Components

**Files:**
- `frontend/src/components/receipts/ReceiptUploadModal.tsx`
- `frontend/src/components/receipts/ReceiptPreview.tsx`
- `frontend/src/components/receipts/ReceiptList.tsx`

**UI Flow:**
1. User clicks "Scan Receipt" button
2. Modal opens with camera/gallery options
3. Capture or select image
4. Preview with edit capability
5. Submit → Upload + OCR
6. Show extracted data for confirmation
7. Create transaction from receipt data

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/receipts/upload | Upload receipt image |
| GET | /api/receipts | List user's receipts |
| GET | /api/receipts/{id} | Get receipt details |
| DELETE | /api/receipts/{id} | Delete receipt |
| POST | /api/receipts/{id}/create-tx | Create transaction from receipt |

---

## Phase 3: PDF Export (Tax Reports)

### 3.1 Report Types

| Report | Description | Use Case |
|--------|-------------|----------|
| Monthly Summary | Income/Expense by category | Monthly review |
| Yearly Summary | Annual totals, YoY comparison | Tax preparation |
| Deductible Expenses | Medical, business expenses marked | 青色申告 |
| Transaction List | Full transaction export with notes | Audit trail |

---

### 3.2 Backend Implementation

**File:** `backend/app/services/report_service.py`

```python
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

def generate_yearly_summary(
    user_id: int,
    year: int,
    output_path: str
) -> str:
    """Generate PDF yearly summary report."""
    doc = SimpleDocTemplate(output_path, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()

    # Title
    elements.append(Paragraph(
        f'{year}年 収支報告書',
        styles['Heading1']
    ))

    # Summary Table
    data = [
        ['項目', '金額'],
        ['总收入 (Income)', f'¥{total_income:,}'],
        ['総支出 (Expense)', f'¥{total_expense:,}'],
        ['差額 (Net)', f'¥{net:,}'],
    ]

    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))

    elements.append(table)

    # Category Breakdown
    elements.append(Paragraph('支出内訳', styles['Heading2']))
    category_data = [['カテゴリー', '金額', '比率']]
    for cat, amount in categories:
        ratio = amount / total_expense * 100
        category_data.append([cat, f'¥{amount:,}', f'{ratio:.1f}%'])

    cat_table = Table(category_data)
    elements.append(cat_table)

    doc.build(elements)
    return output_path
```

**Dependencies:**
```bash
pip install reportlab
# or
pip install weasyprint  # Better CSS support, but requires GTK
```

---

### 3.3 Frontend Components

**Files:**
- `frontend/src/components/reports/ExportPDFModal.tsx`
- `frontend/src/pages/Reports.tsx`

**UI:**
- Select report type (Monthly/Yearly/Deductible)
- Select date range
- Preview option
- Download button

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reports/monthly?year=2025&month=12 | Generate monthly PDF |
| GET | /api/reports/yearly?year=2025 | Generate yearly PDF |
| GET | /api/reports/deductible?year=2025 | Deductible expenses |
| GET | /api/reports/transactions?start_date=&end_date= | Full export |

---

## Implementation Order

### Week 1 (Days 1-4)

| Day | Task | Files |
|-----|------|-------|
| 1 | Database models + migrations | `models/template.py`, `models/receipt.py` |
| 2 | Template CRUD API | `routes/templates.py`, `services/template_service.py` |
| 3 | Template scheduler + Frontend list | `services/scheduler.py`, `Templates.tsx` |
| 4 | Receipt upload + OCR backend | `routes/receipts.py`, `services/ocr_service.py` |

### Week 2 (Days 5-9)

| Day | Task | Files |
|-----|------|-------|
| 5 | Receipt frontend + PDF backend | `ReceiptUploadModal.tsx`, `services/report_service.py` |
| 6 | PDF report templates | Monthly/Yearly report generation |
| 7 | Integration testing | E2E flow tests |
| 8 | Bug fixes + polish | All files |
| 9 | Deployment + documentation | Deploy script, README |

---

## Dependencies

### System Packages (Server)
```bash
apt-get install tesseract-ocr tesseract-ocr-jpn poppler-utils
```

### Python Packages
```bash
pip install reportlab
# OR
pip install weasyprint  # Requires: apt-get install libcairo2 libpango1.0-0
```

### Frontend Dependencies
```bash
# None new (reuse existing: react, lucide-react, etc.)
```

---

## Environment Variables

```env
# Backend
RECEIPT_UPLOAD_DIR=/root/smartmoney/backend/uploads/receipts
MAX_RECEIPT_SIZE=10485760  # 10MB
ALLOWED_RECEIPT_TYPES=image/jpeg,image/png,application/pdf
TESSERACT_CMD=/usr/bin/tesseract
```

---

## Validation Checklist

### Recurring Templates
- [ ] Create template → saved to DB
- [ ] Update template → reflects in DB
- [ ] Delete template → removed from DB
- [ ] Next run date calculated correctly
- [ ] Scheduler creates transactions
- [ ] Frontend shows upcoming runs
- [ ] Toggle active/inactive works

### Receipt OCR
- [ ] Upload image → saved to disk
- [ ] OCR extracts merchant
- [ ] OCR extracts amount
- [ ] OCR extracts date
- [ ] Create transaction from receipt
- [ ] View receipt history
- [ ] Delete receipt

### PDF Export
- [ ] Monthly report generates
- [ ] Yearly report generates
- [ ] Deductible report generates
- [ ] Download works
- [ ] Japanese characters render correctly
- [ ] Tables formatted properly

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OCR accuracy low | Medium | Manual edit after extraction |
| Tesseract not installed | High | Dockerfile includes installation |
| PDF Japanese fonts missing | Medium | Install Japanese font package |
| Large receipt files | Low | Size limit + compression |

---

## Rollback Plan

If issues arise:
1. **Revert migrations:** `alembic downgrade -1`
2. **Remove scheduler:** Comment out APScheduler.start()
3. **Disable OCR:** Return mock data from OCR endpoint
4. **Rollback deploy:** `git checkout previous_tag && docker compose build`

---

## Success Metrics

- Template creation <500ms
- OCR processing <5s per receipt
- PDF generation <3s
- Upload success rate >95%
- OCR accuracy >80% (amount within 5%)

---

**END OF PLAN**

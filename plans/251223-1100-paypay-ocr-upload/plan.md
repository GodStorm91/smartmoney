# PayPay Screenshot OCR Upload Feature

> **⚠️ SUPERSEDED 2026-05-31** by [`plans/260531-1015-mcp-import-flow/`](../260531-1015-mcp-import-flow/plan.md)
>
> CSV export from PayPay is available and is strictly better than OCR (deterministic, exact dedup via Transaction ID, no API cost, complete history). Keeping this file for historical context only — do NOT implement.

**Created:** 2025-12-23
**Status:** Superseded (was: Ready for Implementation)
**Superseded-by:** `plans/260531-1015-mcp-import-flow/`
**Estimated Effort:** 2-3 hours

## Problem Statement

User wants to upload PayPay app screenshots and automatically extract/register transactions, following the same UX pattern as existing CSV upload.

## Solution Overview

Add a tab-based upload interface where users can switch between CSV and PayPay modes. PayPay mode accepts PNG/JPG images, sends them to Claude Vision API for OCR, parses the extracted transactions, and bulk-inserts them using existing infrastructure.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Upload Page                               │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │   CSV Tab    │  │  PayPay Tab  │  ← Tab switcher          │
│  └──────────────┘  └──────────────┘                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  UploadDropZone (accepts images in PayPay mode)         ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │  MultipleFileUploadList (reused, unchanged)             ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /api/upload/paypay                                    │
│  1. Validate image (.png/.jpg, <10MB)                       │
│  2. Base64 encode → Claude Vision API                       │
│  3. Parse JSON array → transaction dicts                    │
│  4. TransactionService.bulk_create_transactions()           │
│  5. Return {created, skipped, total}                        │
└─────────────────────────────────────────────────────────────┘
```

## Existing Code Reuse

| Component | Status | Notes |
|-----------|--------|-------|
| `ReceiptScannerService` | **Adapt pattern** | Vision API call structure |
| `TransactionService.bulk_create_transactions()` | **Reuse as-is** | Bulk insert + duplicate detection |
| `transaction_hasher.py` | **Reuse as-is** | tx_hash generation |
| `category_mapper.py` | **Reuse as-is** | Japanese→English category mapping |
| `MultipleFileUploadList.tsx` | **Reuse as-is** | Batch upload UI |
| `FileUploadItem.tsx` | **Reuse as-is** | File status display |
| `UploadDropZone.tsx` | **Modify** | Accept images when PayPay mode |
| `upload-service.ts` | **Add function** | `uploadPayPayImage()` |

---

## Implementation Tasks

### Phase 1: Backend - PayPay OCR Service (New File)

**File:** `backend/app/utils/paypay_ocr.py`

```python
"""PayPay screenshot OCR using Claude Vision API."""
import json
import base64
from datetime import date
from anthropic import Anthropic
from ..config import settings
from .transaction_hasher import generate_tx_hash
from .category_mapper import map_category


PAYPAY_OCR_PROMPT = """You are a PayPay transaction history parser. Extract ALL visible transactions from this PayPay app screenshot.

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "date": "YYYY-MM-DD",
    "description": "merchant/store name",
    "amount": -1234,
    "category": "食費"
  }
]

RULES:
- date: Transaction date in YYYY-MM-DD format. If unclear, use null.
- description: Merchant/store name exactly as shown
- amount: Integer in JPY. NEGATIVE for payments/expenses, POSITIVE for cashback/refunds/deposits
- category: Suggest ONE Japanese category: 食費, 交通, 日用品, 娯楽, 通信, 医療, 住宅, 教育, その他

Extract EVERY transaction visible in the image. If no transactions found, return empty array []."""


class PayPayOCRService:
    """Service for extracting transactions from PayPay screenshots."""

    def __init__(self):
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-3-5-haiku-20241022"

    def extract_transactions(
        self,
        image_base64: str,
        media_type: str,
        user_id: int
    ) -> list[dict]:
        """Extract transactions from PayPay screenshot.

        Args:
            image_base64: Base64 encoded image (no data URL prefix)
            media_type: MIME type (image/jpeg or image/png)
            user_id: User ID for transaction records

        Returns:
            List of transaction dicts ready for bulk_create
        """
        # Call Claude Vision API
        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_base64
                            }
                        },
                        {"type": "text", "text": PAYPAY_OCR_PROMPT}
                    ]
                }
            ]
        )

        # Parse response
        response_text = response.content[0].text.strip()
        raw_transactions = self._parse_json_response(response_text)

        # Transform to transaction format
        transactions = []
        for tx in raw_transactions:
            if not tx.get("amount"):
                continue  # Skip if no amount

            # Handle null date
            tx_date = tx.get("date")
            if not tx_date:
                tx_date = date.today().isoformat()

            description = tx.get("description", "PayPay Transaction")
            amount = tx.get("amount", 0)
            category_jp = tx.get("category", "その他")

            # Map Japanese category to English
            category_en = map_category(category_jp)

            # Determine if income (positive amount)
            is_income = amount > 0

            # Generate tx_hash for duplicate detection
            tx_hash = generate_tx_hash(
                date=tx_date,
                amount=abs(amount),
                description=description,
                source="PayPay"
            )

            transactions.append({
                "date": tx_date,
                "description": description,
                "amount": abs(amount),  # Store as positive, use is_income flag
                "category": category_en,
                "source": "PayPay",
                "is_income": is_income,
                "is_transfer": False,
                "is_adjustment": False,
                "tx_hash": tx_hash,
                "user_id": user_id,
                "month_key": tx_date[:7]  # YYYY-MM
            })

        return transactions

    def _parse_json_response(self, response_text: str) -> list[dict]:
        """Parse Claude response into transaction list."""
        text = response_text.strip()

        # Handle markdown code blocks
        if text.startswith("```"):
            lines = text.split("\n")
            start_idx = 1
            end_idx = len(lines)
            for i, line in enumerate(lines[1:], 1):
                if line.strip() == "```":
                    end_idx = i
                    break
            text = "\n".join(lines[start_idx:end_idx])
            if text.startswith("json"):
                text = text[4:].strip()

        # Find array bounds
        start = text.find("[")
        end = text.rfind("]") + 1
        if start == -1 or end == 0:
            return []

        return json.loads(text[start:end])


# Singleton
paypay_ocr = PayPayOCRService()
```

---

### Phase 2: Backend - Upload Endpoint

**File:** `backend/app/routes/upload.py` (Add to existing)

```python
# Add import at top
from ..utils.paypay_ocr import paypay_ocr

# Add new endpoint after existing /csv endpoint

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": "image/jpeg",
    "image/png": "image/png",
    "image/jpg": "image/jpeg",
}

@router.post("/paypay", response_model=UploadResponse)
async def upload_paypay_screenshot(
    file: UploadFile = File(..., description="PayPay screenshot image"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload PayPay screenshot and extract transactions via OCR.

    Accepts: PNG, JPG images (max 10MB)
    Returns summary of extracted transactions.
    """
    # Validate content type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only PNG and JPG images are allowed"
        )

    # File size limit (10MB for images)
    MAX_FILE_SIZE = 10 * 1024 * 1024
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 10MB limit"
        )

    try:
        # Base64 encode image
        image_base64 = base64.b64encode(file_content).decode("utf-8")
        media_type = ALLOWED_IMAGE_TYPES[content_type]

        # Extract transactions via OCR
        transactions_data = paypay_ocr.extract_transactions(
            image_base64=image_base64,
            media_type=media_type,
            user_id=current_user.id
        )

        if not transactions_data:
            return {
                "filename": file.filename,
                "total_rows": 0,
                "created": 0,
                "skipped": 0,
                "message": "No transactions found in image"
            }

        # Bulk create transactions (reuse existing)
        created, skipped = TransactionService.bulk_create_transactions(
            db, transactions_data
        )

        return {
            "filename": file.filename,
            "total_rows": len(transactions_data),
            "created": created,
            "skipped": skipped,
            "message": f"Extracted {len(transactions_data)} transactions, created {created}, skipped {skipped} duplicates"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process PayPay screenshot: {str(e)}"
        )
```

**Also add import at top of file:**
```python
import base64
```

---

### Phase 3: Frontend - Upload Service

**File:** `frontend/src/services/upload-service.ts` (Add function)

```typescript
/**
 * Upload PayPay screenshot image
 */
export async function uploadPayPayImage(file: File): Promise<BackendUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<BackendUploadResponse>('/api/upload/paypay', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}
```

---

### Phase 4: Frontend - Tab Switcher & DropZone

**File:** `frontend/src/pages/Upload.tsx` (Modify)

Add upload mode state and tab UI:

```tsx
// Add to imports
import { uploadCSV, uploadPayPayImage, fetchUploadHistory } from '@/services/upload-service'

// Add state at top of component
type UploadMode = 'csv' | 'paypay'
const [uploadMode, setUploadMode] = useState<UploadMode>('csv')

// Add tab UI before UploadDropZone Card
<div className="flex gap-2 mb-4">
  <button
    onClick={() => setUploadMode('csv')}
    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
      uploadMode === 'csv'
        ? 'bg-primary-500 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
    }`}
  >
    CSV
  </button>
  <button
    onClick={() => setUploadMode('paypay')}
    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
      uploadMode === 'paypay'
        ? 'bg-primary-500 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
    }`}
  >
    PayPay
  </button>
</div>

// Pass mode to UploadDropZone
<UploadDropZone
  isDragOver={isDragOver}
  uploading={uploading}
  onDrop={handleDrop}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onFileSelect={handleFilesSelect}
  hasFiles={fileItems.length > 0}
  mode={uploadMode}  // NEW PROP
/>

// Modify handleFilesSelect validation
const handleFilesSelect = (files: FileList) => {
  const newFiles: FileUploadItem[] = []

  const isPayPayMode = uploadMode === 'paypay'
  const allowedExtensions = isPayPayMode ? ['.png', '.jpg', '.jpeg'] : ['.csv']
  const maxSize = isPayPayMode ? 10 * 1024 * 1024 : 50 * 1024 * 1024

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!allowedExtensions.includes(ext)) {
      alert(isPayPayMode
        ? t('upload.alertSelectImage', { filename: file.name })
        : t('upload.alertSelectCSV', { filename: file.name })
      )
      continue
    }

    if (file.size > maxSize) {
      alert(t('upload.alertMaxSize', { filename: file.name }))
      continue
    }

    // ... rest of existing logic
  }
}

// Modify uploadSingleFile to use correct API
const uploadSingleFile = async (item: FileUploadItem) => {
  setFileItems(prev =>
    prev.map(f => f.id === item.id ? { ...f, status: 'uploading' as const, progress: 50 } : f)
  )

  try {
    // Use correct upload function based on mode
    const uploadFn = uploadMode === 'paypay' ? uploadPayPayImage : uploadCSV
    const result = await uploadFn(item.file)

    // ... rest unchanged
  } catch (error) {
    // ... unchanged
  }
}

// Clear files when switching modes
useEffect(() => {
  setFileItems([])
}, [uploadMode])
```

---

### Phase 5: Frontend - DropZone Props

**File:** `frontend/src/components/upload/UploadDropZone.tsx` (Modify)

```tsx
// Update interface
interface UploadDropZoneProps {
  isDragOver: boolean
  uploading: boolean
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onFileSelect: (files: FileList) => void
  hasFiles?: boolean
  mode?: 'csv' | 'paypay'  // NEW
}

// Update component
export function UploadDropZone({
  isDragOver,
  uploading,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileSelect,
  hasFiles = false,
  mode = 'csv',  // NEW
}: UploadDropZoneProps) {
  const { t } = useTranslation('common')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isPayPayMode = mode === 'paypay'
  const acceptTypes = isPayPayMode ? '.png,.jpg,.jpeg' : '.csv'

  return (
    <div>
      <div
        // ... existing attributes unchanged
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}  // DYNAMIC
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files
            if (files && files.length > 0) {
              onFileSelect(files)
              e.target.value = ''
            }
          }}
        />

        {/* Update icon for PayPay mode */}
        {uploading ? (
          // ... unchanged
        ) : (
          <>
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isPayPayMode ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              )}
            </svg>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {hasFiles
                ? t('upload.addMoreFiles')
                : isPayPayMode
                  ? t('upload.dropPayPayImage')
                  : t('upload.dropOrClick')
              }
            </h3>
            {/* ... rest */}
          </>
        )}
      </div>

      {/* Update info box for PayPay */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              {isPayPayMode ? t('upload.paypayRequirements') : t('upload.requirements')}
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              {isPayPayMode ? (
                <>
                  <li>• {t('upload.paypayFormat')}</li>
                  <li>• {t('upload.paypayHint')}</li>
                </>
              ) : (
                <>
                  <li>• {t('upload.requiredColumns')}</li>
                  <li>• {t('upload.supportedApps')}</li>
                  <li>• {t('upload.encoding')}</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

### Phase 6: i18n Translations

**File:** `frontend/public/locales/en/common.json` (Add)

```json
{
  "upload": {
    "dropPayPayImage": "Drop PayPay screenshot or click to upload",
    "paypayRequirements": "PayPay Screenshot Requirements",
    "paypayFormat": "PNG or JPG format (max 10MB)",
    "paypayHint": "Take a screenshot of your PayPay transaction history",
    "alertSelectImage": "{{filename}} is not an image file. Please select PNG or JPG."
  }
}
```

**File:** `frontend/public/locales/ja/common.json` (Add)

```json
{
  "upload": {
    "dropPayPayImage": "PayPayスクリーンショットをドロップまたはクリック",
    "paypayRequirements": "PayPayスクリーンショットの要件",
    "paypayFormat": "PNG/JPG形式（最大10MB）",
    "paypayHint": "PayPayの取引履歴のスクリーンショットを撮影してください",
    "alertSelectImage": "{{filename}}は画像ファイルではありません。PNGまたはJPGを選択してください。"
  }
}
```

**File:** `frontend/public/locales/vi/common.json` (Add)

```json
{
  "upload": {
    "dropPayPayImage": "Thả ảnh chụp màn hình PayPay hoặc nhấp để tải lên",
    "paypayRequirements": "Yêu cầu ảnh chụp màn hình PayPay",
    "paypayFormat": "Định dạng PNG hoặc JPG (tối đa 10MB)",
    "paypayHint": "Chụp màn hình lịch sử giao dịch PayPay của bạn",
    "alertSelectImage": "{{filename}} không phải là tệp hình ảnh. Vui lòng chọn PNG hoặc JPG."
  }
}
```

---

## File Changes Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `backend/app/utils/paypay_ocr.py` | **CREATE** | ~120 |
| `backend/app/routes/upload.py` | MODIFY | +50 |
| `frontend/src/services/upload-service.ts` | MODIFY | +15 |
| `frontend/src/pages/Upload.tsx` | MODIFY | +40 |
| `frontend/src/components/upload/UploadDropZone.tsx` | MODIFY | +30 |
| `frontend/public/locales/*/common.json` | MODIFY | +5 each |

**Total:** ~280 lines of new/modified code

---

## Testing Checklist

- [ ] Upload single PayPay screenshot → transactions extracted
- [ ] Upload multiple images in batch → all processed sequentially
- [ ] Duplicate image upload → transactions skipped (tx_hash)
- [ ] Invalid file type rejected (PDF, GIF, etc.)
- [ ] File > 10MB rejected
- [ ] No transactions in image → "No transactions found" message
- [ ] Tab switching clears file queue
- [ ] Japanese category names mapped correctly
- [ ] Negative amounts → is_income=false
- [ ] Positive amounts (cashback) → is_income=true

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| OCR accuracy varies by screenshot quality | Medium | User can edit/delete bad entries post-import |
| Claude API rate limits | Low | Anthropic limits generous; add retry logic if needed |
| Prompt requires tuning for edge cases | Medium | Iterate on prompt based on real PayPay screenshots |

---

## Future Enhancements (Out of Scope)

- Preview extracted transactions before saving
- Support other payment apps (LINE Pay, Rakuten Pay)
- Confidence scores display
- Manual correction UI for OCR errors

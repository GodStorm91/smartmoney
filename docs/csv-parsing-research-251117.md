# CSV Parsing & Data Normalization Research Report
**Date:** 2025-11-17
**Context:** Financial transaction processing with Japanese CSV files
**Scope:** CSV parsing, encoding, duplicate detection, category mapping, validation

---

## 1. CSV PARSING LIBRARIES

### Primary Recommendation: Pandas
**Library:** `pandas.read_csv()`
**Rationale:** Industry standard, mature, handles edge cases well

**Key Parameters:**
```python
pd.read_csv(
    filepath,
    encoding='auto',           # Auto-detect or specify
    on_bad_lines='skip',       # pandas 1.4.0+ (replaces error_bad_lines)
    engine='python',           # More flexible than C engine
    dtype=str,                 # Preserve original data, convert later
    keep_default_na=False      # Prevent unintended NaN conversions
)
```

**Strengths:**
- Robust error handling via `on_bad_lines` callback
- Built-in type coercion: `pd.to_numeric(df['amount'], errors='coerce')`
- Handles missing columns gracefully
- Efficient for large files (100k+ rows)

**Fallback:** Python stdlib `csv.DictReader` for edge cases

**Citation:** pandas.pydata.org/docs/reference/api/pandas.read_csv.html

---

## 2. JAPANESE ENCODING HANDLING

### Challenge
Japanese CSVs use multiple encodings:
- **Shift-JIS** (legacy, common in finance apps)
- **UTF-8** (modern)
- **UTF-8-BOM** (Excel exports with `\ufeff` prefix)
- **EUC-JP, ISO-2022-JP** (rare)

### Solution Strategy

**Step 1: Auto-Detection with chardet**
```python
import chardet

def detect_encoding(filepath, sample_size=10000):
    with open(filepath, 'rb') as f:
        raw_data = f.read(sample_size)
        result = chardet.detect(raw_data)
        encoding = result['encoding']
        confidence = result['confidence']

        # Fallback if low confidence
        if confidence < 0.7:
            return try_common_encodings(filepath)
        return encoding
```

**Step 2: Fallback Cascade**
```python
COMMON_JAPANESE_ENCODINGS = [
    'utf-8-sig',     # UTF-8 with BOM (Excel)
    'utf-8',         # Standard UTF-8
    'shift-jis',     # Japanese legacy
    'cp932',         # Windows Shift-JIS variant
    'euc-jp',        # Unix Japanese
]

def try_common_encodings(filepath):
    for enc in COMMON_JAPANESE_ENCODINGS:
        try:
            pd.read_csv(filepath, encoding=enc, nrows=5)
            return enc
        except UnicodeDecodeError:
            continue
    raise ValueError("Unable to detect encoding")
```

**Best Practices:**
- Use `encoding='utf-8-sig'` when writing CSVs for Excel compatibility
- Sample size: 10KB minimum for accurate detection
- Log encoding detection results for debugging
- Handle `UnicodeDecodeError` gracefully

**Citation:**
- chardet documentation
- csvfix.com/blog/fix-japanese-csv-encoding
- dev.to/bowmanjd/character-encodings-and-detection

---

## 3. DUPLICATE DETECTION STRATEGIES

### Requirement
Detect duplicates: same date + amount + description + source

### Algorithm Approaches

**Option A: Composite Key Hash (Recommended for MVP)**
```python
import hashlib

def create_transaction_hash(row):
    """Create unique hash from critical fields"""
    components = [
        row['date'].isoformat(),
        str(row['amount']),
        row['description'].strip().lower(),
        row['source'].strip().lower()
    ]
    composite = '|'.join(components)
    return hashlib.sha256(composite.encode()).hexdigest()

# Before insert:
df['tx_hash'] = df.apply(create_transaction_hash, axis=1)
existing_hashes = set(db.query("SELECT tx_hash FROM transactions"))
new_rows = df[~df['tx_hash'].isin(existing_hashes)]
```

**Pros:**
- Fast lookup (O(1) with hash set)
- Simple implementation
- Handles exact duplicates

**Cons:**
- Misses near-duplicates (¥1000 vs ¥1001)
- Sensitive to whitespace/case differences

**Option B: Fuzzy Matching (Advanced)**
```python
from rapidfuzz import fuzz

def is_near_duplicate(tx1, tx2, threshold=90):
    """Detect near-duplicates using Levenshtein distance"""
    if tx1['date'] != tx2['date']:
        return False
    if abs(tx1['amount'] - tx2['amount']) > 10:  # ¥10 tolerance
        return False

    desc_similarity = fuzz.ratio(
        tx1['description'].lower(),
        tx2['description'].lower()
    )
    return desc_similarity >= threshold
```

**When to Use:**
- Description variations: "セブンイレブン" vs "７−１１"
- Rounding differences
- OCR/manual entry errors

**Performance:** O(n²) naive, use blocking (group by date) → O(n*k)

**Option C: Database Unique Constraint**
```sql
CREATE UNIQUE INDEX idx_tx_unique
ON transactions(date, amount, description, source);
```
Let DB handle duplicates via `INSERT IGNORE` or `ON CONFLICT DO NOTHING`

**Recommendation for MVP:** Option A (hash-based) + Option C (DB constraint)

**Citation:**
- xelix.com/ai-for-world-leading-duplicate-invoice-prevention
- marc-deveaux.medium.com/classifying-bank-transactions

---

## 4. CATEGORY MAPPING ARCHITECTURE

### Requirements
- Map Japanese categories (大項目) to English
- Extensible for new categories
- Support subcategories (中項目)

### Architecture Options

**Option 1: JSON Configuration (Recommended for MVP)**
```json
{
  "categories": {
    "食費": {
      "en": "Food",
      "subcategories": {
        "食料品": "Groceries",
        "外食": "Dining Out",
        "カフェ": "Cafe"
      }
    },
    "住宅": {
      "en": "Housing",
      "subcategories": {
        "家賃": "Rent",
        "水道光熱費": "Utilities",
        "修繕費": "Repairs"
      }
    },
    "交通": {
      "en": "Transportation",
      "subcategories": {
        "電車": "Train",
        "タクシー": "Taxi",
        "ガソリン": "Gas"
      }
    },
    "こども・教育": {
      "en": "Baby/Education",
      "subcategories": {
        "保育": "Childcare",
        "教材": "Educational Materials",
        "医療": "Medical"
      }
    },
    "収入": {
      "en": "Income",
      "is_income": true
    }
  }
}
```

**Usage:**
```python
import json

def load_category_mapping(path='config/categories.json'):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def map_category(jp_category, mapping):
    category_data = mapping['categories'].get(jp_category, {})
    return category_data.get('en', 'Other')
```

**Pros:**
- Simple, version-controlled
- Easy manual edits
- No schema migration needed

**Cons:**
- No runtime validation
- Reload required for changes

**Option 2: Database Table (Production)**
```sql
CREATE TABLE category_mappings (
    id INTEGER PRIMARY KEY,
    jp_name TEXT UNIQUE NOT NULL,
    en_name TEXT NOT NULL,
    parent_id INTEGER REFERENCES category_mappings(id),
    is_income BOOLEAN DEFAULT FALSE,
    is_transfer BOOLEAN DEFAULT FALSE
);

-- Example data
INSERT INTO category_mappings (jp_name, en_name, is_income)
VALUES ('収入', 'Income', TRUE);

INSERT INTO category_mappings (jp_name, en_name, parent_id)
VALUES ('食料品', 'Groceries', (SELECT id FROM category_mappings WHERE jp_name='食費'));
```

**Pros:**
- Dynamic updates via admin UI
- Supports hierarchy queries
- Normalized data

**Cons:**
- Complexity overhead for MVP
- Requires migration strategy

**Option 3: YAML (Readable Alternative to JSON)**
```yaml
categories:
  食費:
    en: Food
    subcategories:
      食料品: Groceries
      外食: Dining Out
  住宅:
    en: Housing
    subcategories:
      家賃: Rent
```

**Recommendation:** JSON for MVP, migrate to DB table post-MVP

**Citation:**
- arxiv.org/html/2506.09234v1 (QuickBooks categorization)
- patents.google.com/patent/US6792422B1 (automatic categorization)

---

## 5. DATA VALIDATION STRATEGIES

### Core Validation Dimensions

**1. Completeness Checks**
```python
REQUIRED_FIELDS = ['date', 'amount', 'description', 'source']

def validate_completeness(df):
    missing = df[REQUIRED_FIELDS].isnull().sum()
    if missing.any():
        raise ValueError(f"Missing required fields: {missing[missing > 0].to_dict()}")
```

**2. Data Type Validation**
```python
def validate_types(df):
    # Date validation
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    invalid_dates = df['date'].isnull().sum()
    if invalid_dates > 0:
        logger.warning(f"{invalid_dates} rows with invalid dates")

    # Amount validation (coerce to numeric)
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
    invalid_amounts = df['amount'].isnull().sum()
    if invalid_amounts > 0:
        raise ValueError(f"{invalid_amounts} rows with invalid amounts")

    return df
```

**3. Range Validation**
```python
def validate_ranges(df):
    # Sanity check: no transaction > ¥10M
    outliers = df[df['amount'].abs() > 10_000_000]
    if len(outliers) > 0:
        logger.warning(f"{len(outliers)} transactions exceed ¥10M")

    # Future date check
    future = df[df['date'] > pd.Timestamp.now()]
    if len(future) > 0:
        raise ValueError(f"{len(future)} transactions dated in future")
```

**4. Consistency Validation**
```python
def validate_consistency(df, category_mapping):
    # Unknown categories
    valid_categories = set(category_mapping['categories'].keys())
    unknown = df[~df['category_jp'].isin(valid_categories)]
    if len(unknown) > 0:
        logger.warning(f"{len(unknown)} rows with unknown categories")
        df.loc[unknown.index, 'category_en'] = 'Other'
```

**5. Uniqueness Validation**
```python
def validate_uniqueness(df):
    # Within-file duplicates
    dupes = df.duplicated(subset=['date', 'amount', 'description', 'source'])
    if dupes.any():
        logger.warning(f"{dupes.sum()} duplicate rows in upload")
        return df[~dupes]  # Keep first occurrence
    return df
```

### Validation Pipeline
```python
def validate_csv_data(df, category_mapping):
    """Run all validation checks"""
    try:
        validate_completeness(df)
        df = validate_types(df)
        validate_ranges(df)
        validate_consistency(df, category_mapping)
        df = validate_uniqueness(df)
        return df, []
    except ValueError as e:
        return None, [str(e)]
```

**Best Practices:**
- Log warnings for non-critical issues
- Raise errors for data that breaks processing
- Return validation results to user (imported X, skipped Y, errors Z)
- Implement continuous validation post-import

**Citation:**
- dqops.com/data-quality-for-finance
- acceldata.io/blog/data-validation

---

## 6. ERROR HANDLING PATTERNS

### CSV Parsing Errors
```python
def safe_csv_read(filepath, encoding=None):
    """Robust CSV reading with error handling"""
    if encoding is None:
        encoding = detect_encoding(filepath)

    try:
        df = pd.read_csv(
            filepath,
            encoding=encoding,
            on_bad_lines='skip',     # Skip malformed rows
            engine='python',
            dtype=str                # Preserve as string initially
        )
        return df, encoding, None
    except pd.errors.EmptyDataError:
        return None, encoding, "CSV file is empty"
    except pd.errors.ParserError as e:
        return None, encoding, f"Parse error: {str(e)}"
    except UnicodeDecodeError:
        # Try fallback encodings
        encoding = try_common_encodings(filepath)
        return safe_csv_read(filepath, encoding=encoding)
```

### Column Mapping Errors
```python
COLUMN_ALIASES = {
    '日付': 'date',
    'Date': 'date',
    '内容': 'description',
    '金額（円）': 'amount',
    '金額': 'amount',
    'Amount': 'amount',
    '大項目': 'category_main',
    '中項目': 'category_sub',
    '保有金融機関': 'source',
    '振替': 'is_transfer',
    'メモ': 'notes',
}

def normalize_columns(df):
    """Map various column names to standard fields"""
    # Rename columns
    df = df.rename(columns=COLUMN_ALIASES)

    # Check for required columns
    missing = set(['date', 'amount', 'description']) - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Add optional columns if not present
    if 'source' not in df.columns:
        df['source'] = 'Unknown'
    if 'is_transfer' not in df.columns:
        df['is_transfer'] = False

    return df
```

### User-Friendly Error Messages
```python
class CSVImportError(Exception):
    """Custom exception for CSV import failures"""
    pass

def import_csv_file(filepath):
    """Main import function with comprehensive error handling"""
    try:
        # Step 1: Read CSV
        df, encoding, error = safe_csv_read(filepath)
        if error:
            raise CSVImportError(f"Failed to read CSV: {error}")

        # Step 2: Normalize columns
        df = normalize_columns(df)

        # Step 3: Validate data
        df, errors = validate_csv_data(df, load_category_mapping())
        if errors:
            raise CSVImportError(f"Validation failed: {errors}")

        # Step 4: Detect duplicates
        df['tx_hash'] = df.apply(create_transaction_hash, axis=1)
        existing = get_existing_hashes()
        new_transactions = df[~df['tx_hash'].isin(existing)]

        return {
            'total_rows': len(df),
            'new_rows': len(new_transactions),
            'duplicates': len(df) - len(new_transactions),
            'data': new_transactions,
            'encoding': encoding
        }

    except CSVImportError as e:
        logger.error(f"Import failed: {str(e)}")
        return {'error': str(e)}
    except Exception as e:
        logger.exception("Unexpected error during import")
        return {'error': f"Unexpected error: {str(e)}"}
```

---

## 7. IMPLEMENTATION RECOMMENDATIONS

### Tech Stack
- **CSV Parsing:** `pandas` (primary), `csv.DictReader` (fallback)
- **Encoding Detection:** `chardet` or `charset-normalizer`
- **Fuzzy Matching:** `rapidfuzz` (optional, for advanced duplicate detection)
- **Database:** SQLite (MVP), PostgreSQL (production)

### Project Structure
```
smartmoney/
├── config/
│   └── categories.json          # Category mappings
├── src/
│   ├── csv_parser.py            # Encoding detection, CSV reading
│   ├── normalizer.py            # Data normalization, validation
│   ├── duplicate_detector.py   # Hash-based duplicate detection
│   └── category_mapper.py      # Category mapping logic
├── tests/
│   └── fixtures/
│       ├── zaim_export.csv      # Test CSVs (various encodings)
│       └── moneyforward_export.csv
└── uploads/                     # User-uploaded CSVs
```

### Processing Pipeline
```
1. Upload CSV → 2. Detect Encoding → 3. Parse CSV → 4. Normalize Columns
    ↓
5. Validate Data → 6. Map Categories → 7. Detect Duplicates → 8. Insert to DB
```

### Performance Considerations
- **Batch Size:** Process 10k rows at a time for large files
- **Indexing:** Create DB index on `(date, amount, description, source)` for fast duplicate checks
- **Caching:** Cache category mappings in memory (reload on file change)
- **Async Processing:** Use background jobs (Celery, RQ) for large uploads

---

## 8. UNRESOLVED QUESTIONS

1. **Multiple CSV Formats:** Should system support multiple formats simultaneously or require user to specify source (Zaim vs MoneyForward)?

2. **Duplicate Threshold:** Should near-duplicates (±¥10, similar description) be flagged for manual review or auto-merged?

3. **Category Updates:** How to handle recategorization of historical transactions when mappings change?

4. **Transfer Detection:** Japanese CSVs use 振替 flag, but what if source doesn't provide it? Heuristics needed?

5. **Currency Support:** Spec says JPY default, but should system prepare for multi-currency (foreign transactions)?

6. **Data Retention:** Should original CSV files be stored for audit trail, or just normalized transactions?

---

## REFERENCES

1. Pandas CSV documentation: pandas.pydata.org/docs/reference/api/pandas.read_csv.html
2. Character encoding detection: dev.to/bowmanjd/character-encodings-and-detection
3. Japanese CSV encoding issues: csvfix.com/blog/fix-japanese-csv-encoding
4. Duplicate invoice detection: xelix.com/ai-for-world-leading-duplicate-invoice-prevention
5. Transaction categorization ML: arxiv.org/html/2506.09234v1
6. Financial data quality: dqops.com/data-quality-for-finance
7. Data validation strategies: acceldata.io/blog/data-validation
8. Bank transaction classification: marc-deveaux.medium.com/classifying-bank-transactions

---

**END OF REPORT**

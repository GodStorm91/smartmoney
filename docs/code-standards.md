# SmartMoney Code Standards
**Version:** 1.0
**Last Updated:** 2025-11-17

---

## Design Principles

### YAGNI (You Aren't Gonna Need It)
- Build only what's needed now
- Single-user only (no multi-tenant)
- SQLite first (PostgreSQL when needed)
- Basic features before advanced

### KISS (Keep It Simple, Stupid)
- Monolithic over microservices
- Hash-based over ML algorithms
- Battle-tested libraries over custom
- Direct solutions over clever ones

### DRY (Don't Repeat Yourself)
- Single source of truth for config
- Reusable components/functions
- Shared types across frontend
- Utility functions for common operations

---

## File Organization

### File Size Limits
- **Python files:** ≤200 lines
- **TypeScript files:** ≤200 lines
- **Functions:** ≤50 lines
- **Documentation:** ≤300 lines

**Rationale:** Maintainability, readability, ease of testing

### Naming Conventions

**Python:**
```python
# Files: snake_case
transaction_service.py
csv_parser.py

# Classes: PascalCase
class TransactionService:
class CSVParser:

# Functions/variables: snake_case
def create_transaction():
total_amount = 100

# Constants: UPPER_SNAKE_CASE
MAX_FILE_SIZE = 50_000_000
DEFAULT_CURRENCY = "JPY"
```

**TypeScript:**
```typescript
// Files: PascalCase for components, kebab-case for utils
TransactionList.tsx
formatCurrency.ts

// Components: PascalCase
function TransactionList() {}

// Functions/variables: camelCase
function calculateTotal() {}
const totalAmount = 100;

// Constants: UPPER_SNAKE_CASE
const MAX_ITEMS = 100;

// Types/Interfaces: PascalCase
interface Transaction {}
type TransactionFilters = {};
```

### Directory Structure

**Backend:**
```
backend/app/
├── models/         # SQLAlchemy models (database schema)
├── schemas/        # Pydantic schemas (validation)
├── routes/         # API endpoints (thin controllers)
├── services/       # Business logic (core functions)
├── utils/          # Helpers, parsers, utilities
├── config.py       # Settings from environment
├── database.py     # DB session management
└── main.py         # FastAPI app init
```

**Frontend:**
```
frontend/src/
├── components/     # React components
│   ├── charts/     # Visualization components
│   ├── dashboard/  # Dashboard-specific
│   ├── financial/  # Financial components
│   ├── layout/     # Layout components
│   ├── ui/         # Base UI components
│   └── upload/     # Upload-specific
├── pages/          # Page components (one per route)
├── routes/         # TanStack Router files
├── services/       # API clients (axios)
├── types/          # TypeScript types/interfaces
└── utils/          # Formatters, calculations
```

---

## Python Standards

### PEP 8 Compliance
- Line length: 100 characters (relaxed from 79)
- Indentation: 4 spaces
- Imports: sorted, grouped (stdlib, third-party, local)
- Docstrings: Google style

### Import Style

**Always use relative imports** (not absolute `from app.xxx` imports):

```python
# Good - relative imports
from ..database import get_db
from ..models.user import User
from ..services.transaction_service import TransactionService
from ..auth.dependencies import get_current_user

# Bad - absolute imports (will fail in production)
from app.database import get_db
from app.models.user import User
```

**Why:** Absolute imports like `from app.database` fail when the app is imported as a module in Docker containers or when running tests. Relative imports work in all contexts.

**Import order (within each group):**
1. Standard library
2. Third-party packages  
3. Relative imports (using `..` prefix)

### Type Hints
**Required for:**
- All function parameters
- All function return types
- Class attributes (using `Mapped[]` for SQLAlchemy)

```python
# Good
def create_transaction(
    db: Session,
    transaction_data: TransactionCreate,
) -> Transaction:
    """Create new transaction."""
    pass

# Bad (no type hints)
def create_transaction(db, transaction_data):
    pass
```

### Docstrings
**Format:** Google style

```python
def calculate_progress(
    db: Session,
    goal_id: int,
) -> GoalProgress:
    """Calculate goal progress with projections.

    Args:
        db: Database session
        goal_id: Goal ID to calculate progress for

    Returns:
        GoalProgress with status, projections, needed_per_month

    Raises:
        HTTPException: If goal not found
    """
    pass
```

### Error Handling

```python
# Use HTTPException for API errors
from fastapi import HTTPException, status

# Not found
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail=f"Transaction {id} not found",
)

# Validation error
raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Invalid date format",
)

# Database errors (catch in routes)
try:
    result = service_function(db, data)
except SQLAlchemyError as e:
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Database error",
    )
```

### Database Queries

```python
# Use ORM queries (not raw SQL)
# Good
transactions = db.query(Transaction)\
    .filter(Transaction.date >= start_date)\
    .filter(Transaction.is_transfer == False)\
    .order_by(Transaction.date.desc())\
    .all()

# Bad (raw SQL)
transactions = db.execute("SELECT * FROM transactions WHERE...")

# Use relationship loading when needed
from sqlalchemy.orm import joinedload

# Eager loading
transaction = db.query(Transaction)\
    .options(joinedload(Transaction.category))\
    .first()
```

### Testing

```python
# Test file naming: test_<module>.py
# test_transaction_service.py

# Test function naming: test_<function>_<scenario>
def test_create_transaction_success():
    """Test creating transaction with valid data."""
    pass

def test_create_transaction_duplicate_hash():
    """Test creating transaction with duplicate hash raises error."""
    pass

# Use fixtures for setup
@pytest.fixture
def sample_transaction():
    return Transaction(
        date=date.today(),
        amount=1000,
        # ...
    )

# Use parametrize for multiple cases
@pytest.mark.parametrize("amount,expected", [
    (1000, "¥1,000"),
    (-500, "-¥500"),
])
def test_format_currency(amount, expected):
    assert format_currency(amount) == expected
```

---

## TypeScript Standards

### Strict Mode
**Required:** TypeScript strict mode enabled

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### No `any` Type
**Forbidden:** Using `any` type (use `unknown` or specific types)

```typescript
// Good
function processData(data: Transaction[]): void {}
function handleError(error: unknown): void {}

// Bad
function processData(data: any): void {}
```

### Type Definitions

```typescript
// Define types in src/types/index.ts
export interface Transaction {
  id: number;
  date: string;
  amount: number;
  category: string;
  // ...
}

// Use types for props
interface TransactionListProps {
  transactions: Transaction[];
  onSelect?: (id: number) => void;
}

// Use types for function returns
function calculateTotal(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}
```

### React Components

```typescript
// Functional components only (no class components)
// Use explicit return type for clarity

// Good
function TransactionList({ transactions }: TransactionListProps): JSX.Element {
  return (
    <div>
      {transactions.map(tx => (
        <TransactionItem key={tx.id} transaction={tx} />
      ))}
    </div>
  );
}

// Use React.memo for expensive components
export const TransactionList = React.memo(function TransactionList({
  transactions,
}: TransactionListProps): JSX.Element {
  // ...
});
```

### Hooks Usage

```typescript
// Custom hooks: use<Name> prefix
function useTransactions(filters: TransactionFilters) {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const result = await getTransactions(filters);
      setData(result);
      setLoading(false);
    }
    fetchData();
  }, [filters]);

  return { data, loading };
}

// Dependencies always specified
useEffect(() => {
  // effect
}, [dependency1, dependency2]);
```

### API Services

```typescript
// Centralize API calls in services/
// Use axios instance with base URL

// services/transaction-service.ts
import { apiClient } from './api-client';
import type { Transaction, TransactionFilters } from '../types';

export async function getTransactions(
  filters?: TransactionFilters,
): Promise<Transaction[]> {
  const response = await apiClient.get('/api/transactions', {
    params: filters,
  });
  return response.data;
}

// Error handling
try {
  const transactions = await getTransactions(filters);
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.error('API error:', error.response?.data);
  }
}
```

---

## Error Handling Patterns

### Backend

```python
# Route level (catch broad errors)
@router.get("/transactions/{id}")
async def get_transaction(id: int, db: Session = Depends(get_db)):
    try:
        return TransactionService.get_transaction(db, id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal error")

# Service level (raise specific errors)
@staticmethod
def get_transaction(db: Session, transaction_id: int) -> Transaction:
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise ValueError(f"Transaction {transaction_id} not found")
    return transaction
```

### Frontend

```typescript
// Component level
function TransactionList() {
  const [error, setError] = useState<string | null>(null);

  async function loadTransactions() {
    try {
      const data = await getTransactions();
      setTransactions(data);
      setError(null);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || 'Failed to load transactions');
      } else {
        setError('Unexpected error occurred');
      }
    }
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  // ...
}
```

---

## Testing Requirements

### Backend Testing
**Framework:** pytest
**Coverage Target:** 95%+

**Required Tests:**
- All service functions
- All route endpoints
- All utility functions
- Model constraints
- Edge cases

```python
# Test structure
def test_function_name_scenario():
    # Arrange
    data = setup_test_data()

    # Act
    result = function_under_test(data)

    # Assert
    assert result == expected
```

### Frontend Testing (Future)
**Framework:** Vitest + React Testing Library
**Coverage Target:** 80%+

**Priority Tests:**
- Complex calculations (utils/)
- API services
- Critical user flows

---

## Code Review Checklist

### Before Committing
- [ ] All tests passing
- [ ] No linting errors
- [ ] Type hints/types complete
- [ ] Docstrings/comments added
- [ ] No console.log() left in code
- [ ] Error handling implemented
- [ ] Edge cases covered

### Backend
- [ ] Type hints on all functions
- [ ] Docstrings (Google style)
- [ ] PEP 8 compliant (max 100 chars)
- [ ] No raw SQL (use ORM)
- [ ] HTTPException for errors
- [ ] Tests for new functions

### Frontend
- [ ] TypeScript strict mode (no `any`)
- [ ] Props typed with interfaces
- [ ] React.memo for expensive components
- [ ] useEffect dependencies specified
- [ ] API calls in services/ not components
- [ ] Error handling in place

---

## Git Commit Standards

### Commit Message Format
```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `test`: Adding tests
- `docs`: Documentation
- `style`: Formatting, missing semicolons
- `chore`: Maintenance

**Examples:**
```
feat: add goal progress calculation

Implement linear projection algorithm for goal tracking.
Includes status determination (ahead/on_track/behind).

Closes #15

---

fix: handle Shift-JIS encoding in CSV parser

Auto-detect encoding using chardet library.
Fixes import errors for Japanese CSV files.

Fixes #23
```

---

## Performance Guidelines

### Database
- Index all foreign keys
- Index frequently filtered columns (date, category, month_key)
- Use composite indexes for common filter combinations
- Avoid N+1 queries (use eager loading)
- Paginate large result sets

### Frontend
- Lazy load routes
- Memoize expensive calculations
- Debounce user input
- Virtualize long lists
- Optimize images

### API
- Return only needed fields
- Use pagination (skip/limit)
- Cache static data
- Compress responses (gzip)

---

## Security Best Practices

### Backend
- Validate all inputs (Pydantic schemas)
- Use parameterized queries (ORM prevents SQL injection)
- Sanitize file uploads
- Rate limit endpoints (future)
- HTTPS only in production

### Frontend
- Sanitize user input
- No sensitive data in localStorage
- CSRF protection (FastAPI default)
- Content Security Policy (future)

---

## Documentation Standards

### Code Comments
```python
# Use comments for "why", not "what"

# Good (explains rationale)
# Use BIGINT for JPY to avoid float precision issues
amount: Mapped[int] = mapped_column(BigInteger, nullable=False)

# Bad (states obvious)
# Create transaction
def create_transaction():
```

### README Files
- Quick start guide
- Installation steps
- Example usage
- API documentation links

### Inline Documentation
- Docstrings for all public functions
- Type hints for clarity
- Examples for complex functions

---

## Dependency Management

### Backend
```toml
# pyproject.toml
[project]
dependencies = [
    "fastapi>=0.104.0",
    "sqlalchemy>=2.0.0",
    # Pin major versions, allow minor updates
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "black>=23.0.0",
    "ruff>=0.1.0",
]
```

### Frontend
```json
// package.json
{
  "dependencies": {
    "react": "^18.2.0",  // Allow minor updates
    "typescript": "~5.0.0"  // Lock minor version
  }
}
```

### Update Policy
- Review dependencies monthly
- Test before updating major versions
- Document breaking changes
- Keep security patches current

---

## Folder-Specific Guidelines

### backend/app/models/
- One model per file
- Constraints defined in `__table_args__`
- Indexes on frequently queried columns
- Type hints using `Mapped[]`

### backend/app/services/
- Business logic only (no HTTP logic)
- Return domain objects (not Response)
- Raise ValueError for business errors
- Static methods when no state needed

### backend/app/routes/
- Thin controllers (delegate to services)
- Input validation (Pydantic)
- Error handling (try/except)
- Response models defined

### frontend/src/components/
- One component per file
- Props interface above component
- Export at bottom
- Styles via Tailwind classes

### frontend/src/services/
- API calls only (no business logic)
- Return Promise<T>
- Handle axios errors
- Export individual functions

---

## Common Patterns

### Backend Service Pattern
```python
class TransactionService:
    @staticmethod
    def create_transaction(
        db: Session,
        transaction_data: TransactionCreate,
    ) -> Transaction:
        """Create transaction with duplicate detection."""
        # Generate hash
        tx_hash = generate_tx_hash(...)

        # Check duplicate
        existing = db.query(Transaction)\
            .filter(Transaction.tx_hash == tx_hash)\
            .first()
        if existing:
            raise ValueError("Duplicate transaction")

        # Create
        transaction = Transaction(**transaction_data.dict(), tx_hash=tx_hash)
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction
```

### Frontend Service Pattern
```typescript
export async function getTransactions(
  filters?: TransactionFilters,
): Promise<Transaction[]> {
  const response = await apiClient.get<Transaction[]>('/api/transactions', {
    params: filters,
  });
  return response.data;
}
```

### Frontend Component Pattern
```typescript
interface TransactionListProps {
  transactions: Transaction[];
  onSelect?: (id: number) => void;
}

export function TransactionList({
  transactions,
  onSelect,
}: TransactionListProps): JSX.Element {
  return (
    <div className="space-y-2">
      {transactions.map(tx => (
        <TransactionItem
          key={tx.id}
          transaction={tx}
          onClick={() => onSelect?.(tx.id)}
        />
      ))}
    </div>
  );
}
```

---

**END OF CODE STANDARDS**

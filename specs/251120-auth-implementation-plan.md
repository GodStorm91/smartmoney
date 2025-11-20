# SmartMoney Authentication Implementation Plan

**Date:** 2025-11-20
**Status:** Draft
**Estimated Total Effort:** 16-20 hours

---

## Overview

MVP authentication system for SmartMoney using JWT (access + refresh tokens), email/password registration, and user data isolation across all existing entities.

---

## 1. Database Schema Changes

### 1.1 New User Model

```python
# backend/app/models/user.py
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="user")
    accounts: Mapped[list["Account"]] = relationship(back_populates="user")
    goals: Mapped[list["Goal"]] = relationship(back_populates="user")
    settings: Mapped["AppSettings"] = relationship(back_populates="user", uselist=False)
```

### 1.2 Tables Requiring user_id Column

| Table | Migration Action | FK Constraint |
|-------|-----------------|---------------|
| transactions | Add `user_id` column | REQUIRED, ON DELETE CASCADE |
| accounts | Add `user_id` column | REQUIRED, ON DELETE CASCADE |
| goals | Add `user_id` column | REQUIRED, ON DELETE CASCADE |
| app_settings | Add `user_id` column | REQUIRED, ON DELETE CASCADE, UNIQUE |
| tags | Add `user_id` column | REQUIRED, ON DELETE CASCADE |
| exchange_rates | Keep global (no user_id) | N/A |

### 1.3 Alembic Migration Strategy

**Phase 1: Add columns as nullable**
```python
# Migration 1: Add user_id columns (nullable initially)
op.add_column('transactions', sa.Column('user_id', sa.Integer(), nullable=True))
op.add_column('accounts', sa.Column('user_id', sa.Integer(), nullable=True))
op.add_column('goals', sa.Column('user_id', sa.Integer(), nullable=True))
op.add_column('app_settings', sa.Column('user_id', sa.Integer(), nullable=True))
op.add_column('tags', sa.Column('user_id', sa.Integer(), nullable=True))
```

**Phase 2: Data migration script**
- Create default user for existing data
- Assign all existing records to default user
- Update nullability constraints

**Phase 3: Add FK constraints and indexes**
```python
op.create_foreign_key('fk_transactions_user', 'transactions', 'users', ['user_id'], ['id'], ondelete='CASCADE')
op.create_index('ix_transactions_user_id', 'transactions', ['user_id'])
```

---

## 2. Backend Implementation

### 2.1 Dependencies to Add

```toml
# pyproject.toml
dependencies = [
    # ... existing
    "python-jose[cryptography]>=3.3.0",  # JWT handling
    "passlib[bcrypt]>=1.7.4",            # Password hashing
]
```

### 2.2 Config Updates

```python
# backend/app/config.py
class Settings(BaseSettings):
    # ... existing

    # JWT Configuration
    secret_key: str = "change-me-in-production"  # Use env var
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
```

### 2.3 New Files Structure

```
backend/app/
├── auth/
│   ├── __init__.py
│   ├── dependencies.py    # get_current_user dependency
│   ├── utils.py           # hash_password, verify_password, create_token
│   └── schemas.py         # Token, TokenData, UserCreate, UserLogin
├── models/
│   └── user.py            # User model
├── routes/
│   └── auth.py            # /api/auth/* endpoints
└── services/
    └── user_service.py    # User CRUD operations
```

### 2.4 Auth Utilities

```python
# backend/app/auth/utils.py
from passlib.context import CryptContext
from jose import JWTError, jwt

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    # JWT creation logic

def create_refresh_token(data: dict) -> str:
    # Longer-lived refresh token
```

### 2.5 Auth Dependencies

```python
# backend/app/auth/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = UserService.get_by_id(db, user_id)
    if user is None or not user.is_active:
        raise credentials_exception
    return user
```

### 2.6 API Endpoints

```python
# backend/app/routes/auth.py
router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register new user."""
    # Check email uniqueness
    # Hash password
    # Create user
    # Return tokens

@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get tokens."""
    # Verify credentials
    # Return access + refresh tokens

@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_token: str, db: Session = Depends(get_db)):
    """Refresh access token."""
    # Validate refresh token
    # Return new access token

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return current_user

@router.post("/logout")
async def logout():
    """Logout (client-side token removal)."""
    return {"message": "Logged out"}
```

### 2.7 Protect Existing Routes

Update ALL existing route files to require authentication:

```python
# backend/app/routes/transactions.py
from ..auth.dependencies import get_current_user

@router.get("/", response_model=TransactionListResponse)
async def get_transactions(
    # ... existing params
    current_user: User = Depends(get_current_user),  # ADD THIS
    db: Session = Depends(get_db),
):
    # Filter by user_id
    transactions = TransactionService.get_transactions(
        db=db,
        user_id=current_user.id,  # ADD THIS
        # ... other params
    )
```

**Routes to update:**
- `/api/transactions/*`
- `/api/accounts/*`
- `/api/goals/*`
- `/api/analytics/*`
- `/api/dashboard/*`
- `/api/settings/*`
- `/api/upload/*`
- `/api/tags/*`

**Routes to keep public:**
- `/` (health check)
- `/api/health`
- `/api/auth/*`
- `/api/exchange-rates/*` (optional)

### 2.8 Service Layer Updates

Each service needs `user_id` parameter in queries:

```python
# backend/app/services/transaction_service.py
@staticmethod
def get_transactions(db: Session, user_id: int, **filters):
    query = db.query(Transaction).filter(Transaction.user_id == user_id)
    # ... existing logic
```

---

## 3. Frontend Implementation

### 3.1 New Files Structure

```
frontend/src/
├── auth/
│   ├── AuthContext.tsx       # Auth state + provider
│   ├── useAuth.ts            # Auth hook
│   └── ProtectedRoute.tsx    # Route guard component
├── pages/
│   ├── Login.tsx             # Login page
│   └── Register.tsx          # Registration page
├── routes/
│   ├── login.tsx             # TanStack route
│   └── register.tsx          # TanStack route
└── services/
    └── auth-service.ts       # Auth API calls
```

### 3.2 Auth Service

```typescript
// frontend/src/services/auth-service.ts
import apiClient from './api-client'

interface LoginRequest {
  username: string  // email
  password: string
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

interface User {
  id: number
  email: string
  is_active: boolean
}

export const authService = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const formData = new URLSearchParams()
    formData.append('username', data.username)
    formData.append('password', data.password)

    const response = await apiClient.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    return response.data
  },

  register: async (email: string, password: string): Promise<User> => {
    const response = await apiClient.post('/api/auth/register', { email, password })
    return response.data
  },

  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await apiClient.post('/api/auth/refresh', { refresh_token: refreshToken })
    return response.data
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get('/api/auth/me')
    return response.data
  }
}
```

### 3.3 Auth Context

```typescript
// frontend/src/auth/AuthContext.tsx
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount: check localStorage for token, validate with /me
  // Auto-refresh token before expiry
  // Token storage in localStorage (simple MVP approach)
}
```

### 3.4 API Client Token Injection

```typescript
// frontend/src/services/api-client.ts (UPDATE)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Add 401 interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh or redirect to login
    }
    return Promise.reject(error)
  }
)
```

### 3.5 Protected Routes

```typescript
// frontend/src/auth/ProtectedRoute.tsx
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  if (isLoading) return <LoadingSpinner />
  if (!isAuthenticated) {
    navigate({ to: '/login' })
    return null
  }
  return <>{children}</>
}
```

### 3.6 Route Updates

```typescript
// frontend/src/routes/__root.tsx (UPDATE)
export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <Layout>
        <Outlet />
      </Layout>
    </AuthProvider>
  ),
})

// All existing routes wrap with ProtectedRoute
// frontend/src/routes/index.tsx (UPDATE)
export const Route = createFileRoute('/')({
  component: () => (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  ),
})
```

### 3.7 Login/Register Pages

Simple forms using existing UI components (Card, Input, Button):
- Email field with validation
- Password field (min 8 chars)
- Error display
- Loading states
- i18n translations

---

## 4. Implementation Steps

### Phase 1: Backend Auth Foundation (4-5 hours)

| Step | Task | Est. |
|------|------|------|
| 1.1 | Add dependencies (jose, passlib) | 15m |
| 1.2 | Create User model + schemas | 30m |
| 1.3 | Create auth utilities (hash, JWT) | 45m |
| 1.4 | Implement auth routes (register, login, refresh, me) | 1h |
| 1.5 | Create get_current_user dependency | 30m |
| 1.6 | Write auth tests (unit + integration) | 1.5h |

### Phase 2: Database Migration (3-4 hours)

| Step | Task | Est. |
|------|------|------|
| 2.1 | Create migration: add user_id columns (nullable) | 30m |
| 2.2 | Create migration: add users table | 30m |
| 2.3 | Write data migration script (assign existing data to default user) | 1h |
| 2.4 | Create migration: add FK constraints, make non-nullable | 30m |
| 2.5 | Update all models with user relationships | 30m |
| 2.6 | Test migrations on copy of prod DB | 30m |

### Phase 3: Protect Backend Routes (3-4 hours)

| Step | Task | Est. |
|------|------|------|
| 3.1 | Update all services to filter by user_id | 1.5h |
| 3.2 | Add get_current_user to all protected routes | 1h |
| 3.3 | Update existing tests with auth fixtures | 1h |
| 3.4 | Test all endpoints with authenticated requests | 30m |

### Phase 4: Frontend Auth (4-5 hours)

| Step | Task | Est. |
|------|------|------|
| 4.1 | Create auth-service.ts | 30m |
| 4.2 | Create AuthContext + useAuth hook | 1h |
| 4.3 | Update api-client with token interceptors | 30m |
| 4.4 | Create ProtectedRoute component | 30m |
| 4.5 | Create Login page + route | 1h |
| 4.6 | Create Register page + route | 45m |
| 4.7 | Update __root.tsx with AuthProvider | 15m |
| 4.8 | Wrap all existing routes with ProtectedRoute | 30m |
| 4.9 | Add i18n translations for auth | 30m |

### Phase 5: Testing & Polish (2 hours)

| Step | Task | Est. |
|------|------|------|
| 5.1 | E2E testing (login flow, protected routes) | 1h |
| 5.2 | Error handling improvements | 30m |
| 5.3 | Loading states polish | 30m |

---

## 5. Technical Decisions

### Token Storage
**Decision:** localStorage
**Rationale:** Simpler for MVP. httpOnly cookies better for security but add complexity with CORS.

### Password Requirements
- Minimum 8 characters
- No complexity requirements (MVP)

### Refresh Token Strategy
- Stored in localStorage alongside access token
- Silent refresh before expiry (client-side timer)
- No server-side token blacklisting (MVP simplicity)

### Data Migration for Existing Users
1. Create default admin user during migration
2. Assign all existing data to this user
3. User can login with default credentials and change password

---

## 6. API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/login | No | Get tokens |
| POST | /api/auth/refresh | No | Refresh access token |
| GET | /api/auth/me | Yes | Get current user |
| POST | /api/auth/logout | Yes | Logout (optional) |

---

## 7. Security Considerations (MVP)

- [ ] Use bcrypt for password hashing (12 rounds)
- [ ] JWT signed with HS256 (symmetric key from env var)
- [ ] Access token: 30 min expiry
- [ ] Refresh token: 7 days expiry
- [ ] HTTPS in production (handled by reverse proxy)
- [ ] Rate limiting on auth endpoints (future enhancement)

---

## 8. Future Enhancements (Not in MVP)

- OAuth providers (Google, GitHub)
- Email verification
- Password reset flow
- Two-factor authentication
- Session management (multiple devices)
- Token blacklisting/revocation
- Audit logging

---

## 9. Files to Create/Modify

### New Files (12)

**Backend:**
- `backend/app/models/user.py`
- `backend/app/auth/__init__.py`
- `backend/app/auth/dependencies.py`
- `backend/app/auth/utils.py`
- `backend/app/auth/schemas.py`
- `backend/app/routes/auth.py`
- `backend/app/services/user_service.py`
- `backend/alembic/versions/xxxx_add_auth.py`

**Frontend:**
- `frontend/src/auth/AuthContext.tsx`
- `frontend/src/auth/ProtectedRoute.tsx`
- `frontend/src/services/auth-service.ts`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Register.tsx`
- `frontend/src/routes/login.tsx`
- `frontend/src/routes/register.tsx`

### Modified Files (20+)

**Backend:**
- `backend/app/config.py` (add JWT settings)
- `backend/app/main.py` (include auth router)
- `backend/app/models/__init__.py` (export User)
- `backend/app/models/transaction.py` (add user_id FK)
- `backend/app/models/account.py` (add user_id FK)
- `backend/app/models/goal.py` (add user_id FK)
- `backend/app/models/settings.py` (add user_id FK)
- `backend/app/models/tag.py` (add user_id FK)
- `backend/app/routes/transactions.py` (add auth)
- `backend/app/routes/accounts.py` (add auth)
- `backend/app/routes/goals.py` (add auth)
- `backend/app/routes/dashboard.py` (add auth)
- `backend/app/routes/analytics.py` (add auth)
- `backend/app/routes/settings.py` (add auth)
- `backend/app/routes/upload.py` (add auth)
- `backend/app/routes/tags.py` (add auth)
- All corresponding services (add user_id filter)
- `backend/pyproject.toml` (add dependencies)

**Frontend:**
- `frontend/src/services/api-client.ts` (add interceptors)
- `frontend/src/routes/__root.tsx` (add AuthProvider)
- All route files (wrap with ProtectedRoute)
- `frontend/public/locales/*/translation.json` (auth translations)

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration breaks existing data | High | Backup DB before migration, test on copy first |
| Token refresh race conditions | Medium | Use mutex/lock in frontend interceptor |
| Forgetting to protect a route | Medium | Review all routes, add integration tests |
| Test suite breaks | Medium | Create auth test fixtures early |

---

## 11. Testing Checklist

### Backend
- [ ] User registration (happy path)
- [ ] User registration (duplicate email)
- [ ] Login (valid credentials)
- [ ] Login (invalid credentials)
- [ ] Token refresh (valid)
- [ ] Token refresh (expired)
- [ ] Protected route (with token)
- [ ] Protected route (without token)
- [ ] Protected route (expired token)
- [ ] User data isolation (user A can't see user B's data)

### Frontend
- [ ] Login form validation
- [ ] Register form validation
- [ ] Successful login redirect
- [ ] Token persistence across refresh
- [ ] Auto-redirect to login when token expires
- [ ] Logout clears tokens

---

## Unresolved Questions

1. **Default user credentials for migration:** What email/password for the default user that gets existing data?
2. **Token refresh UX:** Silent refresh vs redirect to login on expiry?
3. **upload_history table:** Does this table exist? Not found in current models.
4. **Settings per user:** Currently AppSettings appears to be global - confirm it should be per-user.

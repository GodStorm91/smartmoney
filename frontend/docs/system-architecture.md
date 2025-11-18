# System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│              User Browser                        │
│  ┌─────────────────────────────────────────┐   │
│  │     React SPA (SmartMoney Frontend)     │   │
│  │                                          │   │
│  │  ┌────────────┐  ┌──────────────────┐  │   │
│  │  │ i18n Layer │  │  React Router    │  │   │
│  │  │ (i18next)  │  │  (Client-side)   │  │   │
│  │  └────────────┘  └──────────────────┘  │   │
│  │                                          │   │
│  │  ┌────────────────────────────────────┐ │   │
│  │  │     Component Layer                │ │   │
│  │  │  - Pages (Dashboard, Goals, etc)   │ │   │
│  │  │  - Layout (Header, Sidebar)        │ │   │
│  │  │  - UI Components (Cards, Charts)   │ │   │
│  │  └────────────────────────────────────┘ │   │
│  │                                          │   │
│  │  ┌────────────────────────────────────┐ │   │
│  │  │     Data Layer (Future)            │ │   │
│  │  │  - API Client                      │ │   │
│  │  │  - State Management                │ │   │
│  │  └────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────┘   │
│                      │                          │
│                      │ HTTP                     │
│                      ▼                          │
│  ┌─────────────────────────────────────────┐   │
│  │    Static Assets (/public)              │   │
│  │  - Translation files (/locales)         │   │
│  │  - Images, fonts                        │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Frontend i18n Architecture

### Core Components

#### 1. i18next Configuration
**File**: `src/i18n/config.ts`

```typescript
i18n
  .use(HttpBackend)           // Plugin: Load translations via HTTP
  .use(LanguageDetector)      // Plugin: Auto-detect user language
  .use(initReactI18next)      // Plugin: React integration
  .init({
    fallbackLng: 'ja',
    supportedLngs: ['ja', 'en', 'vi'],
    defaultNS: 'common',
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  })
```

**Plugin Chain:**
1. **HttpBackend**: Fetches JSON files from `/public/locales`
2. **LanguageDetector**: Detects language from localStorage or browser
3. **initReactI18next**: Provides React hooks (`useTranslation`)

#### 2. Translation Loading Strategy

**HTTP Backend Configuration:**
- **Load Path**: `/locales/{{lng}}/{{ns}}.json`
- **Example**: User selects `en` → Fetches `/locales/en/common.json`
- **Lazy Loading**: Translations loaded on-demand, not bundled
- **Caching**: Browser caches JSON files (standard HTTP caching)

**Loading Flow:**
```
App Start
  ↓
LanguageDetector runs
  ↓
Check localStorage['i18nextLng']
  ↓ (if not found)
Check navigator.language
  ↓ (if not supported)
Use fallbackLng ('ja')
  ↓
HttpBackend fetches /locales/{lang}/common.json
  ↓
i18n initialized
  ↓
Components render with translations
```

#### 3. Language Detection Order

**Priority:**
1. **localStorage** (`i18nextLng` key)
   - Set when user manually selects language
   - Persists across sessions
   - Highest priority

2. **navigator.language** (Browser language)
   - Auto-detected from browser settings
   - Fallback if no localStorage value
   - Examples: `ja-JP`, `en-US`, `vi-VN`

3. **fallbackLng** (`ja`)
   - Default if detection fails
   - Ensures app always loads

**Example Scenarios:**
```
Scenario 1: First-time user with English browser
localStorage: (empty)
navigator.language: 'en-US'
→ Result: Loads English

Scenario 2: Returning user who selected Vietnamese
localStorage: 'vi'
navigator.language: 'en-US'
→ Result: Loads Vietnamese (localStorage wins)

Scenario 3: Unsupported language (e.g., French)
localStorage: (empty)
navigator.language: 'fr-FR'
→ Result: Loads Japanese (fallback)
```

#### 4. Language Persistence Mechanism

**Write to localStorage:**
```typescript
// Triggered by LanguageSwitcher component
i18n.changeLanguage('vi')
  ↓
i18next updates internal state
  ↓
LanguageDetector writes to localStorage['i18nextLng'] = 'vi'
  ↓
All components re-render with new language
```

**Read from localStorage:**
```typescript
// On app initialization
LanguageDetector.detect()
  ↓
const cached = localStorage.getItem('i18nextLng')
  ↓
if (cached && supportedLngs.includes(cached)) {
  return cached
}
```

**Storage Format:**
- **Key**: `i18nextLng`
- **Value**: ISO 639-1 code (`ja`, `en`, `vi`)
- **No expiration**: Persists until user clears browser data

### Translation File Structure

```
public/locales/
├── ja/
│   └── common.json          # 155 keys, Japanese
├── en/
│   └── common.json          # 155 keys, English
└── vi/
    └── common.json          # 155 keys, Vietnamese
```

**Namespace Strategy:**
- **Current**: Single `common` namespace (155 keys)
- **Future**: Split by feature (`dashboard`, `transactions`, etc.)
  - Enables code splitting
  - Reduces initial load size

**Translation Key Structure:**
```json
{
  "header": { "dashboard": "...", "upload": "..." },
  "button": { "save": "...", "cancel": "..." },
  "language": { "selectLanguage": "..." },
  "aria": { "mainNavigation": "..." },
  "dashboard": {
    "kpi": { "income": "...", "expenses": "..." },
    "chart": { "trendTitle": "..." }
  },
  "transactions": {
    "table": { "date": "...", "amount": "..." },
    "filter": { "category": "..." }
  },
  // ... 10 total namespaces
}
```

### Component Integration

#### Using Translations in Components

```tsx
import { useTranslation } from 'react-i18next'

function Dashboard() {
  const { t, i18n } = useTranslation('common')

  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>Current language: {i18n.language}</p>
    </div>
  )
}
```

**Hook Return Values:**
- `t(key, options)`: Translation function
- `i18n.language`: Current language code
- `i18n.changeLanguage(lang)`: Change language programmatically

#### Language Switcher Component

**File**: `src/components/layout/LanguageSwitcher.tsx`

```tsx
const { i18n } = useTranslation('common')

const handleLanguageChange = (code: string) => {
  i18n.changeLanguage(code)  // Triggers:
                             // 1. Re-fetch translations
                             // 2. Update localStorage
                             // 3. Re-render all components
}
```

**State Management:**
- Local state: `isOpen` (dropdown open/close)
- Global state: `i18n.language` (managed by i18next)
- No Redux/Context needed for language state

### Performance Optimizations

#### 1. Lazy Loading
- Translations NOT bundled in JS
- Loaded via HTTP when needed
- Reduces initial bundle size

#### 2. Caching Strategy
- **Browser HTTP cache**: Translations cached by browser
- **localStorage cache**: Language preference cached
- **i18next memory cache**: Loaded translations kept in memory

#### 3. Code Splitting (Future)
- Split `common.json` into feature namespaces
- Load namespaces on route change
- Example: `/dashboard` loads `dashboard.json`

#### 4. Bundle Size Impact
```
i18next: ~12KB gzipped
react-i18next: ~3KB gzipped
i18next-http-backend: ~2KB gzipped
i18next-browser-languagedetector: ~3KB gzipped
Total: ~20KB (minimal overhead)
```

### Type Safety

**File**: `src/i18n/types.ts`

```typescript
export type SupportedLanguage = 'ja' | 'en' | 'vi'

// Future: Generate types from translation files
// export type TranslationKey = keyof typeof import('../public/locales/en/common.json')
```

**TypeScript Integration:**
- Typed language codes prevent typos
- IDE autocomplete for supported languages
- Future: Type-safe translation keys

### Error Handling

**Missing Translation Keys:**
```typescript
// Development: Shows key as fallback
t('nonexistent.key') // → "nonexistent.key"

// Production: Same behavior (no errors thrown)
```

**Missing Language Files:**
- Falls back to `fallbackLng` ('ja')
- Console warning in development
- Graceful degradation

**Network Errors (HTTP Backend):**
- Retry logic built into i18next-http-backend
- Falls back to cached translations if available
- Falls back to fallbackLng if no cache

### Accessibility Architecture

#### ARIA Label Translation
All interactive elements have localized ARIA labels:

```tsx
<button aria-label={t('aria.closeMenu')}>
  <CloseIcon />
</button>
```

**Coverage:**
- Navigation: `aria.mainNavigation`, `aria.mobileNavigation`
- Actions: `aria.closeMenu`, `aria.openSettings`
- Forms: `aria.selectCategory`, `aria.selectDate`

#### Language Announcement
Screen readers announce language changes via:
- `lang` attribute updates on `<html>`
- ARIA live regions for dynamic content

### Development Workflow

#### Adding New Translations

1. **Update all language files:**
```bash
# Edit simultaneously
public/locales/ja/common.json
public/locales/en/common.json
public/locales/vi/common.json
```

2. **Use in component:**
```tsx
{t('newSection.newKey')}
```

3. **Hot reload** in development (Vite HMR)

#### Translation Key Naming Convention
```
{section}.{subsection}.{element}

Examples:
dashboard.kpi.income
transactions.table.date
button.save
aria.mainNavigation
```

### Security Considerations

#### XSS Prevention
- `interpolation.escapeValue: false` (React already escapes)
- All user input sanitized before interpolation
- No `dangerouslySetInnerHTML` with translations

#### Content Security Policy (CSP)
- Translation files served from same origin
- No inline scripts
- No `eval()` usage

### Monitoring & Analytics (Future)

**Potential Integrations:**
- Track language usage distribution
- Monitor translation loading performance
- A/B test multilingual content
- Track language switch events

### Future Enhancements

1. **Namespace Code Splitting**
   - Split by feature/route
   - Load on-demand

2. **Date/Number Formatting**
   - Use `i18n.format()` for locale-aware formatting
   - Integrate with `Intl` API

3. **Pluralization**
   - i18next supports plural rules
   - Example: `{count} item` vs `{count} items`

4. **Translation Management**
   - Integrate with translation management systems (e.g., Lokalise)
   - Automated translation updates

5. **RTL Support**
   - Add Arabic/Hebrew languages
   - CSS direction switching

6. **Server-Side Rendering (SSR)**
   - Language detection on server
   - Pre-render with correct language

## Build Architecture

### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',  // Includes /locales
  build: {
    outDir: 'dist',
    // Translations copied to dist/locales
  }
})
```

### Build Output
```
dist/
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
├── locales/              # Copied from public/
│   ├── ja/common.json
│   ├── en/common.json
│   └── vi/common.json
└── index.html
```

## Development Environment

### Hot Module Replacement (HMR)
- Vite HMR for component changes
- i18next watches translation files
- Language changes trigger re-render without full reload

### Development Server
```bash
npm run dev
# Serves on http://localhost:5173
# /locales served from public/
```

## Production Environment

### Static File Serving
- Translation files served as static assets
- CDN-friendly (cacheable)
- No server-side logic needed

### Caching Headers (Recommended)
```
/locales/*.json
  Cache-Control: public, max-age=31536000, immutable
  (Cache for 1 year, bust via deployment)
```

### CDN Deployment
- Upload entire `dist/` to CDN
- `/locales` files cached at edge
- Low latency worldwide

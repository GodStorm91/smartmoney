# Codebase Summary

## Project Overview
SmartMoney frontend - React-based financial management dashboard with multilingual support (Japanese, English, Vietnamese).

## Technology Stack

### Core Framework
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing

### Internationalization (i18n)
- **i18next** (v23.16.8) - Core i18n framework
- **react-i18next** (v14.1.0) - React bindings
- **i18next-http-backend** (v2.7.3) - Translation file loading
- **i18next-browser-languagedetector** (v7.2.2) - Auto language detection

### UI Libraries
- **Recharts** - Data visualization
- **Tailwind CSS** - Styling framework
- **Lucide React** - Icon library

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx              # Main navigation with language switcher
│   │   └── LanguageSwitcher.tsx    # Language selection dropdown
│   ├── dashboard/                   # Dashboard-specific components
│   ├── budget/                      # Budget management components
│   │   ├── budget-allocation-list.tsx  # Swipe-to-edit allocation cards
│   │   └── budget-summary-card.tsx     # Budget header with save button
│   ├── goals/                       # Goals page components
│   ├── transactions/                # Transaction list components
│   ├── upload/                      # File upload components
│   └── analytics/                   # Analytics charts
├── pages/
│   ├── Dashboard.tsx
│   ├── Budget.tsx                   # Budget page with draft mode
│   ├── Transactions.tsx
│   ├── Upload.tsx
│   ├── Analytics.tsx
│   └── Goals.tsx
├── i18n/
│   ├── config.ts                    # i18next configuration
│   └── types.ts                     # TypeScript type definitions
├── utils/
│   └── cn.ts                        # Utility functions
└── main.tsx                         # App entry point

public/
└── locales/
    ├── ja/common.json               # Japanese translations (155+ keys)
    ├── en/common.json               # English translations (155+ keys)
    └── vi/common.json               # Vietnamese translations (155+ keys)
```

## Multilingual Support Architecture

### Configuration
File: `src/i18n/config.ts`

```typescript
i18n
  .use(HttpBackend)          // Load JSON from /public/locales
  .use(LanguageDetector)     // Auto-detect + localStorage persistence
  .use(initReactI18next)     // React integration
  .init({
    fallbackLng: 'ja',       // Default: Japanese
    supportedLngs: ['ja', 'en', 'vi'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json'
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  })
```

### Language Detection Order
1. **localStorage** - Persisted user preference (`i18nextLng` key)
2. **Browser language** - Fallback to navigator language
3. **Default** - Japanese (`ja`) if no match

### Translation File Structure

```
public/locales/
├── ja/common.json           # 155 keys
├── en/common.json           # 155 keys
└── vi/common.json           # 155 keys
```

**Namespaces:**
- `header` - Navigation links
- `button` - Action buttons
- `language` - Language selector
- `aria` - ARIA labels for accessibility
- `dashboard` - Dashboard KPIs, charts
- `budget` - Budget management (draft mode, swipe instructions, save button)
- `transactions` - Transaction table, filters
- `upload` - File upload UI
- `analytics` - Analytics charts
- `goals` - Goal tracking UI
- `errors` - Error messages

### Supported Languages
- **Japanese (ja)** - Default, 🇯🇵
- **English (en)** - 🇺🇸
- **Vietnamese (vi)** - 🇻🇳

### Language Switcher Component
File: `src/components/layout/LanguageSwitcher.tsx`

**Features:**
- Dropdown with flag icons + language names
- Current language highlight
- localStorage persistence via i18next
- Click-outside to close
- ARIA compliant (labels, roles, expanded states)
- Responsive: desktop shows flag+name, mobile shows flag only

**Integration:**
```tsx
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'

// In Header component
<LanguageSwitcher />
```

### Using Translations in Components

```tsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation('common')

  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.subtitle', { count: 42 })}</p>
    </div>
  )
}
```

### Adding New Translations

1. **Add key to all language files:**
   ```json
   // ja/common.json
   { "mySection": { "newKey": "新しいテキスト" } }

   // en/common.json
   { "mySection": { "newKey": "New text" } }

   // vi/common.json
   { "mySection": { "newKey": "Văn bản mới" } }
   ```

2. **Use in component:**
   ```tsx
   {t('mySection.newKey')}
   ```

3. **With interpolation:**
   ```json
   { "greeting": "Hello {{name}}!" }
   ```
   ```tsx
   {t('greeting', { name: 'Alice' })}
   ```

### TypeScript Support
File: `src/i18n/types.ts`

Defines `SupportedLanguage` type and translation namespace types for type safety.

## Key Features

### Dashboard
- KPI cards (income, expenses, savings, goals)
- Trend charts (Recharts line charts)
- Goal progress tracking
- All text localized

### Budget Management
- **Draft Mode**: Generated budgets are drafts until explicitly saved
- **Interactive Editing**: Swipe gestures (touch/mouse) to adjust allocations
  - Sensitivity: 400px drag = 100% amount change (2.5x improved)
  - Visual feedback: Scale animation, ring highlight, pulse text
  - Touch support: preventDefault() disables browser scroll interference
  - Desktop fallback: Mouse drag support for testing
- **Save Button**: Persists draft budget to database with loading state
- **Category Allocation**: Percentage-based budget per category
- **State Management**: Separate draftBudget and savedBudget tracking
- **CSS Classes**: `touch-none`, `select-none` for proper gesture handling

### Transactions
- Filterable transaction table
- Category badges
- Date formatting (locale-aware)
- Pagination

### Analytics
- Category breakdown charts
- Spending trends
- Goal achievability metrics

### Upload
- CSV file upload
- Drag-and-drop support
- File validation

### Goals
- Goal creation/editing
- Progress tracking
- Achievement status

## Development Workflow

### Running Locally
```bash
npm install
npm run dev
```

### Building for Production
```bash
npm run build
npm run preview
```

### Adding Components
- Place in appropriate subdirectory under `src/components/`
- Import translations via `useTranslation('common')`
- Use TypeScript for props and state

### Code Style
- Functional components with hooks
- TypeScript strict mode
- Tailwind for styling
- ESLint for linting

## Performance Considerations
- Lazy loading translations via HTTP backend
- localStorage caching reduces redundant loads
- Only active language namespace loaded
- React.memo for expensive components

## Accessibility
- ARIA labels in all 3 languages
- Semantic HTML
- Keyboard navigation support
- Focus management in modals/dropdowns

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2015+ features
- CSS Grid and Flexbox

## Next Steps
- Add more namespaces for code splitting
- Implement RTL support (future)
- Add date/number formatting with i18n
- Translation management workflow

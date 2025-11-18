# Deployment Guide

## Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] Build completes without warnings
- [ ] All translation keys present in all languages
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] All 3 languages tested (ja, en, vi)

### Performance
- [ ] Bundle size analyzed
- [ ] Lazy loading implemented where applicable
- [ ] Images optimized
- [ ] Translation files validated

### Security
- [ ] No API keys in frontend code
- [ ] No sensitive data in localStorage
- [ ] CSP headers configured
- [ ] HTTPS enforced

## Build Process

### Local Build
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Build Output
```
dist/
├── assets/
│   ├── index-[hash].js      # Main bundle
│   ├── index-[hash].css     # Styles
│   └── vendor-[hash].js     # Dependencies (if code-split)
├── locales/
│   ├── ja/
│   │   └── common.json      # Japanese translations
│   ├── en/
│   │   └── common.json      # English translations
│   └── vi/
│       └── common.json      # Vietnamese translations
└── index.html               # Entry point
```

### Build Verification
```bash
# Check build size
du -sh dist/

# Verify translation files copied
ls -la dist/locales/*/

# Test production build locally
npm run preview
# Visit http://localhost:4173
# Test all 3 languages
```

## i18n Deployment Configuration

### Translation Files Location
**Critical**: Translation files MUST be in `/public/locales` directory

```
public/
└── locales/
    ├── ja/common.json
    ├── en/common.json
    └── vi/common.json
```

**Build Process:**
- Vite copies `/public` contents to `/dist` during build
- Result: `/dist/locales/` contains all translation files
- i18next loads from `/locales/{{lng}}/{{ns}}.json` path

### No Build-Time Configuration Needed

**i18n works out-of-the-box:**
- No environment variables required
- No build flags needed
- Configuration is runtime-based (user browser)

**Why:**
- Language detection happens in browser (localStorage + navigator)
- Translation loading happens at runtime (HTTP backend)
- No server-side rendering (SSR) needed

### Environment Variables

**Current Setup:**
- No i18n-specific env vars needed

**Future Backend Integration:**
```bash
# .env.production
VITE_API_URL=https://api.smartmoney.com
VITE_DEFAULT_LANGUAGE=ja        # Optional override
VITE_SUPPORTED_LANGUAGES=ja,en,vi
```

## CDN Deployment

### Static File Hosting
All files in `dist/` are static and CDN-friendly.

### Recommended CDN Configuration

#### Cache Headers
```nginx
# Static assets (hashed filenames)
location /assets/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}

# Translation files
location /locales/ {
  add_header Cache-Control "public, max-age=86400, must-revalidate";
  # 24 hour cache, revalidate to check for updates
}

# HTML (never cache)
location / {
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

**Rationale:**
- **Assets**: Hashed filenames → cache forever
- **Translations**: May update → cache 24h, revalidate
- **HTML**: Entry point → never cache (always fresh)

#### CORS Configuration
```nginx
# If translations loaded from different domain
location /locales/ {
  add_header Access-Control-Allow-Origin "*";
  add_header Access-Control-Allow-Methods "GET, OPTIONS";
}
```

### CDN Providers

#### Cloudflare Pages
```bash
# Build settings
Build command: npm run build
Build output directory: dist
```

**Auto-configured:**
- Global CDN
- HTTPS
- Compression (Brotli, Gzip)
- Cache optimization

#### Vercel
```bash
# vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/locales/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=86400, must-revalidate"
        }
      ]
    }
  ]
}
```

#### Netlify
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[headers]]
  for = "/locales/*"
  [headers.values]
    Cache-Control = "public, max-age=86400, must-revalidate"
```

#### AWS S3 + CloudFront
```bash
# Upload to S3
aws s3 sync dist/ s3://smartmoney-frontend/

# CloudFront cache behaviors
/assets/* → Cache: 1 year
/locales/* → Cache: 24 hours
/* → Cache: 0 (HTML)
```

## Platform-Specific Deployments

### Cloudflare Pages

```bash
# Install Wrangler CLI
npm install -g wrangler

# Deploy
wrangler pages deploy dist
```

**Configuration:**
- Automatic HTTPS
- Global CDN (200+ cities)
- HTTP/3 support
- Translation files cached at edge

### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Auto-detection:**
- Detects Vite project
- Runs `npm run build`
- Serves from `dist/`

### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

**Configuration:**
- Drag-and-drop: Upload `dist/` folder
- Or connect GitHub repo for CI/CD

### Traditional Hosting (Nginx/Apache)

#### Nginx Configuration
```nginx
server {
  listen 80;
  server_name smartmoney.com;
  root /var/www/smartmoney/dist;

  # Gzip compression
  gzip on;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

  # Translation files
  location /locales/ {
    add_header Cache-Control "public, max-age=86400, must-revalidate";
    try_files $uri =404;
  }

  # Static assets
  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
  }

  # SPA fallback (client-side routing)
  location / {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    try_files $uri $uri/ /index.html;
  }
}
```

#### Apache Configuration
```apache
<VirtualHost *:80>
  ServerName smartmoney.com
  DocumentRoot /var/www/smartmoney/dist

  # Enable compression
  AddOutputFilterByType DEFLATE text/html text/plain text/css application/json application/javascript

  # Translation files cache
  <LocationMatch "^/locales/">
    Header set Cache-Control "public, max-age=86400, must-revalidate"
  </LocationMatch>

  # Static assets cache
  <LocationMatch "^/assets/">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </LocationMatch>

  # SPA fallback
  <Directory /var/www/smartmoney/dist>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
  </Directory>
</VirtualHost>
```

## Translation File Updates

### Updating Translations

**Process:**
1. Edit translation files in `/public/locales/`
2. Rebuild: `npm run build`
3. Deploy new `dist/` folder
4. CDN caches new files (24h TTL)

**Cache Invalidation:**
```bash
# Cloudflare
wrangler pages deployment create --purge-cache

# AWS CloudFront
aws cloudfront create-invalidation --distribution-id XXX --paths "/locales/*"

# Netlify
netlify deploy --prod --dir=dist
```

### Translation Versioning (Future)

**Hash-based filenames:**
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    // Custom plugin to hash translation files
    hashTranslationFiles()
  ]
})
```

**Benefits:**
- Cache busting on changes
- Long-term caching
- No manual invalidation needed

## Monitoring

### Performance Monitoring

**Metrics to Track:**
- Translation file load time
- Language switch latency
- Bundle size
- First Contentful Paint (FCP)
- Time to Interactive (TTI)

**Tools:**
- Google Analytics
- Vercel Analytics
- Cloudflare Web Analytics
- Lighthouse CI

### Error Monitoring

**Track:**
- Translation loading errors
- Missing translation keys
- Language detection failures

**Tools:**
- Sentry
- LogRocket
- Bugsnag

### Language Usage Analytics

**Track:**
```javascript
// Example: Google Analytics
window.gtag('event', 'language_selected', {
  language: i18n.language
})
```

**Metrics:**
- Language distribution (% ja vs en vs vi)
- Language switch frequency
- Default language accuracy

## Rollback Strategy

### Quick Rollback
```bash
# Keep previous deployment
# Vercel
vercel rollback

# Cloudflare Pages
wrangler pages deployment list
wrangler pages deployment activate <deployment-id>

# Netlify
netlify rollback
```

### Manual Rollback
1. Keep previous `dist/` folder as `dist-backup/`
2. If issues: re-deploy `dist-backup/`
3. Investigate issue in staging

## Security Considerations

### Content Security Policy (CSP)
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self';
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: https:;
               font-src 'self';">
```

**i18n Compatibility:**
- Translation files loaded from same origin (`'self'`)
- No external script loading needed
- No `eval()` usage

### HTTPS Enforcement
```nginx
# Nginx: Redirect HTTP to HTTPS
server {
  listen 80;
  server_name smartmoney.com;
  return 301 https://$server_name$request_uri;
}
```

### Subresource Integrity (SRI) - Future
Hash translation files for integrity verification.

## CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Validate translations
        run: |
          # Check all language files have same keys
          node scripts/validate-translations.js

      - name: Build
        run: npm run build

      - name: Deploy to Cloudflare Pages
        run: npx wrangler pages deploy dist
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Translation Validation Script
```javascript
// scripts/validate-translations.js
const fs = require('fs')

const languages = ['ja', 'en', 'vi']
const namespaces = ['common']

languages.forEach(lang => {
  namespaces.forEach(ns => {
    const path = `public/locales/${lang}/${ns}.json`
    if (!fs.existsSync(path)) {
      console.error(`Missing: ${path}`)
      process.exit(1)
    }
  })
})

// Compare keys across languages
const jaKeys = Object.keys(require('../public/locales/ja/common.json'))
const enKeys = Object.keys(require('../public/locales/en/common.json'))
const viKeys = Object.keys(require('../public/locales/vi/common.json'))

if (jaKeys.length !== enKeys.length || enKeys.length !== viKeys.length) {
  console.error('Translation key count mismatch!')
  process.exit(1)
}

console.log('✅ All translations valid')
```

## Troubleshooting

### Translation Files Not Loading

**Symptom**: Translations show as keys (e.g., `dashboard.title`)

**Diagnosis:**
```bash
# Check browser DevTools Network tab
# Look for requests to /locales/ja/common.json
# Check HTTP status (should be 200)
```

**Solutions:**
1. Verify `dist/locales/` exists after build
2. Check web server serves static files from root
3. Verify no CORS errors in console

### Language Not Persisting

**Symptom**: Language resets on page reload

**Diagnosis:**
```javascript
// Browser console
localStorage.getItem('i18nextLng')  // Should return 'ja', 'en', or 'vi'
```

**Solutions:**
1. Check localStorage not disabled
2. Verify no browser privacy mode
3. Check no localStorage clearing on logout

### Wrong Language Auto-Selected

**Symptom**: App loads in unexpected language

**Diagnosis:**
```javascript
// Browser console
navigator.language        // Check browser language
i18n.language            // Check i18next language
```

**Solutions:**
1. Check `supportedLngs` includes desired language
2. Verify `fallbackLng` is correct
3. Clear localStorage and test detection

## Post-Deployment Verification

### Manual Testing Checklist
- [ ] Load app in 3 browsers (Chrome, Firefox, Safari)
- [ ] Test language switching (ja → en → vi)
- [ ] Verify language persists after reload
- [ ] Test on mobile device
- [ ] Check browser console for errors
- [ ] Verify all pages load in all languages

### Automated Testing
```bash
# Run Lighthouse CI
npm install -g @lhci/cli

lhci autorun --config=lighthouserc.json
```

```javascript
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "https://smartmoney.com",
        "https://smartmoney.com/?lng=en",
        "https://smartmoney.com/?lng=vi"
      ],
      "numberOfRuns": 3
    }
  }
}
```

## Future Enhancements

### Translation Management System
- Integrate with Lokalise, Phrase, or Crowdin
- Automated translation updates
- Translation memory

### Server-Side Rendering (SSR)
- Pre-render with correct language
- SEO optimization for multilingual content

### Edge Computing
- Detect language at CDN edge
- Serve pre-rendered HTML by language

### A/B Testing
- Test different translations
- Optimize for conversion by language

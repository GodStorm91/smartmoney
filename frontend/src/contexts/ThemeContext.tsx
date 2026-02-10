import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'
export type AccentColor = 'green' | 'blue' | 'purple' | 'orange' | 'rose' | 'teal'
export type AppTier = 'pro' | 'lite'

export const ACCENT_COLORS: { id: AccentColor; label: string; preview: string }[] = [
  { id: 'green', label: 'Emerald', preview: '#4CAF50' },
  { id: 'blue', label: 'Ocean', preview: '#3B82F6' },
  { id: 'purple', label: 'Royal', preview: '#8B5CF6' },
  { id: 'orange', label: 'Sunset', preview: '#F97316' },
  { id: 'rose', label: 'Rose', preview: '#F43F5E' },
  { id: 'teal', label: 'Teal', preview: '#14B8A6' },
]

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  accentColor: AccentColor
  tier: AppTier
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setAccentColor: (color: AccentColor) => void
  setTier: (tier: AppTier) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'smartmoney-theme'
const ACCENT_STORAGE_KEY = 'smartmoney-accent'
const TIER_STORAGE_KEY = 'smartmoney-tier'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

function getStoredTheme(): Theme {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  }
  return 'system'
}

function getStoredAccent(): AccentColor {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY)
    if (ACCENT_COLORS.some(c => c.id === stored)) return stored as AccentColor
  }
  return 'green'
}

function getStoredTier(): AppTier {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(TIER_STORAGE_KEY)
    if (stored === 'pro' || stored === 'lite') return stored
  }
  return 'pro'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme())
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const stored = getStoredTheme()
    return stored === 'system' ? getSystemTheme() : stored
  })
  const [accentColor, setAccentColorState] = useState<AccentColor>(() => getStoredAccent())
  const [tier, setTierState] = useState<AppTier>(() => getStoredTier())

  // Update resolved theme when theme or system preference changes
  useEffect(() => {
    const updateResolvedTheme = () => {
      const resolved = theme === 'system' ? getSystemTheme() : theme
      setResolvedTheme(resolved)

      // Apply to document
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add(resolved)
    }

    updateResolvedTheme()

    // Listen for system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => updateResolvedTheme()
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  // Apply accent color to document root
  useEffect(() => {
    const root = document.documentElement
    if (accentColor === 'green') {
      root.removeAttribute('data-accent')
    } else {
      root.setAttribute('data-accent', accentColor)
    }
  }, [accentColor])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
  }

  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color)
    localStorage.setItem(ACCENT_STORAGE_KEY, color)
  }

  const setTier = (newTier: AppTier) => {
    setTierState(newTier)
    localStorage.setItem(TIER_STORAGE_KEY, newTier)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, accentColor, tier, setTheme, toggleTheme, setAccentColor, setTier }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'
export type AccentColor = 'green' | 'blue' | 'purple' | 'orange' | 'rose' | 'teal'
export type AppTier = 'pro' | 'lite'
export type ColorTheme = 'default' | 'catppuccin-latte' | 'catppuccin-frappe' | 'catppuccin-macchiato' | 'catppuccin-mocha' | 'dracula' | 'dracula-light'

export const ACCENT_COLORS: { id: AccentColor; label: string; preview: string }[] = [
  { id: 'green', label: 'Emerald', preview: '#4CAF50' },
  { id: 'blue', label: 'Ocean', preview: '#3B82F6' },
  { id: 'purple', label: 'Royal', preview: '#8B5CF6' },
  { id: 'orange', label: 'Sunset', preview: '#F97316' },
  { id: 'rose', label: 'Rose', preview: '#F43F5E' },
  { id: 'teal', label: 'Teal', preview: '#14B8A6' },
]

/** Theme metadata for the theme selector UI */
export const COLOR_THEMES: { id: ColorTheme; mode: 'light' | 'dark'; preview: { base: string; surface: string; text: string; primary: string } }[] = [
  { id: 'default', mode: 'light', preview: { base: '#f9fafb', surface: '#ffffff', text: '#111827', primary: '#4CAF50' } },
  { id: 'catppuccin-latte', mode: 'light', preview: { base: '#eff1f5', surface: '#ccd0da', text: '#4c4f69', primary: '#7c3aed' } },
  { id: 'catppuccin-frappe', mode: 'dark', preview: { base: '#303446', surface: '#414559', text: '#c6d0f5', primary: '#babbf1' } },
  { id: 'catppuccin-macchiato', mode: 'dark', preview: { base: '#24273a', surface: '#363a4f', text: '#cad3f5', primary: '#91d7e3' } },
  { id: 'catppuccin-mocha', mode: 'dark', preview: { base: '#1e1e2e', surface: '#313244', text: '#cdd6f4', primary: '#cba6f7' } },
  { id: 'dracula', mode: 'dark', preview: { base: '#282a36', surface: '#44475a', text: '#f8f8f2', primary: '#bd93f9' } },
  { id: 'dracula-light', mode: 'light', preview: { base: '#fffbeb', surface: '#dedccf', text: '#1f1f1f', primary: '#644ac9' } },
]

const VALID_COLOR_THEMES: ColorTheme[] = COLOR_THEMES.map(t => t.id)

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  accentColor: AccentColor
  colorTheme: ColorTheme
  tier: AppTier
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setAccentColor: (color: AccentColor) => void
  setColorTheme: (theme: ColorTheme) => void
  setTier: (tier: AppTier) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'smartmoney-theme'
const ACCENT_STORAGE_KEY = 'smartmoney-accent'
const COLOR_THEME_STORAGE_KEY = 'smartmoney-color-theme'
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

function getStoredColorTheme(): ColorTheme {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(COLOR_THEME_STORAGE_KEY)
    if (stored && VALID_COLOR_THEMES.includes(stored as ColorTheme)) return stored as ColorTheme
  }
  return 'default'
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
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => getStoredColorTheme())
  const [tier, setTierState] = useState<AppTier>(() => getStoredTier())

  // Update resolved theme when theme, color theme, or system preference changes
  useEffect(() => {
    const updateResolvedTheme = () => {
      const root = document.documentElement

      if (colorTheme !== 'default') {
        // When a color theme is active, force the appropriate light/dark class
        const themeInfo = COLOR_THEMES.find(t => t.id === colorTheme)
        const forced = themeInfo?.mode ?? 'dark'
        setResolvedTheme(forced)
        root.classList.remove('light', 'dark')
        root.classList.add(forced)
      } else {
        // Default: use normal light/dark/system logic
        const resolved = theme === 'system' ? getSystemTheme() : theme
        setResolvedTheme(resolved)
        root.classList.remove('light', 'dark')
        root.classList.add(resolved)
      }
    }

    updateResolvedTheme()

    // Listen for system theme changes (only relevant in default theme with system mode)
    if (colorTheme === 'default' && theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => updateResolvedTheme()
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme, colorTheme])

  // Apply color theme data-theme attribute to document root
  useEffect(() => {
    const root = document.documentElement
    if (colorTheme === 'default') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', colorTheme)
    }
  }, [colorTheme])

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

  const setColorTheme = (ct: ColorTheme) => {
    setColorThemeState(ct)
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, ct)
  }

  const setTier = (newTier: AppTier) => {
    setTierState(newTier)
    localStorage.setItem(TIER_STORAGE_KEY, newTier)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, accentColor, colorTheme, tier, setTheme, toggleTheme, setAccentColor, setColorTheme, setTier }}>
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

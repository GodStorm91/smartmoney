import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiClient } from '@/services/api-client'
import {
  ACCENT_COLORS,
  COLOR_THEMES,
  THEME_STORAGE_KEY,
  ACCENT_STORAGE_KEY,
  COLOR_THEME_STORAGE_KEY,
  TIER_STORAGE_KEY,
  getSystemTheme,
  getStoredTheme,
  getStoredAccent,
  getStoredColorTheme,
  getStoredTier,
  type Theme,
  type AccentColor,
  type AppTier,
  type ColorTheme,
} from '@/lib/theme-storage'
import { toBackendFormat, fromBackendFormat, type BackendThemeSettings } from '@/lib/theme-api-mapper'

// Re-export types and constants for backward compatibility
export type { Theme, AccentColor, AppTier, ColorTheme }
export { ACCENT_COLORS, COLOR_THEMES }

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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme())
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const stored = getStoredTheme()
    return stored === 'system' ? getSystemTheme() : stored
  })
  const [accentColor, setAccentColorState] = useState<AccentColor>(() => getStoredAccent())
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => getStoredColorTheme())
  const [tier, setTierState] = useState<AppTier>(() => getStoredTier())
  const [isLoadingFromAPI, setIsLoadingFromAPI] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check if user is authenticated by looking for access token
  useEffect(() => {
    const token = localStorage.getItem('smartmoney_access_token')
    setIsAuthenticated(!!token)
  }, [])

  // Fetch theme settings from backend on mount (authenticated users only)
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchThemeSettings = async () => {
      setIsLoadingFromAPI(true)
      try {
        const response = await apiClient.get<BackendThemeSettings>('/api/user/theme-settings')
        const { colorTheme: ct, accentColor: ac, tier: t } = fromBackendFormat(response.data)

        setColorThemeState(ct)
        setAccentColorState(ac)
        setTierState(t)

        // Update localStorage to keep in sync
        localStorage.setItem(COLOR_THEME_STORAGE_KEY, ct)
        localStorage.setItem(ACCENT_STORAGE_KEY, ac)
        localStorage.setItem(TIER_STORAGE_KEY, t)
      } catch (error) {
        console.error('Failed to fetch theme settings from backend:', error)
        // Keep using localStorage values on error
      } finally {
        setIsLoadingFromAPI(false)
      }
    }

    fetchThemeSettings()
  }, [isAuthenticated])

  // Sync theme changes to backend (debounced)
  useEffect(() => {
    if (!isAuthenticated || isLoadingFromAPI) return

    const syncToBackend = async () => {
      try {
        const backendSettings = toBackendFormat(colorTheme, accentColor, tier)
        await apiClient.put('/api/user/theme-settings', backendSettings)
      } catch (error) {
        console.error('Failed to sync theme settings to backend:', error)
      }
    }

    // Debounce API calls to avoid excessive requests
    const timeoutId = setTimeout(syncToBackend, 500)
    return () => clearTimeout(timeoutId)
  }, [colorTheme, accentColor, tier, isAuthenticated, isLoadingFromAPI])

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

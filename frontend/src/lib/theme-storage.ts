/** Local storage utilities for theme persistence */

export const THEME_STORAGE_KEY = 'smartmoney-theme'
export const ACCENT_STORAGE_KEY = 'smartmoney-accent'
export const COLOR_THEME_STORAGE_KEY = 'smartmoney-color-theme'
export const TIER_STORAGE_KEY = 'smartmoney-tier'

export type Theme = 'light' | 'dark' | 'system'
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

export const COLOR_THEMES: { id: ColorTheme; mode: 'light' | 'dark'; preview: { base: string; surface: string; text: string; primary: string } }[] = [
  { id: 'default', mode: 'light', preview: { base: '#f9fafb', surface: '#ffffff', text: '#111827', primary: '#4CAF50' } },
  { id: 'catppuccin-latte', mode: 'light', preview: { base: '#eff1f5', surface: '#ccd0da', text: '#4c4f69', primary: '#7c3aed' } },
  { id: 'catppuccin-frappe', mode: 'dark', preview: { base: '#303446', surface: '#414559', text: '#c6d0f5', primary: '#babbf1' } },
  { id: 'catppuccin-macchiato', mode: 'dark', preview: { base: '#24273a', surface: '#363a4f', text: '#cad3f5', primary: '#91d7e3' } },
  { id: 'catppuccin-mocha', mode: 'dark', preview: { base: '#1e1e2e', surface: '#313244', text: '#cdd6f4', primary: '#cba6f7' } },
  { id: 'dracula', mode: 'dark', preview: { base: '#282a36', surface: '#44475a', text: '#f8f8f2', primary: '#bd93f9' } },
  { id: 'dracula-light', mode: 'light', preview: { base: '#fffbeb', surface: '#dedccf', text: '#1f1f1f', primary: '#644ac9' } },
]

export const VALID_COLOR_THEMES: ColorTheme[] = COLOR_THEMES.map(t => t.id)

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export function getStoredTheme(): Theme {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  }
  return 'system'
}

export function getStoredAccent(): AccentColor {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY)
    if (ACCENT_COLORS.some(c => c.id === stored)) return stored as AccentColor
  }
  return 'green'
}

export function getStoredColorTheme(): ColorTheme {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(COLOR_THEME_STORAGE_KEY)
    if (stored && VALID_COLOR_THEMES.includes(stored as ColorTheme)) return stored as ColorTheme
  }
  return 'default'
}

export function getStoredTier(): AppTier {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(TIER_STORAGE_KEY)
    if (stored === 'pro' || stored === 'lite') return stored
  }
  return 'pro'
}

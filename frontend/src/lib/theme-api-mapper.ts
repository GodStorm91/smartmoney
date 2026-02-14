/** API mapping utilities for theme settings backend sync */

import { ACCENT_COLORS, VALID_COLOR_THEMES, type AccentColor, type AppTier, type ColorTheme } from './theme-storage'

export interface BackendThemeSettings {
  theme_name: string
  accent_color: string
  font_size: string
  other_preferences: Record<string, any>
}

/** Convert frontend theme to backend API format */
export function toBackendFormat(colorTheme: ColorTheme, accentColor: AccentColor, tier: AppTier): Partial<BackendThemeSettings> {
  const accentHex = ACCENT_COLORS.find(c => c.id === accentColor)?.preview || '#4CAF50'
  return {
    theme_name: colorTheme,
    accent_color: accentHex,
    other_preferences: { tier },
  }
}

/** Convert backend API format to frontend theme */
export function fromBackendFormat(settings: BackendThemeSettings): { colorTheme: ColorTheme; accentColor: AccentColor; tier: AppTier } {
  // Map theme_name to colorTheme
  const colorTheme = VALID_COLOR_THEMES.includes(settings.theme_name as ColorTheme)
    ? (settings.theme_name as ColorTheme)
    : 'default'

  // Map hex color to accent color (find closest match)
  const accentColor = ACCENT_COLORS.find(c => c.preview.toLowerCase() === settings.accent_color.toLowerCase())?.id || 'green'

  // Get tier from other_preferences
  const tier = (settings.other_preferences?.tier === 'lite' ? 'lite' : 'pro') as AppTier

  return { colorTheme, accentColor, tier }
}

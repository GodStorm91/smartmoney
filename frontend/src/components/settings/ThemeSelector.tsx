import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { useTheme, COLOR_THEMES, type ColorTheme } from '@/contexts/ThemeContext'
import { cn } from '@/utils/cn'

const THEME_I18N_KEYS: Record<ColorTheme, string> = {
  default: 'appearance.themes.default',
  'catppuccin-latte': 'appearance.themes.catppuccinLatte',
  'catppuccin-frappe': 'appearance.themes.catppuccinFrappe',
  'catppuccin-macchiato': 'appearance.themes.catppuccinMacchiato',
  'catppuccin-mocha': 'appearance.themes.catppuccinMocha',
  dracula: 'appearance.themes.dracula',
  'dracula-light': 'appearance.themes.draculaLight',
}

const THEME_FALLBACK_NAMES: Record<ColorTheme, string> = {
  default: 'Default',
  'catppuccin-latte': 'Catppuccin Latte',
  'catppuccin-frappe': 'Catppuccin Frappe',
  'catppuccin-macchiato': 'Catppuccin Macchiato',
  'catppuccin-mocha': 'Catppuccin Mocha',
  dracula: 'Dracula',
  'dracula-light': 'Dracula Light',
}

export function ThemeSelector() {
  const { t } = useTranslation('common')
  const { colorTheme, setColorTheme } = useTheme()

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {COLOR_THEMES.map((theme) => {
        const isActive = colorTheme === theme.id
        const { base, surface, text, primary } = theme.preview

        return (
          <button
            key={theme.id}
            onClick={() => setColorTheme(theme.id)}
            className={cn(
              'relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
              isActive
                ? 'border-primary-500 ring-2 ring-primary-500/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            {/* Mini preview */}
            <div
              className="w-full aspect-[4/3] rounded-lg overflow-hidden border border-black/10"
              style={{ backgroundColor: base }}
            >
              <div className="p-2 h-full flex flex-col gap-1.5">
                {/* Title bar */}
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: primary }}
                  />
                  <div
                    className="h-1.5 rounded-full flex-1"
                    style={{ backgroundColor: text, opacity: 0.3 }}
                  />
                </div>
                {/* Content blocks */}
                <div
                  className="flex-1 rounded"
                  style={{ backgroundColor: surface }}
                >
                  <div className="p-1.5 flex flex-col gap-1">
                    <div
                      className="h-1 rounded-full w-3/4"
                      style={{ backgroundColor: text, opacity: 0.5 }}
                    />
                    <div
                      className="h-1 rounded-full w-1/2"
                      style={{ backgroundColor: text, opacity: 0.3 }}
                    />
                    <div
                      className="h-1.5 rounded-full w-2/5 mt-0.5"
                      style={{ backgroundColor: primary }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Theme name */}
            <span className={cn(
              'text-xs font-medium truncate w-full text-center',
              isActive
                ? 'text-primary-700 dark:text-primary-300'
                : 'text-gray-600 dark:text-gray-400'
            )}>
              {t(THEME_I18N_KEYS[theme.id], THEME_FALLBACK_NAMES[theme.id])}
            </span>

            {/* Selected indicator */}
            {isActive && (
              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

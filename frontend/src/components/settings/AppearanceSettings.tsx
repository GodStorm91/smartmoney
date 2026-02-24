import { useTranslation } from 'react-i18next'
import { Sun, Moon, Monitor, Crown, Zap, Globe } from 'lucide-react'
import { useTheme, ACCENT_COLORS, type AccentColor, type AppTier } from '@/contexts/ThemeContext'
import { cn } from '@/utils/cn'
import { ThemeSelector } from './ThemeSelector'

const languages = [
  { code: 'ja', nameKey: 'language.japanese', flag: '🇯🇵' },
  { code: 'en', nameKey: 'language.english', flag: '🇺🇸' },
  { code: 'vi', nameKey: 'language.vietnamese', flag: '🇻🇳' },
]

export function AppearanceSettings() {
  const { t, i18n } = useTranslation('common')
  const { theme, setTheme, accentColor, setAccentColor, colorTheme, tier, setTier } = useTheme()

  const themeModes = [
    { id: 'light' as const, icon: Sun, label: t('appearance.light', 'Light') },
    { id: 'dark' as const, icon: Moon, label: t('appearance.dark', 'Dark') },
    { id: 'system' as const, icon: Monitor, label: t('appearance.system', 'System') },
  ]

  const tierOptions: { id: AppTier; icon: typeof Crown; label: string; desc: string }[] = [
    { id: 'pro', icon: Crown, label: t('appearance.pro', 'Pro'), desc: t('appearance.proDesc', 'Full access, all items visible') },
    { id: 'lite', icon: Zap, label: t('appearance.lite', 'Lite'), desc: t('appearance.liteDesc', 'Simplified view, fewer items per page') },
  ]

  const accentLabelMap: Record<string, string> = {
    green: t('appearance.colors.emerald', 'Emerald'),
    blue: t('appearance.colors.ocean', 'Ocean'),
    purple: t('appearance.colors.royal', 'Royal'),
    orange: t('appearance.colors.sunset', 'Sunset'),
    rose: t('appearance.colors.rose', 'Rose'),
    teal: t('appearance.colors.teal', 'Teal'),
  }

  return (
    <div className="space-y-6">
      {/* Language */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary-500" />
          {t('appearance.language', 'Language')}
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {languages.map(({ code, nameKey, flag }) => (
            <button
              key={code}
              onClick={() => i18n.changeLanguage(code)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                i18n.language === code
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <span className="text-2xl">{flag}</span>
              <span className={cn(
                'text-xs font-medium',
                i18n.language === code ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400'
              )}>
                {t(nameKey)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Theme Mode */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {t('appearance.themeMode', 'Theme Mode')}
        </h4>
        {colorTheme !== 'default' ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            {t('appearance.themeControlled', 'Controlled by theme')}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {themeModes.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                  theme === id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <Icon className={cn(
                  'w-5 h-5',
                  theme === id ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                )} />
                <span className={cn(
                  'text-xs font-medium',
                  theme === id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400'
                )}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Color Theme */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {t('appearance.colorTheme', 'Color Theme')}
        </h4>
        <ThemeSelector />
      </div>

      {/* Accent Color - only shown when default theme is active */}
      {colorTheme === 'default' && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {t('appearance.accentColor', 'Accent Color')}
          </h4>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.id}
                onClick={() => setAccentColor(color.id as AccentColor)}
                className="group flex flex-col items-center gap-1.5"
                title={accentLabelMap[color.id] || color.label}
              >
                <div className={cn(
                  'w-10 h-10 rounded-full transition-all ring-offset-2 ring-offset-white dark:ring-offset-gray-900',
                  accentColor === color.id
                    ? 'ring-2 ring-gray-900 dark:ring-white scale-110'
                    : 'ring-1 ring-gray-200 dark:ring-gray-700 group-hover:scale-105'
                )}
                  style={{ backgroundColor: color.preview }}
                />
                <span className={cn(
                  'text-[10px] font-medium',
                  accentColor === color.id
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-500'
                )}>
                  {accentLabelMap[color.id] || color.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tier Selection */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {t('appearance.displayMode', 'Display Mode')}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {tierOptions.map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              onClick={() => setTier(id)}
              className={cn(
                'flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left',
                tier === id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn(
                  'w-4 h-4',
                  tier === id ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500'
                )} />
                <span className={cn(
                  'text-sm font-semibold',
                  tier === id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'
                )}>
                  {label}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'

const languages = [
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
]

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0]

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code)
    setIsOpen(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus-ring"
        aria-label={t('language.selectLanguage')}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-lg sm:text-xl" aria-hidden="true">{currentLang.flag}</span>
        <span className="text-sm font-medium hidden sm:inline text-gray-700 dark:text-gray-200">{currentLang.name}</span>
        <svg
          className={cn('w-4 h-4 transition-transform hidden sm:block', isOpen && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 animate-slide-down">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                'first:rounded-t-lg last:rounded-b-lg',
                'text-gray-700 dark:text-gray-200',
                i18n.language === lang.code && 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
              )}
              role="menuitem"
            >
              <span className="text-xl" aria-hidden="true">{lang.flag}</span>
              <span className="text-sm font-medium flex-1 text-left">{lang.name}</span>
              {i18n.language === lang.code && (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-label="Selected"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

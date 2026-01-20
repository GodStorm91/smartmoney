import { useTranslation } from 'react-i18next'

export function UploadFAQ() {
  const { t } = useTranslation('common')

  return (
    <div className="space-y-4">
      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer py-3 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
          <span className="font-medium text-gray-900 dark:text-gray-100">{t('upload.faqQuestion1')}</span>
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          {t('upload.faqAnswer1')}
        </div>
      </details>

      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer py-3 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
          <span className="font-medium text-gray-900 dark:text-gray-100">{t('upload.faqQuestion2')}</span>
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          {t('upload.faqAnswer2')}
        </div>
      </details>

      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer py-3 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
          <span className="font-medium text-gray-900 dark:text-gray-100">{t('upload.faqQuestion3')}</span>
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          {t('upload.faqAnswer3')}
        </div>
      </details>
    </div>
  )
}

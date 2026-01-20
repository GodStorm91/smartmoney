import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ShortcutsHelpModalProps {
  open: boolean
  onClose: () => void
}

interface ShortcutGroup {
  title: string
  shortcuts: { keys: string[]; description: string }[]
}

export function ShortcutsHelpModal({ open, onClose }: ShortcutsHelpModalProps) {
  const { t } = useTranslation()
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent)

  const groups: ShortcutGroup[] = [
    {
      title: t('shortcuts.general', 'General'),
      shortcuts: [
        { keys: [isMac ? '⌘' : 'Ctrl', 'K'], description: t('shortcuts.commandPalette', 'Open command palette') },
        { keys: ['Esc'], description: t('shortcuts.closeModal', 'Close modal/dialog') },
        { keys: ['?'], description: t('shortcuts.showHelp', 'Show keyboard shortcuts') },
      ],
    },
    {
      title: t('shortcuts.actions', 'Actions'),
      shortcuts: [
        { keys: [isMac ? '⌘' : 'Ctrl', 'N'], description: t('shortcuts.newTransaction', 'New transaction') },
        { keys: [isMac ? '⌘' : 'Ctrl', 'U'], description: t('shortcuts.uploadCsv', 'Upload CSV') },
        { keys: [isMac ? '⌘' : 'Ctrl', 'F'], description: t('shortcuts.focusSearch', 'Focus search') },
      ],
    },
    {
      title: t('shortcuts.navigation', 'Navigation'),
      shortcuts: [
        { keys: ['G', 'D'], description: t('shortcuts.gotoDashboard', 'Go to Dashboard') },
        { keys: ['G', 'T'], description: t('shortcuts.gotoTransactions', 'Go to Transactions') },
        { keys: ['G', 'A'], description: t('shortcuts.gotoAccounts', 'Go to Accounts') },
        { keys: ['G', 'B'], description: t('shortcuts.gotoBudget', 'Go to Budget') },
        { keys: ['G', 'N'], description: t('shortcuts.gotoAnalytics', 'Go to Analytics') },
        { keys: ['G', 'G'], description: t('shortcuts.gotoGoals', 'Go to Goals') },
        { keys: ['G', 'S'], description: t('shortcuts.gotoSettings', 'Go to Settings') },
      ],
    },
  ]

  if (!open) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[100001] flex items-center justify-center p-4"

    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('shortcuts.title', 'Keyboard Shortcuts')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-6">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-200">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex}>
                          <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-600">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-gray-400 mx-0.5">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {t('shortcuts.hint', 'Press Esc to close')}
          </p>
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}

export default ShortcutsHelpModal

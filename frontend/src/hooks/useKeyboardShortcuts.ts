import { useEffect, useCallback } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean // For Mac Command key
  shiftKey?: boolean
  callback: () => void
  description: string
  category?: string
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
}

/**
 * Hook for registering global keyboard shortcuts
 * Automatically handles both Ctrl (Windows/Linux) and Cmd (Mac)
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true } = options

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Skip if user is typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape key even in inputs
        if (event.key !== 'Escape') {
          return
        }
      }

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()

        // Handle Ctrl/Cmd modifier (support both for cross-platform)
        const modifierMatches =
          shortcut.ctrlKey || shortcut.metaKey
            ? event.ctrlKey || event.metaKey
            : !event.ctrlKey && !event.metaKey

        const shiftMatches = shortcut.shiftKey ? event.shiftKey : !event.shiftKey

        if (keyMatches && modifierMatches && shiftMatches) {
          event.preventDefault()
          shortcut.callback()
          return
        }
      }
    },
    [shortcuts, enabled]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Pre-defined shortcut keys for consistency
 */
export const SHORTCUT_KEYS = {
  ESCAPE: 'Escape',
  COMMAND_PALETTE: 'k',
  SEARCH: 'f',
  NEW_TRANSACTION: 'n',
  UPLOAD: 'u',
  HELP: '?',
} as const

/**
 * Get display string for a shortcut (e.g., "⌘K" or "Ctrl+K")
 */
export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent)
  const parts: string[] = []

  if (shortcut.ctrlKey || shortcut.metaKey) {
    parts.push(isMac ? '⌘' : 'Ctrl')
  }
  if (shortcut.shiftKey) {
    parts.push(isMac ? '⇧' : 'Shift')
  }

  // Format key display
  let keyDisplay = shortcut.key.toUpperCase()
  if (shortcut.key === 'Escape') keyDisplay = 'Esc'
  if (shortcut.key === '?') keyDisplay = '?'

  parts.push(keyDisplay)

  return isMac ? parts.join('') : parts.join('+')
}

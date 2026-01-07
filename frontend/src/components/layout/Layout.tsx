import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Header } from './Header'
import { Footer } from './Footer'
import { BottomNavigation } from './BottomNavigation'
import { ChatFAB, ChatPanel } from '@/components/chat'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { ShortcutsHelpModal } from '@/components/ui/ShortcutsHelpModal'
import { useKeyboardShortcuts, SHORTCUT_KEYS } from '@/hooks/useKeyboardShortcuts'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false)

  // Navigation shortcut state (for "G then X" shortcuts)
  const [pendingNavKey, setPendingNavKey] = useState<string | null>(null)

  // Handle navigation shortcuts (G + key)
  const handleNavigation = useCallback((key: string) => {
    const routes: Record<string, string> = {
      d: '/dashboard',
      t: '/transactions',
      a: '/accounts',
      b: '/budget',
      n: '/analytics',
      g: '/goals',
      s: '/settings',
    }
    const route = routes[key.toLowerCase()]
    if (route) {
      navigate({ to: route })
    }
    setPendingNavKey(null)
  }, [navigate])

  // Register keyboard shortcuts
  useKeyboardShortcuts([
    // Command palette
    {
      key: SHORTCUT_KEYS.COMMAND_PALETTE,
      ctrlKey: true,
      callback: () => setIsCommandPaletteOpen(true),
      description: 'Open command palette',
    },
    // Escape - close modals
    {
      key: SHORTCUT_KEYS.ESCAPE,
      callback: () => {
        if (isCommandPaletteOpen) setIsCommandPaletteOpen(false)
        else if (isShortcutsModalOpen) setIsShortcutsModalOpen(false)
        else if (isChatOpen) setIsChatOpen(false)
        setPendingNavKey(null)
      },
      description: 'Close modal',
    },
    // Help
    {
      key: SHORTCUT_KEYS.HELP,
      shiftKey: true,
      callback: () => setIsShortcutsModalOpen(true),
      description: 'Show shortcuts help',
    },
    // New transaction - navigate to transactions page
    {
      key: SHORTCUT_KEYS.NEW_TRANSACTION,
      ctrlKey: true,
      callback: () => navigate({ to: '/transactions' }),
      description: 'New transaction',
    },
    // Upload
    {
      key: SHORTCUT_KEYS.UPLOAD,
      ctrlKey: true,
      callback: () => navigate({ to: '/upload' }),
      description: 'Upload CSV',
    },
    // Focus search
    {
      key: SHORTCUT_KEYS.SEARCH,
      ctrlKey: true,
      callback: () => setIsCommandPaletteOpen(true),
      description: 'Focus search',
    },
    // Navigation prefix "G"
    {
      key: 'g',
      callback: () => setPendingNavKey('g'),
      description: 'Navigation prefix',
    },
    // Navigation targets (only work after "G")
    ...['d', 't', 'a', 'b', 'n', 'g', 's'].map(key => ({
      key,
      callback: () => {
        if (pendingNavKey === 'g') {
          handleNavigation(key)
        }
      },
      description: `Navigate to ${key}`,
    })),
  ])

  // Clear pending nav key after timeout
  useEffect(() => {
    if (pendingNavKey) {
      const timeout = setTimeout(() => setPendingNavKey(null), 1500)
      return () => clearTimeout(timeout)
    }
  }, [pendingNavKey])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <BottomNavigation />

      {/* Quick Actions FAB (mobile only) */}
      <FloatingActionButton />

      {/* AI Chat Assistant */}
      <ChatFAB onClick={() => setIsChatOpen(true)} />
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Command Palette */}
      <CommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        onShowShortcuts={() => setIsShortcutsModalOpen(true)}
      />

      {/* Shortcuts Help Modal */}
      <ShortcutsHelpModal
        open={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  )
}

import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { MessageCircle } from 'lucide-react'
import { Header } from './Header'
import { Footer } from './Footer'
import { BottomNavigation } from './BottomNavigation'
import { Sidebar } from './Sidebar'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'
import { PageTransition } from '@/components/ui/PageTransition'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { ShortcutsHelpModal } from '@/components/ui/ShortcutsHelpModal'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { useKeyboardShortcuts, SHORTCUT_KEYS } from '@/hooks/useKeyboardShortcuts'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false)
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false)

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
      r: '/analytics?tab=report',
      g: '/goals',
      s: '/settings',
    }
    const route = routes[key.toLowerCase()]
    if (route) {
      const [path, qs] = route.split('?')
      const search = qs ? Object.fromEntries(new URLSearchParams(qs)) : undefined
      navigate({ to: path, search })
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
    // Chat panel
    {
      key: 'c',
      ctrlKey: true,
      altKey: true,
      callback: () => setIsChatPanelOpen(true),
      description: 'Open AI chat',
    },
    // Escape - close modals
    {
      key: SHORTCUT_KEYS.ESCAPE,
      callback: () => {
        if (isChatPanelOpen) setIsChatPanelOpen(false)
        else if (isCommandPaletteOpen) setIsCommandPaletteOpen(false)
        else if (isShortcutsModalOpen) setIsShortcutsModalOpen(false)
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
    ...['d', 't', 'a', 'b', 'n', 'r', 'g', 's'].map(key => ({
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
      <Sidebar />
      <Header />
      <main className="flex-1 pb-24 md:pb-0 md:ml-16">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
      <BottomNavigation />

      {/* Quick Actions FAB (mobile only) */}
      <FloatingActionButton />

      {/* AI Chat Button */}
      <button
        onClick={() => setIsChatPanelOpen(true)}
        className="fixed bottom-36 right-4 md:bottom-6 md:right-6 z-50 p-4 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        title="AI Chat Assistant (Ctrl+Alt+C)"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

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

      {/* AI Chat Panel */}
      <ChatPanel
        isOpen={isChatPanelOpen}
        onClose={() => setIsChatPanelOpen(false)}
      />
    </div>
  )
}

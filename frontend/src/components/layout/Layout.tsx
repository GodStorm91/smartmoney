import { useState } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { BottomNavigation } from './BottomNavigation'
import { ChatFAB, ChatPanel } from '@/components/chat'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <BottomNavigation />

      {/* AI Chat Assistant */}
      <ChatFAB onClick={() => setIsChatOpen(true)} />
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  )
}

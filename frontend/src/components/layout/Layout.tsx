import { Header } from './Header'
import { Footer } from './Footer'
import { BottomNavigation } from './BottomNavigation'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <BottomNavigation />
    </div>
  )
}

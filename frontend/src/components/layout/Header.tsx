import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { cn } from '@/utils/cn'

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <svg
              className="w-8 h-8 text-primary-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <h1 className="text-xl font-bold text-gray-900">SmartMoney</h1>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex items-center gap-6"
            role="navigation"
            aria-label="メインナビゲーション"
          >
            <NavLink to="/">ダッシュボード</NavLink>
            <NavLink to="/upload">アップロード</NavLink>
            <NavLink to="/transactions">取引履歴</NavLink>
            <NavLink to="/analytics">分析</NavLink>
            <NavLink to="/goals">目標</NavLink>
            <NavLink to="/settings">設定</NavLink>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 focus-ring"
            aria-label={isMobileMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav
            className="md:hidden py-4 border-t border-gray-200"
            role="navigation"
            aria-label="モバイルナビゲーション"
          >
            <div className="flex flex-col gap-2">
              <MobileNavLink to="/" onClick={() => setIsMobileMenuOpen(false)}>
                ダッシュボード
              </MobileNavLink>
              <MobileNavLink to="/upload" onClick={() => setIsMobileMenuOpen(false)}>
                アップロード
              </MobileNavLink>
              <MobileNavLink to="/transactions" onClick={() => setIsMobileMenuOpen(false)}>
                取引履歴
              </MobileNavLink>
              <MobileNavLink to="/analytics" onClick={() => setIsMobileMenuOpen(false)}>
                分析
              </MobileNavLink>
              <MobileNavLink to="/goals" onClick={() => setIsMobileMenuOpen(false)}>
                目標
              </MobileNavLink>
              <MobileNavLink to="/settings" onClick={() => setIsMobileMenuOpen(false)}>
                設定
              </MobileNavLink>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}

// Desktop navigation link component
function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={cn(
        'text-gray-600 hover:text-gray-900 transition-colors pb-1',
        'focus-ring rounded'
      )}
      activeProps={{
        className: 'text-primary-600 font-medium border-b-2 border-primary-600',
      }}
    >
      {children}
    </Link>
  )
}

// Mobile navigation link component
function MobileNavLink({
  to,
  children,
  onClick,
}: {
  to: string
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100',
        'transition-colors focus-ring'
      )}
      activeProps={{
        className: 'bg-primary-50 text-primary-700 font-medium',
      }}
    >
      {children}
    </Link>
  )
}

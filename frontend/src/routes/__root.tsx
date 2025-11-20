import { createRootRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

function RootComponent() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const publicPaths = ['/login', '/register']
    if (!isLoading && !isAuthenticated && !publicPaths.includes(location.pathname)) {
      navigate({ to: '/login' })
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Auth pages don't need layout
  if (location.pathname === '/login' || location.pathname === '/register') {
    return <Outlet />
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})

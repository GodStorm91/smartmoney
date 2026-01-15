import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { SyncStatusBar } from './components/sync'
import { XPToastProvider } from '@/components/gamification/XPToast'
import { useTheme } from '@/hooks/useTheme'

// Create router instance
const router = createRouter({ routeTree })

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  // Initialize theme
  useTheme()

  return (
    <XPToastProvider>
      <SyncStatusBar />
      <RouterProvider router={router} />
    </XPToastProvider>
  )
}

export default App

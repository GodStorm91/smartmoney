import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { SyncStatusBar } from './components/sync'

// Create router instance
const router = createRouter({ routeTree })

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  return (
    <>
      <SyncStatusBar />
      <RouterProvider router={router} />
    </>
  )
}

export default App

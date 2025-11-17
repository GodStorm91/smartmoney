import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree'

// Create router instance
const router = createRouter({ routeTree })

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/': {
      parentRoute: typeof import('./routes/__root').Route
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof import('./routes/index').Route
      lazyRoute: typeof import('./routes/index').Route
    }
    '/analytics': {
      parentRoute: typeof import('./routes/__root').Route
      id: '/analytics'
      path: '/analytics'
      fullPath: '/analytics'
      preLoaderRoute: typeof import('./routes/analytics').Route
      lazyRoute: typeof import('./routes/analytics').Route
    }
    '/goals': {
      parentRoute: typeof import('./routes/__root').Route
      id: '/goals'
      path: '/goals'
      fullPath: '/goals'
      preLoaderRoute: typeof import('./routes/goals').Route
      lazyRoute: typeof import('./routes/goals').Route
    }
    '/settings': {
      parentRoute: typeof import('./routes/__root').Route
      id: '/settings'
      path: '/settings'
      fullPath: '/settings'
      preLoaderRoute: typeof import('./routes/settings').Route
      lazyRoute: typeof import('./routes/settings').Route
    }
    '/transactions': {
      parentRoute: typeof import('./routes/__root').Route
      id: '/transactions'
      path: '/transactions'
      fullPath: '/transactions'
      preLoaderRoute: typeof import('./routes/transactions').Route
      lazyRoute: typeof import('./routes/transactions').Route
    }
    '/upload': {
      parentRoute: typeof import('./routes/__root').Route
      id: '/upload'
      path: '/upload'
      fullPath: '/upload'
      preLoaderRoute: typeof import('./routes/upload').Route
      lazyRoute: typeof import('./routes/upload').Route
    }
  }
}

function App() {
  return <RouterProvider router={router} />
}

export default App

import React from 'react'
import ReactDOM from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { AuthProvider } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { PrivacyProvider } from './contexts/PrivacyContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { SyncProvider } from './contexts/SyncContext'
import { ToastProvider } from './components/ui/Toast'
import { XPToastProvider } from './components/gamification/XPToast'
import { queryClient, shouldPersistQuery } from './lib/query-client'
import { persister } from './lib/persister'
import { initializeDB } from './db'
import App from './App'
import './index.css'
import './i18n/config'

// Initialize IndexedDB on app load
initializeDB().then((success) => {
  if (!success) {
    console.warn('IndexedDB initialization failed - offline features may not work')
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24, // 24 hours
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              // Only persist successful queries that aren't auth-related
              return query.state.status === 'success' &&
                     shouldPersistQuery([...query.queryKey])
            },
          },
        }}
      >
        <XPToastProvider>
          <ToastProvider>
            <SyncProvider>
              <AuthProvider>
                <SettingsProvider>
                  <PrivacyProvider>
                    <App />
                  </PrivacyProvider>
                </SettingsProvider>
              </AuthProvider>
            </SyncProvider>
          </ToastProvider>
        </XPToastProvider>
      </PersistQueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)

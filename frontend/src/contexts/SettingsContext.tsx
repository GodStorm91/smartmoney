import { createContext, useContext, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSettings } from '@/services/settings-service'
import type { Settings } from '@/types'

interface SettingsContextType {
  settings: Settings | undefined
  isLoading: boolean
  currency: string
  baseDate: number
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  })

  const value: SettingsContextType = {
    settings,
    isLoading,
    currency: settings?.currency || 'JPY',
    baseDate: settings?.base_date || 25,
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

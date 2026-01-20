import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import axios from 'axios'
import { apiClient } from '@/services/api-client'

interface User {
  id: number
  email: string
  is_active: boolean
  created_at: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'smartmoney_access_token'
const REFRESH_TOKEN_KEY = 'smartmoney_refresh_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Define callbacks BEFORE useEffects that depend on them
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    setUser(null)
    setIsLoading(false)
  }, [])

  const refreshToken = useCallback(async (): Promise<boolean> => {
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refresh) return false

    try {
      // Use plain axios to avoid interceptor loops
      const baseURL = import.meta.env.VITE_API_URL || ''
      const response = await axios.post(`${baseURL}/api/auth/refresh`, {
        refresh_token: refresh,
      })

      const { access_token, refresh_token: newRefresh } = response.data
      localStorage.setItem(TOKEN_KEY, access_token)
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh)

      // Fetch user info with explicit auth header
      const userResponse = await apiClient.get('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
      setUser(userResponse.data)

      return true
    } catch {
      // Clear invalid tokens
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      return false
    }
  }, [])

  // Setup axios interceptors for auth
  useEffect(() => {
    // Request interceptor - add token to requests
    const requestInterceptor = apiClient.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem(TOKEN_KEY)
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor - handle 401 errors
    const responseInterceptor = apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        // Don't retry auth endpoints to avoid infinite loops
        const isAuthEndpoint = originalRequest?.url?.includes('/api/auth/')

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
          originalRequest._retry = true

          const refreshed = await refreshToken()
          if (refreshed) {
            const token = localStorage.getItem(TOKEN_KEY)
            originalRequest.headers.Authorization = `Bearer ${token}`
            return apiClient(originalRequest)
          } else {
            // Refresh failed, logout
            logout()
          }
        }

        return Promise.reject(error)
      }
    )

    return () => {
      apiClient.interceptors.request.eject(requestInterceptor)
      apiClient.interceptors.response.eject(responseInterceptor)
    }
  }, [refreshToken, logout])

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) {
        try {
          const response = await apiClient.get('/api/auth/me')
          setUser(response.data)
        } catch {
          // Token invalid, try refresh
          const refreshed = await refreshToken()
          if (!refreshed) {
            // Already cleared in refreshToken, just ensure loading stops
            setUser(null)
          }
        }
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [refreshToken])

  const login = async (email: string, password: string) => {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)

    const response = await apiClient.post('/api/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const { access_token, refresh_token } = response.data
    localStorage.setItem(TOKEN_KEY, access_token)
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token)

    // Fetch user info with explicit auth header (don't rely on interceptor timing)
    const userResponse = await apiClient.get('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })
    setUser(userResponse.data)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

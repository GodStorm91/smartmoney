import axios, { AxiosError, AxiosInstance } from 'axios'

// Create axios instance with base configuration
// In production (built), use relative URLs (nginx proxies /api to backend)
// In development, use localhost:8000 or Vite proxy
const baseURL = import.meta.env.DEV ? 'http://localhost:8000' : ''

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
  maxRedirects: 0,
})

// Fetch wrapper that bypasses service worker for API requests
async function fetchWithAuth(url: string, authHeader: string | undefined): Promise<any> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(authHeader && { Authorization: authHeader }),
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }))
    const err: any = new Error(error.detail || 'Request failed')
    err.response = {
      status: res.status,
      statusText: res.statusText,
      data: error,
    }
    throw err
  }
  return res.json()
}

// Handle 307 redirects manually to preserve Authorization header
apiClient.interceptors.response.use(
  (response) => {
    // Handle 307/301 redirects - axios doesn't preserve headers by default
    if (response.status === 307 || response.status === 301) {
      const redirectUrl = response.headers.location
      if (redirectUrl) {
        const config = response.config
        const authHeader = typeof config.headers.Authorization === 'string' ? config.headers.Authorization : undefined
        if (authHeader) {
          // Use fetch to bypass service worker and handle redirect
          return fetchWithAuth(redirectUrl, authHeader)
        }
      }
    }
    return response
  },
  (error: AxiosError) => {
    // Handle redirects on error responses too
    if (error.response?.status === 307 || error.response?.status === 301) {
      const redirectUrl = error.response.headers.location
      if (redirectUrl && error.config) {
        const authHeader = typeof error.config.headers.Authorization === 'string' ? error.config.headers.Authorization : undefined
        if (authHeader) {
          // Use fetch to bypass service worker and handle redirect
          return fetchWithAuth(redirectUrl, authHeader)
        }
      }
    }
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default apiClient

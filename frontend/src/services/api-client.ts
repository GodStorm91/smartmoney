import axios, { AxiosError, AxiosInstance } from 'axios'

// Create axios instance with base configuration
// In production (built), use relative URLs (nginx proxies /api to backend)
// In development, use localhost:8000 or Vite proxy
const baseURL = import.meta.env.DEV ? 'http://localhost:8000' : ''

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default apiClient

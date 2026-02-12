import { createContext, useContext, useState, useEffect } from 'react'
import axios from '../lib/axios'

/**
 * Authentication context.
 *
 * The backend issues a JWT in an httpOnly cookie, so the frontend:
 * - Must send requests with credentials
 * - Cannot read the token directly from JS
 * - Determines auth state by calling `/api/v1/auth/me`
 */
const AuthContext = createContext(null)

/**
 * Hook to access the current auth context.
 *
 * @returns {{
 *  user: any,
 *  loading: boolean,
 *  error: string | null,
 *  login: (email: string, password: string) => Promise<{success: boolean, error?: string}>,
 *  signup: (email: string, password: string) => Promise<{success: boolean, error?: string}>,
 *  logout: () => Promise<void>,
 *  isAuthenticated: boolean
 * }}
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Provider that owns auth state and exposes auth actions.
 *
 * - On mount, calls `checkAuth()` to restore session state
 * - Exposes `login`, `signup`, and `logout` helpers used by pages/components
 *
 * @param {{ children: import('react').ReactNode }} props
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth()
  }, [])

  /**
   * Restore session state from the server.
   *
   * If the cookie is missing/expired this will fail and we simply treat the user as logged out.
   */
  const checkAuth = async () => {
    try {
      // Try to get current user profile (will fail if not authenticated)
      const response = await axios.get('/api/v1/auth/me')
      setUser(response.data.user)
    } catch (err) {
      // User is not authenticated, that's fine
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Log in and store the user returned by the backend.
   *
   * @param {string} email
   * @param {string} password
   */
  const login = async (email, password) => {
    try {
      setError(null)
      const response = await axios.post('/api/v1/auth/login', {
        email,
        password
      })
      setUser(response.data.user)
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.error?.message || err.response?.data?.message || 'Login failed'
      setError(message)
      return { success: false, error: message }
    }
  }

  /**
   * Create a new account and store the user returned by the backend.
   *
   * @param {string} email
   * @param {string} password
   */
  const signup = async (email, password) => {
    try {
      setError(null)
      const response = await axios.post('/api/v1/auth/signup', {
        email,
        password
      })
      setUser(response.data.user)
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.error?.message || err.response?.data?.message || 'Signup failed'
      setError(message)
      return { success: false, error: message }
    }
  }

  /**
   * Log out on the server and clear local user state.
   *
   * Even if the server call fails, we clear local state so UI doesn't remain “stuck logged in”.
   */
  const logout = async () => {
    try {
      await axios.post('/api/v1/auth/logout')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
    }
  }

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

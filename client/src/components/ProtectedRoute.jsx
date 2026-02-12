import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Route guard for authenticated-only sections.
 *
 * - While auth status is being restored, we show a simple loading state.
 * - If unauthenticated, redirect to `/login`.
 * - Otherwise, render `children`.
 *
 * @param {{ children: import('react').ReactNode }} props
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute

import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

/**
 * Legacy dashboard placeholder.
 *
 * This file is currently not routed to by `App.jsx` (the app uses `SavedLocations` as the
 * authenticated landing page). It's kept around as a simple example of consuming auth state.
 */
function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-blue-600">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-800">Weather App</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Welcome to Weather App Dashboard
          </h2>
          <p className="text-gray-600">
            You are successfully logged in! This is where the weather features will be implemented.
          </p>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Coming soon:</strong> Weather forecasts, saved locations, and more!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

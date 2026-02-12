import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Main app shell for authenticated routes.
 *
 * Provides:
 * - Top navigation (desktop + mobile)
 * - App-wide background and layout container
 * - `<Outlet />` for nested routes
 *
 * Note on modal navigation:
 * - The "AI Lookup" link navigates with `backgroundLocation` so it can render as an overlay.
 */
function Layout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Desktop user dropdown
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  // Mobile hamburger menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close any open menus when navigating.
  useEffect(() => {
    setIsUserMenuOpen(false)
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-blue-600 overflow-x-hidden">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <Link to="/locations" className="flex items-center space-x-2">
              <span className="text-2xl">🌤️</span>
              <span className="text-lg font-bold text-gray-800">Weather App</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-3">
              <Link
                to="/locations"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition"
              >
                Dashboard
              </Link>
              <button
                onClick={() => navigate('/lookup', { state: { backgroundLocation: location } })}
                className="text-gray-700 hover:text-blue-600 p-2 rounded-md transition"
                aria-label="AI Lookup"
                title="AI Lookup"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
                <span className="sr-only">AI Lookup</span>
              </button>
              
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen((open) => !open)}
                  className="flex items-center text-gray-700 hover:text-blue-600 p-2 rounded-md transition"
                  aria-label="User menu"
                  title="User menu"
                >
                  <span>👤</span>
                  <span className="sr-only">User menu</span>
                </button>
                
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <div className="flex items-center">
                <button
                  onClick={() => {
                    navigate('/lookup', { state: { backgroundLocation: location } })
                    setIsMobileMenuOpen(false)
                  }}
                  className="text-gray-700 hover:text-blue-600 p-2 rounded-md transition"
                  aria-label="AI Lookup"
                  title="AI Lookup"
                >
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  </svg>
                </button>

                <button
                  onClick={() => setIsMobileMenuOpen((open) => !open)}
                  className="text-gray-700 hover:text-blue-600 p-2"
                  aria-label="Open menu"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden pb-4">
              <Link
                to="/locations"
                className="block text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <div className="border-t border-gray-200 mt-2 pt-2">
                <button
                  onClick={handleLogout}
                  className="block w-full text-left text-red-600 hover:text-red-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout

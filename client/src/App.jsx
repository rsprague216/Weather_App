import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Layout from './components/Layout'
import SavedLocations from './pages/SavedLocations'
import WeatherDetail from './pages/WeatherDetail'
import AddLocation from './pages/AddLocation'
import AILookup from './pages/AILookup'
import ProtectedRoute from './components/ProtectedRoute'

/**
 * Top-level React component.
 *
 * Responsibilities:
 * - Own the router instance
 * - Provide authentication context to the entire app
 * - Delegate route structure to `AppRoutes`
 */
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

/**
 * Defines all app routes.
 *
 * This app uses a simple “background location” pattern to support modal-style routes.
 * Example: AI Lookup can open as an overlay while preserving the underlying route.
 *
 * When navigation includes `{ state: { backgroundLocation: location } }`, we render:
 * - The background routes using `backgroundLocation`
 * - The overlay route on top using the real `location`
 */
function AppRoutes() {
  const location = useLocation()
  const backgroundLocation = location.state?.backgroundLocation

  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/locations" replace />} />
          <Route path="locations" element={<SavedLocations />} />
          <Route path="weather/:locationId" element={<WeatherDetail />} />
          <Route path="add-location" element={<AddLocation />} />
          <Route path="lookup" element={<AILookup />} />
        </Route>
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="lookup" element={<AILookup />} />
          </Route>
        </Routes>
      )}
    </>
  )
}

export default App

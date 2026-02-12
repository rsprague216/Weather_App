import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../lib/axios'
import { getPositionWithFallback } from '../lib/geolocation'
import { getWeatherIcon } from '../lib/weatherIcons'

/**
 * Saved locations landing page.
 *
 * Key behaviors:
 * - "Current Location" card is always shown first (never persisted in DB)
 * - Each card fetches a lightweight weather preview
 * - Deleting a saved location updates local state without re-fetch
 */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQueryList = window.matchMedia(query)
    const onChange = (event) => setMatches(event.matches)

    setMatches(mediaQueryList.matches)
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', onChange)
      return () => mediaQueryList.removeEventListener('change', onChange)
    }

    // Safari fallback
    mediaQueryList.addListener(onChange)
    return () => mediaQueryList.removeListener(onChange)
  }, [query])

  return matches
}

function SavedLocations() {
  const navigate = useNavigate()
  const [savedLocations, setSavedLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    fetchSavedLocations()
  }, [])

  const fetchSavedLocations = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/v1/saved-locations')
      setSavedLocations(response.data.locations || [])
      setLoading(false)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch saved locations')
      setLoading(false)
    }
  }

  const handleDeleteLocation = async (locationId, e) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to remove this location?')) return

    try {
      await axios.delete(`/api/v1/saved-locations/${locationId}`)
      // Functional update prevents stale-closure bugs if state changes between click and response.
      setSavedLocations((prev) => prev.filter((loc) => loc.id !== locationId))
    } catch (err) {
      window.alert(err.response?.data?.error?.message || 'Failed to delete location')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white text-lg">Loading locations...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Your Locations</h1>

      {isDesktop ? (
        /* Desktop: Grid */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Current Location Card (Always First) */}
          <LocationCard
            location={{ id: 'current', name: 'Current Location', isCurrent: true }}
            onClick={() => navigate('/weather/current')}
          />

          {/* Saved Locations */}
          {savedLocations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onClick={() => navigate(`/weather/${location.id}`)}
              onDelete={(e) => handleDeleteLocation(location.id, e)}
            />
          ))}

          {/* Add Location Card (Always Last) */}
          <AddLocationCard onClick={() => navigate('/add-location')} />
        </div>
      ) : (
        /* Mobile: Carousel-style */
        <div className="space-y-3">
          {/* Current Location Card (Always First) */}
          <LocationCard
            location={{ id: 'current', name: 'Current Location', isCurrent: true }}
            onClick={() => navigate('/weather/current')}
          />

          {/* Saved Locations */}
          {savedLocations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onClick={() => navigate(`/weather/${location.id}`)}
              onDelete={(e) => handleDeleteLocation(location.id, e)}
            />
          ))}

          {/* Add Location Card (Always Last) */}
          <AddLocationCard onClick={() => navigate('/add-location')} />
        </div>
      )}

      {savedLocations.length === 0 && (
        <div className="mt-8 text-center text-white">
          <p className="text-lg">No saved locations yet</p>
          <p className="text-sm opacity-80 mt-2">Click "Add Location" to get started</p>
        </div>
      )}
    </div>
  )
}

/**
 * Location card with an embedded weather preview.
 *
 * This component intentionally fetches its own preview data so the grid/list can
 * render quickly while each card loads independently.
 */
function LocationCard({ location, onClick, onDelete }) {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWeatherPreview()
  }, [location.id, location.isCurrent])

  const fetchWeatherPreview = async () => {
    try {
      setLoading(true)
      
      if (location.isCurrent) {
        // Get current location weather
        try {
          const position = await getPositionWithFallback()
          const { latitude, longitude } = position.coords
          const response = await axios.get(`/api/v1/weather?lat=${latitude}&lon=${longitude}&units=imperial`)
          setWeather(response.data)
        } catch (err) {
          console.warn('Geolocation/weather error (current location preview):', {
            code: err?.code,
            message: err?.message
          })
          setWeather(null)
        }
      } else {
        // Get saved location weather
        const response = await axios.get(`/api/v1/saved-locations/${location.id}/weather?units=imperial`)
        setWeather(response.data)
      }
    } catch (err) {
      console.error('Failed to fetch weather preview:', err)
      setWeather(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-lg p-4 cursor-pointer hover:shadow-xl transition transform hover:-translate-y-1 relative"
    >
      {/* Delete Button (only for saved locations) */}
      {!location.isCurrent && onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 text-gray-400 hover:text-red-600 transition p-1.5"
          aria-label="Delete location"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Location Name */}
      <div className="mb-2">
        <h3 className="text-xl font-bold text-gray-800">
          {location.isCurrent && '📍 '}
          {location.name}
        </h3>
        {location.region && location.country && (
          <p className="text-sm text-gray-600">{location.region}, {location.country}</p>
        )}
      </div>

      {/* Weather Preview */}
      {loading ? (
        <div className="text-gray-400 text-sm">Loading weather...</div>
      ) : weather?.current ? (
        <div>
          <div className="flex items-center justify-between mt-3">
            <div className="text-4xl font-bold text-gray-800">{Math.round(weather.current.tempF)}°</div>
            <div className="text-3xl">{getWeatherIcon(weather.current.condition)}</div>
          </div>
          <div className="text-sm text-gray-600 mt-2">{weather.current.condition}</div>
          {weather.forecast && weather.forecast[0] && (
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>H: {Math.round(weather.forecast[0].day.maxTempF)}°</span>
              <span>L: {Math.round(weather.forecast[0].day.minTempF)}°</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-400 text-sm">Weather unavailable</div>
      )}
    </div>
  )
}

/**
 * "Add location" call-to-action card.
 */
function AddLocationCard({ onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white bg-opacity-30 border-2 border-white border-dashed rounded-lg shadow-lg p-4 cursor-pointer hover:bg-opacity-40 transition flex flex-col items-center justify-center min-h-[170px] text-white"
    >
      <div className="text-4xl mb-2">➕</div>
      <div className="text-lg font-semibold">Add Location</div>
      <div className="text-sm opacity-80 mt-1">Search for a city</div>
    </div>
  )
}

export default SavedLocations

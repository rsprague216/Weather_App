import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../lib/axios'
import { getGeolocationErrorMessage, getPositionWithFallback } from '../lib/geolocation'

/**
 * Add location page.
 *
 * - Searches via backend geocoding endpoint
 * - Saves a location via `/saved-locations`
 * - Offers "Use Current Location" for convenience
 */
function AddLocation() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSearch = async (query) => {
    setSearchQuery(query)
    
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(`/api/v1/locations/search?q=${encodeURIComponent(query)}`)
      setSearchResults(response.data.locations || [])
      setLoading(false)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Search failed')
      setLoading(false)
    }
  }

  const handleSaveLocation = async (location) => {
    try {
      await axios.post('/api/v1/saved-locations', {
        locationId: location.id
      })
      // Navigate to the weather view for this location
      navigate(`/weather/${location.id}`)
    } catch (err) {
      if (err.response?.status === 409) {
        // Location already saved
        alert('This location is already saved')
        navigate(`/weather/${location.id}`)
      } else {
        alert(err.response?.data?.error?.message || 'Failed to save location')
      }
    }
  }

  const handleUseCurrentLocation = async () => {
    try {
      // We intentionally attempt to fetch coords here so we can surface a helpful
      // permissions/settings message before taking the user to the weather page.
      await getPositionWithFallback()
      navigate('/weather/current')
    } catch (err) {
      window.alert(getGeolocationErrorMessage(err))
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Mobile: Full Page Layout */}
      <div className="md:hidden">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-white hover:text-gray-200 transition mr-4"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-white">Add Location</h1>
        </div>
      </div>

      {/* Desktop: Modal-style Layout */}
      <div className="hidden md:block">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-white">Add Location</h1>
          <button
            onClick={() => navigate(-1)}
            className="text-white hover:text-gray-200 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search for a city..."
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          autoFocus
        />
      </div>

      {/* Use Current Location Button */}
      <button
        onClick={handleUseCurrentLocation}
        className="w-full bg-white text-blue-600 font-medium py-2.5 px-4 rounded-lg shadow-lg hover:shadow-xl transition flex items-center justify-center space-x-2 mb-4"
      >
        <span className="text-xl">📍</span>
        <span>Use Current Location</span>
      </button>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center text-white py-8">
          <div className="text-lg">Searching...</div>
        </div>
      )}

      {/* Search Results */}
      {!loading && searchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {searchResults.map((location) => (
              <div
                key={location.id}
                onClick={() => handleSaveLocation(location)}
                className="p-4 hover:bg-blue-50 cursor-pointer transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-gray-800">{location.name}</div>
                    <div className="text-sm text-gray-600">
                      {location.region && `${location.region}, `}{location.country}
                    </div>
                  </div>
                  {location.isSaved && (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                      Saved
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
        <div className="text-center text-white py-8">
          <div className="text-lg">No locations found</div>
          <div className="text-sm opacity-80 mt-2">Try a different search term</div>
        </div>
      )}

      {/* Hint Text */}
      {!loading && searchQuery.trim().length === 0 && (
        <div className="text-center text-white opacity-80 py-8">
          <div className="text-sm">Enter a city name to search</div>
        </div>
      )}
    </div>
  )
}

export default AddLocation

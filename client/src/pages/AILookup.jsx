import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from '../lib/axios'
import { getCurrentCoords } from '../lib/geolocation'

/**
 * AI Lookup modal page.
 *
 * This is intentionally a *tool* interaction (single query → single response),
 * not a chat experience.
 */
function AILookup() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const closeInProgressRef = useRef(false)

  const mightNeedCurrentLocation = (text) => {
    const q = text.trim()
    if (q.length === 0) return false

    // Explicit current-location phrases.
    if (/\b(here|my location|current location|where i am|where I'm at|where im at)\b/i.test(q)) return true

    // If the query already looks like it names a place or coordinates, skip geolocation.
    const lower = q.toLowerCase()
    if (/\b(in|at|near|around)\b\s+\S+/i.test(q)) return false
    if (/\b\d{1,2}\.\d+\s*,\s*-?\d{1,3}\.\d+\b/.test(q)) return false
    if (/[a-zA-Z]+\s*,\s*[a-zA-Z]{2,}/.test(q)) return false

    // Otherwise, treat as a location-less query (e.g., "Will it rain tomorrow?").
    // The server will still decide authoritatively based on intent extraction.
    if (/(tomorrow|today|tonight|this weekend|next week|rain|snow|wind|forecast)/i.test(lower)) return true

    return true
  }

  useEffect(() => {
    closeInProgressRef.current = false
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    if (closeInProgressRef.current) return
    closeInProgressRef.current = true

    setIsOpen(false)
    window.setTimeout(() => {
      if (location.state?.backgroundLocation) {
        navigate(-1)
      } else {
        navigate('/locations')
      }
    }, 180)
  }, [location.state, navigate])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleClose])

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    
    if (query.trim().length === 0) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      setResult(null)

      let currentLocation
      if (mightNeedCurrentLocation(query)) {
        try {
          currentLocation = await getCurrentCoords()
        } catch {
          // If the user denied permissions or geolocation fails, let the server respond.
          // It can either proceed (if a location was provided) or return a helpful error.
        }
      }

      const response = await axios.post('/api/v1/lookup',
        currentLocation
          ? { query: query.trim(), units: 'imperial', currentLocation }
          : { query: query.trim(), units: 'imperial' }
      )

      setResult(response.data)
      setLoading(false)
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to process your query')
      setLoading(false)
    }
  }

  const handleQueryKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault()
      if (!loading && query.trim().length > 0) {
        handleSubmit()
      }
    }
  }

  const handleSaveLocation = async () => {
    if (!result?.card?.location?.id) return

    try {
      await axios.post('/api/v1/saved-locations', {
        locationId: result.card.location.id
      })
      alert('Location saved!')
    } catch (err) {
      if (err.response?.status === 409) {
        alert('This location is already saved')
      } else {
        alert(err.response?.data?.error?.message || 'Failed to save location')
      }
    }
  }

  const handleNewQuery = () => {
    setQuery('')
    setResult(null)
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close AI Lookup"
        onClick={handleClose}
        className="absolute inset-0 bg-black bg-opacity-40"
      />

      {/* Modal container (slides down from top) */}
      <div
        className="relative flex justify-center items-start px-4 pt-4 sm:pt-6"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            handleClose()
          }
        }}
      >
        <div
          className={
            `w-full max-w-3xl bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-200 ease-out ` +
            (isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6')
          }
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-800">AI Weather Lookup</h1>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition p-2"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal content */}
          <div className="p-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
            {/* Instructions */}
            <div className="bg-blue-50 text-gray-700 rounded-lg p-3 mb-4">
              <p className="text-sm">
                Ask a natural language question about the weather anywhere in the world.
                For example: "What's the weather in Denver tomorrow?" or "Will it rain in Paris this weekend?"
              </p>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleQueryKeyDown}
                placeholder="What's the weather like in..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                rows="2"
                disabled={loading}
                autoFocus
              />
              <div className="flex justify-between items-center mt-3">
                {result && (
                  <button
                    type="button"
                    onClick={handleNewQuery}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    New Query
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading || query.trim().length === 0}
                  className="ml-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Processing...' : 'Ask'}
                </button>
              </div>
            </form>

            {/* Error Message */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="space-y-3">
                {result.summaryText && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Answer</h2>
                    <p className="text-gray-700">{result.summaryText}</p>
                  </div>
                )}

                {result.card && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex justify-between items-start mb-3 gap-3">
                      <div className="min-w-0">
                        <h3 className="text-xl font-bold text-gray-800 truncate">
                          {result.card.location?.name || 'Location'}
                        </h3>
                        {result.card.location?.region && result.card.location?.country && (
                          <p className="text-sm text-gray-600 truncate">
                            {result.card.location.region}, {result.card.location.country}
                          </p>
                        )}
                        {result.card.timeframe && (
                          <p className="text-sm text-gray-500 mt-1 truncate">{result.card.timeframe}</p>
                        )}
                      </div>
                      {result.card.location?.id && (
                        <button
                          onClick={handleSaveLocation}
                          className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition text-sm font-medium shrink-0"
                        >
                          Save Location
                        </button>
                      )}
                    </div>

                    {result.card.current && (
                      <div className="text-center py-3 border-t border-b border-gray-200 my-3">
                        <div className="text-5xl font-bold text-gray-800">{Math.round(result.card.current.temp)}°</div>
                        <div className="text-gray-600 mt-2">{result.card.current.condition}</div>
                        <div className="flex justify-center space-x-4 mt-3 text-sm text-gray-500">
                          {result.card.current.tempMax && result.card.current.tempMin && (
                            <>
                              <span>H: {Math.round(result.card.current.tempMax)}°</span>
                              <span>L: {Math.round(result.card.current.tempMin)}°</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {result.card.current && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        {result.card.current.precipitationChance !== undefined && (
                          <div className="bg-blue-50 rounded-lg p-2 text-center">
                            <div className="text-xl">☔</div>
                            <div className="text-xs text-gray-600 mt-1">Precipitation</div>
                            <div className="font-semibold">{result.card.current.precipitationChance}%</div>
                          </div>
                        )}
                        {result.card.current.windSpeed !== undefined && (
                          <div className="bg-blue-50 rounded-lg p-2 text-center">
                            <div className="text-xl">💨</div>
                            <div className="text-xs text-gray-600 mt-1">Wind</div>
                            <div className="font-semibold">{Math.round(result.card.current.windSpeed)} mph</div>
                          </div>
                        )}
                        {result.card.current.humidity !== undefined && (
                          <div className="bg-blue-50 rounded-lg p-2 text-center">
                            <div className="text-xl">💧</div>
                            <div className="text-xs text-gray-600 mt-1">Humidity</div>
                            <div className="font-semibold">{result.card.current.humidity}%</div>
                          </div>
                        )}
                        {result.card.current.uvIndex !== undefined && (
                          <div className="bg-blue-50 rounded-lg p-2 text-center">
                            <div className="text-xl">☀️</div>
                            <div className="text-xs text-gray-600 mt-1">UV Index</div>
                            <div className="font-semibold">{result.card.current.uvIndex}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {result.card.daily && result.card.daily.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Forecast</h4>
                        <div className="space-y-2">
                          {result.card.daily.slice(0, 5).map((day, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded gap-3">
                              <div className="flex items-center space-x-3 min-w-0">
                                <div className="w-16 text-sm text-gray-600 shrink-0">
                                  {index === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                </div>
                                <div className="text-sm text-gray-700 truncate min-w-0">{day.condition}</div>
                              </div>
                              <div className="flex space-x-2 text-sm shrink-0">
                                <span className="font-semibold">{Math.round(day.tempMax)}°</span>
                                <span className="text-gray-500">{Math.round(day.tempMin)}°</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!result && !loading && (
              <div className="bg-blue-50 text-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Example queries:</h3>
                <ul className="space-y-2 text-sm">
                  <li>• "What's the weather in New York tomorrow?"</li>
                  <li>• "Will it rain in Seattle this weekend?"</li>
                  <li>• "How cold is it in Chicago right now?"</li>
                  <li>• "What's the forecast for Miami next week?"</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AILookup

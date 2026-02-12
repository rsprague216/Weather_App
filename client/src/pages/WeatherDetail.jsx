import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from '../lib/axios'
import { getGeolocationErrorMessage, getPositionWithFallback } from '../lib/geolocation'
import { getWeatherIcon } from '../lib/weatherIcons'

/**
 * Detailed weather view.
 *
 * Supports:
 * - `locationId === 'current'`: uses browser geolocation and fetches by lat/lon
 * - Saved locations: fetches via `/saved-locations/:id/weather`
 */
function WeatherDetail() {
  const { locationId } = useParams()
  const [weather, setWeather] = useState(null)
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedDayIndex, setExpandedDayIndex] = useState(null)

  useEffect(() => {
    fetchWeather()
  }, [locationId])

  const fetchWeather = async () => {
    try {
      setLoading(true)
      setError(null)
      setExpandedDayIndex(null)

      // If locationId is 'current', use browser geolocation
      if (locationId === 'current') {
        try {
          const position = await getPositionWithFallback()
          const { latitude, longitude } = position.coords
          const response = await axios.get(`/api/v1/weather?lat=${latitude}&lon=${longitude}&units=imperial`)
          setWeather(response.data)
          setLocation({ name: 'Current Location', latitude, longitude })
          setLoading(false)
        } catch (err) {
          setError(getGeolocationErrorMessage(err))
          setLoading(false)
        }
      } else {
        // Fetch weather for saved location
        const response = await axios.get(`/api/v1/saved-locations/${locationId}/weather?units=imperial`)
        setWeather(response.data)
        setLocation(response.data.location)
        setLoading(false)
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch weather')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white text-lg">Loading weather...</div>
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

  if (!weather || !weather.current) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        No weather data available
      </div>
    )
  }

  const { current, forecast } = weather
  
  // Get all hourly data from today's forecast
  const hourly = forecast && forecast[0] ? forecast[0].hourly : []
  
  // Map forecast to daily format expected by UI
  const daily = forecast ? forecast.map(f => ({
    date: f.date,
    condition: f.day.condition,
    tempMax: f.day.maxTempF,
    tempMin: f.day.minTempF,
    precipitationChance: f.day.dailyChanceOfRain
  })) : []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <h1 className="text-2xl font-bold text-gray-800">{location?.name}</h1>
        <p className="text-gray-600">{current.condition}</p>
        
        {/* Current Temperature */}
        <div className="mt-3 text-center">
          <div className="text-5xl font-bold text-gray-800">{Math.round(current.tempF)}°</div>
          <div className="text-gray-600 mt-2">
            Feels like {Math.round(current.feelsLikeF)}° • H:{forecast && forecast[0] ? Math.round(forecast[0].day.maxTempF) : '--'}° L:{forecast && forecast[0] ? Math.round(forecast[0].day.minTempF) : '--'}°
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl">☔</div>
            <div className="text-sm text-gray-600 mt-1">Precipitation</div>
            <div className="text-lg font-semibold">{current.precipChance || 0}%</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl">💨</div>
            <div className="text-sm text-gray-600 mt-1">Wind</div>
            <div className="text-lg font-semibold">{Math.round(current.windMph)} mph</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl">💧</div>
            <div className="text-sm text-gray-600 mt-1">Humidity</div>
            <div className="text-lg font-semibold">{current.humidity}%</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl">🌡️</div>
            <div className="text-sm text-gray-600 mt-1">Wind Dir</div>
            <div className="text-lg font-semibold">{current.windDir || 'N'}</div>
          </div>
        </div>
      </div>

      {/* Hourly Forecast */}
      {hourly && hourly.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h2 className="text-xl font-bold text-gray-800 mb-3">Hourly Forecast</h2>
          <div className="overflow-x-auto">
            <div className="flex space-x-4 pb-2">
              {hourly.slice(0, 24).map((hour, index) => (
                <div key={index} className="flex-shrink-0 text-center bg-blue-50 rounded-lg p-2 min-w-[76px]">
                  <div className="text-sm font-medium text-gray-600">
                    {new Date(hour.time).toLocaleTimeString('en-US', { hour: 'numeric' })}
                  </div>
                  <div className="text-2xl my-2">{getWeatherIcon(hour.condition)}</div>
                  <div className="text-lg font-semibold">{Math.round(hour.tempF)}°</div>
                  <div className="text-xs text-gray-500 mt-1">☔ {hour.chanceOfRain || 0}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Daily Forecast */}
      {daily && daily.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h2 className="text-xl font-bold text-gray-800 mb-3">7-Day Forecast</h2>
          <div className="space-y-2">
            {daily.map((day, index) => (
              <div key={index} className="bg-blue-50 rounded-lg">
                {/* Mobile: abbreviated row with tap-to-expand */}
                <div className="md:hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedDayIndex(expandedDayIndex === index ? null : index)}
                    className="w-full text-left p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 shrink-0 font-medium text-gray-700">
                          {index === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="text-2xl shrink-0">{getWeatherIcon(day.condition)}</div>
                        <div className="text-xs text-gray-500 truncate min-w-0">
                          {expandedDayIndex === index ? 'Tap to collapse' : 'Tap to expand'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-xs text-blue-700">☔ {day.precipitationChance || 0}%</div>
                        <div className="flex gap-2 text-sm">
                          <span className="font-semibold text-gray-800">{Math.round(day.tempMax)}°</span>
                          <span className="text-gray-500">{Math.round(day.tempMin)}°</span>
                        </div>
                      </div>
                    </div>

                    {expandedDayIndex === index && (
                      <div className="mt-2 text-sm text-gray-700">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{day.condition}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              High {Math.round(day.tempMax)}° • Low {Math.round(day.tempMin)}°
                            </div>
                          </div>
                          <div className="text-xs text-blue-700 shrink-0">☔ {day.precipitationChance || 0}%</div>
                        </div>
                      </div>
                    )}
                  </button>
                </div>

                {/* Tablet/Desktop: full row (truncate to prevent overflow) */}
                <div className="hidden md:flex items-center justify-between p-2 gap-3">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="w-20 shrink-0 font-medium text-gray-700">
                      {index === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-2xl shrink-0">{getWeatherIcon(day.condition)}</div>
                    <div className="text-sm text-gray-600 flex-1 min-w-0 truncate">{day.condition}</div>
                  </div>
                  <div className="flex items-center space-x-4 shrink-0">
                    <div className="text-sm text-blue-700">☔ {day.precipitationChance || 0}%</div>
                    <div className="flex space-x-2">
                      <span className="font-semibold text-gray-800">{Math.round(day.tempMax)}°</span>
                      <span className="text-gray-500">{Math.round(day.tempMin)}°</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default WeatherDetail

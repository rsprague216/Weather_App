/**
 * Weather Routes
 * 
 * Provides weather data for specific coordinates using the National Weather Service API.
 * All endpoints require authentication.
 * 
 * Features:
 * - 7-day weather forecasts
 * - Hourly forecast data
 * - Current conditions
 * - Automatic location name lookup
 * - Free (no API key required)
 * 
 * Endpoints:
 * - GET / - Get weather for coordinates
 * 
 * @module routes/weather
 */

import express from 'express'
import axiosInstance from '../utils/axios.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken } from '../middleware/auth.js'
import { weatherQuerySchema } from '../validators/schemas.js'
import { fetchWeatherData } from '../utils/weatherService.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

/**
 * GET /api/v1/weather
 * 
 * Get comprehensive weather data for specific coordinates.
 * 
 * Query parameters:
 * - lat: string (latitude)
 * - lon: string (longitude)
 * - units: string (optional, 'imperial' or 'metric', default: 'imperial')
 * 
 * Response 200:
 * - location: { name, latitude, longitude, timezone, localtime }
 * - current: { tempF, tempC, condition, windMph, humidity, ... }
 * - forecast: Array of 7 daily forecasts
 * - hourlyForecast: Array of hourly forecasts grouped by day
 * 
 * Response 404: Location outside NWS coverage (non-US)
 * Response 400: Invalid coordinates
 * Response 503: NWS API unavailable
 */
router.get('/', asyncHandler(async (req, res) => {
  const { lat, lon, units } = weatherQuerySchema.parse(req.query)

  try {
    // Get location name from reverse geocoding (Nominatim)
    let locationName = 'Unknown Location'
    try {
      const geoResponse = await axiosInstance.get('https://nominatim.openstreetmap.org/reverse', {
        params: { lat, lon, format: 'json' }
      })
      const address = geoResponse.data.address
      locationName = address.city || address.town || address.village || address.county || 'Unknown Location'
    } catch (error) {
      console.warn('Geocoding failed:', error.message)
    }

    const weatherData = await fetchWeatherData(lat, lon, locationName, units)
    res.json(weatherData)
  } catch (error) {
    console.error('NWS API Error:', error.response?.data || error.message)
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        error: {
          code: 'LOCATION_NOT_SUPPORTED',
          message: 'Weather data not available for this location (NWS only covers US locations)'
        }
      })
    }
    
    return res.status(500).json({
      error: {
        code: 'WEATHER_API_ERROR',
        message: 'Failed to fetch weather data'
      }
    })
  }
}))



export default router

/**
 * AI Weather Lookup Routes
 * 
 * Natural language weather queries using OpenAI GPT-4 for intent extraction.
 * Converts plain text queries into structured weather API requests.
 * 
 * Features:
 * - Natural language understanding ("What's the weather tomorrow in Chicago?")
 * - 4 intent types: CURRENT, DAY, HOURLY_WINDOW, DATE_RANGE
 * - Automatic location geocoding
 * - Weather card generation with summaries
 * - Tool-based (not conversational) for predictable results
 * 
 * Endpoints:
 * - POST /lookup - Process natural language weather query
 * 
 * Requires: OPENAI_API_KEY environment variable
 * 
 * @module routes/lookup
 */

import express from 'express'
import axiosInstance from '../utils/axios.js'
import OpenAI from 'openai'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken } from '../middleware/auth.js'
import { lookupSchema } from '../validators/schemas.js'
import pool from '../utils/db.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// OpenAI configuration - warn if not set but don't crash
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  WARNING: OPENAI_API_KEY not set. AI lookup endpoint will not work.')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30 second timeout
  maxRetries: 2 // Retry failed requests
})

// National Weather Service API
const NWS_API_BASE_URL = 'https://api.weather.gov'
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'

async function storeOrGetLocation(locationData) {
  const { address, lat, lon } = locationData

  const name = address?.city || address?.town || address?.village || address?.county || 'Unknown'
  const region = address?.state || ''
  const country = address?.country || 'USA'
  const externalId = locationData.place_id?.toString() || `${lat},${lon}`

  const existingLocation = await pool.query(
    'SELECT id FROM locations WHERE external_id = $1',
    [externalId]
  )

  if (existingLocation.rows.length > 0) {
    return {
      id: existingLocation.rows[0].id,
      name,
      region,
      country
    }
  }

  let timezone = 'America/New_York'
  try {
    const nwsResponse = await axiosInstance.get(`${NWS_API_BASE_URL}/points/${lat},${lon}`)
    timezone = nwsResponse.data.properties.timeZone
  } catch (error) {
    console.warn('Could not fetch timezone from NWS (lookup):', error.message)
  }

  const result = await pool.query(
    `INSERT INTO locations (external_id, name, region, country, latitude, longitude, timezone)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [externalId, name, region, country, parseFloat(lat), parseFloat(lon), timezone]
  )

  return {
    id: result.rows[0].id,
    name,
    region,
    country
  }
}

/**
 * OpenAI function calling tool definition for weather intent extraction.
 * 
 * Extracts structured intent from natural language queries like:
 * - "What's the weather in Seattle?" → CURRENT intent
 * - "Will it rain tomorrow in Boston?" → DAY intent  
 * - "Show me temps from 9am to 5pm in Denver" → HOURLY_WINDOW intent
 * - "Weather forecast for next 3 days in Miami" → DATE_RANGE intent
 * 
 * This is NOT a chat interface - it's a tool-based extraction system
 * for predictable, structured output.
 */
const weatherIntentTool = {
  type: 'function',
  function: {
    name: 'extract_weather_intent',
    description: 'Extract structured weather query intent from natural language',
    parameters: {
      type: 'object',
      properties: {
        intentType: {
          type: 'string',
          enum: ['CURRENT', 'DAY', 'HOURLY_WINDOW', 'DATE_RANGE'],
          description: 'The type of weather query'
        },
        locationProvided: {
          type: 'boolean',
          description: 'True if the user explicitly named a location in their query; otherwise false'
        },
        location: {
          type: 'string',
          description: 'The location name (city, coordinates, etc.). Omit or leave empty if the user did not specify a location.'
        },
        date: {
          type: 'string',
          description: 'Specific date in YYYY-MM-DD format (for DAY or DATE_RANGE)'
        },
        startDate: {
          type: 'string',
          description: 'Start date for DATE_RANGE in YYYY-MM-DD format'
        },
        endDate: {
          type: 'string',
          description: 'End date for DATE_RANGE in YYYY-MM-DD format'
        },
        startHour: {
          type: 'number',
          description: 'Start hour for HOURLY_WINDOW (0-23)'
        },
        endHour: {
          type: 'number',
          description: 'End hour for HOURLY_WINDOW (0-23)'
        }
      },
      required: ['intentType', 'locationProvided']
    }
  }
}

async function reverseGeocodeLocationName(lat, lon) {
  try {
    const response = await axiosInstance.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: { lat, lon, format: 'json' }
    })
    const address = response.data?.address
    return address?.city || address?.town || address?.village || address?.county || 'Current Location'
  } catch (error) {
    console.warn('Reverse geocoding failed (lookup):', error.message)
    return 'Current Location'
  }
}

/**
 * Generates a natural language summary of weather data based on intent type.
 * 
 * Creates human-readable text summaries like:
 * - "Chicago is currently 72°F and sunny"
 * - "Boston will have a high of 85°F tomorrow"
 * - "Denver forecast: Mostly sunny, Partly cloudy over the next 3 days"
 * 
 * @param {Object} intent - Extracted intent from OpenAI
 * @param {string} intent.intentType - CURRENT, DAY, HOURLY_WINDOW, or DATE_RANGE
 * @param {Object} weatherData - Weather data from NWS API
 * @param {Object} weatherData.location - Location info
 * @param {Object} weatherData.current - Current conditions
 * @param {Array} weatherData.forecast - Daily forecasts
 * @returns {string} Human-readable weather summary
 * 
 * @private
 */
function generateSummaryText(intent, weatherData) {
  const { location, current, forecast } = weatherData
  const { intentType } = intent

  switch (intentType) {
    case 'CURRENT':
      return `${location.name} is currently ${current.condition} with a temperature of ${Math.round(current.tempF)}°F.`
    
    case 'DAY':
      if (forecast && forecast.length > 0) {
        const day = forecast[0].day
        return `${location.name} will be ${day.condition} with highs around ${Math.round(day.maxTempF)}°F and lows around ${Math.round(day.minTempF)}°F.`
      }
      break
    
    case 'HOURLY_WINDOW':
      if (forecast && forecast.length > 0 && forecast[0].hourly) {
        const hours = forecast[0].hourly
        const temps = hours.map(h => h.tempF)
        const avgTemp = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length)
        return `${location.name} will average ${avgTemp}°F during the requested hours.`
      }
      break
    
    case 'DATE_RANGE':
      if (forecast && forecast.length > 0) {
        const conditions = [...new Set(forecast.map(d => d.day.condition))]
        return `${location.name} will have ${conditions.join(', ')} over the next ${forecast.length} days.`
      }
      break
  }

  return `Weather data retrieved for ${location.name}.`
}

/**
 * Generates structured card data for UI rendering based on intent type.
 * 
 * Creates intent-specific data structures:
 * - CURRENT: Current conditions with temperature, feels like, humidity, wind
 * - DAY: Daily forecast with high/low temps and precipitation chance
 * - HOURLY_WINDOW: Hourly forecast for specific time range
 * - DATE_RANGE: Multi-day forecast with daily summaries
 * 
 * @param {Object} intent - Extracted intent from OpenAI
 * @param {string} intent.intentType - Type of weather query
 * @param {Object} weatherData - Weather data from NWS API  
 * @returns {Object} Structured card data ready for UI rendering
 * 
 * Card format:
 * - type: Intent type
 * - title: Display title with location and date
 * - metrics/hourlyData/dailyData: Intent-specific data
 * 
 * @private
 */
function generateCard(intent, weatherData) {
  const { location, current, forecast } = weatherData
  const { intentType } = intent

  switch (intentType) {
    case 'CURRENT':
      return {
        type: 'CURRENT',
        title: `${location.name}`,
        metrics: {
          temperature: Math.round(current.tempF),
          feelsLike: Math.round(current.feelsLikeF),
          condition: current.condition,
          humidity: current.humidity,
          windSpeed: Math.round(current.windMph)
        }
      }
    
    case 'DAY':
      if (forecast && forecast.length > 0) {
        const day = forecast[0].day
        return {
          type: 'DAY',
          title: `${location.name} • ${intent.date || 'Today'}`,
          metrics: {
            high: Math.round(day.maxTempF),
            low: Math.round(day.minTempF),
            precipChance: day.dailyChanceOfRain
          }
        }
      }
      break
    
    case 'HOURLY_WINDOW':
      if (forecast && forecast.length > 0 && forecast[0].hourly) {
        const allHourly = forecast[0].hourly
        const hours = allHourly.slice(intent.startHour || 0, (intent.endHour || 23) + 1)
        return {
          type: 'HOURLY_WINDOW',
          title: `${location.name} • ${intent.startHour || 0}:00-${intent.endHour || 23}:00`,
          hourlyData: hours.map(h => ({
            hour: new Date(h.time).getHours(),
            temp: Math.round(h.tempF),
            condition: h.condition,
            precipChance: h.chanceOfRain
          }))
        }
      }
      break
    
    case 'DATE_RANGE':
      if (forecast && forecast.length > 0) {
        return {
          type: 'DATE_RANGE',
          title: `${location.name} • ${intent.startDate} to ${intent.endDate}`,
          dailyData: forecast.map(d => ({
            date: d.date,
            high: Math.round(d.day.maxTempF),
            low: Math.round(d.day.minTempF),
            condition: d.day.condition
          }))
        }
      }
      break
  }

  return null
}

/**
 * Fetches weather data from NWS API (internal implementation for lookup endpoint).
 * 
 * Similar to weatherService.js but duplicated here for lookup-specific needs.
 * Makes calls to NWS API to retrieve forecast and hourly data.
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} locationName - Location name for response
 * @returns {Promise<Object>} Weather data object with location, current, and forecast
 * 
 * @throws {Error} If NWS API request fails
 * @private
 */
async function fetchNWSWeather(lat, lon, locationName) {
  try {
    // Get gridpoint data
    const pointsResponse = await axiosInstance.get(`${NWS_API_BASE_URL}/points/${lat},${lon}`, {
      headers: { 'User-Agent': 'WeatherApp/1.0' }
    })
    
    const properties = pointsResponse.data.properties
    const forecastUrl = properties.forecast
    const forecastHourlyUrl = properties.forecastHourly
    const timezone = properties.timeZone
    
    // Get forecast data
    const [forecastResponse, hourlyResponse] = await Promise.all([
      axiosInstance.get(forecastUrl, { headers: { 'User-Agent': 'WeatherApp/1.0' } }),
      axiosInstance.get(forecastHourlyUrl, { headers: { 'User-Agent': 'WeatherApp/1.0' } })
    ])
    
    const periods = forecastResponse.data.properties.periods
    const hourlyPeriods = hourlyResponse.data.properties.periods
    
    // Current conditions (first hourly period)
    const currentHourly = hourlyPeriods[0]
    const current = {
      tempF: currentHourly.temperature,
      tempC: (currentHourly.temperature - 32) * 5/9,
      condition: currentHourly.shortForecast,
      windMph: parseInt(currentHourly.windSpeed) || 0,
      windDir: currentHourly.windDirection,
      humidity: currentHourly.relativeHumidity?.value || 0,
      feelsLikeF: currentHourly.temperature,
      feelsLikeC: (currentHourly.temperature - 32) * 5/9,
      precipChance: currentHourly.probabilityOfPrecipitation?.value || 0
    }
    
    // Group forecast periods by day
    const forecastByDay = {}
    periods.forEach(period => {
      const date = period.startTime.split('T')[0]
      if (!forecastByDay[date]) {
        forecastByDay[date] = { day: null, night: null }
      }
      if (period.isDaytime) {
        forecastByDay[date].day = period
      } else {
        forecastByDay[date].night = period
      }
    })
    
    // Group hourly by day
    const hourlyByDay = {}
    hourlyPeriods.forEach(period => {
      const date = period.startTime.split('T')[0]
      if (!hourlyByDay[date]) {
        hourlyByDay[date] = []
      }
      hourlyByDay[date].push(period)
    })
    
    // Build daily forecast
    const forecast = Object.keys(forecastByDay).slice(0, 7).map(date => {
      const dayData = forecastByDay[date]
      const hourlyData = hourlyByDay[date] || []
      
      const dayPeriod = dayData.day || dayData.night
      const nightPeriod = dayData.night || dayData.day
      
      return {
        date,
        day: {
          maxTempF: dayPeriod?.temperature || 0,
          minTempF: nightPeriod?.temperature || 0,
          condition: dayPeriod?.shortForecast || 'Unknown',
          detailedForecast: dayPeriod?.detailedForecast || '',
          dailyChanceOfRain: Math.max(
            dayPeriod?.probabilityOfPrecipitation?.value || 0,
            nightPeriod?.probabilityOfPrecipitation?.value || 0
          )
        },
        hourly: hourlyData.map(hour => ({
          time: hour.startTime,
          tempF: hour.temperature,
          condition: hour.shortForecast,
          chanceOfRain: hour.probabilityOfPrecipitation?.value || 0
        }))
      }
    })
    
    return {
      location: {
        name: locationName,
        latitude: lat,
        longitude: lon,
        timezone
      },
      current,
      forecast
    }
  } catch (error) {
    console.error('NWS API Error:', error.response?.data || error.message)
    throw error
  }
}

/**
 * POST /api/v1/lookup
 * 
 * Process natural language weather queries using AI intent extraction.
 * 
 * Workflow:
 * 1. Extract structured intent from query using OpenAI GPT-4
 * 2. Geocode location name to coordinates (Nominatim)
 * 3. Fetch weather data from NWS API
 * 4. Generate response with summary text and UI card
 * 
 * Request body:
 * - query: string (natural language, e.g., "What's the weather in Seattle?")
 * - units: string (optional, 'imperial' or 'metric', default: 'imperial')
 * 
 * Response 200:
 * - intent: Extracted intent object (intentType, location, dates, etc.)
 * - weatherData: Full weather data from NWS
 * - summary: Natural language summary text
 * - card: Structured card data for UI rendering
 * 
 * Supported intent types:
 * - CURRENT: Current weather conditions
 * - DAY: Specific day forecast
 * - HOURLY_WINDOW: Weather for time range
 * - DATE_RANGE: Multi-day forecast
 * 
 * Example queries:
 * - "What's the weather like in Boston?"
 * - "Will it rain tomorrow in Seattle?"
 * - "Show me temperatures from 9am to 5pm in Denver"
 * - "Weather forecast for next 3 days in Miami"
 * 
 * Response 500: OpenAI API key not configured
 * Response 404: Location not found
 * Response 400: Invalid query format
 */
router.post('/', asyncHandler(async (req, res) => {
  const { query, units, currentLocation } = lookupSchema.parse(req.body)

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: {
        code: 'CONFIGURATION_ERROR',
        message: 'OpenAI API key not configured'
      }
    })
  }

  try {
    // Step 1: Extract intent using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a weather query intent extraction assistant. Extract structured intent from natural language weather queries. IMPORTANT: If the user does not explicitly specify a location, set locationProvided=false and omit location (or set it to an empty string).'
        },
        {
          role: 'user',
          content: query
        }
      ],
      tools: [weatherIntentTool],
      tool_choice: { type: 'function', function: { name: 'extract_weather_intent' } }
    })

    const toolCall = completion.choices[0].message.tool_calls?.[0]
    if (!toolCall) {
      return res.status(400).json({
        error: {
          code: 'INTENT_EXTRACTION_FAILED',
          message: 'Could not understand the weather query'
        }
      })
    }

    const intent = JSON.parse(toolCall.function.arguments)

    let weatherData
    let resolvedLocation = null

    // Step 2/3: Resolve location → coordinates.
    // If the user didn't provide a location, assume current coordinates (if provided by client).
    const locationToken = typeof intent.location === 'string' ? intent.location.trim() : ''
    const isNonSpecificLocation = /\b(here|my location|current location|where i am|where i'm at|where im at)\b/i.test(locationToken)

    if (!intent.locationProvided || isNonSpecificLocation) {
      if (!currentLocation) {
        return res.status(400).json({
          error: {
            code: 'CURRENT_LOCATION_REQUIRED',
            message: 'No location was provided. Enable location services or include a location in your query.'
          }
        })
      }

      const locationName = await reverseGeocodeLocationName(currentLocation.lat, currentLocation.lon)
      weatherData = await fetchNWSWeather(currentLocation.lat, currentLocation.lon, locationName)
    } else {
      const locationQuery = locationToken
      if (!locationQuery) {
        return res.status(400).json({
          error: {
            code: 'LOCATION_REQUIRED',
            message: 'Please include a location in your query.'
          }
        })
      }

      // Get location coordinates using Nominatim
      const searchResponse = await axiosInstance.get(`${NOMINATIM_BASE_URL}/search`, {
        params: {
          q: locationQuery,
          format: 'json',
          addressdetails: 1,
          limit: 1,
          countrycodes: 'us' // NWS only covers US
        }
      })

      if (searchResponse.data.length === 0) {
        return res.status(404).json({
          error: {
            code: 'LOCATION_NOT_FOUND',
            message: `Could not find location: ${locationQuery}`
          }
        })
      }

      const location = searchResponse.data[0]
      const address = location.address
      const locationName = address.city || address.town || address.village || address.county || locationQuery
      resolvedLocation = await storeOrGetLocation(location)

      // Fetch weather data from NWS
      weatherData = await fetchNWSWeather(location.lat, location.lon, locationName)
    }

    // Step 4: Generate summary and card
    const summaryText = generateSummaryText(intent, weatherData)
    
    // Format response to match frontend expectations
    res.json({
      summaryText,
      card: {
        location: {
          name: weatherData.location.name,
          id: resolvedLocation?.id || null,
          region: resolvedLocation?.region,
          country: resolvedLocation?.country
        },
        current: {
          temp: weatherData.current.tempF,
          condition: weatherData.current.condition,
          tempMax: weatherData.forecast && weatherData.forecast.length > 0 ? weatherData.forecast[0].day.maxTempF : null,
          tempMin: weatherData.forecast && weatherData.forecast.length > 0 ? weatherData.forecast[0].day.minTempF : null,
          precipitationChance: weatherData.current.precipChance,
          windSpeed: weatherData.current.windMph,
          humidity: weatherData.current.humidity
        },
        daily: weatherData.forecast.map(d => ({
          date: d.date,
          condition: d.day.condition,
          tempMax: d.day.maxTempF,
          tempMin: d.day.minTempF
        }))
      }
    })
  } catch (error) {
    console.error('Lookup Error:', error.response?.data || error.message)
    
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
        code: 'LOOKUP_ERROR',
        message: 'Failed to process weather lookup'
      }
    })
  }
}))

export default router

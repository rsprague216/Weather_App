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
import { fetchWeatherData } from '../utils/weatherService.js'
import { isStateLevelQuery } from '../utils/lookupDisambiguation.js'
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

  // Check if location already exists
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

  // Estimate timezone from longitude as a fallback (US only)
  function estimateTimezone(longitude) {
    const lng = parseFloat(longitude)
    if (lng > -82) return 'America/New_York'
    if (lng > -90) return 'America/Chicago'
    if (lng > -105) return 'America/Denver'
    return 'America/Los_Angeles'
  }

  let timezone = estimateTimezone(lon)
  try {
    const nwsResponse = await axiosInstance.get(`${NWS_API_BASE_URL}/points/${lat},${lon}`)
    timezone = nwsResponse.data.properties.timeZone
  } catch (error) {
    console.warn(`Could not fetch timezone from NWS (lookup), using estimate (${timezone}):`, error.message)
  }

  // Upsert to handle concurrent inserts for the same external_id
  const result = await pool.query(
    `INSERT INTO locations (external_id, name, region, country, latitude, longitude, timezone)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (external_id) DO NOTHING
     RETURNING id`,
    [externalId, name, region, country, parseFloat(lat), parseFloat(lon), timezone]
  )

  // If DO NOTHING fired, the RETURNING clause returns no rows — fetch the existing id
  if (result.rows.length === 0) {
    const existing = await pool.query(
      'SELECT id FROM locations WHERE external_id = $1',
      [externalId]
    )
    return {
      id: existing.rows[0].id,
      name,
      region,
      country
    }
  }

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
        const startH = intent.startHour ?? 0
        const endH = intent.endHour ?? 23
        const hours = forecast[0].hourly.filter(h => {
          const hour = new Date(h.time).getHours()
          return hour >= startH && hour <= endH
        })
        if (hours.length > 0) {
          const temps = hours.map(h => h.tempF)
          const avgTemp = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length)
          return `${location.name} will average ${avgTemp}°F from ${startH}:00 to ${endH}:00.`
        }
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
        const startH = intent.startHour ?? 0
        const endH = intent.endHour ?? 23
        const hours = allHourly.filter(h => {
          const hour = new Date(h.time).getHours()
          return hour >= startH && hour <= endH
        })
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
  const { query, currentLocation, selectedLocationIndex, intent: cachedIntent } = lookupSchema.parse(req.body)

  if (!process.env.OPENAI_API_KEY && !cachedIntent) {
    return res.status(500).json({
      error: {
        code: 'CONFIGURATION_ERROR',
        message: 'OpenAI API key not configured'
      }
    })
  }

  try {
    // Step 1: Extract intent using OpenAI (skip if already extracted during disambiguation)
    let intent
    if (cachedIntent) {
      intent = cachedIntent
    } else {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a weather query intent extraction assistant. Today is ${new Date().toISOString().split('T')[0]}. Extract structured intent from natural language weather queries. Use today's date to resolve relative references like "tomorrow", "this weekend", "next week", etc. IMPORTANT: If the user does not explicitly specify a location, set locationProvided=false and omit location (or set it to an empty string).`
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

      intent = JSON.parse(toolCall.function.arguments)
    }

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

      // Reverse geocode to get location details for display and storage
      let locationName = 'Current Location'
      try {
        const reverseResponse = await axiosInstance.get(`${NOMINATIM_BASE_URL}/reverse`, {
          params: { lat: currentLocation.lat, lon: currentLocation.lon, format: 'json', addressdetails: 1 }
        })
        const reverseData = reverseResponse.data
        const address = reverseData?.address
        locationName = address?.city || address?.town || address?.village || address?.county || 'Current Location'
        resolvedLocation = await storeOrGetLocation({
          address,
          lat: currentLocation.lat,
          lon: currentLocation.lon,
          place_id: reverseData?.place_id
        })
      } catch (error) {
        console.warn('Reverse geocoding failed (lookup):', error.message)
      }

      weatherData = await fetchWeatherData(currentLocation.lat, currentLocation.lon, locationName)
      weatherData.coordinates = {
        lat: parseFloat(currentLocation.lat),
        lon: parseFloat(currentLocation.lon)
      }
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
          limit: 5, // Get multiple results for disambiguation
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

      const results = searchResponse.data

      // Log results for debugging
      console.log(`Geocoding results for "${locationQuery}":`, results.map(r => ({
        display_name: r.display_name,
        type: r.type,
        class: r.class,
        osm_type: r.osm_type,
        importance: r.importance
      })))

      const firstResult = results[0]
      const isStateLevel = isStateLevelQuery(locationQuery, firstResult)

      // If state-level and no selection made, show major cities for disambiguation.
      if (isStateLevel && selectedLocationIndex === undefined) {
        const stateName = firstResult.address?.state || locationQuery

        console.log(`Broad location detected. Fetching cities in: ${stateName}`)

        const citySearchResponse = await axiosInstance.get(`${NOMINATIM_BASE_URL}/search`, {
          params: {
            q: `city in ${stateName}`,
            format: 'json',
            addressdetails: 1,
            limit: 10,
            countrycodes: 'us'
          }
        })

        // Filter to actual cities/towns within the correct state and deduplicate by name
        const seen = new Set()
        const cities = citySearchResponse.data
          .filter(r => {
            const addr = r.address
            const city = addr.city || addr.town || addr.village
            if (!city) return false
            if (addr.state !== stateName) return false
            if (seen.has(city)) return false
            seen.add(city)
            return true
          })
          .slice(0, 5)

        if (cities.length > 0) {
          const disambiguationOptions = cities.map((result, index) => {
            const addr = result.address
            const name = addr.city || addr.town || addr.village || addr.county || 'Unknown'
            return {
              index,
              name,
              region: addr.state || '',
              country: addr.country || 'USA',
              displayName: result.display_name,
              lat: parseFloat(result.lat),
              lon: parseFloat(result.lon)
            }
          })

          return res.json({
            requiresDisambiguation: true,
            originalQuery: locationQuery,
            locations: disambiguationOptions,
            intent,
            stateName
          })
        } else {
          return res.status(400).json({
            error: {
              code: 'LOCATION_TOO_BROAD',
              message: `Could not find cities in "${locationQuery}". Please specify a city or town.`
            }
          })
        }
      }

      // Detect ambiguity: multiple distinct locations (non-state level).
      const isAmbiguous = selectedLocationIndex === undefined
        && !isStateLevel
        && results.length > 1
        && (() => {
          const locationNames = results.map(r => {
            const addr = r.address
            return addr.city || addr.town || addr.village || addr.county || 'Unknown'
          })
          const uniqueNames = new Set(locationNames)
          return uniqueNames.size > 1
        })()

      if (isAmbiguous) {
        const disambiguationOptions = results.slice(0, 5).map((result, index) => {
          const addr = result.address
          const name = addr.city || addr.town || addr.village || addr.county || 'Unknown'
          const region = addr.state || ''
          const country = addr.country || 'USA'
          
          return {
            index,
            name,
            region,
            country,
            displayName: result.display_name,
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon)
          }
        })

        return res.json({
          requiresDisambiguation: true,
          originalQuery: locationQuery,
          locations: disambiguationOptions,
          intent
        })
      }

      // Select the appropriate location (only if we haven't already fetched weather for a capital)
      if (!weatherData) {
        const locationIndex = selectedLocationIndex !== undefined ? selectedLocationIndex : 0
        if (locationIndex >= results.length) {
          return res.status(400).json({
            error: {
              code: 'INVALID_SELECTION',
              message: 'Selected location index is out of range'
            }
          })
        }

        const location = results[locationIndex]
        const address = location.address
        const locationName = address.city || address.town || address.village || address.county || locationQuery
        resolvedLocation = await storeOrGetLocation(location)

        // Fetch weather data from NWS
        weatherData = await fetchWeatherData(location.lat, location.lon, locationName)
        
        // Add coordinates to weather data for transparency
        weatherData.coordinates = {
          lat: parseFloat(location.lat),
          lon: parseFloat(location.lon)
        }
      }
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
          country: resolvedLocation?.country,
          coordinates: weatherData.coordinates
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

    // NWS 404 — coordinates outside US coverage
    if (error.response?.status === 404) {
      return res.status(404).json({
        error: {
          code: 'LOCATION_NOT_SUPPORTED',
          message: 'Weather data not available for this location (NWS only covers US locations)'
        }
      })
    }

    // OpenAI errors
    if (error?.constructor?.name === 'APIError' || error?.type === 'invalid_request_error') {
      const status = error.status || 500
      if (status === 429) {
        return res.status(429).json({
          error: {
            code: 'AI_RATE_LIMITED',
            message: 'AI service is temporarily busy. Please try again in a moment.'
          }
        })
      }
      if (status === 401 || status === 403) {
        return res.status(500).json({
          error: {
            code: 'AI_AUTH_ERROR',
            message: 'AI service authentication failed. Please contact support.'
          }
        })
      }
      return res.status(502).json({
        error: {
          code: 'AI_SERVICE_ERROR',
          message: 'AI service encountered an error. Please try again.'
        }
      })
    }

    return res.status(500).json({
      error: {
        code: 'LOOKUP_ERROR',
        message: 'Failed to process weather lookup. Please try again.'
      }
    })
  }
}))

export default router

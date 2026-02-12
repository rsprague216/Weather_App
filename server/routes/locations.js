/**
 * Location Routes
 * 
 * Provides location search and geocoding functionality using OpenStreetMap's Nominatim API.
 * All endpoints require authentication.
 * 
 * Features:
 * - Location search by text query (city, address, coordinates)
 * - Reverse geocoding (coordinates to location name)
 * - Automatic location normalization and storage
 * - Timezone lookup via NWS API
 * 
 * Endpoints:
 * - GET /search - Search for locations
 * - GET /reverse - Reverse geocode coordinates
 * 
 * @module routes/locations
 */

import express from 'express'
import axiosInstance from '../utils/axios.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken } from '../middleware/auth.js'
import { searchLocationSchema, reverseGeocodeSchema } from '../validators/schemas.js'
import pool from '../utils/db.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// Nominatim (OpenStreetMap) for geocoding - free service
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'

/**
 * Normalizes location data from Nominatim and stores it in the database.
 * 
 * If the location already exists (matched by external_id), returns existing ID.
 * Otherwise, creates a new location record with timezone data from NWS API.
 * \n * @param {Object} locationData - Raw location data from Nominatim API
 * @param {string} locationData.display_name - Full formatted address
 * @param {Object} locationData.address - Address components
 * @param {string} locationData.lat - Latitude
 * @param {string} locationData.lon - Longitude
 * @param {string|number} [locationData.place_id] - Nominatim place ID
 * @returns {Promise<string>} UUID of location in database
 * \n * @private
 */
async function storeOrGetLocation(locationData) {
  const { display_name, address, lat, lon } = locationData
  
  // Extract location components from Nominatim response
  const name = address.city || address.town || address.village || address.county || 'Unknown'
  const region = address.state || ''
  const country = address.country || 'USA'
  
  // Create a unique external_id using Nominatim place_id or coordinates
  const externalId = locationData.place_id?.toString() || `${lat},${lon}`

  // Check if location already exists
  const existingLocation = await pool.query(
    'SELECT id FROM locations WHERE external_id = $1',
    [externalId]
  )

  if (existingLocation.rows.length > 0) {
    return existingLocation.rows[0].id
  }

  // Get timezone using NWS API
  let timezone = 'America/New_York' // Default
  try {
    const nwsResponse = await axiosInstance.get(`https://api.weather.gov/points/${lat},${lon}`)
    timezone = nwsResponse.data.properties.timeZone
  } catch (error) {
    console.warn('Could not fetch timezone from NWS:', error.message)
  }

  // Insert new location
  const result = await pool.query(
    `INSERT INTO locations (external_id, name, region, country, latitude, longitude, timezone)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [externalId, name, region, country, parseFloat(lat), parseFloat(lon), timezone]
  )

  return result.rows[0].id
}

/**
 * GET /api/v1/locations/search
 * 
 * Search for locations by name, address, or natural language query.
 * Uses OpenStreetMap Nominatim geocoding service (free tier).
 * 
 * Query parameters:
 * - q: string (search query, e.g., "Chicago", "90210", "New York, NY")
 * 
 * Response 200:
 * - locations: Array of location objects with:
 *   - id: UUID in our database
 *   - externalId: Nominatim place_id
 *   - name: City/town name
 *   - region: State/province
 *   - country: Country name
 *   - latitude: Decimal degrees
 *   - longitude: Decimal degrees
 *   - timezone: IANA timezone identifier
 *   - displayName: Full formatted address
 * 
 * Note: Results limited to US locations (NWS API requirement)
 * Response 400: Validation error
 */
router.get('/search', asyncHandler(async (req, res) => {
  const { q } = searchLocationSchema.parse(req.query)

  try {
    const response = await axiosInstance.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q,
        format: 'json',
        addressdetails: 1,
        limit: 10,
        countrycodes: 'us' // Restrict to US since NWS only covers US
      }
    })

    // Normalize and store locations, then return with our IDs
    const locations = await Promise.all(
      response.data.map(async (loc) => {
        const locationId = await storeOrGetLocation(loc)
        const address = loc.address
        const name = address.city || address.town || address.village || address.county
        
        return {
          id: locationId,
          name,
          region: address.state || '',
          country: address.country || 'USA',
          latitude: parseFloat(loc.lat),
          longitude: parseFloat(loc.lon)
        }
      })
    )

    res.json({ locations })
  } catch (error) {
    console.error('Nominatim API Error:', error.response?.data || error.message)
    return res.status(500).json({
      error: {
        code: 'GEOCODING_ERROR',
        message: 'Failed to search locations'
      }
    })
  }
}))

/**
 * GET /api/v1/locations/reverse
 * 
 * Reverse geocode coordinates to get location information.
 * Converts latitude/longitude to human-readable location name and details.
 * 
 * Query parameters:
 * - lat: string (latitude, e.g., "41.8781")
 * - lon: string (longitude, e.g., "-87.6298")
 * 
 * Response 200:
 * - location: {
 *     id: UUID in our database
 *     name: City/town name
 *     region: State/province
 *     country: Country name
 *     latitude: Decimal degrees
 *     longitude: Decimal degrees
 *     timezone: IANA timezone identifier
 *     displayName: Full formatted address
 *   }
 * 
 * Response 404: No location found at coordinates
 * Response 400: Invalid coordinate format
 */
router.get('/reverse', asyncHandler(async (req, res) => {
  const { lat, lon } = reverseGeocodeSchema.parse(req.query)

  try {
    const response = await axiosInstance.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat,
        lon,
        format: 'json',
        addressdetails: 1
      }
    })

    if (!response.data || response.data.error) {
      return res.status(404).json({
        error: {
          code: 'LOCATION_NOT_FOUND',
          message: 'No location found for these coordinates'
        }
      })
    }

    const locationData = response.data
    const locationId = await storeOrGetLocation(locationData)
    const address = locationData.address
    
    // Get timezone from NWS
    let timezone = 'America/New_York'
    try {
      const nwsResponse = await axiosInstance.get(`https://api.weather.gov/points/${lat},${lon}`)
      timezone = nwsResponse.data.properties.timeZone
    } catch (error) {
      console.warn('Could not fetch timezone from NWS:', error.message)
    }

    res.json({
      location: {
        id: locationId,
        name: address.city || address.town || address.village || address.county,
        region: address.state || '',
        country: address.country || 'USA',
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        timezone
      }
    })
  } catch (error) {
    console.error('Nominatim API Error:', error.response?.data || error.message)
    return res.status(500).json({
      error: {
        code: 'GEOCODING_ERROR',
        message: 'Failed to reverse geocode location'
      }
    })
  }
}))

export default router

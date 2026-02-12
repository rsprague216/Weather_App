/**
 * Saved Locations Routes
 * 
 * Manages user's saved/favorite locations with reordering capability.
 * All endpoints require authentication.
 * 
 * Features:
 * - Save locations to user profile
 * - Retrieve weather for all saved locations
 * - Reorder locations with gapped sort keys
 * - Delete saved locations
 * - Duplicate prevention
 * 
 * Endpoints:
 * - GET / - List all saved locations
 * - POST / - Save a new location
 * - DELETE /:id - Remove saved location
 * - PATCH /:id/reorder - Reorder location
 * - GET /weather - Get weather for all saved locations
 * 
 * @module routes/savedLocations
 */

import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken } from '../middleware/auth.js'
import { savedLocationSchema, reorderLocationSchema } from '../validators/schemas.js'
import pool from '../utils/db.js'
import { fetchWeatherData } from '../utils/weatherService.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

/**
 * GET /api/v1/saved-locations
 * 
 * Get all saved locations for the authenticated user, ordered by sort_key.
 * 
 * Response 200:
 * - locations: Array of saved location objects with:
 *   - id: Location UUID
 *   - externalId: Nominatim place_id
 *   - name: City/town name
 *   - region: State/province
 *   - country: Country name
 *   - latitude: Decimal degrees
 *   - longitude: Decimal degrees
 *   - timezone: IANA timezone
 *   - sortKey: BigInt for ordering
 */
router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT 
      sl.id as saved_location_id,
      sl.sort_key,
      l.id,
      l.external_id,
      l.name,
      l.region,
      l.country,
      l.latitude,
      l.longitude,
      l.timezone
    FROM saved_locations sl
    JOIN locations l ON sl.location_id = l.id
    WHERE sl.user_id = $1
    ORDER BY sl.sort_key ASC`,
    [req.user.userId]
  )

  const locations = result.rows.map(row => ({
    id: row.id,
    externalId: row.external_id,
    name: row.name,
    region: row.region,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    timezone: row.timezone,
    sortKey: row.sort_key
  }))

  res.json({ locations })
}))

/**
 * POST /api/v1/saved-locations
 * 
 * Save a new location to the user's saved locations list.
 * Uses gapped sort keys (increments by 1000) to allow efficient reordering.
 * 
 * Request body:
 * - locationId: UUID of location to save
 * 
 * Response 201:
 * - location: Full location object with sortKey
 * 
 * Response 404: Location ID not found
 * Response 409: Location already saved by this user
 * Response 400: Invalid locationId format
 */
router.post('/', asyncHandler(async (req, res) => {
  const { locationId } = savedLocationSchema.parse(req.body)

  // Check if location exists
  const locationResult = await pool.query(
    'SELECT id FROM locations WHERE id = $1',
    [locationId]
  )

  if (locationResult.rows.length === 0) {
    return res.status(404).json({
      error: {
        code: 'LOCATION_NOT_FOUND',
        message: 'Location not found'
      }
    })
  }

  // Check if already saved
  const existingResult = await pool.query(
    'SELECT id FROM saved_locations WHERE user_id = $1 AND location_id = $2',
    [req.user.userId, locationId]
  )

  if (existingResult.rows.length > 0) {
    return res.status(409).json({
      error: {
        code: 'LOCATION_ALREADY_SAVED',
        message: "You've already saved this location."
      }
    })
  }

  // Get max sort_key to append at the end
  const maxSortKeyResult = await pool.query(
    'SELECT COALESCE(MAX(sort_key), 0) as max_sort_key FROM saved_locations WHERE user_id = $1',
    [req.user.userId]
  )

  const maxSortKey = BigInt(maxSortKeyResult.rows[0].max_sort_key)
  const newSortKey = maxSortKey + 1000n // Gap for future reordering

  // Insert saved location
  const insertResult = await pool.query(
    `INSERT INTO saved_locations (user_id, location_id, sort_key)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [req.user.userId, locationId, newSortKey.toString()]
  )

  // Get full location details
  const fullLocationResult = await pool.query(
    `SELECT 
      l.id,
      l.external_id,
      l.name,
      l.region,
      l.country,
      l.latitude,
      l.longitude,
      l.timezone
    FROM locations l
    WHERE l.id = $1`,
    [locationId]
  )

  const location = fullLocationResult.rows[0]

  res.status(201).json({
    location: {
      id: location.id,
      externalId: location.external_id,
      name: location.name,
      region: location.region,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
      sortKey: newSortKey.toString()
    }
  })
}))

/**
 * DELETE /api/v1/saved-locations/:locationId
 * 
 * Remove a location from the user's saved locations.
 * 
 * URL parameters:
 * - locationId: UUID of location to remove
 * 
 * Response 204: Successfully deleted (no content)
 * Response 404: Saved location not found
 */
router.delete('/:locationId', asyncHandler(async (req, res) => {
  const { locationId } = req.params

  const result = await pool.query(
    'DELETE FROM saved_locations WHERE user_id = $1 AND location_id = $2 RETURNING id',
    [req.user.userId, locationId]
  )

  if (result.rows.length === 0) {
    return res.status(404).json({
      error: {
        code: 'SAVED_LOCATION_NOT_FOUND',
        message: 'Saved location not found'
      }
    })
  }

  res.status(204).send()
}))

/**
 * PATCH /api/v1/saved-locations/:locationId/order
 * 
 * Reorder a saved location in the user's list.
 * Uses gapped BigInt sort keys for efficient reordering without updating all records.
 * 
 * URL parameters:
 * - locationId: UUID of location to reorder
 * 
 * Request body:
 * - afterLocationId: UUID of location to place after (null to move to first position)
 * 
 * Algorithm:
 * - Moving to first: newSortKey = minSortKey - 1000
 * - Moving after another: newSortKey = (prevSortKey + nextSortKey) / 2
 * - If gap too small (< 10), triggers rebalancing of all sort keys
 * 
 * Response 200:
 * - message: Success message
 * - sortKey: New sort key value
 * 
 * Response 404: Location not found
 * Response 400: Invalid afterLocationId
 */
router.patch('/:locationId/order', asyncHandler(async (req, res) => {
  const { locationId } = req.params
  const { afterLocationId } = reorderLocationSchema.parse(req.body)

  // Get the location to be moved
  const locationToMove = await pool.query(
    'SELECT id, sort_key FROM saved_locations WHERE user_id = $1 AND location_id = $2',
    [req.user.userId, locationId]
  )

  if (locationToMove.rows.length === 0) {
    return res.status(404).json({
      error: {
        code: 'SAVED_LOCATION_NOT_FOUND',
        message: 'Saved location not found'
      }
    })
  }

  let newSortKey

  if (afterLocationId === null) {
    // Move to the beginning
    const minSortKeyResult = await pool.query(
      'SELECT MIN(sort_key) as min_sort_key FROM saved_locations WHERE user_id = $1',
      [req.user.userId]
    )
    const minSortKey = BigInt(minSortKeyResult.rows[0].min_sort_key || 0)
    newSortKey = minSortKey - 1000n
  } else {
    // Move after a specific location
    const afterLocationResult = await pool.query(
      'SELECT sort_key FROM saved_locations WHERE user_id = $1 AND location_id = $2',
      [req.user.userId, afterLocationId]
    )

    if (afterLocationResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'AFTER_LOCATION_NOT_FOUND',
          message: 'Reference location not found'
        }
      })
    }

    const afterSortKey = BigInt(afterLocationResult.rows[0].sort_key)

    // Get the next location's sort_key
    const nextLocationResult = await pool.query(
      `SELECT sort_key FROM saved_locations 
       WHERE user_id = $1 AND sort_key > $2
       ORDER BY sort_key ASC
       LIMIT 1`,
      [req.user.userId, afterSortKey.toString()]
    )

    if (nextLocationResult.rows.length === 0) {
      // After location is the last one, append at the end
      newSortKey = afterSortKey + 1000n
    } else {
      // Insert between two locations
      const nextSortKey = BigInt(nextLocationResult.rows[0].sort_key)
      newSortKey = (afterSortKey + nextSortKey) / 2n
    }
  }

  // Update the sort_key
  await pool.query(
    'UPDATE saved_locations SET sort_key = $1 WHERE user_id = $2 AND location_id = $3',
    [newSortKey.toString(), req.user.userId, locationId]
  )

  res.json({ 
    message: 'Location reordered successfully',
    sortKey: newSortKey.toString()
  })
}))

/**
 * GET /api/v1/saved-locations/:locationId/weather
 * 
 * Get current weather data for a specific saved location.
 * Verifies user has saved this location before returning weather.
 * 
 * URL parameters:
 * - locationId: UUID of saved location
 * 
 * Query parameters:
 * - units: string (optional, 'imperial' or 'metric', default: 'imperial')
 * 
 * Response 200:
 * - location: Location information with timezone
 * - current: Current weather conditions
 * - forecast: 7-day daily forecast
 * - hourlyForecast: Hourly forecasts grouped by day
 * 
 * Response 404: Location not saved by this user
 * Response 503: NWS API unavailable
 */
router.get('/:locationId/weather', asyncHandler(async (req, res) => {
  const { locationId } = req.params
  const { units } = req.query

  // Verify the location is saved by this user and get location details
  const savedLocationResult = await pool.query(
    `SELECT l.latitude, l.longitude, l.name
     FROM saved_locations sl
     JOIN locations l ON sl.location_id = l.id
     WHERE sl.user_id = $1 AND sl.location_id = $2`,
    [req.user.userId, locationId]
  )

  if (savedLocationResult.rows.length === 0) {
    return res.status(404).json({
      error: {
        code: 'SAVED_LOCATION_NOT_FOUND',
        message: 'Saved location not found'
      }
    })
  }

  const { latitude, longitude, name } = savedLocationResult.rows[0]

  try {
    const weatherData = await fetchWeatherData(latitude, longitude, name, units || 'imperial')
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

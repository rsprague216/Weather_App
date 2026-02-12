/**
 * Request Validation Schemas
 * 
 * Zod validation schemas for all API endpoints.
 * Provides runtime type checking and data validation with detailed error messages.
 * 
 * Features:
 * - Email normalization (lowercase, trimmed)
 * - Strong password requirements
 * - UUID validation for database IDs
 * - Coordinate format validation
 * 
 * @module validators/schemas
 */

import { z } from 'zod'

/**
 * Password validation schema with security requirements.
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least one letter (uppercase or lowercase)
 * - At least one number
 */
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

/**
 * User signup validation schema.
 * Email is automatically normalized (lowercased and trimmed).
 */
export const signupSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: passwordSchema
})

/**
 * User login validation schema.
 * Email is automatically normalized (lowercased and trimmed).
 */
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z.string().min(1, 'Password is required')
})

/**
 * Saved location creation schema.
 * Validates UUID format for location references.
 */
export const savedLocationSchema = z.object({
  locationId: z.string().uuid('Invalid location ID')
})

/**
 * Location reorder schema.
 * Accepts null to move to first position, or UUID to move after specific location.
 */
export const reorderLocationSchema = z.object({
  afterLocationId: z.string().uuid().nullable()
})

/**
 * Location search query schema.
 * Validates search text input (city, address, coordinates, etc.)
 */
export const searchLocationSchema = z.object({
  q: z.string().min(1, 'Search query is required')
})

/**
 * Reverse geocoding schema.
 * Validates latitude/longitude coordinate strings.
 */
export const reverseGeocodeSchema = z.object({
  lat: z.string().regex(/^-?\d+\.?\d*$/, 'Invalid latitude'),
  lon: z.string().regex(/^-?\d+\.?\d*$/, 'Invalid longitude')
})

/**
 * Weather query schema.
 * Validates coordinates and optional unit preference (imperial/metric).
 */
export const weatherQuerySchema = z.object({
  lat: z.string().regex(/^-?\d+\.?\d*$/, 'Invalid latitude'),
  lon: z.string().regex(/^-?\d+\.?\d*$/, 'Invalid longitude'),
  units: z.enum(['imperial', 'metric']).optional().default('imperial')
})

/**
 * Natural language weather lookup schema.
 * Validates user's plain text query and optional unit preference.
 */
export const lookupSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  units: z.enum(['imperial', 'metric']).optional().default('imperial'),
  currentLocation: z
    .object({
      lat: z.coerce.number(),
      lon: z.coerce.number()
    })
    .optional()
})

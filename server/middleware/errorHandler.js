/**
 * Error Handler Middleware
 * 
 * Centralized error handling for consistent error responses across the API.
 * Handles validation errors, database errors, and generic errors with appropriate
 * HTTP status codes and error messages.
 * 
 * @module middleware/errorHandler
 */

/**
 * Global error handling middleware for Express.
 * 
 * Processes different types of errors and returns appropriate HTTP responses:
 * - Zod validation errors (400)
 * - Database unique constraint violations (409)
 * - Custom errors with statusCode property
 * - Generic server errors (500)
 * 
 * @param {Error} err - Error object caught by Express
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object} JSON error response
 * 
 * @example
 * // At the end of your Express app setup:
 * app.use(errorHandler)
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err)

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors
      }
    })
  }

  // Database errors
  if (err.code === '23505') { // Unique constraint violation
    return res.status(409).json({
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'This record already exists'
      }
    })
  }

  // Default error
  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred'
    }
  })
}

/**
 * Wraps async route handlers to automatically catch and forward errors.
 * 
 * Eliminates the need for try/catch blocks in every async route handler.
 * Any errors thrown or rejected promises will be caught and passed to
 * the error handling middleware.
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler
 * 
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.findAll() // Errors auto-caught
 *   res.json(users)
 * }))
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

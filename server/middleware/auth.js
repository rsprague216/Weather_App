/**
 * Authentication Middleware
 * 
 * Provides JWT-based authentication for protected routes.
 * Verifies tokens stored in httpOnly cookies for enhanced security.
 * 
 * @module middleware/auth
 */

import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

// Ensure JWT_SECRET is set at startup
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

/**
 * Middleware to authenticate requests using JWT tokens from httpOnly cookies.
 * 
 * Extracts the JWT token from the request cookies, verifies it, and attaches
 * the decoded user information to req.user for use in subsequent middleware/routes.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object|void} JSON error response or calls next()
 * 
 * @throws {401} UNAUTHORIZED - No token provided
 * @throws {401} TOKEN_EXPIRED - Token has expired
 * @throws {403} FORBIDDEN - Invalid token signature
 * 
 * @example
 * router.get('/protected', authenticateToken, (req, res) => {
 *   const userId = req.user.userId
 *   // ... handle request
 * })
 */
export const authenticateToken = (req, res, next) => {
  const token = req.cookies.token

  if (!token) {
    return res.status(401).json({ 
      error: { 
        code: 'UNAUTHORIZED', 
        message: 'Authentication required' 
      } 
    })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired'
        }
      })
    }
    
    return res.status(403).json({ 
      error: { 
        code: 'FORBIDDEN', 
        message: 'Invalid or expired token' 
      } 
    })
  }
}

/**
 * Generates a signed JWT token for a given user ID.
 * 
 * Creates a token with a 24-hour expiration time. The token contains
 * the user's ID in the payload for identification in protected routes.
 * 
 * @param {string} userId - UUID of the user
 * @returns {string} Signed JWT token
 * 
 * @example
 * const token = generateToken('123e4567-e89b-12d3-a456-426614174000')
 * res.cookie('token', token, { httpOnly: true, secure: true })
 */
export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

/**
 * Generate refresh token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' })
}

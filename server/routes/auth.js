/**
 * Authentication Routes
 * 
 * Handles user authentication operations including signup, login, token refresh,
 * logout, and user profile retrieval.
 * 
 * Security features:
 * - Argon2id password hashing
 * - JWT tokens in httpOnly cookies
 * - Refresh token rotation
 * - Email normalization
 * 
 * Endpoints:
 * - POST /signup - Register new user
 * - POST /login - Authenticate user
 * - POST /refresh - Refresh access token
 * - POST /logout - Clear authentication
 * - GET /me - Get current user info
 * 
 * @module routes/auth
 */

import express from 'express'
import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticateToken, generateToken, generateRefreshToken } from '../middleware/auth.js'
import { signupSchema, loginSchema } from '../validators/schemas.js'
import pool from '../utils/db.js'

const router = express.Router()

// Rate limiter specifically for login/signup attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth attempts per windowMs
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many authentication attempts, please try again later' } },
  skipSuccessfulRequests: true, // Only count failed attempts
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * POST /api/v1/auth/signup
 * 
 * Register a new user account.
 * 
 * Request body:
 * - email: string (valid email, will be normalized)
 * - password: string (min 8 chars, must include letter and number)
 * 
 * Response 201:
 * - user: { id, email, createdAt }
 * - Sets httpOnly cookies: token, refreshToken
 * 
 * Response 409: Email already exists
 * Response 400: Validation error
 */
router.post('/signup', authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = signupSchema.parse(req.body)

  // Check if user already exists
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  )

  if (existingUser.rows.length > 0) {
    return res.status(409).json({
      error: {
        code: 'USER_ALREADY_EXISTS',
        message: 'An account with this email already exists'
      }
    })
  }

  // Hash password with Argon2id
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id
  })

  // Create user
  const result = await pool.query(
    `INSERT INTO users (email, password_hash) 
     VALUES ($1, $2) 
     RETURNING id, email, created_at`,
    [email.toLowerCase(), passwordHash]
  )

  const user = result.rows[0]

  // Generate tokens
  const token = generateToken(user.id)
  const refreshToken = generateRefreshToken(user.id)

  // Set httpOnly cookies
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  })

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  })

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at
    }
  })
}))

/**
 * POST /api/v1/auth/login
 * 
 * Authenticate an existing user.
 * 
 * Request body:
 * - email: string (valid email, will be normalized)
 * - password: string
 * 
 * Response 200:
 * - user: { id, email, createdAt }
 * - Sets httpOnly cookies: token, refreshToken
 * 
 * Response 401: Invalid credentials
 * Response 400: Validation error
 */
router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body)

  // Find user
  const result = await pool.query(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
    [email.toLowerCase()]
  )

  if (result.rows.length === 0) {
    return res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    })
  }

  const user = result.rows[0]

  // Verify password
  const isValidPassword = await argon2.verify(user.password_hash, password)

  if (!isValidPassword) {
    return res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    })
  }

  // Generate tokens
  const token = generateToken(user.id)
  const refreshToken = generateRefreshToken(user.id)

  // Set httpOnly cookies
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  })

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  })

  res.json({
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at
    }
  })
}))

/**
 * POST /api/v1/auth/refresh
 * 
 * Refresh the access token using a valid refresh token.
 * Implements token rotation for enhanced security.
 * 
 * Requires: refreshToken cookie
 * 
 * Response 200:
 * - user: { id, email, createdAt }
 * - Sets new httpOnly cookies: token, refreshToken
 * 
 * Response 401: Invalid or expired refresh token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken
  const jwtSecret = process.env.JWT_SECRET

  if (!refreshToken) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Refresh token required'
      }
    })
  }

  if (!jwtSecret) {
    return res.status(500).json({
      error: {
        code: 'CONFIGURATION_ERROR',
        message: 'Server authentication is not configured'
      }
    })
  }

  try {
    const decoded = jwt.verify(refreshToken, jwtSecret)
    
    // Rotate both access and refresh tokens
    const token = generateToken(decoded.userId)
    const newRefreshToken = generateRefreshToken(decoded.userId)

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    })

    res.json({ message: 'Token refreshed successfully' })
  } catch (error) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid or expired refresh token'
      }
    })
  }
}))

/**
 * POST /api/v1/auth/logout
 * 
 * Logout user by clearing authentication cookies.
 * 
 * Response 200:
 * - message: Confirmation message
 * - Clears httpOnly cookies: token, refreshToken
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token')
  res.clearCookie('refreshToken')
  res.json({ message: 'Logged out successfully' })
})

/**
 * GET /api/v1/auth/me
 * 
 * Get current authenticated user's profile information.
 * 
 * Requires: Authentication (token cookie)
 * 
 * Response 200:
 * - user: { id, email, createdAt }
 * 
 * Response 401: Not authenticated
 * Response 404: User not found
 */
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT id, email, created_at FROM users WHERE id = $1',
    [req.user.userId]
  )

  if (result.rows.length === 0) {
    return res.status(404).json({
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }
    })
  }

  const user = result.rows[0]
  res.json({
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at
    }
  })
}))

export default router

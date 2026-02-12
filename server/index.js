import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import morgan from 'morgan'
import { errorHandler } from './middleware/errorHandler.js'
import pool from './utils/db.js'

// Import routes
import authRoutes from './routes/auth.js'
import savedLocationsRoutes from './routes/savedLocations.js'
import locationsRoutes from './routes/locations.js'
import weatherRoutes from './routes/weather.js'
import lookupRoutes from './routes/lookup.js'

dotenv.config()

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'OPENAI_API_KEY', 'POSTGRES_DB', 'POSTGRES_USER']
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '))
  console.error('Please check your .env file')
  process.exit(1)
}

if (process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
  console.warn('⚠️  WARNING: Using default JWT_SECRET. Please set a secure secret in production!')
}

const app = express()
const PORT = process.env.PORT || 5000

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}))

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false
})

// Apply rate limiting to all routes
app.use('/api/', limiter)

// Compression
app.use(compression())

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'))
} else {
  app.use(morgan('dev'))
}

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    message: '🎉 Server is running successfully!',
    timestamp: new Date().toISOString()
  })
})

// API v1 Routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/saved-locations', savedLocationsRoutes)
app.use('/api/v1/locations', locationsRoutes)
app.use('/api/v1/weather', weatherRoutes)
app.use('/api/v1/lookup', lookupRoutes)

// Error handling middleware (must be last)
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found'
    }
  })
})

// Database health check on startup
async function checkDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW()')
    console.log('✅ Database connected successfully')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    return false
  }
}

// Start server
let server

async function startServer() {
  // Check database connection
  const dbConnected = await checkDatabaseConnection()
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...')
    process.exit(1)
  }

  server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
    console.log(`📝 API documentation: http://localhost:${PORT}/api/health`)
    console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`)
  })
}

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`)
  
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed')
      
      try {
        await pool.end()
        console.log('Database connections closed')
        process.exit(0)
      } catch (error) {
        console.error('Error during shutdown:', error)
        process.exit(1)
      }
    })

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout')
      process.exit(1)
    }, 30000)
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  gracefulShutdown('UNCAUGHT_EXCEPTION')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown('UNHANDLED_REJECTION')
})

// Start the server
startServer()

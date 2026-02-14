import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import morgan from 'morgan'
import { fileURLToPath } from 'url'
import { errorHandler } from './middleware/errorHandler.js'
import pool from './utils/db.js'

// Import routes
import authRoutes from './routes/auth.js'
import savedLocationsRoutes from './routes/savedLocations.js'
import locationsRoutes from './routes/locations.js'
import weatherRoutes from './routes/weather.js'
import lookupRoutes from './routes/lookup.js'

dotenv.config()

function validateEnvironment() {
  const requiredEnvVars = ['JWT_SECRET']
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
  }

  if (process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
    console.warn('⚠️  WARNING: Using default JWT_SECRET. Please set a secure secret in production!')
  }
}

export function createApp(options = {}) {
  const { enableRateLimit = process.env.NODE_ENV !== 'test' } = options
  const app = express()

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

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later' } },
    standardHeaders: true,
    legacyHeaders: false
  })

  if (enableRateLimit) {
    app.use('/api/', limiter)
  }

  app.use(compression())

  if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'))
  } else if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'))
  }

  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))
  app.use(cookieParser())

  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }))

  app.get('/api/health', (req, res) => {
    res.json({
      message: '🎉 Server is running successfully!',
      timestamp: new Date().toISOString()
    })
  })

  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/saved-locations', savedLocationsRoutes)
  app.use('/api/v1/locations', locationsRoutes)
  app.use('/api/v1/weather', weatherRoutes)
  app.use('/api/v1/lookup', lookupRoutes)

  app.use(errorHandler)

  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found'
      }
    })
  })

  return app
}

export const app = createApp()

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

export async function startServer() {
  validateEnvironment()

  const dbConnected = await checkDatabaseConnection()
  if (!dbConnected) {
    throw new Error('Failed to connect to database')
  }

  const PORT = process.env.PORT || 5000

  server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
    console.log(`📝 API documentation: http://localhost:${PORT}/api/health`)
    console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`)
  })

  return server
}

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

function registerProcessHandlers() {
  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    gracefulShutdown('UNCAUGHT_EXCEPTION')
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    gracefulShutdown('UNHANDLED_REJECTION')
  })
}

const isDirectExecution = process.argv[1] === fileURLToPath(import.meta.url)

if (isDirectExecution) {
  registerProcessHandlers()
  startServer().catch((error) => {
    console.error('❌ Server startup failed:', error.message)
    process.exit(1)
  })
}

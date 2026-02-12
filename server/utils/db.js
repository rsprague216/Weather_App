/**
 * Database Connection Pool
 * 
 * PostgreSQL connection pool configuration with production-ready settings.
 * Manages database connections efficiently with automatic connection reuse,
 * idle timeout, and error handling.
 * 
 * @module utils/db
 */

import pkg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pkg

/**
 * PostgreSQL connection pool instance.
 * 
 * Configuration:
 * - Max 20 concurrent connections
 * - 30 second idle timeout (closes unused connections)
 * - 2 second connection timeout (fail fast on connection issues)
 * 
 * Environment variables:
 * - POSTGRES_HOST: Database host (default: localhost)
 * - POSTGRES_PORT: Database port (default: 5432)
 * - POSTGRES_DB: Database name (default: weather_app)
 * - POSTGRES_USER: Database user (default: postgres)
 * - POSTGRES_PASSWORD: Database password (default: postgres)
 */
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'weather_app',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000 // Return an error after 2 seconds if connection cannot be established
})

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

// Log pool connection events in development
if (process.env.NODE_ENV !== 'production') {
  pool.on('connect', () => {
    console.log('New database connection established')
  })
  
  pool.on('remove', () => {
    console.log('Database connection removed from pool')
  })
}

export default pool

# Backend Technologies Documentation

## Overview

The Weather App backend is built with Node.js and Express, following modern industry standards for security, performance, and maintainability. This document provides a comprehensive overview of all technologies, libraries, and architectural patterns used.

---

## Core Technologies

### Runtime & Framework

#### **Node.js** (v18+)
- **Purpose**: JavaScript runtime environment
- **Why**: Asynchronous I/O, large ecosystem, unified language with frontend
- **Configuration**: ES Modules (`"type": "module"` in package.json)

#### **Express.js** (v4.18+)
- **Purpose**: Web application framework
- **Why**: Minimal, flexible, industry standard for Node.js APIs
- **Features Used**:
  - Route handling
  - Middleware pipeline
  - JSON parsing
  - Cookie parsing
  - Static file serving

---

## Database

### **PostgreSQL** (v15+)
- **Purpose**: Primary relational database
- **Why**: 
  - ACID compliance
  - Rich data types (UUID, BIGINT for sort keys)
  - Strong consistency
  - Industry-standard for production apps
- **Driver**: `pg` (node-postgres)
  - Connection pooling (max 20 connections)
  - Prepared statements (SQL injection prevention)
  - Async/await support

#### Database Schema

**users** table:
```sql
- id (UUID, primary key)
- email (VARCHAR, unique, indexed)
- password_hash (VARCHAR)
- created_at (TIMESTAMP)
```

**locations** table:
```sql
- id (UUID, primary key)
- external_id (VARCHAR, unique) -- Nominatim place_id
- name (VARCHAR)
- region (VARCHAR)
- country (VARCHAR)
- latitude (DECIMAL)
- longitude (DECIMAL)
- timezone (VARCHAR)
- created_at (TIMESTAMP)
```

**saved_locations** table:
```sql
- id (UUID, primary key)
- user_id (UUID, foreign key → users.id)
- location_id (UUID, foreign key → locations.id)
- sort_key (BIGINT) -- For reordering
- created_at (TIMESTAMP)
- UNIQUE constraint on (user_id, location_id)
```

---

## Authentication & Security

### **Argon2id** (`argon2`)
- **Purpose**: Password hashing
- **Why**: 
  - Winner of Password Hashing Competition (PHC)
  - Resistant to GPU/ASIC attacks
  - Better than bcrypt/scrypt
- **Usage**: Hash passwords on signup, verify on login

### **JSON Web Tokens** (`jsonwebtoken`)
- **Purpose**: Stateless authentication
- **Why**: Scalable, no server-side session storage
- **Implementation**:
  - Access token (24 hour expiry)
  - Refresh token (30 day expiry)
  - Stored in httpOnly cookies (not localStorage)
  - Token rotation on refresh

### **Helmet.js** (`helmet`)
- **Purpose**: HTTP security headers
- **Headers Set**:
  - Content Security Policy (CSP)
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Strict-Transport-Security (HSTS)
  - X-XSS-Protection
- **Why**: Protects against common web vulnerabilities

### **Express Rate Limit** (`express-rate-limit`)
- **Purpose**: Rate limiting / DDoS protection
- **Configuration**:
  - General API: 100 requests per 15 minutes
  - Auth endpoints: 5 requests per 15 minutes
- **Why**: Prevents abuse, ensures fair resource usage

---

## Validation

### **Zod** (`zod`)
- **Purpose**: Runtime type validation and parsing
- **Why**:
  - TypeScript-like schemas in JavaScript
  - Detailed error messages
  - Type inference
  - Composable schemas
- **Usage**: Validate all request bodies and query parameters
- **Schemas**:
  - signupSchema, loginSchema
  - searchLocationSchema, reverseGeocodeSchema
  - weatherQuerySchema, lookupSchema
  - savedLocationSchema, reorderLocationSchema

---

## External APIs

### **National Weather Service (NWS) API**
- **Purpose**: Weather data (forecasts, current conditions)
- **Cost**: FREE (no API key required)
- **Coverage**: United States only
- **Endpoints Used**:
  - `/points/{lat},{lon}` - Get gridpoint data and forecast URLs
  - `/gridpoints/{office}/{x},{y}/forecast` - 7-day forecast
  - `/gridpoints/{office}/{x},{y}/forecast/hourly` - Hourly forecast
- **Data Provided**:
  - Temperature (Fahrenheit)
  - Conditions (text + icon URL)
  - Wind speed/direction
  - Precipitation probability
  - Relative humidity
  - Timezone information
- **Why**: Free, reliable, no rate limits, official government API

### **Nominatim (OpenStreetMap)**
- **Purpose**: Geocoding and reverse geocoding
- **Cost**: FREE
- **Endpoints Used**:
  - `/search` - Text search to coordinates
  - `/reverse` - Coordinates to location name
- **Why**: Free, no API key, global coverage
- **Usage Policy**: Must include User-Agent header

### **OpenAI GPT-4** (`openai`)
- **Purpose**: Natural language intent extraction
- **Model**: `gpt-4-turbo-preview`
- **Cost**: Paid (usage-based)
- **Method**: Function calling (tool-based, not chat)
- **Why**: 
  - Accurate intent extraction
  - Structured output via function calling
  - Not conversational (predictable results)
- **Intent Types**:
  - CURRENT (current weather)
  - DAY (specific day forecast)
  - HOURLY_WINDOW (time range forecast)
  - DATE_RANGE (multi-day forecast)

---

## HTTP Client

### **Axios** (`axios`)
- **Purpose**: HTTP requests to external APIs
- **Why**: 
  - Promise-based
  - Automatic JSON parsing
  - Request/response interceptors
  - Better than native fetch for error handling
- **Custom Configuration** (`utils/axios.js`):
  - 10 second timeout
  - Automatic retry logic (max 2 retries)
  - Exponential backoff (2s, 4s)
  - Custom User-Agent header
  - Only retries on network errors or 5xx responses

---

## Performance & Reliability

### **Compression** (`compression`)
- **Purpose**: Response compression (gzip/deflate)
- **Why**: Reduces bandwidth, faster responses
- **Compression Ratio**: Typically 70-90% reduction for JSON

### **Database Connection Pooling** (`pg.Pool`)
- **Configuration**:
  - Max connections: 20
  - Idle timeout: 30 seconds
  - Connection timeout: 2 seconds
- **Why**: Reuse connections, better performance, resource management

### **Retry Logic** (Axios interceptor)
- **Strategy**: Exponential backoff
- **Retries**: Up to 2 times
- **Conditions**: Network errors or 5xx server errors
- **Why**: Resilience to transient failures

---

## Logging & Monitoring

### **Morgan** (`morgan`)
- **Purpose**: HTTP request logging
- **Format**: 'combined' (Apache-style)
- **Output**: Console (can pipe to file/service)
- **Logged Data**:
  - HTTP method, path
  - Status code
  - Response time
  - Content length
  - User agent

### **Custom Logger** (`utils/logger.js`)
- **Purpose**: Application logging
- **Levels**: ERROR, WARN, INFO, DEBUG
- **Format**: Timestamp + level + message
- **Environment**: DEBUG in dev, INFO in production

---

## Error Handling

### **Custom Error Handler** (`middleware/errorHandler.js`)
- **Features**:
  - Centralized error handling
  - Consistent error response format
  - Zod validation error handling
  - Database error handling (e.g., unique constraint)
  - Custom status codes and error codes

### **Async Handler Wrapper**
- **Purpose**: Eliminate try/catch in every route
- **How**: Wraps async route handlers, catches errors, forwards to error middleware

### **Graceful Shutdown**
- **Signals**: SIGTERM, SIGINT
- **Process**:
  1. Stop accepting new connections
  2. Close HTTP server
  3. Close database pool
  4. Exit process
- **Why**: Proper cleanup, no data loss during deployments

---

## Development Tools

### **Nodemon** (`nodemon`)
- **Purpose**: Auto-restart on file changes
- **Configuration**: Watches `.js` files
- **Why**: Faster development workflow

### **Dotenv** (`dotenv`)
- **Purpose**: Load environment variables from `.env` file
- **Why**: Keep secrets out of code
- **Variables Used**:
  - `JWT_SECRET` (required)
  - `OPENAI_API_KEY` (required)
  - `POSTGRES_*` (database config)
  - `NODE_ENV` (environment)
  - `PORT` (server port)

### **Cookie Parser** (`cookie-parser`)
- **Purpose**: Parse cookies from HTTP requests
- **Why**: Read JWT tokens from httpOnly cookies

---

## Architecture Patterns

### **Modular Route Organization**
```
routes/
  ├── auth.js          # Authentication
  ├── locations.js     # Location search/geocoding
  ├── weather.js       # Weather data
  ├── savedLocations.js # User's saved locations
  └── lookup.js        # AI natural language queries
```

### **Separation of Concerns**
- **Routes**: HTTP request/response handling
- **Middleware**: Cross-cutting concerns (auth, errors, validation)
- **Validators**: Input validation schemas
- **Utils**: Reusable utilities (db, axios, weather, logger)

### **Gapped Sort Keys**
- **Purpose**: Efficient reordering without updating all records
- **Implementation**: BIGINT with 1000-unit gaps
- **Algorithm**:
  - New items: `max_sort_key + 1000`
  - Reorder: `(prev_sort_key + next_sort_key) / 2`
  - Rebalance: When gap < 10

### **Middleware Pipeline**
```
Request
  ↓
Environment Validation → Helmet → Rate Limiting → Compression
  ↓
Morgan Logging → Cookie Parser → Body Parser
  ↓
CORS → Route-specific Auth
  ↓
Route Handler → Response Compression
  ↓
Error Handler → Response
```

---

## Environment Variables

### Required
- `JWT_SECRET`: Secret key for signing JWTs (generate with `openssl rand -base64 32`)
- `OPENAI_API_KEY`: OpenAI API key for AI lookups

### Database
- `POSTGRES_HOST`: Database host (default: localhost)
- `POSTGRES_PORT`: Database port (default: 5432)
- `POSTGRES_DB`: Database name (default: weather_app)
- `POSTGRES_USER`: Database user (default: postgres)
- `POSTGRES_PASSWORD`: Database password (default: postgres)

### Optional
- `PORT`: Server port (default: 5001)
- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging verbosity (ERROR/WARN/INFO/DEBUG)

---

## API Versioning

### Strategy
- **Prefix**: `/api/v1/`
- **Why**: Backwards compatibility, gradual migration
- **Future**: Can add `/api/v2/` without breaking v1 clients

---

## Security Best Practices Implemented

✅ **No SQL Injection**: Parameterized queries only  
✅ **No Plaintext Passwords**: Argon2id hashing  
✅ **No Token in LocalStorage**: httpOnly cookies only  
✅ **CORS Configured**: Specific origin, not wildcard  
✅ **Rate Limiting**: Prevent brute force and DDoS  
✅ **Security Headers**: Helmet.js  
✅ **Environment Validation**: Server won't start without required vars  
✅ **JWT Expiry**: Tokens expire (24h access, 30d refresh)  
✅ **Input Validation**: Zod on all inputs  
✅ **Error Sanitization**: Don't leak sensitive details  

---

## Performance Optimizations

✅ **Connection Pooling**: Reuse database connections  
✅ **Response Compression**: gzip/deflate compression  
✅ **Retry Logic**: Automatic retry with backoff  
✅ **Concurrent Requests**: Promise.all for parallel API calls  
✅ **Efficient Indexing**: Database indexes on email, external_id  
✅ **Gapped Sort Keys**: Efficient reordering without full table updates  

---

## Production Readiness

### Implemented
- ✅ Environment variable validation
- ✅ Graceful shutdown handling
- ✅ Database connection pooling
- ✅ HTTP request logging
- ✅ Error tracking
- ✅ Rate limiting
- ✅ Security headers
- ✅ Request compression

### Recommended Additions
- [ ] Error tracking service (Sentry, Rollbar)
- [ ] Application performance monitoring (New Relic, Datadog)
- [ ] Database backups + disaster recovery
- [ ] SSL/TLS certificates (Let's Encrypt)
- [ ] Reverse proxy (nginx, Caddy)
- [ ] Process manager (PM2, systemd)
- [ ] Log aggregation (ELK, Splunk, CloudWatch)
- [ ] Health check endpoint monitoring
- [ ] Load balancing (if scaling horizontally)

---

## File Structure

```
server/
├── index.js                 # Application entry point
├── package.json             # Dependencies and scripts
├── .env                     # Environment variables (not committed)
├── .prettierrc              # Code formatting rules
├── PRODUCTION.md            # Production deployment guide
├── BACKEND_TECHNOLOGIES.md  # This file
│
├── db/                      # Database setup
│   ├── create-db.js         # Database creation script
│   ├── init.js              # Run migrations
│   └── migrations/          # SQL migration files
│       ├── 001_create_users_table.sql
│       ├── 002_create_locations_table.sql
│       └── 003_create_saved_locations_table.sql
│
├── middleware/              # Express middleware
│   ├── auth.js              # JWT authentication
│   └── errorHandler.js      # Global error handling
│
├── routes/                  # API route handlers
│   ├── auth.js              # Authentication endpoints
│   ├── locations.js         # Location search/geocoding
│   ├── weather.js           # Weather data
│   ├── savedLocations.js    # Saved locations CRUD
│   └── lookup.js            # AI natural language queries
│
├── utils/                   # Utility modules
│   ├── axios.js             # Configured HTTP client
│   ├── db.js                # Database connection pool
│   ├── logger.js            # Application logger
│   └── weatherService.js    # Weather data service
│
└── validators/              # Request validation
    └── schemas.js           # Zod validation schemas
```

---

## Testing Strategy

### Manual Testing (Current)
- cURL commands for endpoint testing
- Database queries for data verification
- Server logs for error tracking

### Recommended Testing Framework
```bash
# Unit tests
- Jest + Supertest for API endpoint testing
- Sinon for mocking external APIs
- Coverage: 80%+ target

# Integration tests
- Test database interactions
- Test external API integrations
- Test error handling

# E2E tests
- Playwright or Cypress
- Test full user workflows
```

---

## Scaling Considerations

### Current Capacity
- Single instance can handle ~1000 concurrent users
- Database pooled connections: 20
- Rate limits prevent abuse

### Horizontal Scaling
- Stateless authentication (JWT) enables easy horizontal scaling
- Add load balancer (nginx, AWS ALB)
- Session affinity not required
- Database becomes bottleneck → read replicas

### Caching Strategy (Future)
- Redis for:
  - Location search results (1 hour TTL)
  - Weather data (15 minute TTL)
  - Geocoding results (24 hour TTL)
- Reduces API calls to NWS and Nominatim

---

## Documentation Standards

### JSDoc Comments
- All functions have complete JSDoc headers
- Parameter types and descriptions
- Return types and descriptions
- @throws for error conditions
- @example for complex functions
- @private for internal functions

### Code Comments
- Inline comments explain "why", not "what"
- Complex algorithms documented
- Business logic rationale included
- Reference to design docs where applicable

---

## License & Attribution

### Dependencies
All dependencies are open source and production-ready:
- MIT License: express, axios, zod, morgan, nodemon
- Apache 2.0: helmet
- ISC: argon2, cookie-parser

### External APIs
- **NWS API**: Public domain (U.S. government)
- **Nominatim**: ODbL (OpenStreetMap)
- **OpenAI**: Commercial license required

---

## Maintenance & Updates

### Dependency Updates
```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Security audit
npm audit

# Fix vulnerabilities
npm audit fix
```

### Monitoring Checklist
- [ ] Check server logs daily
- [ ] Monitor error rates
- [ ] Review rate limit hits
- [ ] Check database connection pool usage
- [ ] Monitor external API response times
- [ ] Review security headers

---

## Support & Resources

### Documentation
- [Express.js Docs](https://expressjs.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [NWS API Docs](https://www.weather.gov/documentation/services-web-api)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Zod Docs](https://zod.dev/)

### Design Documents
- `weather_app_design_v1_1.md` - Complete system design
- `PRODUCTION.md` - Production deployment guide
- `.github/copilot-instructions.md` - Development guidelines

---

**Last Updated**: February 11, 2026  
**Version**: 1.0  
**Maintainer**: Weather App Team

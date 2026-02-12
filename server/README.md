# Weather App Server

Node.js + Express backend for the Weather App.

## Data Sources

- **Weather Data:** [National Weather Service (NWS) API](https://www.weather.gov/documentation/services-web-api) - Free, no API key required
- **Geocoding:** [Nominatim (OpenStreetMap)](https://nominatim.org) - Free, no API key required  
- **AI Lookups:** [OpenAI GPT-4](https://platform.openai.com) - Requires API key

**Important:** NWS API only provides weather data for US locations. Geocoding is restricted to US addresses.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=your-openai-api-key-here
   ```

3. **Set up the database:**
   ```bash
   npm run db:setup
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

Server will run on `http://localhost:5000`

## API Documentation

See [API.md](./API.md) for complete API documentation.

## Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run db:create` - Create the database
- `npm run db:migrate` - Run migrations
- `npm run db:setup` - Create database and run migrations

## Project Structure

```
server/
├── index.js              # Main server file
├── routes/               # API route handlers
│   ├── auth.js          # Authentication endpoints
│   ├── savedLocations.js # Saved locations management
│   ├── locations.js     # Location search & geocoding
│   ├── weather.js       # Weather data endpoints
│   └── lookup.js        # AI-powered natural language queries
├── middleware/          # Express middleware
│   ├── auth.js         # JWT authentication
│   └── errorHandler.js # Global error handling
├── validators/          # Request validation schemas
│   └── schemas.js      # Zod validation schemas
├── utils/              # Utility functions
│   └── db.js          # PostgreSQL connection pool
└── db/                # Database setup
    ├── init.js        # Migration runner
    └── migrations/    # SQL migration files
```

## Features

✅ JWT authentication with httpOnly cookies  
✅ Argon2id password hashing  
✅ 7-day weather forecasts with hourly data  
✅ Location search and reverse geocoding  
✅ Saved locations with drag-and-drop reordering  
✅ Natural language weather queries using OpenAI  
✅ Comprehensive error handling  
✅ Request validation with Zod  

## Weather Data Notes

The NWS API provides:
- Current conditions
- 7-day forecasts
- Hourly forecasts
- Temperature, precipitation, wind, humidity, and more
- All data in both imperial and metric units

**Limitations:**
- US locations only
- No historical weather data
- Forecasts limited to 7 days

For non-US locations, consider switching to a different weather API provider in the future.

## License

ISC

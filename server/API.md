# Weather App API Documentation

API endpoints for the Weather App backend.

Base URL: `http://localhost:5000/api/v1`

## Weather Data Sources

**Weather:** National Weather Service (NWS) API - https://api.weather.gov  
**Geocoding:** Nominatim (OpenStreetMap) - https://nominatim.openstreetmap.org  
**AI:** OpenAI GPT-4 for natural language intent extraction

**Note:** This app currently only supports US locations due to NWS API coverage limitations.

## Authentication

All endpoints except auth endpoints require a valid JWT token in an httpOnly cookie.

### POST `/auth/signup`

Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2026-02-11T..."
  }
}
```

**Error (409):**
```json
{
  "error": {
    "code": "USER_ALREADY_EXISTS",
    "message": "An account with this email already exists"
  }
}
```

### POST `/auth/login`

Authenticate user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2026-02-11T..."
  }
}
```

**Error (401):**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

### POST `/auth/refresh`

Refresh access token using refresh token.

**Response (200):**
```json
{
  "message": "Token refreshed successfully"
}
```

### POST `/auth/logout`

Logout user by clearing cookies.

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

### GET `/auth/me`

Get current authenticated user.

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "createdAt": "2026-02-11T..."
  }
}
```

---

## Saved Locations

### GET `/saved-locations`

Get all saved locations for the authenticated user.

**Response (200):**
```json
{
  "locations": [
    {
      "id": "uuid",
      "externalId": "lat,lon",
      "name": "San Francisco",
      "region": "California",
      "country": "USA",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "timezone": "America/Los_Angeles",
      "sortKey": "1000"
    }
  ]
}
```

### POST `/saved-locations`

Save a new location.

**Request Body:**
```json
{
  "locationId": "uuid"
}
```

**Response (201):**
```json
{
  "location": {
    "id": "uuid",
    "externalId": "lat,lon",
    "name": "Denver",
    "region": "Colorado",
    "country": "USA",
    "latitude": 39.7392,
    "longitude": -104.9903,
    "timezone": "America/Denver",
    "sortKey": "2000"
  }
}
```

**Error (409):**
```json
{
  "error": {
    "code": "LOCATION_ALREADY_SAVED",
    "message": "You've already saved this location."
  }
}
```

### DELETE `/saved-locations/:locationId`

Remove a saved location.

**Response (204):** No content

**Error (404):**
```json
{
  "error": {
    "code": "SAVED_LOCATION_NOT_FOUND",
    "message": "Saved location not found"
  }
}
```

### PATCH `/saved-locations/:locationId/order`

Reorder a saved location.

**Request Body:**
```json
{
  "afterLocationId": "uuid"  // or null to move to beginning
}
```

**Response (200):**
```json
{
  "message": "Location reordered successfully",
  "sortKey": "1500"
}
```

---

## Locations (Search)

### GET `/locations/search?q=...`

Search for locations by name.

**Query Parameters:**
- `q` (string, required): Search query

**Response (200):**
```json
{
  "locations": [
    {
      "id": "uuid",
      "name": "Denver",
      "region": "Colorado",
      "country": "USA",
      "latitude": 39.7392,
      "longitude": -104.9903
    }
  ]
}
```

### GET `/locations/reverse?lat=..&lon=..`

Reverse geocode coordinates to location.

**Query Parameters:**
- `lat` (string, required): Latitude
- `lon` (string, required): Longitude

**Response (200):**
```json
{
  "location": {
    "id": "uuid",
    "name": "Denver",
    "region": "Colorado",
    "country": "USA",
    "latitude": 39.7392,
    "longitude": -104.9903,
    "timezone": "America/Denver"
  }
}
```

---

## Weather

### GET `/weather?lat=..&lon=..&units=imperial`

Get weather data for coordinates.

**Query Parameters:**
- `lat` (string, required): Latitude
- `lon` (string, required): Longitude
- `units` (string, optional): `imperial` or `metric` (default: `imperial`)

**Response (200):**
```json
{
  "location": {
    "name": "Denver",
    "region": "Colorado",
    "country": "USA",
    "latitude": 39.7392,
    "longitude": -104.9903,
    "timezone": "America/Denver",
    "localtime": "2026-02-11 10:30"
  },
  "current": {
    "tempF": 58,
    "tempC": 14,
    "condition": "Partly cloudy",
    "conditionIcon": "//cdn.weatherapi.com/...",
    "windMph": 10,
    "windKph": 16,
    "windDir": "W",
    "humidity": 45,
    "feelsLikeF": 55,
    "feelsLikeC": 13,
    "precipIn": 0,
    "precipMm": 0,
    "pressure": 30.1,
    "uv": 5,
    "visibilityMiles": 10,
    "visibilityKm": 16
  },
  "forecast": [
    {
      "date": "2026-02-11",
      "dateEpoch": 1739232000,
      "day": {
        "maxTempF": 62,
        "maxTempC": 17,
        "minTempF": 42,
        "minTempC": 6,
        "avgTempF": 52,
        "avgTempC": 11,
        "condition": "Partly cloudy",
        "conditionIcon": "//cdn.weatherapi.com/...",
        "maxWindMph": 15,
        "maxWindKph": 24,
        "precipIn": 0,
        "precipMm": 0,
        "avgHumidity": 50,
        "dailyChanceOfRain": 20,
        "dailyChanceOfSnow": 0,
        "uv": 5
      },
      "astro": {
        "sunrise": "06:45 AM",
        "sunset": "05:30 PM",
        "moonrise": "08:15 PM",
        "moonset": "07:30 AM",
        "moonPhase": "Waxing Gibbous"
      },
      "hourly": [
        {
          "timeEpoch": 1739232000,
          "time": "2026-02-11 00:00",
          "tempF": 45,
          "tempC": 7,
          "condition": "Clear",
          "conditionIcon": "//cdn.weatherapi.com/...",
          "windMph": 8,
          "windKph": 13,
          "windDir": "W",
          "humidity": 60,
          "feelsLikeF": 42,
          "feelsLikeC": 6,
          "chanceOfRain": 10,
          "chanceOfSnow": 0,
          "precipIn": 0,
          "precipMm": 0,
          "uv": 0
        }
        // ... more hourly data
      ]
    }
    // ... more forecast days
  ]
}
```

### GET `/saved-locations/:locationId/weather?units=imperial`

Get weather data for a saved location.

**URL Parameters:**
- `locationId` (uuid, required): Saved location ID

**Query Parameters:**
- `units` (string, optional): `imperial` or `metric` (default: `imperial`)

**Response:** Same as `/weather` endpoint

---

## AI Lookup

### POST `/lookup`

Natural language weather lookup using OpenAI.

**Request Body:**
```json
{
  "query": "Weather in Denver tomorrow",
  "units": "imperial"
}
```

**Response (200):**
```json
{
  "summaryText": "Denver will be partly cloudy tomorrow with highs around 58°F.",
  "card": {
    "type": "DAY",
    "title": "Denver, CO • Tomorrow",
    "metrics": {
      "high": 58,
      "low": 42,
      "precipChance": 20
    }
  }
}
```

**Card Types:**

1. **CURRENT**
```json
{
  "type": "CURRENT",
  "title": "Denver, CO",
  "metrics": {
    "temperature": 58,
    "feelsLike": 55,
    "condition": "Partly cloudy",
    "humidity": 45,
    "windSpeed": 10
  }
}
```

2. **DAY**
```json
{
  "type": "DAY",
  "title": "Denver, CO • Tomorrow",
  "metrics": {
    "high": 58,
    "low": 42,
    "precipChance": 20
  }
}
```

3. **HOURLY_WINDOW**
```json
{
  "type": "HOURLY_WINDOW",
  "title": "Denver, CO • 9:00-17:00",
  "hourlyData": [
    {
      "hour": 9,
      "temp": 50,
      "condition": "Partly cloudy",
      "precipChance": 10
    }
    // ... more hours
  ]
}
```

4. **DATE_RANGE**
```json
{
  "type": "DATE_RANGE",
  "title": "Denver, CO • 2026-02-11 to 2026-02-15",
  "dailyData": [
    {
      "date": "2026-02-11",
      "high": 58,
      "low": 42,
      "condition": "Partly cloudy"
    }
    // ... more days
  ]
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

Common error codes:
- `UNAUTHORIZED` (401): Authentication required
- `FORBIDDEN` (403): Invalid or expired token
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Duplicate entry
- `VALIDATION_ERROR` (400): Invalid request data
- `INTERNAL_SERVER_ERROR` (500): Server error

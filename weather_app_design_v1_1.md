# Weather Web App

## Product & Technical Design Document

**Version:** 1.1\
**Stack:** React + Vite + Tailwind (Frontend) \| Node.js + PostgreSQL
(Backend)

------------------------------------------------------------------------

# 1. Product Overview

## Purpose

A responsive weather web application that allows users to:

-   View detailed weather for their current location
-   Save and reorder multiple locations
-   Navigate between saved locations via card UI
-   Use a natural-language weather lookup tool (non-conversational AI)

The AI feature acts strictly as a natural language weather query
interface, not a chat agent.

------------------------------------------------------------------------

# 2. Core Product Principles

1.  Mobile-first responsive design
2.  Single canonical layout for weather detail
3.  Deterministic AI behavior (no back-and-forth chat)
4.  Saved locations are unique per user
5.  Current location always appears first
6.  Add-location card always appears last
7.  Minimal conversational UX --- tool, not chatbot

------------------------------------------------------------------------

# 3. Tech Stack

## Frontend

-   React + Vite
-   TailwindCSS
-   React Router
-   TanStack Query (recommended)
-   Mobile-first responsive design

## Backend

-   Node.js
-   PostgreSQL
-   JWT Authentication (httpOnly cookies)
-   Argon2id password hashing
-   Zod schema validation
-   OpenAI structured tool-based intent extraction

------------------------------------------------------------------------

# 4. Database Schema

## Users

-   id (UUID)
-   email (CITEXT, unique)
-   password_hash (Argon2)
-   created_at
-   updated_at

## Locations

-   id (UUID)
-   external_id (provider place ID)
-   name
-   region
-   country
-   latitude
-   longitude
-   timezone

## Saved Locations

-   id (UUID)
-   user_id (FK)
-   location_id (FK)
-   sort_key (BIGINT, gapped ordering)
-   created_at
-   updated_at

Constraints: - UNIQUE (user_id, location_id) --- prevents duplicates -
Current location is NOT stored in saved_locations

------------------------------------------------------------------------

# 5. API Endpoints

All endpoints are prefixed with `/api/v1`.

## Auth

POST `/auth/signup`\
POST `/auth/login`\
POST `/auth/refresh`\
POST `/auth/logout`\
GET `/auth/me`

## Saved Locations

GET `/saved-locations`\
POST `/saved-locations` (returns 201 or 409 if already saved)\
DELETE `/saved-locations/:locationId`\
PATCH `/saved-locations/:locationId/order`

Duplicate Save Response (409):

``` json
{
  "error": {
    "code": "LOCATION_ALREADY_SAVED",
    "message": "You’ve already saved this location."
  }
}
```

## Locations (Search)

GET `/locations/search?q=...`\
GET `/locations/reverse?lat=..&lon=..`

## Weather

GET `/weather?lat=..&lon=..&units=imperial`\
GET `/saved-locations/:locationId/weather?units=imperial`

## AI Lookup

POST `/lookup`

Request:

``` json
{ "query": "Weather in Denver tomorrow", "units": "imperial" }
```

Response:

``` json
{
  "summaryText": "Denver will be partly cloudy tomorrow with highs around 58°F.",
  "card": {
    "type": "DAY",
    "title": "Denver, CO • Tomorrow",
    "metrics": { "high": 58, "low": 42, "precipChance": 20 }
  }
}
```

------------------------------------------------------------------------

# 6. React Component Structure

## Folder Structure

    src/
      app/
        routes/
          AppLayout.tsx
          ProtectedRoute.tsx

        pages/
          LoginPage.tsx
          SignupPage.tsx
          SavedLocationsPage.tsx
          LocationDetailPage.tsx
          AddLocationPage.tsx

        components/
          topbar/
            TopBar.tsx
            UserMenu.tsx

          location/
            LocationHeader.tsx
            MetricsRow.tsx
            HourlyForecast.tsx
            DailyForecast.tsx
            DetailsSection.tsx
            LocationActions.tsx

          saved/
            SavedLocationsGrid.tsx
            LocationCard.tsx
            CurrentLocationCard.tsx
            AddLocationCard.tsx

          add-location/
            AddLocationModal.tsx
            AddLocationSearchInput.tsx
            LocationSearchResults.tsx

          lookup/
            WeatherLookupPanel.tsx
            WeatherLookupModal.tsx
            WeatherLookupInput.tsx
            LookupResult.tsx
            TemporaryWeatherCard.tsx

        api/
          auth.ts
          savedLocations.ts
          locations.ts
          weather.ts
          lookup.ts

        hooks/
          useAuth.ts
          useSavedLocations.ts
          useWeather.ts
          useLookupWeather.ts
          useGeolocation.ts

------------------------------------------------------------------------

# 7. Routing

Public: - `/login` - `/signup`

Protected: - `/app/saved` - `/app/location/current` -
`/app/location/:locationId` - `/app/add-location` (mobile full page) -
Desktop uses modal for Add Location

------------------------------------------------------------------------

# 8. Responsive Design Summary

Mobile: - Vertical layout - Carousel for saved locations - Fullscreen AI
lookup

Desktop: - Two-column weather layout - Grid saved locations - Right-side
AI lookup panel - Add-location modal

------------------------------------------------------------------------

# 9. AI Intent Types

Supported intents: - CURRENT - DAY - HOURLY_WINDOW - DATE_RANGE

AI extracts structured intent → backend validates → backend fetches
weather → returns summary + temporary card.

No conversational memory. No history stored.

------------------------------------------------------------------------

# 10. System Architecture Summary

Frontend: - Stateless display layer - Uses backend for weather + AI
processing

Backend: - Handles geocoding - Weather provider proxy - AI intent
parsing - Card payload generation - Authentication - Saved location
management

Database: - Stores users and saved locations - Does not store weather
data - Does not store chat history

------------------------------------------------------------------------

# End of Document

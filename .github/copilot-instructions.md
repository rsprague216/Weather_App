# Project Guidelines

## Architecture

Monorepo structure: `client/` (React + Vite + TailwindCSS) and `server/` (Node.js + Express + PostgreSQL).
- Frontend proxies `/api` requests to backend via [vite.config.js](../client/vite.config.js)
- Backend runs on port 5000, frontend on port 3000
- Both use ES Modules (`"type": "module"` in package.json files)
- See [weather_app_design_v1_1.md](../weather_app_design_v1_1.md) for complete architecture

## Build and Test

```bash
npm run install:all      # Install all dependencies
npm run dev              # Run both client and server concurrently
npm run dev:client       # Frontend only (port 3000)
npm run dev:server       # Backend only (port 5000)
npm run build            # Build production client
```

## Code Style

- **React**: Functional components with hooks, JSX syntax ([App.jsx](../client/src/App.jsx))
- **API calls**: Use axios with async/await
- **CSS**: TailwindCSS utility classes, mobile-first responsive design
- **Backend**: Express route handlers with async error handling
- **Imports**: ES6 import/export syntax throughout

## Project Conventions

- **Component structure**: Follow planned folder hierarchy in design doc (app/pages, app/components, app/api, app/hooks)
- **Saved locations**: Use gapped ordering (BIGINT sort_key) for reordering without conflicts
- **AI lookup**: Tool-based intent extraction, NOT conversational chat (see design doc section 9)
- **Current location**: Never stored in database, always appears first in UI
- **API responses**: Prefix all endpoints with `/api/v1`

## Database Schema

- Users: UUID primary keys, Argon2id password hashing
- Locations: External provider ID + normalized data (name, region, country, lat/lon, timezone)
- Saved Locations: UNIQUE constraint on (user_id, location_id) to prevent duplicates
- See full schema in [weather_app_design_v1_1.md](../weather_app_design_v1_1.md) section 4

## Security

- **Auth**: JWT in httpOnly cookies (never localStorage)
- **Passwords**: Argon2id hashing only
- **Validation**: Zod schemas on all API inputs
- **CORS**: Configured in [server/index.js](../server/index.js)

## Integration Points

- **Weather API**: Proxy calls through backend (not directly from client)
- **Geocoding**: Backend handles location search and reverse geocoding
- **OpenAI**: Structured tool-based intent extraction for natural language weather queries

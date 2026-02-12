# Weather App

Full-stack weather application with a React + Vite + TailwindCSS frontend and a Node.js + Express + PostgreSQL backend.

This repo is a monorepo:
- `client/` — SPA frontend (React)
- `server/` — API backend (Express)

## What’s Implemented

- **Auth**: Signup/login/logout via JWT stored in **httpOnly cookies**
- **Saved locations**: Add/remove saved locations (server enforces no duplicates)
- **Current location**: Uses the browser Geolocation API (never stored in DB)
- **Weather detail**: Current + hourly + multi-day forecast views
- **AI lookup**: Tool-based natural language weather queries via backend `/api/v1/lookup`

## Tech Stack

- **Frontend**: React, React Router, Vite, TailwindCSS, Axios
- **Backend**: Node.js, Express, PostgreSQL, Zod validation, OpenAI SDK (for lookup)

See:
- Frontend technologies: [client/FRONTEND_TECHNOLOGIES.md](client/FRONTEND_TECHNOLOGIES.md)
- Frontend overview: [client/README.md](client/README.md)
- Backend overview: [server/README.md](server/README.md)
- Backend technologies: [server/BACKEND_TECHNOLOGIES.md](server/BACKEND_TECHNOLOGIES.md)
- API reference: [server/API.md](server/API.md)

## Project Structure

```
Weather_App/
├── client/                      # React SPA (Vite)
│   ├── src/
│   ├── vite.config.js           # Dev server + /api proxy
│   └── package.json
├── server/                      # Express API + Postgres
│   ├── index.js
│   ├── db/                       # DB setup + migrations
│   └── package.json
├── weather_app_design_v1_1.md
└── package.json                  # Root scripts (runs both)
```

## Setup

### 1) Install dependencies

```bash
npm run install:all
```

### 2) Configure backend environment

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and set at least:
- `JWT_SECRET`
- `OPENAI_API_KEY` (required for AI lookup)
- `POSTGRES_*` values

### 3) Set up the database

```bash
cd server
npm run db:setup
```

## Running (Dev)

### Both client + server

```bash
npm run dev
```

Defaults:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

Note: the Vite dev proxy in [client/vite.config.js](client/vite.config.js) currently targets `http://localhost:5001`. Either:
- set `PORT=5001` in `server/.env`, or
- update the proxy target to `http://localhost:5000`.

### Client only

```bash
npm run dev:client
```

### Server only

```bash
npm run dev:server
```

## API Notes

- All API routes are versioned under `/api/v1/*`.
- The frontend calls `/api/v1/...` and relies on Vite’s dev proxy for local development.

Weather data is backed by the National Weather Service (NWS) API, which only supports US locations.

If API calls fail in dev, confirm the backend port matches the proxy target in [client/vite.config.js](client/vite.config.js).

## Useful Docs

- Architecture/design: [weather_app_design_v1_1.md](weather_app_design_v1_1.md)
- Wireframes: [weather_app_wireframes_v1_0.md](weather_app_wireframes_v1_0.md)

## License

ISC

# Frontend Technologies Documentation

## Overview

The Weather App frontend is a single-page application (SPA) built with React and Vite. It focuses on a mobile-first UI, cookie-based authentication, and a clean separation between pages, shared components, and shared browser helpers.

This document describes the technologies actually used in `client/` (based on `client/package.json` and the current source code).

---

## Core Technologies

### **React** (`react`, `react-dom`)
- **Purpose**: Component-based UI framework
- **What it’s used for**:
  - Functional components + hooks (`useState`, `useEffect`, `useCallback`, `useRef`)
  - Context API for authentication state (`AuthContext`)
  - Strict Mode during development (`React.StrictMode`)

### **JavaScript (ES Modules)**
- **Purpose**: Modern module system and syntax
- **Notes**:
  - The client package uses ES Modules (`"type": "module"`).
  - Vite handles dev-time module loading and production bundling.

---

## Routing

### **React Router** (`react-router-dom`)
- **Purpose**: Client-side routing
- **What it’s used for**:
  - `BrowserRouter`, `Routes`, `Route` for nested route structure
  - `Navigate` for redirects
  - `useNavigate`, `useLocation`, `useParams` for navigation and URL params
  - A “background location” pattern for modal-style navigation (AI Lookup overlay)

---

## HTTP + API Integration

### **Axios** (`axios`)
- **Purpose**: HTTP client for calling the backend
- **What it’s used for**:
  - Auth requests (`/api/v1/auth/*`)
  - Saved locations CRUD (`/api/v1/saved-locations`)
  - Weather queries (saved locations + lat/lon)
  - AI lookup (`/api/v1/lookup`)
- **Cookie auth support**:
  - The app uses httpOnly cookies; requests must include credentials.
  - The frontend exports a dedicated axios instance with `withCredentials: true` in `src/lib/axios.js`.

### **Vite Dev Proxy** (`client/vite.config.js`)
- **Purpose**: Proxy `/api/*` requests in development
- **Why**: Keeps frontend requests same-origin in dev and avoids CORS friction.
- **Behavior**:
  - Requests to `/api` from `http://localhost:3000` proxy to the backend target configured in Vite.

---

## Styling

### **Tailwind CSS** (`tailwindcss`)
- **Purpose**: Utility-first styling system
- **What it’s used for**:
  - Layout (flex/grid, spacing, responsive breakpoints)
  - Typography and color utilities
  - Mobile-first responsive UI

### **PostCSS** (`postcss`) + **Autoprefixer** (`autoprefixer`)
- **Purpose**: CSS build pipeline
- **What it’s used for**:
  - Tailwind compilation
  - Automatic vendor prefixing for broader browser compatibility

---

## Build Tooling

### **Vite** (`vite`)
- **Purpose**: Development server + production bundler
- **What it’s used for**:
  - Fast dev HMR
  - Optimized production build (`vite build`)
  - `import.meta.env` environment flags (e.g., DEV)

### **Vite React Plugin** (`@vitejs/plugin-react`)
- **Purpose**: React + JSX integration for Vite

---

## Browser APIs Used

### **Geolocation API** (`navigator.geolocation`)
- **Purpose**: “Current Location” weather
- **Where it’s used**:
  - Saved locations preview card for current location
  - Weather details for `locationId === 'current'`
  - AI lookup can optionally include coordinates when the query implies “here”
- **Implementation detail**:
  - Shared helper functions live in `src/lib/geolocation.js` (timeouts, fallback retry, user-friendly error messages).

---

## Key Frontend Architecture Choices

- **Context over external state libraries**: Auth state is managed via React Context (`src/context/AuthContext.jsx`).
- **Pages vs. components**:
  - Route-level screens in `src/pages/`
  - Shared UI shell and helpers in `src/components/` and `src/lib/`
- **Cookie-based auth**:
  - No token storage in `localStorage`.
  - Auth state is derived from backend `/auth/me`.

---

## Commands

From the `client/` directory:
- `npm run dev` — Start Vite dev server (default: `http://localhost:3000`)
- `npm run build` — Create production build output in `client/dist/`
- `npm run preview` — Preview the production build locally

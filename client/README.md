# Frontend - Weather App

This directory contains the React frontend for the Weather App with complete weather functionality.

## Features Implemented

### Authentication
- **Signup**: New user registration with validation
- **Login**: User authentication with JWT tokens
- **Logout**: Secure logout clearing authentication cookies
- **Protected Routes**: All weather features require authentication

### Weather Features
- **Saved Locations View**: Card-based interface for viewing all saved locations
- **Current Location**: Automatic geolocation-based weather
- **Weather Detail**: Comprehensive weather information (current, hourly, daily)
- **Location Search**: Search and save locations worldwide
- **AI Lookup**: Natural language weather queries (non-conversational)

### File Structure

```
client/src/
├── App.jsx                      # Main app with nested routing
├── main.jsx                     # React entry point
├── lib/
│   ├── axios.js                 # Axios instance with credentials (httpOnly cookie auth)
│   ├── geolocation.js           # Shared geolocation helpers (timeouts/retry/error mapping)
│   └── weatherIcons.js          # Condition string -> emoji helper
├── context/
│   └── AuthContext.jsx          # Authentication state management
├── components/
│   ├── Layout.jsx               # Main app layout with navigation
│   └── ProtectedRoute.jsx       # Route wrapper for authentication
└── pages/
    ├── Login.jsx                # Login page
    ├── Signup.jsx               # Signup page
    ├── SavedLocations.jsx       # Location cards view (homepage)
    ├── WeatherDetail.jsx        # Detailed weather for a location
    ├── AddLocation.jsx          # Location search and save
    └── AILookup.jsx             # Natural language weather lookup
```

## Routes

### Public Routes
- `/login` - User login
- `/signup` - User registration

### Protected Routes (require authentication)
- `/` - Redirects to `/locations`
- `/locations` - Saved locations cards view
- `/weather/:locationId` - Weather detail for specific location
- `/weather/current` - Current location weather
- `/add-location` - Search and add new location
- `/lookup` - AI-powered weather lookup

## Components

### Layout
Main app shell with:
- Top navigation bar
- Logo and app name
- Navigation links (Saved Locations, Add Location, AI Lookup)
- User menu with logout
- Responsive mobile menu

### SavedLocations
- Displays all saved locations as cards
- Current location card (always first)
- Add location card (always last)
- Weather preview on each card
- Delete saved locations
- Mobile: vertical carousel
- Desktop: responsive grid

### WeatherDetail
- Location name and current conditions
- Large temperature display
- "Feels like" and high/low temps
- Quick metrics (precipitation, wind, humidity, UV)
- 24-hour hourly forecast (horizontal scroll)
- 7-day daily forecast
- Supports both current location and saved locations

### AddLocation
- Search input for location search
- "Use Current Location" button
- Search results list
- Shows "Saved" badge for already-saved locations
- Prevents duplicate saves (409 handling)
- Mobile: full page
- Desktop: modal-style overlay

### AILookup
- Natural language query input
- AI-powered weather interpretation
- Summary text response
- Weather card display
- "Save Location" option
- Example queries for guidance
- Mobile: fullscreen
- Desktop: right panel style

## Usage

### Development
```bash
# From the client directory
npm run dev
```

Frontend runs on http://localhost:3000

### Building for Production
```bash
npm run build
```

Outputs to `client/dist/`

## API Integration

All API calls use the configured axios instance with credentials:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5001`
- Proxy: `/api/*` → `http://localhost:5001/api/*`

### Endpoints Used
- `GET /api/v1/saved-locations` - Get user's saved locations
- `POST /api/v1/saved-locations` - Save a new location
- `DELETE /api/v1/saved-locations/:id` - Remove saved location
- `GET /api/v1/locations/search?q=...` - Search for locations
- `GET /api/v1/weather?lat=...&lon=...` - Get weather by coordinates
- `GET /api/v1/saved-locations/:id/weather` - Get weather for saved location
- `POST /api/v1/lookup` - Natural language weather query

## Design Principles

### Mobile-First
- All layouts designed for mobile first
- Responsive breakpoints for tablet and desktop
- Touch-friendly interface elements

### Card-Based UI
- Locations displayed as interactive cards
- Consistent card styling throughout
- Weather previews on location cards

### Current Location Priority
- Always appears first in saved locations
- Uses browser geolocation API
- Graceful fallback if location denied

### No Duplicate Locations
- Backend prevents duplicate saves (409 response)
- Frontend shows "Already saved" message
- Search results show "Saved" badge

### AI as Tool, Not Chat
- Single query/response pattern
- No conversation history
- Temporary results (not persisted)
- Clear "New Query" action

## Responsive Design Strategy

### Mobile (<768px)
- Vertical stacking
- Horizontal scroll for dense data
- Fullscreen overlays for add/lookup
- Hamburger menu for navigation

### Tablet (768px-1024px)
- Hybrid layouts
- Partial grid views
- Expanded metrics visibility

### Desktop (>1024px)
- Multi-column grid layouts
- Modal overlays for add/lookup
- Always-visible navigation
- Drag-and-drop reordering (future)

## Security
- JWT tokens in httpOnly cookies
- Automatic auth check on mount
- Protected routes redirect to login
- Axios credentials enabled globally

## Next Steps
- Implement location reordering (drag-and-drop)
- Add loading skeletons
- Implement error boundaries
- Add unit/integration tests
- PWA features (offline support)
- Dark mode toggle

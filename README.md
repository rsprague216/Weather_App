# Weather App

A full-stack weather application built with React, Vite, TailwindCSS, and Node.js.

## 🚀 Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variables

## 📦 Project Structure

```
Weather_App/
├── client/              # Frontend React application
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── server/              # Backend Node.js server
│   ├── index.js
│   ├── .env
│   └── package.json
└── package.json         # Root package.json
```

## 🛠️ Installation

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

   Or manually:
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

## 🏃 Running the App

### Development Mode (Both servers concurrently)
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### Individual Servers

**Frontend only:**
```bash
npm run dev:client
```

**Backend only:**
```bash
npm run dev:server
```

## 🔧 Environment Variables

Create a `.env` file in the `server/` directory:

```env
PORT=5000
```

## 📝 Available API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/weather` - Weather data endpoint (placeholder)

## 🎨 Features

- ✅ React with Vite for fast development
- ✅ TailwindCSS for responsive styling
- ✅ Express backend with CORS enabled
- ✅ API proxy configuration
- ✅ Hot module replacement
- ✅ Modern ES6+ syntax

## 📚 Next Steps

1. Integrate a weather API (OpenWeatherMap, WeatherAPI, etc.)
2. Add search functionality for different cities
3. Display weather forecasts
4. Add weather icons and animations
5. Implement error handling and loading states
6. Add unit tests

## 📄 License

ISC

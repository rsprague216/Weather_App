import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

/**
 * Application entry point.
 *
 * - Mounts React into `#root`.
 * - Uses `React.StrictMode` in development to surface side-effect issues early.
 * - Global styles are driven by Tailwind (see `src/index.css`).
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

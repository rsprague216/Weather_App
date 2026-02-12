import axios from 'axios'

/**
 * Frontend HTTP client.
 *
 * Notes:
 * - Uses Vite's dev-server proxy for `/api/*` so we keep requests same-origin in dev.
 * - `withCredentials: true` is required because auth is stored in httpOnly cookies.
 * - We export a dedicated axios instance (not global defaults) to avoid side effects
 *   if other code imports axios directly.
 */
const api = axios.create({
	withCredentials: true
})

export default api

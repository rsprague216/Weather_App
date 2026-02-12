/**
 * Geolocation helpers used by multiple pages.
 *
 * Design goals:
 * - Centralize browser geolocation behavior (timeouts, retries, error normalization)
 * - Keep UI components focused on rendering + user flows
 * - Make it easy to update geolocation strategy in one place
 */

/**
 * @typedef {Object} Coords
 * @property {number} lat
 * @property {number} lon
 */

/**
 * Attempt to retrieve the user's current position.
 *
 * Behavior:
 * - Fast initial attempt (cached location allowed)
 * - On timeout, retries once with high accuracy + longer timeout
 *
 * @returns {Promise<GeolocationPosition>}
 */
export function getPositionWithFallback() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(Object.assign(new Error('Geolocation is not supported'), { code: 'UNSUPPORTED' }))
      return
    }

    if (import.meta?.env?.DEV && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          console.debug('[geolocation] permission state:', status.state)
        })
        .catch(() => {})
    }

    const attempt = (options) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(error),
        options
      )
    }

    // First attempt: allow cached location + reasonable timeout.
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => {
        // If we timed out, retry once with longer timeout + high accuracy.
        if (error?.code === 3) {
          attempt({ enableHighAccuracy: true, timeout: 45000, maximumAge: 60 * 60 * 1000 })
          return
        }
        reject(error)
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60 * 60 * 1000 }
    )
  })
}

/**
 * Convenience wrapper around `navigator.geolocation.getCurrentPosition` that resolves to
 * `{ lat, lon }`.
 *
 * This is primarily used by AI lookup to optionally provide the server with current coords.
 *
 * @param {PositionOptions} [options]
 * @returns {Promise<Coords>}
 */
export async function getCurrentCoords(options = { enableHighAccuracy: false, timeout: 7000, maximumAge: 60_000 }) {
  const position = await new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(Object.assign(new Error('Geolocation is not supported'), { code: 'UNSUPPORTED' }))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })

  return { lat: position.coords.latitude, lon: position.coords.longitude }
}

/**
 * Converts a GeolocationPositionError (or our UNSUPPORTED sentinel) into a user-friendly message.
 *
 * @param {any} error
 * @returns {string}
 */
export function getGeolocationErrorMessage(error) {
  switch (error?.code) {
    case 'UNSUPPORTED':
      return 'Geolocation is not supported by your browser'
    case 1:
      return 'Location permission denied. Please allow location access for this site.'
    case 2:
      return 'Location unavailable. Please check your device location settings and try again.'
    case 3:
      return 'Location request timed out. Please try again.'
    default:
      return 'Unable to retrieve your location. Please enable location services.'
  }
}

/**
 * Maps a weather condition string into a simple emoji icon.
 *
 * This is intentionally lightweight (no icon pack dependency) and used anywhere
 * we need quick visual scanning (location cards, hourly rows, etc.).
 *
 * @param {string | undefined | null} condition
 * @returns {string}
 */
export function getWeatherIcon(condition) {
  const lowerCondition = condition?.toLowerCase() || ''
  if (lowerCondition.includes('rain')) return '🌧️'
  if (lowerCondition.includes('snow')) return '❄️'
  if (lowerCondition.includes('cloud')) return '☁️'
  if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) return '☀️'
  if (lowerCondition.includes('partly')) return '⛅'
  if (lowerCondition.includes('storm') || lowerCondition.includes('thunder')) return '⛈️'
  return '🌤️'
}

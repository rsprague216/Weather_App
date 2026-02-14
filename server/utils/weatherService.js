/**
 * Weather Service Utility
 * 
 * Handles all interactions with the National Weather Service (NWS) API.
 * Fetches weather data, processes forecasts, and formats data for the application.
 * 
 * NWS API provides:
 * - 7-day forecast
 * - Hourly forecast data
 * - Current conditions
 * - Free for all US locations
 * 
 * @module utils/weatherService
 */

import axiosInstance from './axios.js'

const NWS_API_BASE_URL = 'https://api.weather.gov'

/**
 * Fetches comprehensive weather data for specific coordinates.
 * 
 * Makes multiple NWS API calls:
 * 1. /points/{lat},{lon} - Get gridpoint and forecast URLs
 * 2. /forecast - Get 7-day daily forecast
 * 3. /forecastHourly - Get hourly forecast data
 * 
 * @param {string|number} lat - Latitude (-90 to 90)
 * @param {string|number} lon - Longitude (-180 to 180)
 * @param {string} locationName - Human-readable location name
 * @param {string} [units='imperial'] - Temperature units (imperial/metric)
 * @returns {Promise<Object>} Formatted weather data
 * @returns {Object} returns.location - Location information with timezone
 * @returns {Object} returns.current - Current weather conditions
 * @returns {Array} returns.forecast - 7-day daily forecast
 * @returns {Array} returns.hourlyForecast - Hourly forecast grouped by day
 * 
 * @throws {Error} If NWS API request fails
 * @throws {Error} If coordinates are outside NWS coverage (non-US)
 * 
 * @example
 * const weather = await fetchWeatherData(41.8781, -87.6298, 'Chicago')
 * console.log(weather.current.tempF) // Current temperature in Fahrenheit
 * console.log(weather.forecast[0].day.avgTempF) // Today's avg temp
 */
export async function fetchWeatherData(lat, lon, locationName, units = 'imperial') {
  try {
    // Step 1: Get gridpoint data
    const pointsResponse = await axiosInstance.get(`${NWS_API_BASE_URL}/points/${lat},${lon}`)
    
    const properties = pointsResponse.data.properties
    const forecastUrl = properties.forecast
    const forecastHourlyUrl = properties.forecastHourly
    const timezone = properties.timeZone
    
    // Step 2: Get forecast data (7-day)
    const [forecastResponse, hourlyResponse] = await Promise.all([
      axiosInstance.get(forecastUrl),
      axiosInstance.get(forecastHourlyUrl)
    ])
    
    const periods = forecastResponse.data.properties.periods
    const hourlyPeriods = hourlyResponse.data.properties.periods
    
    // Current conditions (use first hourly period)
    const currentHourly = hourlyPeriods[0]
    const current = {
      tempF: currentHourly.temperature,
      tempC: (currentHourly.temperature - 32) * 5/9,
      condition: currentHourly.shortForecast,
      conditionIcon: currentHourly.icon,
      windMph: parseInt(currentHourly.windSpeed) || 0,
      windKph: (parseInt(currentHourly.windSpeed) || 0) * 1.60934,
      windDir: currentHourly.windDirection,
      humidity: currentHourly.relativeHumidity?.value || 0,
      feelsLikeF: estimateFeelsLike(currentHourly.temperature, parseInt(currentHourly.windSpeed) || 0, currentHourly.relativeHumidity?.value || 0),
      feelsLikeC: (estimateFeelsLike(currentHourly.temperature, parseInt(currentHourly.windSpeed) || 0, currentHourly.relativeHumidity?.value || 0) - 32) * 5/9,
      precipChance: currentHourly.probabilityOfPrecipitation?.value || 0,
      dewPointF: currentHourly.dewpoint?.value ? celsiusToFahrenheit(currentHourly.dewpoint.value) : null,
      dewPointC: currentHourly.dewpoint?.value || null
    }
    
    // Group forecast periods by day
    const forecastByDay = {}
    periods.forEach(period => {
      const date = period.startTime.split('T')[0]
      if (!forecastByDay[date]) {
        forecastByDay[date] = { day: null, night: null }
      }
      if (period.isDaytime) {
        forecastByDay[date].day = period
      } else {
        forecastByDay[date].night = period
      }
    })
    
    // Group hourly by day
    const hourlyByDay = {}
    hourlyPeriods.forEach(period => {
      const date = period.startTime.split('T')[0]
      if (!hourlyByDay[date]) {
        hourlyByDay[date] = []
      }
      hourlyByDay[date].push(period)
    })
    
    // Build daily forecast
    const forecast = Object.keys(forecastByDay).slice(0, 7).map(date => {
      const dayData = forecastByDay[date]
      const hourlyData = hourlyByDay[date] || []
      
      const dayPeriod = dayData.day || dayData.night
      const nightPeriod = dayData.night || dayData.day
      
      return {
        date,
        dateEpoch: new Date(date).getTime() / 1000,
        day: {
          maxTempF: dayPeriod?.temperature || 0,
          maxTempC: dayPeriod?.temperature ? (dayPeriod.temperature - 32) * 5/9 : 0,
          minTempF: nightPeriod?.temperature || 0,
          minTempC: nightPeriod?.temperature ? (nightPeriod.temperature - 32) * 5/9 : 0,
          avgTempF: dayPeriod && nightPeriod ? (dayPeriod.temperature + nightPeriod.temperature) / 2 : dayPeriod?.temperature || 0,
          avgTempC: dayPeriod && nightPeriod ? ((dayPeriod.temperature + nightPeriod.temperature) / 2 - 32) * 5/9 : 0,
          condition: dayPeriod?.shortForecast || 'Unknown',
          conditionIcon: dayPeriod?.icon || '',
          detailedForecast: dayPeriod?.detailedForecast || '',
          windSpeed: dayPeriod?.windSpeed || '0 mph',
          windDirection: dayPeriod?.windDirection || 'N',
          dailyChanceOfRain: Math.max(
            dayPeriod?.probabilityOfPrecipitation?.value || 0,
            nightPeriod?.probabilityOfPrecipitation?.value || 0
          )
        },
        hourly: hourlyData.map(hour => ({
          timeEpoch: new Date(hour.startTime).getTime() / 1000,
          time: hour.startTime,
          tempF: hour.temperature,
          tempC: (hour.temperature - 32) * 5/9,
          condition: hour.shortForecast,
          conditionIcon: hour.icon,
          windSpeed: hour.windSpeed,
          windDirection: hour.windDirection,
          humidity: hour.relativeHumidity?.value || 0,
          chanceOfRain: hour.probabilityOfPrecipitation?.value || 0,
          dewPointF: hour.dewpoint?.value ? celsiusToFahrenheit(hour.dewpoint.value) : null,
          dewPointC: hour.dewpoint?.value || null
        }))
      }
    })
    
    return {
      location: {
        name: locationName,
        latitude: lat,
        longitude: lon,
        timezone,
        localtime: new Date().toLocaleString('en-US', { timeZone: timezone })
      },
      current,
      forecast
    }
  } catch (error) {
    console.error('NWS API Error:', error.response?.data || error.message)
    throw error
  }
}

/**
 * Helper function to convert Celsius to Fahrenheit
 */
function celsiusToFahrenheit(celsius) {
  return (celsius * 9/5) + 32
}

/**
 * Estimates "feels like" temperature using wind chill (cold) or heat index (hot).
 * Falls back to the actual temperature for moderate conditions.
 *
 * @param {number} tempF - Temperature in Fahrenheit
 * @param {number} windMph - Wind speed in mph
 * @param {number} humidity - Relative humidity percentage
 * @returns {number} Estimated feels-like temperature in Fahrenheit
 */
function estimateFeelsLike(tempF, windMph, humidity) {
  // Wind chill: applies when temp <= 50°F and wind > 3 mph
  if (tempF <= 50 && windMph > 3) {
    return Math.round(
      35.74 + 0.6215 * tempF - 35.75 * Math.pow(windMph, 0.16) + 0.4275 * tempF * Math.pow(windMph, 0.16)
    )
  }
  // Heat index: applies when temp >= 80°F
  if (tempF >= 80) {
    return Math.round(
      -42.379 + 2.04901523 * tempF + 10.14333127 * humidity
      - 0.22475541 * tempF * humidity - 0.00683783 * tempF * tempF
      - 0.05481717 * humidity * humidity + 0.00122874 * tempF * tempF * humidity
      + 0.00085282 * tempF * humidity * humidity - 0.00000199 * tempF * tempF * humidity * humidity
    )
  }
  return tempF
}

/**
 * Axios HTTP Client
 * 
 * Centralized axios instance with automatic retry logic and exponential backoff.
 * Provides resilient HTTP requests for external API calls (NWS, Nominatim, OpenAI).
 * 
 * Features:
 * - 10 second timeout
 * - Automatic retry on network errors (max 2 retries)
 * - Exponential backoff (2^retry * 1000ms)
 * - Custom User-Agent header
 * 
 * @module utils/axios
 */

import axios from 'axios'

/**
 * Configured axios instance for all external API calls.
 * 
 * Timeout: 10 seconds
 * Retries: Up to 2 times on network errors or 5xx responses
 * Backoff: 2s, 4s (exponential)
 */
const axiosInstance = axios.create({
  timeout: 10000, // 10 second timeout
  headers: {
    'User-Agent': 'WeatherApp/1.0'
  }
})

/**
 * Response interceptor for automatic retry logic.
 * 
 * Retries failed requests with exponential backoff strategy:
 * - 1st retry: 2 second delay
 * - 2nd retry: 4 second delay
 * 
 * Only retries on:
 * - Network errors (no response received)
 * - Server errors (5xx status codes)
 * 
 * Does NOT retry on:
 * - Client errors (4xx status codes)
 * - After 2 retry attempts
 */
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config

    // Don't retry if we've already retried or it's not a network error
    if (!config || config.__retryCount >= 2) {
      return Promise.reject(error)
    }

    // Initialize retry count
    config.__retryCount = config.__retryCount || 0

    // Only retry on network errors or 5xx errors
    if (
      !error.response || 
      (error.response.status >= 500 && error.response.status < 600)
    ) {
      config.__retryCount += 1

      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, config.__retryCount) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))

      return axiosInstance(config)
    }

    return Promise.reject(error)
  }
)

export default axiosInstance

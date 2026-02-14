import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../utils/axios.js', () => ({
  default: {
    get: vi.fn()
  }
}))

vi.mock('../../utils/weatherService.js', () => ({
  fetchWeatherData: vi.fn()
}))

import axiosInstance from '../../utils/axios.js'
import { fetchWeatherData } from '../../utils/weatherService.js'
import { app } from '../../index.js'
import { closeTestDatabase, resetTestDatabase } from '../helpers/db.js'

async function createAuthenticatedAgent() {
  const agent = request.agent(app)
  const signupResponse = await agent
    .post('/api/v1/auth/signup')
    .send({ email: `weather-${Date.now()}@example.com`, password: 'securepass1' })

  expect(signupResponse.status).toBe(201)
  return agent
}

describe('weather routes', () => {
  beforeEach(async () => {
    await resetTestDatabase()
    vi.clearAllMocks()
  })

  afterAll(async () => {
    await closeTestDatabase()
  })

  it('returns weather payload for valid coordinates with mocked providers', async () => {
    const agent = await createAuthenticatedAgent()

    axiosInstance.get.mockResolvedValue({
      data: {
        address: {
          city: 'Seattle'
        }
      }
    })

    fetchWeatherData.mockResolvedValue({
      location: {
        name: 'Seattle',
        latitude: '47.6062',
        longitude: '-122.3321',
        timezone: 'America/Los_Angeles'
      },
      current: {
        tempF: 60,
        condition: 'Cloudy'
      },
      forecast: []
    })

    const response = await agent.get('/api/v1/weather?lat=47.6062&lon=-122.3321')

    expect(response.status).toBe(200)
    expect(response.body.location.name).toBe('Seattle')
    expect(fetchWeatherData).toHaveBeenCalledWith('47.6062', '-122.3321', 'Seattle', 'imperial')
  })

  it('falls back to Unknown Location if reverse geocoding fails', async () => {
    const agent = await createAuthenticatedAgent()

    axiosInstance.get.mockRejectedValue(new Error('Nominatim unavailable'))

    fetchWeatherData.mockResolvedValue({
      location: {
        name: 'Unknown Location'
      },
      current: {
        tempF: 55,
        condition: 'Rain'
      },
      forecast: []
    })

    const response = await agent.get('/api/v1/weather?lat=40.7128&lon=-74.0060')

    expect(response.status).toBe(200)
    expect(fetchWeatherData).toHaveBeenCalledWith('40.7128', '-74.0060', 'Unknown Location', 'imperial')
  })

  it('returns validation error for malformed coordinates', async () => {
    const agent = await createAuthenticatedAgent()

    const response = await agent.get('/api/v1/weather?lat=not-a-number&lon=-74.0060')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('maps NWS unsupported location failures to LOCATION_NOT_SUPPORTED', async () => {
    const agent = await createAuthenticatedAgent()

    axiosInstance.get.mockResolvedValue({
      data: {
        address: {
          city: 'Somewhere'
        }
      }
    })

    fetchWeatherData.mockRejectedValue({
      response: {
        status: 404
      }
    })

    const response = await agent.get('/api/v1/weather?lat=10.0000&lon=10.0000')

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('LOCATION_NOT_SUPPORTED')
  })

  it('maps generic upstream failures to WEATHER_API_ERROR', async () => {
    const agent = await createAuthenticatedAgent()

    axiosInstance.get.mockResolvedValue({
      data: {
        address: {
          city: 'Seattle'
        }
      }
    })

    fetchWeatherData.mockRejectedValue(new Error('Upstream unavailable'))

    const response = await agent.get('/api/v1/weather?lat=47.6062&lon=-122.3321')

    expect(response.status).toBe(500)
    expect(response.body.error.code).toBe('WEATHER_API_ERROR')
  })
})

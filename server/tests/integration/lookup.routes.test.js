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
    .send({ email: `lookup-${Date.now()}@example.com`, password: 'securepass1' })

  expect(signupResponse.status).toBe(201)
  return agent
}

describe('lookup routes', () => {
  beforeEach(async () => {
    await resetTestDatabase()
    vi.clearAllMocks()
  })

  afterAll(async () => {
    await closeTestDatabase()
  })

  it('returns disambiguation options for ambiguous location results', async () => {
    const agent = await createAuthenticatedAgent()
    let searchCallCount = 0

    axiosInstance.get.mockImplementation(async (url) => {
      if (url.includes('/search')) {
        searchCallCount += 1

        if (searchCallCount === 1) {
          return {
            data: [
              {
                lat: '31.0000',
                lon: '-100.0000',
                display_name: 'Texas, United States',
                addresstype: 'state',
                type: 'administrative',
                osm_type: 'relation',
                importance: 0.88,
                address: { state: 'Texas', country: 'United States' }
              }
            ]
          }
        }

        return {
          data: [
            {
              lat: '30.2672',
              lon: '-97.7431',
              display_name: 'Austin, Texas, United States',
              address: { city: 'Austin', state: 'Texas', country: 'United States' }
            },
            {
              lat: '29.7604',
              lon: '-95.3698',
              display_name: 'Houston, Texas, United States',
              address: { city: 'Houston', state: 'Texas', country: 'United States' }
            }
          ]
        }
      }

      throw new Error(`Unexpected URL in test mock: ${url}`)
    })

    const response = await agent
      .post('/api/v1/lookup')
      .send({
        query: 'texas',
        intent: {
          intentType: 'CURRENT',
          locationProvided: true,
          location: 'texas'
        }
      })

    expect(response.status).toBe(200)
    expect(response.body.requiresDisambiguation).toBe(true)
    expect(response.body.locations).toHaveLength(2)
    expect(fetchWeatherData).not.toHaveBeenCalled()
  })

  it('returns weather card for current-location lookup with mocked providers', async () => {
    const agent = await createAuthenticatedAgent()

    axiosInstance.get.mockImplementation(async (url) => {
      if (url.includes('/reverse')) {
        return {
          data: {
            place_id: 12345,
            address: {
              city: 'Seattle',
              state: 'Washington',
              country: 'United States'
            }
          }
        }
      }

      if (url.includes('/points/')) {
        return {
          data: {
            properties: {
              timeZone: 'America/Los_Angeles'
            }
          }
        }
      }

      throw new Error(`Unexpected URL in test mock: ${url}`)
    })

    fetchWeatherData.mockResolvedValue({
      location: {
        name: 'Seattle'
      },
      current: {
        tempF: 61,
        condition: 'Partly Cloudy',
        precipChance: 10,
        windMph: 6,
        humidity: 70
      },
      forecast: [
        {
          date: '2026-02-13',
          day: {
            condition: 'Partly Cloudy',
            maxTempF: 64,
            minTempF: 52
          },
          hourly: []
        }
      ]
    })

    const response = await agent
      .post('/api/v1/lookup')
      .send({
        query: 'weather here',
        currentLocation: {
          lat: 47.6062,
          lon: -122.3321
        },
        intent: {
          intentType: 'CURRENT',
          locationProvided: false
        }
      })

    expect(response.status).toBe(200)
    expect(response.body.card.location.name).toBe('Seattle')
    expect(response.body.card.location.id).toBeTruthy()
    expect(response.body.card.current.temp).toBe(61)
    expect(fetchWeatherData).toHaveBeenCalledWith(47.6062, -122.3321, 'Seattle')
  })

  it('returns CURRENT_LOCATION_REQUIRED when no location is provided', async () => {
    const agent = await createAuthenticatedAgent()

    const response = await agent
      .post('/api/v1/lookup')
      .send({
        query: 'will it rain tomorrow?',
        intent: {
          intentType: 'DAY',
          locationProvided: false
        }
      })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('CURRENT_LOCATION_REQUIRED')
  })

  it('returns LOCATION_NOT_FOUND when geocoding yields no matches', async () => {
    const agent = await createAuthenticatedAgent()

    axiosInstance.get.mockResolvedValue({ data: [] })

    const response = await agent
      .post('/api/v1/lookup')
      .send({
        query: 'weather in nowhereville',
        intent: {
          intentType: 'CURRENT',
          locationProvided: true,
          location: 'nowhereville'
        }
      })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('LOCATION_NOT_FOUND')
  })

  it('returns INVALID_SELECTION for out-of-range disambiguation choice', async () => {
    const agent = await createAuthenticatedAgent()

    axiosInstance.get.mockResolvedValue({
      data: [
        {
          lat: '47.6062',
          lon: '-122.3321',
          display_name: 'Seattle, Washington, United States',
          address: { city: 'Seattle', state: 'Washington', country: 'United States' }
        }
      ]
    })

    const response = await agent
      .post('/api/v1/lookup')
      .send({
        query: 'seattle',
        selectedLocationIndex: 5,
        intent: {
          intentType: 'CURRENT',
          locationProvided: true,
          location: 'seattle'
        }
      })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_SELECTION')
  })

  it('maps unsupported weather coverage to LOCATION_NOT_SUPPORTED', async () => {
    const agent = await createAuthenticatedAgent()

    axiosInstance.get.mockImplementation(async (url) => {
      if (url.includes('/search')) {
        return {
          data: [
            {
              lat: '10.0000',
              lon: '10.0000',
              display_name: 'Offshore, Example',
              address: { county: 'Offshore', state: 'Nowhere', country: 'United States' },
              place_id: 999
            }
          ]
        }
      }

      if (url.includes('/points/')) {
        return {
          data: {
            properties: {
              timeZone: 'America/New_York'
            }
          }
        }
      }

      throw new Error(`Unexpected URL in test mock: ${url}`)
    })

    fetchWeatherData.mockRejectedValue({
      response: {
        status: 404
      }
    })

    const response = await agent
      .post('/api/v1/lookup')
      .send({
        query: 'weather offshore',
        intent: {
          intentType: 'CURRENT',
          locationProvided: true,
          location: 'offshore'
        }
      })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('LOCATION_NOT_SUPPORTED')
  })
})

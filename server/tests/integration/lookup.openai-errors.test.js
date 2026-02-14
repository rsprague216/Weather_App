import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { createCompletionMock } = vi.hoisted(() => ({
  createCompletionMock: vi.fn()
}))

vi.mock('openai', () => ({
  default: class MockOpenAI {
    constructor() {
      this.chat = {
        completions: {
          create: createCompletionMock
        }
      }
    }
  }
}))

vi.mock('../../utils/axios.js', () => ({
  default: {
    get: vi.fn()
  }
}))

vi.mock('../../utils/weatherService.js', () => ({
  fetchWeatherData: vi.fn()
}))

import { app } from '../../index.js'
import { closeTestDatabase, resetTestDatabase } from '../helpers/db.js'

async function createAuthenticatedAgent() {
  const agent = request.agent(app)
  const signupResponse = await agent
    .post('/api/v1/auth/signup')
    .send({ email: `lookup-openai-${Date.now()}@example.com`, password: 'securepass1' })

  expect(signupResponse.status).toBe(201)
  return agent
}

describe('lookup routes - openai error mapping', () => {
  beforeEach(async () => {
    await resetTestDatabase()
    vi.clearAllMocks()
  })

  afterAll(async () => {
    await closeTestDatabase()
  })

  it('maps OpenAI 429 errors to AI_RATE_LIMITED', async () => {
    const agent = await createAuthenticatedAgent()

    createCompletionMock.mockRejectedValue({
      type: 'invalid_request_error',
      status: 429
    })

    const response = await agent
      .post('/api/v1/lookup')
      .send({ query: 'weather in seattle' })

    expect(response.status).toBe(429)
    expect(response.body.error.code).toBe('AI_RATE_LIMITED')
  })

  it('maps OpenAI server failures to AI_SERVICE_ERROR', async () => {
    const agent = await createAuthenticatedAgent()

    createCompletionMock.mockRejectedValue({
      type: 'invalid_request_error',
      status: 500
    })

    const response = await agent
      .post('/api/v1/lookup')
      .send({ query: 'weather in seattle' })

    expect(response.status).toBe(502)
    expect(response.body.error.code).toBe('AI_SERVICE_ERROR')
  })
})

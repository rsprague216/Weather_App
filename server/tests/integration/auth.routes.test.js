import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../index.js'
import { closeTestDatabase, resetTestDatabase } from '../helpers/db.js'

describe('auth routes', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  afterAll(async () => {
    await closeTestDatabase()
  })

  it('returns 401 for /me without an auth cookie', async () => {
    const response = await request(app).get('/api/v1/auth/me')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  it('signs up a user and sets auth cookies', async () => {
    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'newuser@example.com', password: 'securepass1' })

    expect(response.status).toBe(201)
    expect(response.body.user.email).toBe('newuser@example.com')
    expect(response.headers['set-cookie']).toBeDefined()
  })

  it('returns current user for authenticated session', async () => {
    const agent = request.agent(app)

    const signupResponse = await agent
      .post('/api/v1/auth/signup')
      .send({ email: 'sessionuser@example.com', password: 'securepass1' })

    expect(signupResponse.status).toBe(201)

    const meResponse = await agent.get('/api/v1/auth/me')

    expect(meResponse.status).toBe(200)
    expect(meResponse.body.user.email).toBe('sessionuser@example.com')
  })
})

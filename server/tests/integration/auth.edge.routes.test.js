import { randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { app } from '../../index.js'
import { closeTestDatabase, resetTestDatabase } from '../helpers/db.js'

describe('auth routes edge cases', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  afterAll(async () => {
    await closeTestDatabase()
  })

  it('returns 401 when refresh token cookie is missing', async () => {
    const response = await request(app).post('/api/v1/auth/refresh')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 when refresh token is invalid', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refreshToken=not-a-valid-jwt'])

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })

  it('refreshes token and rotates access cookie for authenticated session', async () => {
    const agent = request.agent(app)

    const signupResponse = await agent
      .post('/api/v1/auth/signup')
      .send({ email: `refresh-${Date.now()}@example.com`, password: 'securepass1' })

    expect(signupResponse.status).toBe(201)

    const refreshResponse = await agent.post('/api/v1/auth/refresh')

    expect(refreshResponse.status).toBe(200)
    expect(refreshResponse.body.message).toBe('Token refreshed successfully')
    expect(refreshResponse.headers['set-cookie']).toBeDefined()
    expect(refreshResponse.headers['set-cookie'].join(';')).toContain('token=')
  })

  it('clears auth cookies on logout', async () => {
    const agent = request.agent(app)

    const signupResponse = await agent
      .post('/api/v1/auth/signup')
      .send({ email: `logout-${Date.now()}@example.com`, password: 'securepass1' })

    expect(signupResponse.status).toBe(201)

    const logoutResponse = await agent.post('/api/v1/auth/logout')

    expect(logoutResponse.status).toBe(200)
    expect(logoutResponse.body.message).toBe('Logged out successfully')
    expect(logoutResponse.headers['set-cookie']).toBeDefined()
    expect(logoutResponse.headers['set-cookie'].join(';')).toContain('token=')
    expect(logoutResponse.headers['set-cookie'].join(';')).toContain('refreshToken=')
  })

  it('returns USER_NOT_FOUND when token is valid but user no longer exists', async () => {
    const unknownUserId = randomUUID()
    const token = jwt.sign(
      { userId: unknownUserId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    )

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', [`token=${token}`])

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('USER_NOT_FOUND')
  })
})

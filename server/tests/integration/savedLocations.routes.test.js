import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { app } from '../../index.js'
import pool from '../../utils/db.js'
import { closeTestDatabase, resetTestDatabase } from '../helpers/db.js'

async function createAuthenticatedAgent() {
  const agent = request.agent(app)
  const signupResponse = await agent
    .post('/api/v1/auth/signup')
    .send({ email: `saved-${Date.now()}@example.com`, password: 'securepass1' })

  expect(signupResponse.status).toBe(201)
  return agent
}

async function createLocation(overrides = {}) {
  const defaults = {
    externalId: `ext-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: 'Seattle',
    region: 'Washington',
    country: 'USA',
    latitude: 47.6062,
    longitude: -122.3321,
    timezone: 'America/Los_Angeles'
  }

  const location = { ...defaults, ...overrides }

  const result = await pool.query(
    `INSERT INTO locations (external_id, name, region, country, latitude, longitude, timezone)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name`,
    [
      location.externalId,
      location.name,
      location.region,
      location.country,
      location.latitude,
      location.longitude,
      location.timezone
    ]
  )

  return result.rows[0]
}

describe('saved locations routes', () => {
  beforeEach(async () => {
    await resetTestDatabase()
  })

  afterAll(async () => {
    await closeTestDatabase()
  })

  it('saves locations and preserves gapped sort ordering', async () => {
    const agent = await createAuthenticatedAgent()
    const locationOne = await createLocation({ externalId: 'loc-1', name: 'Seattle' })
    const locationTwo = await createLocation({ externalId: 'loc-2', name: 'Portland' })

    const firstSave = await agent
      .post('/api/v1/saved-locations')
      .send({ locationId: locationOne.id })

    const secondSave = await agent
      .post('/api/v1/saved-locations')
      .send({ locationId: locationTwo.id })

    expect(firstSave.status).toBe(201)
    expect(secondSave.status).toBe(201)
    expect(firstSave.body.location.sortKey).toBe('1000')
    expect(secondSave.body.location.sortKey).toBe('2000')

    const listResponse = await agent.get('/api/v1/saved-locations')

    expect(listResponse.status).toBe(200)
    expect(listResponse.body.locations.map((item) => item.name)).toEqual(['Seattle', 'Portland'])
  })

  it('returns LOCATION_ALREADY_SAVED when attempting duplicate save', async () => {
    const agent = await createAuthenticatedAgent()
    const location = await createLocation({ externalId: 'loc-duplicate' })

    const firstSave = await agent
      .post('/api/v1/saved-locations')
      .send({ locationId: location.id })

    const duplicateSave = await agent
      .post('/api/v1/saved-locations')
      .send({ locationId: location.id })

    expect(firstSave.status).toBe(201)
    expect(duplicateSave.status).toBe(409)
    expect(duplicateSave.body.error.code).toBe('LOCATION_ALREADY_SAVED')
  })

  it('moves location to first position when reorder afterLocationId is null', async () => {
    const agent = await createAuthenticatedAgent()
    const seattle = await createLocation({ externalId: 'loc-r1', name: 'Seattle' })
    const portland = await createLocation({ externalId: 'loc-r2', name: 'Portland' })

    await agent.post('/api/v1/saved-locations').send({ locationId: seattle.id })
    await agent.post('/api/v1/saved-locations').send({ locationId: portland.id })

    const reorderResponse = await agent
      .patch(`/api/v1/saved-locations/${portland.id}/order`)
      .send({ afterLocationId: null })

    expect(reorderResponse.status).toBe(200)

    const listResponse = await agent.get('/api/v1/saved-locations')
    expect(listResponse.body.locations.map((item) => item.name)).toEqual(['Portland', 'Seattle'])
  })

  it('moves location after another location using midpoint sort key strategy', async () => {
    const agent = await createAuthenticatedAgent()
    const austin = await createLocation({ externalId: 'loc-r3', name: 'Austin' })
    const denver = await createLocation({ externalId: 'loc-r4', name: 'Denver' })
    const miami = await createLocation({ externalId: 'loc-r5', name: 'Miami' })

    await agent.post('/api/v1/saved-locations').send({ locationId: austin.id })
    await agent.post('/api/v1/saved-locations').send({ locationId: denver.id })
    await agent.post('/api/v1/saved-locations').send({ locationId: miami.id })

    const reorderResponse = await agent
      .patch(`/api/v1/saved-locations/${austin.id}/order`)
      .send({ afterLocationId: denver.id })

    expect(reorderResponse.status).toBe(200)

    const listResponse = await agent.get('/api/v1/saved-locations')
    expect(listResponse.body.locations.map((item) => item.name)).toEqual(['Denver', 'Austin', 'Miami'])
  })
})

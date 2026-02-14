import { describe, expect, it } from 'vitest'
import { signupSchema, weatherQuerySchema } from '../../validators/schemas.js'

describe('validation schemas', () => {
  it('normalizes email input for signup', () => {
    const parsed = signupSchema.parse({
      email: 'TestUser@Example.com',
      password: 'password123'
    })

    expect(parsed.email).toBe('testuser@example.com')
  })

  it('rejects signup passwords without a number', () => {
    expect(() => signupSchema.parse({
      email: 'user@example.com',
      password: 'passwordonly'
    })).toThrow()
  })

  it('defaults weather units to imperial', () => {
    const parsed = weatherQuerySchema.parse({
      lat: '34.05',
      lon: '-118.24'
    })

    expect(parsed.units).toBe('imperial')
  })
})

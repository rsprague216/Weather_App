import pool from '../../utils/db.js'

export async function resetTestDatabase() {
  await pool.query('TRUNCATE TABLE saved_locations, locations, users RESTART IDENTITY CASCADE')
}

export async function closeTestDatabase() {
  await pool.end()
}

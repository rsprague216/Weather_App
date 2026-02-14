import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry'
  },
  webServer: [
    {
      command: 'POSTGRES_DB=weather_app_test npm --prefix server run db:setup && PORT=5001 POSTGRES_DB=weather_app_test JWT_SECRET=test-secret OPENAI_API_KEY=test-openai-key npm run dev:server',
      port: 5001,
      reuseExistingServer: true,
      timeout: 120000
    },
    {
      command: 'npm run dev:client',
      port: 3000,
      reuseExistingServer: true,
      timeout: 120000
    }
  ]
})

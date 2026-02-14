import { test, expect } from '@playwright/test'

test('lookup disambiguation flow resolves to weather result', async ({ page }) => {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'e2e-user-id',
          email: 'e2e@example.com',
          createdAt: new Date().toISOString()
        }
      })
    })
  })

  await page.route('**/api/v1/lookup', async (route) => {
    const body = route.request().postDataJSON()

    if (body.selectedLocationIndex === undefined) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          requiresDisambiguation: true,
          originalQuery: 'springfield',
          intent: {
            intentType: 'CURRENT',
            locationProvided: true,
            location: 'springfield'
          },
          locations: [
            {
              index: 0,
              name: 'Springfield',
              region: 'Illinois',
              country: 'USA',
              displayName: 'Springfield, Illinois, USA',
              lat: 39.7817,
              lon: -89.6501
            },
            {
              index: 1,
              name: 'Springfield',
              region: 'Oregon',
              country: 'USA',
              displayName: 'Springfield, Oregon, USA',
              lat: 44.0462,
              lon: -123.022
            }
          ]
        })
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summaryText: 'Springfield is currently Cloudy with a temperature of 62°F.',
        card: {
          location: {
            id: 'lookup-location-id',
            name: 'Springfield',
            region: 'Oregon',
            country: 'USA',
            coordinates: {
              lat: 44.0462,
              lon: -123.022
            }
          },
          current: {
            temp: 62,
            condition: 'Cloudy',
            tempMax: 66,
            tempMin: 54,
            precipitationChance: 15,
            windSpeed: 8,
            humidity: 68
          },
          daily: []
        }
      })
    })
  })

  await page.goto('/lookup')
  await page.getByPlaceholder("What's the weather like in...").fill('springfield')
  await page.getByRole('button', { name: 'Ask' }).click()

  await expect(page.getByText('Multiple locations found for "springfield"')).toBeVisible()
  await page.getByRole('button', { name: 'Springfield, Oregon' }).click()

  await expect(page.getByText('Answer')).toBeVisible()
  await expect(page.getByText('Springfield is currently Cloudy with a temperature of 62°F.')).toBeVisible()
  await expect(page.getByText('Oregon, USA')).toBeVisible()
})

test('lookup result can save location', async ({ page }) => {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'e2e-user-id',
          email: 'e2e@example.com',
          createdAt: new Date().toISOString()
        }
      })
    })
  })

  await page.route('**/api/v1/lookup', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summaryText: 'Seattle is currently Sunny with a temperature of 70°F.',
        card: {
          location: {
            id: 'saved-location-id',
            name: 'Seattle',
            region: 'Washington',
            country: 'USA',
            coordinates: {
              lat: 47.6062,
              lon: -122.3321
            }
          },
          current: {
            temp: 70,
            condition: 'Sunny',
            tempMax: 75,
            tempMin: 60,
            precipitationChance: 5,
            windSpeed: 4,
            humidity: 50
          },
          daily: []
        }
      })
    })
  })

  await page.route('**/api/v1/saved-locations', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }

    const payload = route.request().postDataJSON()
    expect(payload.locationId).toBe('saved-location-id')

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        location: {
          id: 'saved-location-id',
          name: 'Seattle'
        }
      })
    })
  })

  await page.goto('/lookup')
  await page.getByPlaceholder("What's the weather like in...").fill('weather in seattle')
  await page.getByRole('button', { name: 'Ask' }).click()

  await expect(page.getByText('Seattle is currently Sunny with a temperature of 70°F.')).toBeVisible()
  await page.getByRole('button', { name: 'Save Location' }).click()
  await expect(page.getByText('Location saved!')).toBeVisible()
})

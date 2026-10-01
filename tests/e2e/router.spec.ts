import { test, expect } from '@playwright/test'

test('routes an intent from the dashboard', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Context Router' })).toBeVisible()

  await page.getByLabel('Intent').fill('Investigate production errors after deployment')
  await page.getByRole('button', { name: 'Route context' }).click()

  await expect(page.getByTestId('route-result')).toContainText('sentry')
})

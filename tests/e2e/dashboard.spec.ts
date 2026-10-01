import { test, expect } from '@playwright/test'

test.describe('Dashboard UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Context Router' })).toBeVisible()
  })

  test('displays dashboard title and subtitle', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Context Router' })).toBeVisible()
    await expect(
      page.getByText('Route an agent to only the context and tools it needs.')
    ).toBeVisible()
  })

  test('displays intent textarea', async ({ page }) => {
    await expect(page.getByLabel('Intent')).toBeVisible()
    await expect(page.getByRole('textbox')).toBeVisible()
  })

  test('displays example buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Investigate production errors/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Find the database query/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Review the latest pull request/ })).toBeVisible()
  })

  test('clicking example fills intent', async ({ page }) => {
    await page.getByRole('button', { name: /Investigate production errors/ }).click()
    await expect(page.getByLabel('Intent')).toHaveValue(
      /Investigate production errors after the latest deployment/
    )
  })

  test('routes an intent and displays results', async ({ page }) => {
    await page
      .getByLabel('Intent')
      .fill('Investigate production errors after the latest deployment')
    await page.getByRole('button', { name: 'Route context' }).click()

    // Wait for results
    await expect(page.getByTestId('route-result')).toBeVisible({ timeout: 10000 })

    // Check that results contain the servers the router selects for this intent
    const resultText = await page.getByTestId('route-result').textContent()
    expect(resultText).toContain('sentry')
    expect(resultText).toContain('observability')
    expect(resultText).toContain('cicd')
  })

  test('displays policy information', async ({ page }) => {
    await page.getByLabel('Intent').fill('inspect code and database')
    await page.getByRole('button', { name: 'Route context' }).click()
    await expect(page.getByTestId('route-result')).toBeVisible()

    const resultText = await page.getByTestId('route-result').textContent()
    expect(resultText).toContain('"riskLevel": "read"')
    expect(resultText).toContain('allowed')
  })

  test('displays reasoning', async ({ page }) => {
    await page.getByLabel('Intent').fill('Why did the API slow down after deployment?')
    await page.getByRole('button', { name: 'Route context' }).click()
    await expect(page.getByTestId('route-result')).toBeVisible()

    const resultText = await page.getByTestId('route-result').textContent()
    expect(resultText).toContain('reasoning')
  })

  test('clears results when new query entered', async ({ page }) => {
    // First query
    await page.getByLabel('Intent').fill('first query')
    await page.getByRole('button', { name: 'Route context' }).click()
    await expect(page.getByTestId('route-result')).toBeVisible()

    // Second query
    await page.getByLabel('Intent').fill('second query')
    await page.getByRole('button', { name: 'Route context' }).click()
    await expect(page.getByTestId('route-result')).toBeVisible()
  })

  test('disables button when intent is empty', async ({ page }) => {
    await page.getByLabel('Intent').fill('')
    await expect(page.getByRole('button', { name: 'Route context' })).toBeDisabled()
  })

  test('disables button while loading', async ({ page }) => {
    // Delay the API response so the transient loading state is observable.
    await page.route('**/api/route', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await route.continue()
    })

    await page.getByLabel('Intent').fill('test query')
    await page.getByRole('button', { name: 'Route context' }).click()

    // Button should show loading state
    await expect(page.getByRole('button', { name: 'Routing…' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Routing…' })).toBeDisabled()
  })
})

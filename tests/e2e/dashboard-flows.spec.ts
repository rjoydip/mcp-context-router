import { test, expect } from '@playwright/test'

test.describe('Dashboard end-to-end flows', () => {
  test('routes a database intent and shows matching servers', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Intent').fill('Find the database query causing high latency')
    await page.getByRole('button', { name: 'Route context' }).click()

    await expect(page.getByTestId('route-result')).toBeVisible({ timeout: 10000 })
    const resultText = await page.getByTestId('route-result').textContent()
    expect(resultText).toContain('database')
    expect(resultText).toContain('routeId')
    expect(resultText).toMatch(/route_\d+_[a-z0-9]+/)
  })

  test('routes a git intent and shows the git-ast server', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Intent').fill('inspect git diff and TypeScript AST symbols')
    await page.getByRole('button', { name: 'Route context' }).click()

    await expect(page.getByTestId('route-result')).toBeVisible({ timeout: 10000 })
    const resultText = await page.getByTestId('route-result').textContent()
    expect(resultText).toContain('git-ast')
    expect(resultText).toContain('ast_symbols')
  })

  test('result JSON is valid and describes a full decision', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Intent').fill('Review the latest pull request and related tests')
    await page.getByRole('button', { name: 'Route context' }).click()
    await expect(page.getByTestId('route-result')).toBeVisible({ timeout: 10000 })

    const raw = await page.getByTestId('route-result').locator('pre').textContent()
    const decision = JSON.parse(raw!)

    expect(decision.routeId).toMatch(/^route_\d+_[a-z0-9]+$/)
    expect(Array.isArray(decision.servers)).toBe(true)
    expect(Array.isArray(decision.tools)).toBe(true)
    expect(decision.servers.length).toBeGreaterThan(0)
    expect(decision.policy.allowed).toBe(true)
    expect(decision.policy.riskLevel).toBe('read')
    // read-only default
    for (const selected of decision.tools) {
      expect(selected.tool.risk).toBe('read')
    }
  })

  test('rerouting replaces the previous result', async ({ page }) => {
    await page.goto('/')

    await page.getByLabel('Intent').fill('inspect git diff')
    await page.getByRole('button', { name: 'Route context' }).click()
    await expect(page.getByTestId('route-result')).toBeVisible({ timeout: 10000 })
    const first = await page.getByTestId('route-result').locator('pre').textContent()

    await page.getByLabel('Intent').fill('Find the database query causing high latency')
    await page.getByRole('button', { name: 'Route context' }).click()
    await expect
      .poll(
        async () => {
          const current = await page.getByTestId('route-result').locator('pre').textContent()
          return current !== first
        },
        { timeout: 10000 }
      )
      .toBe(true)

    const second = await page.getByTestId('route-result').locator('pre').textContent()
    const decision = JSON.parse(second!)
    // The dashboard posts { intent }, not { query }.
    expect(decision.intent).toBe('Find the database query causing high latency')
    const serverIds = decision.servers.map((server: { serverId: string }) => server.serverId)
    expect(serverIds).toContain('database')
  })

  test('every example button produces a result', async ({ page }) => {
    await page.goto('/')
    const examples = [
      /Investigate production errors/,
      /Find the database query/,
      /Review the latest pull request/
    ]

    for (const example of examples) {
      await page.getByRole('button', { name: example }).click()
      await expect(page.getByLabel('Intent')).toHaveValue(example)

      await page.getByRole('button', { name: 'Route context' }).click()
      await expect(page.getByTestId('route-result')).toBeVisible({ timeout: 10000 })

      const raw = await page.getByTestId('route-result').locator('pre').textContent()
      const decision = JSON.parse(raw!)
      expect(decision.servers.length).toBeGreaterThan(0)
    }
  })

  test('route button is keyboard reachable and submits the form', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Intent').fill('inspect git history')
    await page.getByRole('button', { name: 'Route context' }).focus()
    await page.keyboard.press('Enter')

    await expect(page.getByTestId('route-result')).toBeVisible({ timeout: 10000 })
  })
})

import { test, expect } from '@playwright/test'

test.describe('API Endpoints', () => {
  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
  })

  test('servers endpoint returns all servers', async ({ request }) => {
    const response = await request.get('/api/servers')
    expect(response.ok()).toBeTruthy()
    const servers = await response.json()
    expect(Array.isArray(servers)).toBeTruthy()
    expect(servers.length).toBeGreaterThan(0)

    // Check required fields
    for (const server of servers) {
      expect(server).toHaveProperty('id')
      expect(server).toHaveProperty('name')
      expect(server).toHaveProperty('category')
      expect(server).toHaveProperty('tools')
      expect(Array.isArray(server.tools)).toBeTruthy()
    }
  })

  test('route endpoint returns valid decision', async ({ request }) => {
    const response = await request.post('/api/route', {
      data: { query: 'Why did the API slow down after deployment?' }
    })
    expect(response.ok()).toBeTruthy()

    const result = await response.json()
    expect(result).toHaveProperty('query')
    expect(result).toHaveProperty('servers')
    expect(result).toHaveProperty('tools')
    expect(result).toHaveProperty('policy')
    expect(result).toHaveProperty('routeId')

    // Check policy structure
    expect(result.policy).toHaveProperty('allowed')
    expect(result.policy).toHaveProperty('reason')
    expect(result.policy).toHaveProperty('filteredTools')
    expect(result.policy).toHaveProperty('riskLevel')
  })

  test('route respects maxServers limit', async ({ request }) => {
    const response = await request.post('/api/route', {
      data: { query: 'inspect everything', maxServers: 2 }
    })
    expect(response.ok()).toBeTruthy()

    const result = await response.json()
    expect(result.servers.length).toBeLessThanOrEqual(2)
  })

  test('route respects maxTools limit', async ({ request }) => {
    const response = await request.post('/api/route', {
      data: { query: 'inspect everything', maxTools: 3 }
    })
    expect(response.ok()).toBeTruthy()

    const result = await response.json()
    expect(result.tools.length).toBeLessThanOrEqual(3)
  })

  test('route respects risk policy', async ({ request }) => {
    const response = await request.post('/api/route', {
      data: {
        query: 'write to file',
        allowRisk: ['write']
      }
    })
    expect(response.ok()).toBeTruthy()

    const result = await response.json()
    // Default policy is read-only, so write tools should be filtered
    expect(result.policy.filteredTools.every((t: any) => t.tool.risk === 'read')).toBe(true)
  })

  test('route with context', async ({ request }) => {
    const response = await request.post('/api/route', {
      data: {
        query: 'inspect service',
        context: { service: 'auth', environment: 'production' }
      }
    })
    expect(response.ok()).toBeTruthy()

    const result = await response.json()
    expect(result.query).toBe('inspect service')
  })
})

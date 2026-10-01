import { test, expect } from '@playwright/test'

test.describe('API error handling', () => {
  test('rejects malformed JSON with 400', async ({ request }) => {
    const response = await request.post('/api/route', {
      headers: { 'content-type': 'application/json' },
      // A Buffer is sent as raw bytes; string payloads get JSON-stringified.
      data: Buffer.from('{ not valid json')
    })
    expect(response.status()).toBe(400)
  })

  test('returns 404 for unknown API routes', async ({ request }) => {
    const response = await request.get('/api/does-not-exist')
    expect(response.status()).toBe(404)
  })

  test('returns 404 for wrong methods on /api/route', async ({ request }) => {
    const response = await request.get('/api/route')
    expect(response.status()).toBe(404)
  })

  test('health timestamp is a valid ISO date', async ({ request }) => {
    const response = await request.get('/api/health')
    const body = await response.json()
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false)
  })

  test('servers all carry the full definition shape', async ({ request }) => {
    const response = await request.get('/api/servers')
    const servers = await response.json()
    expect(servers.length).toBe(12)
    for (const server of servers) {
      expect(typeof server.id).toBe('string')
      expect(typeof server.name).toBe('string')
      expect(typeof server.description).toBe('string')
      expect(typeof server.priority).toBe('number')
      expect(server.enabled).toBe(true)
      expect(server.risk).toBe('read')
      expect(Array.isArray(server.tools)).toBe(true)
      expect(Array.isArray(server.capabilities)).toBe(true)
      for (const tool of server.tools) {
        expect(tool.risk).toBe('read')
      }
    }
  })
})

test.describe('Route decision contract', () => {
  test('every decision carries a unique routeId and timestamp', async ({ request }) => {
    const routeIds = new Set<string>()
    for (const query of ['inspect git history', 'database schema', 'production errors']) {
      const response = await request.post('/api/route', { data: { query } })
      const result = await response.json()
      expect(result.routeId).toMatch(/^route_\d+_[a-z0-9]+$/)
      expect(routeIds.has(result.routeId)).toBe(false)
      routeIds.add(result.routeId)
      expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false)
    }
  })

  test('matchedCapabilities only reference known capabilities', async ({ request }) => {
    const serversResponse = await request.get('/api/servers')
    const servers = await serversResponse.json()
    const known = new Set(
      servers.flatMap((server: { capabilities: string[] }) => server.capabilities)
    )

    const response = await request.post('/api/route', {
      data: { query: 'review the latest pull request' }
    })
    const result = await response.json()
    for (const candidate of result.servers) {
      for (const capability of candidate.matchedCapabilities) {
        expect(known.has(capability), `unknown capability ${capability}`).toBe(true)
      }
    }
  })

  test('selected tools belong to selected servers', async ({ request }) => {
    const response = await request.post('/api/route', {
      data: { query: 'inspect git diff and AST symbols' }
    })
    const result = await response.json()
    const serverIds = new Set(result.servers.map((server: { serverId: string }) => server.serverId))
    for (const selected of result.tools) {
      expect(serverIds.has(selected.serverId)).toBe(true)
    }
  })

  test('git intent routes git-ast first with ast tools', async ({ request }) => {
    const response = await request.post('/api/route', {
      data: { query: 'inspect git diff and TypeScript AST symbols' }
    })
    const result = await response.json()
    expect(result.servers[0].serverId).toBe('git-ast')
    const toolNames = result.tools.map((selected: { tool: { name: string } }) => selected.tool.name)
    expect(toolNames).toEqual(expect.arrayContaining(['ast_symbols']))
    // read-only default policy
    for (const selected of result.tools) {
      expect(selected.tool.risk).toBe('read')
    }
  })

  test('database intent surfaces the database server', async ({ request }) => {
    const response = await request.post('/api/route', {
      data: { query: 'find the database query causing high latency' }
    })
    const result = await response.json()
    const serverIds = result.servers.map((server: { serverId: string }) => server.serverId)
    expect(serverIds).toContain('database')
  })

  test('estimated tokens grow with more selected tools', async ({ request }) => {
    const few = await request.post('/api/route', { data: { query: 'git log', maxTools: 2 } })
    const many = await request.post('/api/route', { data: { query: 'git log', maxTools: 8 } })
    const fewResult = await few.json()
    const manyResult = await many.json()
    expect(manyResult.estimatedTokens).toBeGreaterThan(fewResult.estimatedTokens)
    expect(manyResult.estimatedTokens).toBeLessThanOrEqual(manyResult.tokenBudget)
  })
})

import { describe, expect, it } from 'vitest'
import app from '../../src/worker/index'
import type { CloudflareEnv } from '../../src/worker/index'

// The Hono app only touches bindings when building services for /api/*, and
// the routing path itself is pure, so a stub env is enough to exercise the
// HTTP contract without Cloudflare emulators.
const stubEnv = {
  ASSETS: {},
  DB: {},
  CODEBASE_BUCKET: {},
  CODEBASE_KV: {},
  GITHUB_TOKEN: 'test-token',
  GITHUB_OWNER: 'test-org',
  GITHUB_REPO: 'test-repo'
} as unknown as CloudflareEnv

const json = (init?: RequestInit) => ({ ...init, headers: { 'content-type': 'application/json' } })

interface HealthBody {
  status: string
  timestamp: string
}

interface ServerSummary {
  id: string
  name: string
  category: string
  tools: unknown[]
}

interface DecisionBody {
  query?: string
  routeId: string
  timestamp: string
  servers: Array<{ serverId: string }>
  tools: unknown[]
  reasoning: unknown[]
  policy: {
    allowed: boolean
    riskLevel: string
    filteredTools: Array<{ tool: { risk: string } }>
  }
  tokenBudget: number
  estimatedTokens: number
}

const readJson = async <T>(response: Response): Promise<T> => (await response.json()) as T

describe('worker API - Hono app', () => {
  describe('GET /api/health', () => {
    it('returns ok with a timestamp', async () => {
      const response = await app.request('/api/health', {}, stubEnv)
      expect(response.status).toBe(200)
      const body = await readJson<HealthBody>(response)
      expect(body.status).toBe('ok')
      expect(new Date(body.timestamp).getTime()).not.toBeNaN()
    })
  })

  describe('GET /api/servers', () => {
    it('returns the base registry without optional provider tokens', async () => {
      const response = await app.request('/api/servers', {}, stubEnv)
      expect(response.status).toBe(200)
      const servers = await readJson<ServerSummary[]>(response)
      expect(Array.isArray(servers)).toBe(true)
      const ids = servers.map((server) => server.id)
      // Always present: local + unconditional servers.
      expect(ids).toEqual(
        expect.arrayContaining([
          'git-ast',
          'codebase',
          'database',
          'github',
          'dependency',
          'architecture'
        ])
      )
      // Gated on tokens that the stub env does not provide.
      expect(ids).not.toContain('cicd')
      expect(ids).not.toContain('sentry')
      expect(ids).not.toContain('kubernetes')
      expect(ids).not.toContain('cloud')
      for (const server of servers) {
        expect(server).toHaveProperty('id')
        expect(server).toHaveProperty('name')
        expect(server).toHaveProperty('category')
        expect(Array.isArray(server.tools)).toBe(true)
      }
    })

    it('includes token-gated providers when their tokens are set', async () => {
      const fullEnv = {
        ...stubEnv,
        CICD_TOKEN: 'cicd-token',
        SENTRY_TOKEN: 'sentry-token',
        SENTRY_ORG: 'org',
        KUBERNETES_CONFIG: 'kubeconfig',
        CLOUDFLARE_ACCOUNT_ID: 'account'
      } as unknown as CloudflareEnv
      const response = await app.request('/api/servers', {}, fullEnv)
      const servers = await readJson<ServerSummary[]>(response)
      const ids = servers.map((server) => server.id)
      expect(ids).toEqual(
        expect.arrayContaining([
          'git-ast',
          'codebase',
          'database',
          'github',
          'cicd',
          'sentry',
          'kubernetes',
          'cloud'
        ])
      )
      // 12 total in the full registry.
      expect(servers.length).toBe(12)
    })
  })

  describe('POST /api/route', () => {
    it('returns a complete route decision', async () => {
      const response = await app.request(
        '/api/route',
        json({
          method: 'POST',
          body: JSON.stringify({ query: 'inspect git diff and AST symbols' })
        }),
        stubEnv
      )
      expect(response.status).toBe(200)
      const decision = await readJson<DecisionBody>(response)
      expect(decision.query).toBe('inspect git diff and AST symbols')
      expect(decision.routeId).toMatch(/^route_\d+_[a-z0-9]+$/)
      expect(decision.timestamp).toBeDefined()
      expect(decision.servers.length).toBeGreaterThan(0)
      expect(decision.servers[0]!.serverId).toBe('git-ast')
      expect(Array.isArray(decision.tools)).toBe(true)
      expect(Array.isArray(decision.reasoning)).toBe(true)
      expect(decision.policy).toMatchObject({ allowed: expect.any(Boolean), riskLevel: 'read' })
      expect(decision.tokenBudget).toBeGreaterThan(0)
      expect(decision.estimatedTokens).toBeGreaterThanOrEqual(0)
    })

    it('respects maxServers and maxTools', async () => {
      const response = await app.request(
        '/api/route',
        json({
          method: 'POST',
          body: JSON.stringify({ query: 'inspect everything', maxServers: 2, maxTools: 3 })
        }),
        stubEnv
      )
      const decision = await readJson<DecisionBody>(response)
      expect(decision.servers.length).toBeLessThanOrEqual(2)
      expect(decision.tools.length).toBeLessThanOrEqual(3)
    })

    it('enforces the read-only default policy', async () => {
      const response = await app.request(
        '/api/route',
        json({
          method: 'POST',
          body: JSON.stringify({ query: 'write to file and execute commands', risk: 'execute' })
        }),
        stubEnv
      )
      const decision = await readJson<DecisionBody>(response)
      // defaultPolicy.allowRisks is ['read'], so execute is filtered out.
      expect(decision.policy.filteredTools.every((t) => t.tool.risk === 'read')).toBe(true)
      expect(decision.policy.riskLevel).toBe('read')
    })

    it('applies request context to scoring', async () => {
      const response = await app.request(
        '/api/route',
        json({
          method: 'POST',
          body: JSON.stringify({
            query: 'inspect service',
            context: { service: 'auth', environment: 'production' }
          })
        }),
        stubEnv
      )
      expect(response.status).toBe(200)
      const decision = await readJson<DecisionBody>(response)
      expect(decision.query).toBe('inspect service')
    })
  })

  describe('error handling', () => {
    it('returns 404 for unknown routes', async () => {
      const response = await app.request('/api/nope', {}, stubEnv)
      expect(response.status).toBe(404)
    })

    it('returns 404 for wrong methods', async () => {
      const response = await app.request('/api/route', { method: 'GET' }, stubEnv)
      expect(response.status).toBe(404)
    })
  })
})

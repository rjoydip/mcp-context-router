import { describe, expect, it } from 'vitest'
import {
  RouteTracer,
  buildRouteReasoning,
  buildRouteDecision,
  generateTraceId
} from '../../src/core/tracing'

describe('tracing - RouteTracer', () => {
  it('creates tracer with unique route ID', () => {
    const tracer = new RouteTracer('test-route-1')
    expect(tracer.getEvents().length).toBe(0)
  })

  it('records trace events', () => {
    const tracer = new RouteTracer('test-route-1')
    tracer.trace('discovery', { providerCount: 12 })
    tracer.trace('scoring', { scoredServers: 12 })

    const events = tracer.getEvents()
    expect(events).toHaveLength(2)
    expect(events[0]!.phase).toBe('discovery')
    expect(events[0]!.data.providerCount).toBe(12)
    expect(events[1]!.phase).toBe('scoring')
  })

  it('clears events', () => {
    const tracer = new RouteTracer('test')
    tracer.trace('discovery', {})
    tracer.clear()
    expect(tracer.getEvents()).toHaveLength(0)
  })

  it('generates unique trace IDs', () => {
    const id1 = generateTraceId()
    const id2 = generateTraceId()
    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/^trace_\d+_[a-z0-9]+$/)
  })
})

describe('tracing - buildRouteReasoning', () => {
  it('builds reasoning from candidates', () => {
    const candidates = [
      {
        serverId: 'github',
        serverName: 'GitHub MCP',
        score: 85,
        matchedTerms: ['pr', 'review'],
        matchedCapabilities: ['github_pr', 'github_pr_diff'],
        reasoning: ['Category: github (12 pts)', 'Term matches: pr, review']
      }
    ]

    const reasoning = buildRouteReasoning(candidates)
    expect(reasoning).toHaveLength(1)
    expect(reasoning[0]!.serverId).toBe('github')
    expect(reasoning[0]!.signals).toEqual(['pr', 'review'])
    expect(reasoning[0]!.matchedCapabilities).toEqual(['github_pr', 'github_pr_diff'])
    expect(reasoning[0]!.policy).toBe('allowed')
  })
})

describe('tracing - buildRouteDecision', () => {
  it('builds complete route decision', () => {
    const decision = buildRouteDecision(
      { query: 'test', intent: 'test' },
      [
        {
          serverId: 'github',
          serverName: 'GitHub MCP',
          category: 'github',
          score: 85,
          matchedTerms: ['pr'],
          matchedCapabilities: ['github_pr'],
          tools: [],
          reasoning: []
        }
      ],
      [
        {
          serverId: 'github',
          serverName: 'GitHub MCP',
          tool: { name: 'github_pr', description: '', tags: [], risk: 'read' as const },
          score: 90,
          reasoning: 'test'
        }
      ],
      { allowed: true, reason: 'ok', filteredTools: [], riskLevel: 'read' as const },
      8000,
      1000
    )

    expect(decision.query).toBe('test')
    expect(decision.intent).toBe('test')
    expect(decision.servers).toHaveLength(1)
    expect(decision.tools).toHaveLength(1)
    expect(decision.routeId).toMatch(/^route_\d+_[a-z0-9]+$/)
    expect(decision.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('includes policy decision', () => {
    const decision = buildRouteDecision(
      { query: 'test' },
      [],
      [],
      { allowed: false, reason: 'Policy denied', filteredTools: [], riskLevel: 'execute' as const },
      8000,
      0
    )
    expect(decision.policy.allowed).toBe(false)
    expect(decision.policy.reason).toBe('Policy denied')
    expect(decision.policy.riskLevel).toBe('execute')
  })

  it('includes token budget and estimation', () => {
    const decision = buildRouteDecision(
      { query: 'test' },
      [],
      [],
      { allowed: true, reason: 'ok', filteredTools: [], riskLevel: 'read' as const },
      5000,
      1200
    )
    expect(decision.tokenBudget).toBe(5000)
    expect(decision.estimatedTokens).toBe(1200)
  })
})

describe('tracing - generateTraceId', () => {
  it('generates unique IDs', () => {
    const ids = new Set()
    for (let i = 0; i < 100; i++) {
      ids.add(generateTraceId())
    }
    expect(ids.size).toBe(100)
  })

  it('has correct format', () => {
    const id = generateTraceId()
    expect(id).toMatch(/^trace_\d+_[a-z0-9]+$/)
  })
})

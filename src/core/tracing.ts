import type { RouteDecision, RouteReason, RouteRequest, McpTool, ToolRisk } from './types'

export interface TraceEvent {
  routeId: string
  timestamp: string
  phase: 'discovery' | 'scoring' | 'selection' | 'policy' | 'execution' | 'complete'
  data: Record<string, unknown>
}

export class RouteTracer {
  private events: TraceEvent[] = []
  private routeId: string

  constructor(routeId: string) {
    this.routeId = routeId
  }

  trace(phase: TraceEvent['phase'], data: Record<string, unknown>): void {
    this.events.push({
      routeId: this.routeId,
      timestamp: new Date().toISOString(),
      phase,
      data
    })
  }

  getEvents(): TraceEvent[] {
    return [...this.events]
  }

  clear(): void {
    this.events = []
  }
}

export function buildRouteReasoning(
  candidates: Array<{
    serverId: string
    serverName: string
    score: number
    matchedTerms: string[]
    matchedCapabilities: string[]
    reasoning: string[]
  }>
): RouteReason[] {
  return candidates.map((c) => ({
    serverId: c.serverId,
    serverName: c.serverName,
    score: c.score,
    signals: c.matchedTerms,
    matchedCapabilities: c.matchedCapabilities,
    reasoning: c.reasoning.join('; '),
    policy: 'allowed'
  }))
}

export function buildRouteDecision(
  request: RouteRequest,
  candidates: Array<{
    serverId: string
    serverName: string
    category: string
    score: number
    matchedTerms: string[]
    matchedCapabilities: string[]
    tools: McpTool[]
    reasoning: string[]
  }>,
  selectedTools: Array<{
    serverId: string
    serverName: string
    tool: McpTool
    score: number
    reasoning: string
  }>,
  policyDecision: {
    allowed: boolean
    reason: string
    filteredTools: Array<{
      serverId: string
      serverName: string
      tool: McpTool
      score: number
      reasoning: string
    }>
    riskLevel: ToolRisk
  },
  tokenBudget: number,
  estimatedTokens: number
): RouteDecision {
  const routeId = `route_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  return {
    query: request.query,
    intent: request.intent,
    servers: candidates.map((c) => ({
      serverId: c.serverId,
      serverName: c.serverName,
      category: c.category as any,
      score: c.score,
      matchedTerms: c.matchedTerms,
      matchedCapabilities: c.matchedCapabilities,
      tools: c.tools,
      reasoning: c.reasoning
    })),
    tools: selectedTools.map((t) => ({
      serverId: t.serverId,
      serverName: t.serverName,
      tool: t.tool as any,
      score: t.score,
      reasoning: t.reasoning
    })),
    reasoning: buildRouteReasoning(candidates),
    policy: {
      allowed: policyDecision.allowed,
      reason: policyDecision.reason,
      filteredTools: policyDecision.filteredTools as any,
      riskLevel: policyDecision.riskLevel as any
    },
    tokenBudget,
    estimatedTokens,
    timestamp: new Date().toISOString(),
    routeId
  }
}

export function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

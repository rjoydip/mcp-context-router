import type { McpServerDefinition, RouteRequest, RouteDecision } from './types'
import { routeContext as scoreRouteContext } from './scoring'
import { applyPolicy, estimateTokens } from './policy'
import { buildRouteDecision } from './tracing'

export function routeContext(request: RouteRequest, servers: McpServerDefinition[]): RouteDecision {
  const { candidates, selectedTools } = scoreRouteContext(request, servers)

  // Apply policy
  const policy = applyPolicy(
    selectedTools.map((t) => ({
      serverId: t.serverId,
      serverName: t.serverName,
      tool: t.tool,
      score: t.score,
      reasoning: t.reasoning
    })),
    request.risk ? [request.risk] : undefined
  )

  const estimatedTokens = estimateTokens(
    selectedTools.map((t) => ({
      serverId: t.serverId,
      serverName: t.serverName,
      tool: t.tool,
      score: t.score,
      reasoning: t.reasoning
    }))
  )

  return buildRouteDecision(
    {
      maxServers: 3,
      maxTools: 8,
      tokenBudget: 8000,
      ...request
    } as RouteRequest,
    candidates,
    selectedTools,
    policy,
    8000,
    estimatedTokens
  )
}

export { scoreServer, scoreTool } from './scoring'
export { applyPolicy, estimateTokens, defaultPolicy } from './policy'
export { buildRouteDecision, buildRouteReasoning, RouteTracer } from './tracing'
export { ToolDiscovery, toolDiscovery } from './discovery'
export {
  createContextGraph,
  addNode,
  addEdge,
  getNode,
  getEdges,
  getRelatedNodes,
  buildGraphFromServers,
  findPath,
  serializeGraph
} from './graph'

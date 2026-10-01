export type ToolRisk = 'read' | 'write' | 'execute'

export interface PolicyConfig {
  allowRisks: ToolRisk[]
  deniedToolNames: string[]
  maxTokens?: number
}

export type McpCategory =
  | 'git'
  | 'codebase'
  | 'database'
  | 'github'
  | 'cicd'
  | 'dependency'
  | 'architecture'
  | 'sentry'
  | 'kubernetes'
  | 'cloud'
  | 'observability'
  | 'security'

export type McpSource = 'local' | 'cloudflare' | 'remote' | 'mock' | 'draft'

export interface McpTool {
  name: string
  description: string
  tags: string[]
  risk: ToolRisk
  category?: McpCategory
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
}

export interface McpServerDefinition {
  id: string
  name: string
  description: string
  category: McpCategory
  priority: number
  enabled: boolean
  source: McpSource
  risk: ToolRisk
  tools: McpTool[]
  capabilities: string[]
  version: string
  metadata?: Record<string, unknown>
}

export interface RouteRequest {
  query: string
  intent?: string
  maxServers?: number
  maxTools?: number
  tokenBudget?: number
  risk?: ToolRisk
  context?: {
    repository?: string
    branch?: string
    environment?: string
    service?: string
    commit?: string
    deployment?: string
  }
}

export interface RouteCandidate {
  serverId: string
  serverName: string
  category: McpCategory
  score: number
  matchedTerms: string[]
  matchedCapabilities: string[]
  tools: McpTool[]
  reasoning: string[]
}

export interface SelectedTool {
  serverId: string
  serverName: string
  tool: McpTool
  score: number
  reasoning: string
}

export interface PolicyDecision {
  allowed: boolean
  reason: string
  filteredTools: SelectedTool[]
  riskLevel: ToolRisk
}

export interface RouteReason {
  serverId: string
  serverName: string
  score: number
  signals: string[]
  matchedCapabilities: string[]
  reasoning: string
  policy: 'allowed' | 'denied'
}

export interface RouteDecision {
  query: string
  intent?: string
  servers: RouteCandidate[]
  tools: SelectedTool[]
  reasoning: RouteReason[]
  policy: PolicyDecision
  tokenBudget: number
  estimatedTokens: number
  timestamp: string
  routeId: string
}

export interface ContextNode {
  id: string
  type: string
  name: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface ContextEdge {
  sourceId: string
  targetId: string
  relation: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface McpProvider {
  id: string
  metadata: McpServerDefinition
  discover(): Promise<McpTool[]>
  invoke(tool: string, args: unknown): Promise<unknown>
  healthCheck?(): Promise<boolean>
}

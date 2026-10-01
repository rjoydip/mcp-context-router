import type { ContextNode, ContextEdge, McpServerDefinition, McpCategory } from './types'

export interface ContextGraph {
  nodes: Map<string, ContextNode>
  edges: Map<string, ContextEdge>
}

const NODE_TYPE_PREFIXES: Record<McpCategory, string> = {
  git: 'git',
  codebase: 'code',
  database: 'db',
  github: 'gh',
  cicd: 'ci',
  dependency: 'dep',
  architecture: 'arch',
  sentry: 'sentry',
  kubernetes: 'k8s',
  cloud: 'cloud',
  observability: 'obs',
  security: 'sec'
}

export function createContextGraph(): ContextGraph {
  return {
    nodes: new Map(),
    edges: new Map()
  }
}

export function addNode(
  graph: ContextGraph,
  category: McpCategory,
  name: string,
  metadata?: Record<string, unknown>
): ContextNode {
  const prefix = NODE_TYPE_PREFIXES[category] || 'node'
  const id = `${prefix}:${name}`
  const node: ContextNode = {
    id,
    type: category,
    name,
    metadata,
    createdAt: new Date().toISOString()
  }
  graph.nodes.set(id, node)
  return node
}

export function addEdge(
  graph: ContextGraph,
  sourceId: string,
  targetId: string,
  relation: string,
  metadata?: Record<string, unknown>
): ContextEdge {
  const edgeId = `${sourceId}:${relation}:${targetId}`
  const edge: ContextEdge = {
    sourceId,
    targetId,
    relation,
    metadata,
    createdAt: new Date().toISOString()
  }
  graph.edges.set(edgeId, edge)
  return edge
}

export function getNode(graph: ContextGraph, id: string): ContextNode | undefined {
  return graph.nodes.get(id)
}

export function getEdges(
  graph: ContextGraph,
  sourceId?: string,
  targetId?: string,
  relation?: string
): ContextEdge[] {
  return Array.from(graph.edges.values()).filter((edge) => {
    if (sourceId && edge.sourceId !== sourceId) return false
    if (targetId && edge.targetId !== targetId) return false
    if (relation && edge.relation !== relation) return false
    return true
  })
}

export function getRelatedNodes(
  graph: ContextGraph,
  nodeId: string,
  relation?: string
): ContextNode[] {
  const edges = getEdges(graph, nodeId, undefined, relation)
  const relatedIds = edges.map((e) => (e.sourceId === nodeId ? e.targetId : e.sourceId))
  return relatedIds
    .map((id) => graph.nodes.get(id))
    .filter((n): n is ContextNode => n !== undefined)
}

export function buildGraphFromServers(servers: McpServerDefinition[]): ContextGraph {
  const graph = createContextGraph()

  // Add server nodes
  for (const server of servers) {
    addNode(graph, server.category, server.id, {
      name: server.name,
      description: server.description,
      priority: server.priority,
      source: server.source,
      tools: server.tools.map((t) => t.name)
    })

    // Add tool nodes and edges
    for (const tool of server.tools) {
      const toolNode = addNode(graph, server.category, `${server.id}:${tool.name}`, {
        description: tool.description,
        tags: tool.tags,
        risk: tool.risk,
        category: tool.category
      })
      addEdge(graph, `${server.category}:${server.id}`, toolNode.id, 'provides')
    }
  }

  // Add cross-server relationships based on categories
  const categoryRelationships: Array<{ from: McpCategory; to: McpCategory; relation: string }> = [
    { from: 'github', to: 'git', relation: 'tracks' },
    { from: 'cicd', to: 'github', relation: 'triggers' },
    { from: 'cicd', to: 'codebase', relation: 'tests' },
    { from: 'cicd', to: 'architecture', relation: 'deploys' },
    { from: 'dependency', to: 'codebase', relation: 'imports' },
    { from: 'architecture', to: 'codebase', relation: 'structures' },
    { from: 'architecture', to: 'database', relation: 'models' },
    { from: 'sentry', to: 'architecture', relation: 'monitors' },
    { from: 'observability', to: 'sentry', relation: 'aggregates' },
    { from: 'observability', to: 'kubernetes', relation: 'aggregates' },
    { from: 'observability', to: 'cloud', relation: 'aggregates' },
    { from: 'observability', to: 'cicd', relation: 'aggregates' },
    { from: 'security', to: 'dependency', relation: 'scans' },
    { from: 'security', to: 'codebase', relation: 'analyzes' },
    { from: 'security', to: 'architecture', relation: 'audits' },
    { from: 'cloud', to: 'kubernetes', relation: 'hosts' },
    { from: 'cloud', to: 'database', relation: 'provides' }
  ]

  for (const { from, to, relation } of categoryRelationships) {
    const fromNode = Array.from(graph.nodes.values()).find((n) => n.type === from)
    const toNode = Array.from(graph.nodes.values()).find((n) => n.type === to)
    if (fromNode && toNode) {
      addEdge(graph, fromNode.id, toNode.id, relation)
    }
  }

  return graph
}

export function findPath(
  graph: ContextGraph,
  sourceId: string,
  targetId: string,
  maxDepth = 5
): ContextNode[] | null {
  const visited = new Set<string>()
  const queue: Array<{ nodeId: string; path: ContextNode[] }> = [
    { nodeId: sourceId, path: [graph.nodes.get(sourceId)!] }
  ]

  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!

    if (nodeId === targetId) {
      return path
    }

    if (path.length >= maxDepth) continue
    if (visited.has(nodeId)) continue
    visited.add(nodeId)

    const edges = getEdges(graph, nodeId)
    for (const edge of edges) {
      const nextId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId
      const nextNode = graph.nodes.get(nextId)
      if (nextNode && !visited.has(nextId)) {
        queue.push({ nodeId: nextId, path: [...path, nextNode] })
      }
    }
  }

  return null
}

export function serializeGraph(graph: ContextGraph): {
  nodes: ContextNode[]
  edges: ContextEdge[]
} {
  return {
    nodes: Array.from(graph.nodes.values()),
    edges: Array.from(graph.edges.values())
  }
}

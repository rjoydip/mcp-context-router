import { describe, expect, it } from 'vitest'
import {
  createContextGraph,
  addNode,
  addEdge,
  getNode,
  getEdges,
  getRelatedNodes,
  buildGraphFromServers,
  findPath,
  serializeGraph
} from '../../src/core/graph'
import { defaultServers } from '../../src/core/registry'

describe('graph - basic operations', () => {
  it('creates empty graph', () => {
    const graph = createContextGraph()
    expect(graph.nodes.size).toBe(0)
    expect(graph.edges.size).toBe(0)
  })

  it('adds nodes with unique IDs', () => {
    const graph = createContextGraph()
    const node1 = addNode(graph, 'git', 'git-ast', { name: 'Git AST' })
    const node2 = addNode(graph, 'github', 'github', { name: 'GitHub' })

    expect(graph.nodes.size).toBe(2)
    expect(node1.id).toBe('git:git-ast')
    expect(node2.id).toBe('gh:github')
  })

  it('adds edges between nodes', () => {
    const graph = createContextGraph()
    const node1 = addNode(graph, 'github', 'github')
    const node2 = addNode(graph, 'git', 'git-ast')
    const edge = addEdge(graph, node1.id, node2.id, 'tracks')

    expect(graph.edges.size).toBe(1)
    expect(edge.sourceId).toBe(node1.id)
    expect(edge.targetId).toBe(node2.id)
    expect(edge.relation).toBe('tracks')
  })

  it('retrieves nodes by ID', () => {
    const graph = createContextGraph()
    const node = addNode(graph, 'git', 'git-ast')
    const retrieved = getNode(graph, 'git:git-ast')
    expect(retrieved).toEqual(node)
  })

  it('returns undefined for non-existent node', () => {
    const graph = createContextGraph()
    expect(getNode(graph, 'nonexistent')).toBeUndefined()
  })

  it('filters edges by source', () => {
    const graph = createContextGraph()
    const a = addNode(graph, 'git', '1')
    const b = addNode(graph, 'codebase', '2')
    const c = addNode(graph, 'database', '3')
    addEdge(graph, a.id, b.id, 'rel1')
    addEdge(graph, a.id, c.id, 'rel2')
    addEdge(graph, b.id, c.id, 'rel3')

    const fromA = getEdges(graph, a.id)
    expect(fromA.length).toBe(2)
  })

  it('filters edges by target', () => {
    const graph = createContextGraph()
    const a = addNode(graph, 'git', '1')
    const b = addNode(graph, 'codebase', '2')
    const c = addNode(graph, 'database', '3')
    addEdge(graph, a.id, c.id, 'rel1')
    addEdge(graph, b.id, c.id, 'rel2')

    const toC = getEdges(graph, undefined, c.id)
    expect(toC.length).toBe(2)
  })

  it('filters edges by relation', () => {
    const graph = createContextGraph()
    const a = addNode(graph, 'git', '1')
    const b = addNode(graph, 'codebase', '2')
    addEdge(graph, a.id, b.id, 'rel1')
    addEdge(graph, a.id, b.id, 'rel2')

    const rel1Edges = getEdges(graph, a.id, b.id, 'rel1')
    expect(rel1Edges.length).toBe(1)
  })

  it('gets related nodes', () => {
    const graph = createContextGraph()
    const a = addNode(graph, 'git', '1')
    const b = addNode(graph, 'codebase', '2')
    const c = addNode(graph, 'database', '3')
    addEdge(graph, a.id, b.id, 'rel1')
    addEdge(graph, a.id, c.id, 'rel2')

    const related = getRelatedNodes(graph, a.id)
    expect(related.length).toBe(2)
  })

  it('finds path between nodes', () => {
    const graph = createContextGraph()
    const a = addNode(graph, 'git', '1')
    const b = addNode(graph, 'codebase', '2')
    const c = addNode(graph, 'database', '3')
    addEdge(graph, a.id, b.id, 'rel1')
    addEdge(graph, b.id, c.id, 'rel2')

    const path = findPath(graph, a.id, c.id)
    expect(path).toHaveLength(3)
    expect(path![0]!.id).toBe(a.id)
    expect(path![2]!.id).toBe(c.id)
  })

  it('returns null for non-existent path', () => {
    const graph = createContextGraph()
    const a = addNode(graph, 'git', '1')
    const b = addNode(graph, 'codebase', '2')
    // No edge between them
    expect(findPath(graph, a.id, b.id)).toBeNull()
  })

  it('serializes graph', () => {
    const graph = createContextGraph()
    const a = addNode(graph, 'git', '1')
    const b = addNode(graph, 'codebase', '2')
    addEdge(graph, a.id, b.id, 'rel')

    const serialized = serializeGraph(graph)
    expect(serialized.nodes.length).toBe(2)
    expect(serialized.edges.length).toBe(1)
  })
})

describe('graph - buildGraphFromServers', () => {
  it('builds graph from servers', () => {
    const graph = buildGraphFromServers(defaultServers)
    expect(graph.nodes.size).toBeGreaterThan(0)
    expect(graph.edges.size).toBeGreaterThan(0)
  })

  it('creates nodes for each server', () => {
    const graph = buildGraphFromServers(defaultServers)
    const serverNodes = Array.from(graph.nodes.values()).filter((n) =>
      defaultServers.some((s) => s.id === n.name)
    )
    expect(serverNodes.length).toBe(defaultServers.length)
  })

  it('creates tool nodes and provides edges', () => {
    const graph = buildGraphFromServers(defaultServers)
    const toolNodes = Array.from(graph.nodes.values()).filter(
      (n) => n.type === 'git' && n.name.includes(':')
    )
    const providesEdges = Array.from(graph.edges.values()).filter((e) => e.relation === 'provides')
    expect(toolNodes.length).toBeGreaterThan(0)
    expect(providesEdges.length).toBeGreaterThan(0)
  })

  it('adds category relationship edges', () => {
    const graph = buildGraphFromServers(defaultServers)
    const relationshipEdges = Array.from(graph.edges.values()).filter(
      (e) => e.relation !== 'provides' && e.relation !== 'tracks'
    )
    expect(relationshipEdges.length).toBeGreaterThan(0)
  })
})

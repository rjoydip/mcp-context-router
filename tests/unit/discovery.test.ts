import { describe, expect, it, beforeEach } from 'vitest'
import { ToolDiscovery } from '../../src/core/discovery'
import type { McpProvider } from '../../src/core/types'

const mockProvider: McpProvider = {
  id: 'test-provider',
  metadata: {
    id: 'test-provider',
    name: 'Test Provider',
    description: 'Test provider for unit tests',
    category: 'codebase',
    priority: 5,
    enabled: true,
    source: 'local',
    risk: 'read',
    tools: [
      {
        name: 'tool_a',
        description: 'Tool A',
        tags: ['tag1', 'tag2'],
        risk: 'read',
        category: 'codebase'
      },
      { name: 'tool_b', description: 'Tool B', tags: ['tag3'], risk: 'write', category: 'codebase' }
    ],
    capabilities: ['capability_a', 'capability_b'],
    version: '1.0.0'
  },
  async discover() {
    return this.metadata.tools
  },
  async invoke(tool: string) {
    return `result for ${tool}`
  }
}

describe('discovery - ToolDiscovery', () => {
  let discovery: ToolDiscovery

  beforeEach(() => {
    discovery = new ToolDiscovery()
  })

  it('registers and retrieves providers', () => {
    discovery.register(mockProvider)
    expect(discovery.get('test-provider')).toBe(mockProvider)
    expect(discovery.list()).toHaveLength(1)
  })

  it('lists servers', () => {
    discovery.register(mockProvider)
    const servers = discovery.listServers()
    expect(servers).toHaveLength(1)
    expect(servers[0]!.id).toBe('test-provider')
  })

  it('unregisters providers', () => {
    discovery.register(mockProvider)
    discovery.unregister('test-provider')
    expect(discovery.list()).toHaveLength(0)
    expect(discovery.get('test-provider')).toBeUndefined()
  })

  it('lists all tools', () => {
    discovery.register(mockProvider)
    const tools = discovery.listTools()
    expect(tools).toHaveLength(2)
    expect(tools.map((t) => t.name)).toEqual(['tool_a', 'tool_b'])
  })

  it('lists tools for specific server', () => {
    discovery.register(mockProvider)
    const tools = discovery.listTools('test-provider')
    expect(tools).toHaveLength(2)
  })

  it('returns empty for non-existent server', () => {
    discovery.register(mockProvider)
    expect(discovery.listTools('nonexistent')).toEqual([])
  })

  it('searches tools by query', async () => {
    discovery.register(mockProvider)
    const results = await discovery.searchTools('tool a')
    expect(results).toHaveLength(1)
    expect(results[0]!.name).toBe('tool_a')
  })

  it('searches tools by tag', async () => {
    discovery.register(mockProvider)
    const results = await discovery.searchTools('tag1')
    expect(results).toHaveLength(1)
  })

  it('searches tools by description', async () => {
    discovery.register(mockProvider)
    const results = await discovery.searchTools('Tool B')
    expect(results).toHaveLength(1)
    expect(results[0]!.name).toBe('tool_b')
  })

  it('filters by category', async () => {
    discovery.register(mockProvider)
    const results = await discovery.searchTools('tool', { categories: ['codebase'] })
    expect(results).toHaveLength(2)
  })

  it('limits results', async () => {
    discovery.register(mockProvider)
    const results = await discovery.searchTools('tool', { maxResults: 1 })
    expect(results.length).toBe(1)
  })

  it('searches capabilities', async () => {
    discovery.register(mockProvider)
    // searchCapabilities uses searchTools internally which searches by name/description/tags
    const result = await discovery.searchCapabilities('tool_a')
    expect(result.tools.length).toBe(1)
    expect(result.tools[0]!.name).toBe('tool_a')
    expect(result.servers.length).toBe(1)
  })

  it('invokes tools', async () => {
    discovery.register(mockProvider)
    const result = await discovery.invoke('test-provider', 'tool_a', {})
    expect(result).toBe('result for tool_a')
  })

  it('throws for non-existent provider', async () => {
    await expect(discovery.invoke('nonexistent', 'tool', {})).rejects.toThrow('Provider not found')
  })

  it('provides stats', () => {
    discovery.register(mockProvider)
    const stats = discovery.getStats()
    expect(stats.providers).toBe(1)
    expect(stats.tools).toBe(2)
    expect(stats.categories).toEqual({ codebase: 2 })
  })

  it('provides graph access', () => {
    discovery.register(mockProvider)
    const graph = discovery.getGraph()
    expect(graph.nodes.size).toBeGreaterThan(0)
  })
})

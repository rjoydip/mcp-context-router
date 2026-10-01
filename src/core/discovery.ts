import type { McpProvider, McpServerDefinition, McpTool, McpCategory, McpSource } from './types'
import { createContextGraph, buildGraphFromServers, type ContextGraph } from './graph'

export interface ToolDiscoveryOptions {
  query?: string
  categories?: McpCategory[]
  sources?: McpSource[]
  maxResults?: number
  includeDrafts?: boolean
}

export class ToolDiscovery {
  private providers: Map<string, McpProvider> = new Map()
  private graph: ContextGraph
  private toolIndex: Map<string, { providerId: string; tool: McpTool }> = new Map()

  constructor() {
    this.graph = createContextGraph()
  }

  register(provider: McpProvider): void {
    this.providers.set(provider.id, provider)

    // Index tools for fast lookup
    for (const tool of provider.metadata.tools) {
      this.toolIndex.set(`${provider.id}:${tool.name}`, { providerId: provider.id, tool })
    }

    // Update graph
    this.updateGraph()
  }

  unregister(providerId: string): void {
    this.providers.delete(providerId)

    // Remove from index
    for (const [key, value] of this.toolIndex.entries()) {
      if (value.providerId === providerId) {
        this.toolIndex.delete(key)
      }
    }

    this.updateGraph()
  }

  get(providerId: string): McpProvider | undefined {
    return this.providers.get(providerId)
  }

  list(): McpProvider[] {
    return Array.from(this.providers.values())
  }

  listServers(): McpServerDefinition[] {
    return this.list().map((p) => p.metadata)
  }

  listTools(serverId?: string): McpTool[] {
    if (serverId) {
      const provider = this.providers.get(serverId)
      return provider ? provider.metadata.tools : []
    }
    return Array.from(this.toolIndex.values()).map((v) => v.tool)
  }

  async searchTools(query: string, options: ToolDiscoveryOptions = {}): Promise<McpTool[]> {
    const lowerQuery = query.toLowerCase()
    const results: Array<{ tool: McpTool; score: number }> = []

    for (const [, { tool }] of this.toolIndex) {
      if (options.categories && tool.category && !options.categories.includes(tool.category)) {
        continue
      }

      let score = 0
      const _searchable = [tool.name, tool.description, ...tool.tags].join(' ').toLowerCase()

      // Exact match on name
      if (tool.name.toLowerCase().includes(lowerQuery)) {
        score += 100
      }

      // Tag match
      for (const tag of tool.tags) {
        if (tag.toLowerCase().includes(lowerQuery)) {
          score += 50
        }
      }

      // Description match
      if (tool.description.toLowerCase().includes(lowerQuery)) {
        score += 25
      }

      if (score > 0) {
        results.push({ tool, score })
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, options.maxResults || 20)
      .map((r) => r.tool)
  }

  async searchCapabilities(
    query: string,
    options: ToolDiscoveryOptions = {}
  ): Promise<{
    servers: McpServerDefinition[]
    tools: McpTool[]
  }> {
    const tools = await this.searchTools(query, options)

    // Find unique servers that provide these tools
    const serverIds = new Set<string>()
    for (const tool of tools) {
      for (const [_key, value] of this.toolIndex.entries()) {
        if (value.tool.name === tool.name) {
          serverIds.add(value.providerId)
          break
        }
      }
    }

    const servers = Array.from(serverIds)
      .map((id) => this.providers.get(id)?.metadata)
      .filter((s): s is McpServerDefinition => s !== undefined)

    return { servers, tools }
  }

  async discover(providerId: string): Promise<McpTool[]> {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`)
    }
    const tools = await provider.discover()
    return tools
  }

  async invoke(providerId: string, tool: string, args: unknown): Promise<unknown> {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`)
    }
    return provider.invoke(tool, args)
  }

  private updateGraph(): void {
    this.graph = buildGraphFromServers(this.listServers())
  }

  getGraph(): ContextGraph {
    return this.graph
  }

  getStats(): { providers: number; tools: number; categories: Record<string, number> } {
    const categories: Record<string, number> = {}
    for (const [, { tool }] of this.toolIndex) {
      if (tool.category) {
        categories[tool.category] = (categories[tool.category] || 0) + 1
      }
    }
    return {
      providers: this.providers.size,
      tools: this.toolIndex.size,
      categories
    }
  }
}

export const toolDiscovery = new ToolDiscovery()

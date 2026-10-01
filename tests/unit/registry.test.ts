import { describe, expect, it } from 'vitest'
import { defaultServers } from '../../src/core/registry'
import type { McpCategory, McpSource } from '../../src/core/types'

const VALID_CATEGORIES: McpCategory[] = [
  'git',
  'codebase',
  'database',
  'github',
  'cicd',
  'dependency',
  'architecture',
  'sentry',
  'kubernetes',
  'cloud',
  'observability',
  'security'
]

const VALID_SOURCES: McpSource[] = ['local', 'cloudflare', 'remote', 'mock', 'draft']

describe('registry - defaultServers', () => {
  it('registers all 12 MCP servers', () => {
    expect(defaultServers).toHaveLength(12)
  })

  it('has unique server ids', () => {
    const ids = defaultServers.map((server) => server.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses the expected server ids', () => {
    expect(defaultServers.map((server) => server.id)).toEqual([
      'git-ast',
      'codebase',
      'database',
      'github',
      'cicd',
      'dependency',
      'architecture',
      'sentry',
      'kubernetes',
      'cloud',
      'observability',
      'security'
    ])
  })

  it('every server is enabled and read-only', () => {
    for (const server of defaultServers) {
      expect(server.enabled).toBe(true)
      expect(server.risk).toBe('read')
    }
  })

  it('every server has a valid category and source', () => {
    for (const server of defaultServers) {
      expect(VALID_CATEGORIES).toContain(server.category)
      expect(VALID_SOURCES).toContain(server.source)
    }
  })

  it('every server has name, description and version', () => {
    for (const server of defaultServers) {
      expect(server.name.length).toBeGreaterThan(0)
      expect(server.description.length).toBeGreaterThan(0)
      expect(server.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(server.priority).toBeGreaterThan(0)
    }
  })

  it('every server exposes at least one tool', () => {
    for (const server of defaultServers) {
      expect(server.tools.length).toBeGreaterThan(0)
    }
  })

  it('has unique tool names within each server', () => {
    for (const server of defaultServers) {
      const names = server.tools.map((tool) => tool.name)
      expect(new Set(names).size, `duplicate tools in ${server.id}`).toBe(names.length)
    }
  })

  it('has unique tool names across all servers except shared capabilities', () => {
    // dependency_vulnerabilities is intentionally shared by dependency + security.
    const names = defaultServers.flatMap((server) => server.tools.map((tool) => tool.name))
    const counts = new Map<string, number>()
    for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1)
    const duplicated = [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name)
    expect(duplicated).toEqual(['dependency_vulnerabilities'])
  })

  it('every tool is read-only with a description and tags', () => {
    for (const server of defaultServers) {
      for (const tool of server.tools) {
        expect(tool.risk, `${server.id}.${tool.name}`).toBe('read')
        expect(tool.description.length, `${server.id}.${tool.name}`).toBeGreaterThan(0)
        expect(tool.tags.length, `${server.id}.${tool.name}`).toBeGreaterThan(0)
      }
    }
  })

  it('capabilities cover every tool name', () => {
    for (const server of defaultServers) {
      for (const tool of server.tools) {
        expect(server.capabilities, `${server.id}.${tool.name}`).toContain(tool.name)
      }
    }
  })

  it('capabilities have no duplicates', () => {
    for (const server of defaultServers) {
      expect(new Set(server.capabilities).size, `duplicate capabilities in ${server.id}`).toBe(
        server.capabilities.length
      )
    }
  })

  it('local servers declare read-only metadata', () => {
    const local = defaultServers.filter((server) => server.source === 'local')
    expect(local.length).toBeGreaterThan(0)
    for (const server of local) {
      expect(server.metadata?.read_only, server.id).toBe(true)
    }
  })
})

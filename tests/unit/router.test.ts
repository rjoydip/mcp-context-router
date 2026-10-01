import { describe, expect, it } from 'vitest'
import { routeContext } from '../../src/core/router'
import { defaultServers } from '../../src/core/registry'

describe('context router', () => {
  it('routes git and AST intents to local Git AST', () => {
    const result = routeContext(
      { query: 'inspect git diff and TypeScript AST symbols' },
      defaultServers
    )
    expect(result.servers.map((s) => s.serverId)).toContain('git-ast')
    expect(result.tools.map((t) => t.tool.name)).toContain('ast_symbols')
  })
  it('routes database intents to database MCP', () => {
    const result = routeContext(
      { query: 'inspect postgres database schema and SQL query' },
      defaultServers
    )
    expect(result.servers.map((s) => s.serverId)).toContain('database')
  })
  it('routes production error intents to Sentry and Kubernetes', () => {
    const result = routeContext(
      { query: 'investigate production errors and Kubernetes pod logs' },
      defaultServers
    )
    expect(result.servers.map((s) => s.serverId)).toContain('sentry')
    expect(result.servers.map((s) => s.serverId)).toContain('kubernetes')
  })
  it('keeps the default policy read-only', () => {
    const result = routeContext({ query: 'inspect code and database' }, defaultServers)
    expect(result.tools.every((t) => t.tool.risk === 'read')).toBe(true)
  })
})

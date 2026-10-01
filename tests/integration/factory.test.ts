import { describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import { createRouterMcpServer } from '../../src/mcp/server'
import { CodebaseService } from '../../src/local/codebase'
import { LocalGitAst } from '../../src/local/git-ast'

describe('MCP integration', () => {
  it('exposes router, Git AST and codebase tools', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const server = createRouterMcpServer({
      git: new LocalGitAst(),
      codebase: new CodebaseService(process.cwd()),
      database: undefined
    })
    const client = new Client({ name: 'integration-test', version: '0.3.0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
    const names = (await client.listTools()).tools.map((tool) => tool.name)
    expect(names).toEqual(
      expect.arrayContaining(['route_context', 'ast_symbols', 'code_search', 'db_schema'])
    )
    const result = await client.callTool({
      name: 'route_context',
      arguments: { query: 'inspect git AST and codebase', intent: 'inspect git AST and codebase' }
    })
    expect(result.isError).not.toBe(true)
    await client.close()
    await server.close()
  })
})

describe('server factory (as used by serveStdio / createMcpHandler)', () => {
  it('produces an independent, fully wired server per call', async () => {
    const factory = () =>
      createRouterMcpServer({
        git: new LocalGitAst(),
        codebase: new CodebaseService(process.cwd())
      })

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const server = factory()
    const client = new Client({ name: 'factory-test', version: '0.3.0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    const tools = (await client.listTools()).tools
    expect(tools.length).toBeGreaterThan(0)
    for (const tool of tools) {
      expect(tool.inputSchema).toBeDefined()
    }

    // route_context must echo the intent and return a policy decision
    const result = await client.callTool({
      name: 'route_context',
      arguments: {
        query: 'inspect database schema and git history',
        intent: 'inspect database schema and git history'
      }
    })
    expect(result.isError).not.toBe(true)
    const payload = JSON.parse((result.content as Array<{ text: string }>)[0]!.text)
    expect(payload.query).toBe('inspect database schema and git history')
    expect(payload.policy).toBeDefined()
    expect(payload.policy.allowed).toBe(true)

    await client.close()
    await server.close()
  })

  it('enforces read-only policy on tool results', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const server = createRouterMcpServer({
      git: new LocalGitAst(),
      codebase: new CodebaseService(process.cwd())
    })
    const client = new Client({ name: 'policy-test', version: '0.3.0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    const result = await client.callTool({
      name: 'route_context',
      arguments: {
        query: 'inspect code and database',
        intent: 'inspect code and database',
        allowRisk: ['write', 'execute']
      }
    })
    const payload = JSON.parse((result.content as Array<{ text: string }>)[0]!.text)
    // requesting write/execute must not expand beyond the read-only default
    expect(payload.tools.every((t: { tool: { risk: string } }) => t.tool.risk === 'read')).toBe(
      true
    )

    await client.close()
    await server.close()
  })
})

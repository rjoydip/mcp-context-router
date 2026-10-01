import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import { createRouterMcpServer } from '../../src/mcp/server'
import { CodebaseService } from '../../src/local/codebase'
import { LocalGitAst } from '../../src/local/git-ast'

describe('MCP Server Integration', () => {
  let client: Client
  let serverTransport: any
  let clientTransport: any
  let server: any

  beforeEach(async () => {
    ;[clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const serverInstance = createRouterMcpServer({
      git: new LocalGitAst(),
      codebase: new CodebaseService(process.cwd()),
      database: undefined
    })
    server = serverInstance
    client = new Client({ name: 'integration-test', version: '0.3.0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  })

  afterEach(async () => {
    await client.close()
    await server.close()
  })

  it('exposes router, Git AST and codebase tools', async () => {
    const names = (await client.listTools()).tools.map((tool) => tool.name)
    expect(names).toEqual(
      expect.arrayContaining(['route_context', 'ast_symbols', 'code_search', 'db_schema'])
    )
  })

  it('routes git AST and codebase intent', async () => {
    const result = await client.callTool({
      name: 'route_context',
      arguments: { query: 'inspect git AST and codebase', intent: 'inspect git AST and codebase' }
    })
    expect(result.isError).not.toBe(true)
    const payload = JSON.parse((result.content as Array<{ text: string }>)[0]!.text)
    expect(payload.query).toBe('inspect git AST and codebase')
    expect(payload.servers.length).toBeGreaterThan(0)
  })

  it('lists servers via MCP', async () => {
    const result = await client.callTool({
      name: 'list_servers',
      arguments: {}
    })
    expect(result.isError).not.toBe(true)
    const servers = JSON.parse((result.content as Array<{ text: string }>)[0]!.text)
    expect(servers.length).toBeGreaterThan(0)
  })

  it('executes git_status tool', async () => {
    const result = await client.callTool({
      name: 'git_status',
      arguments: {}
    })
    expect(result.isError).not.toBe(true)
    expect(typeof (result.content as Array<{ text: string }>)[0]!.text).toBe('string')
  })

  it('executes git_log tool with limit', async () => {
    const result = await client.callTool({
      name: 'git_log',
      arguments: { limit: 5 }
    })
    expect(result.isError).not.toBe(true)
  })

  it('executes code_search tool', async () => {
    const result = await client.callTool({
      name: 'code_search',
      arguments: { query: 'function', maxResults: 3 }
    })
    expect(result.isError).not.toBe(true)
  })

  it('executes read_file tool', async () => {
    const result = await client.callTool({
      name: 'read_file',
      arguments: { file: 'package.json' }
    })
    expect(result.isError).not.toBe(true)
  })

  it('returns error for non-existent tool', async () => {
    try {
      const result = await client.callTool({
        name: 'non_existent_tool',
        arguments: {}
      })
      expect(result.isError).toBe(true)
    } catch (error) {
      // If the client throws a ProtocolError for unknown tools, that's also acceptable
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain('not found')
    }
  })
})

describe('MCP Server - Policy Enforcement', () => {
  let client: Client
  let serverTransport: any
  let clientTransport: any
  let server: any

  beforeEach(async () => {
    ;[clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const serverInstance = createRouterMcpServer({
      git: new LocalGitAst(),
      codebase: new CodebaseService(process.cwd()),
      database: undefined
    })
    server = serverInstance
    client = new Client({ name: 'policy-test', version: '0.3.0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  })

  afterEach(async () => {
    await client.close()
    await server.close()
  })

  it('enforces read-only policy when requesting write', async () => {
    const result = await client.callTool({
      name: 'route_context',
      arguments: {
        query: 'write to file',
        intent: 'write to file',
        allowRisk: ['write']
      }
    })
    const payload = JSON.parse((result.content as Array<{ text: string }>)[0]!.text)
    expect(payload.policy.filteredTools.every((t: any) => t.tool.risk === 'read')).toBe(true)
  })

  it('returns policy decision in route result', async () => {
    const result = await client.callTool({
      name: 'route_context',
      arguments: { intent: 'inspect code', allowRisk: ['read'] }
    })
    const payload = JSON.parse((result.content as Array<{ text: string }>)[0]!.text)
    expect(payload.policy).toBeDefined()
    expect(payload.policy.allowed).toBe(true)
    expect(payload.policy.reason).toBeDefined()
  })
})

describe('MCP Server - Multiple Instances', () => {
  it('creates independent server instances', async () => {
    const [c1, s1] = InMemoryTransport.createLinkedPair()
    const [c2, s2] = InMemoryTransport.createLinkedPair()

    const server1 = createRouterMcpServer({
      git: new LocalGitAst(),
      codebase: new CodebaseService(process.cwd())
    })
    const server2 = createRouterMcpServer({
      git: new LocalGitAst(),
      codebase: new CodebaseService(process.cwd())
    })

    const client1 = new Client({ name: 'client1', version: '1.0' })
    const client2 = new Client({ name: 'client2', version: '1.0' })

    await Promise.all([
      server1.connect(s1),
      server2.connect(s2),
      client1.connect(c1),
      client2.connect(c2)
    ])

    const tools1 = (await client1.listTools()).tools.map((t) => t.name)
    const tools2 = (await client2.listTools()).tools.map((t) => t.name)

    expect(tools1).toEqual(tools2)

    await client1.close()
    await client2.close()
    await server1.close()
    await server2.close()
  })
})

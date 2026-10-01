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

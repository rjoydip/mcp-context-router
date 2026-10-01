import { McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod/v4'
import { defaultServers } from '../core/registry'
import { routeContext } from '../core/router'
import { CodebaseService } from '../local/codebase'
import { DatabaseService } from '../local/database'
import { LocalGitAst } from '../local/git-ast'

export interface RouterServices {
  git: LocalGitAst
  codebase: CodebaseService
  database?: DatabaseService
}

export function createRouterMcpServer(services: RouterServices) {
  const server = new McpServer({ name: 'mcp-context-router', version: '0.3.0' })

  server.registerTool(
    'route_context',
    {
      description: 'Discover and policy-filter MCP capabilities for an agent intent',
      inputSchema: z.object({
        intent: z.string().min(1),
        maxServers: z.number().int().min(1).max(10).optional(),
        maxTools: z.number().int().min(1).max(50).optional(),
        allowRisk: z.array(z.enum(['read', 'write', 'execute'])).optional()
      })
    },
    async ({ intent, maxServers, maxTools, allowRisk }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            routeContext(
              {
                query: intent,
                intent,
                maxServers,
                maxTools,
                risk: allowRisk ? allowRisk[0] : undefined
              },
              defaultServers
            ),
            null,
            2
          )
        }
      ]
    })
  )

  server.registerTool(
    'list_servers',
    { description: 'List all capabilities known by the router' },
    async () => ({ content: [{ type: 'text', text: JSON.stringify(defaultServers, null, 2) }] })
  )

  server.registerTool('git_status', { description: 'Inspect local Git status' }, async () => ({
    content: [{ type: 'text', text: await services.git.status() }]
  }))

  server.registerTool(
    'git_log',
    {
      description: 'Inspect local Git history',
      inputSchema: z.object({ limit: z.number().int().min(1).max(50).optional() })
    },
    async ({ limit }) => ({ content: [{ type: 'text', text: await services.git.log(limit) }] })
  )

  server.registerTool(
    'git_diff',
    {
      description: 'Inspect local Git diff',
      inputSchema: z.object({ staged: z.boolean().optional() })
    },
    async ({ staged }) => ({ content: [{ type: 'text', text: await services.git.diff(staged) }] })
  )

  server.registerTool(
    'ast_symbols',
    {
      description: 'Extract TypeScript or JavaScript symbols from a local file',
      inputSchema: z.object({ file: z.string().min(1) })
    },
    async ({ file }) => ({
      content: [{ type: 'text', text: JSON.stringify(await services.git.symbols(file), null, 2) }]
    })
  )

  server.registerTool(
    'code_search',
    {
      description: 'Search source files in the local codebase',
      inputSchema: z.object({
        query: z.string().min(1),
        maxResults: z.number().int().min(1).max(100).optional()
      })
    },
    async ({ query, maxResults }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(await services.codebase.search(query, maxResults), null, 2)
        }
      ]
    })
  )

  server.registerTool(
    'read_file',
    {
      description: 'Read a local codebase file',
      inputSchema: z.object({ file: z.string().min(1) })
    },
    async ({ file }) => ({
      content: [{ type: 'text', text: await services.codebase.readFile(file) }]
    })
  )

  server.registerTool(
    'list_files',
    {
      description: 'List local codebase files',
      inputSchema: z.object({ directory: z.string().optional() })
    },
    async ({ directory }) => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(await services.codebase.listFiles(directory), null, 2)
        }
      ]
    })
  )

  server.registerTool('db_schema', { description: 'Inspect PostgreSQL schema' }, async () =>
    services.database
      ? {
          content: [
            { type: 'text', text: JSON.stringify(await services.database.schema(), null, 2) }
          ]
        }
      : { isError: true, content: [{ type: 'text', text: 'DATABASE_URL is not configured' }] }
  )

  server.registerTool(
    'db_query',
    {
      description: 'Execute a read-only PostgreSQL query',
      inputSchema: z.object({ sql: z.string().min(1), params: z.array(z.unknown()).optional() })
    },
    async ({ sql, params }) =>
      services.database
        ? {
            content: [
              {
                type: 'text',
                text: JSON.stringify(await services.database.query(sql, params), null, 2)
              }
            ]
          }
        : { isError: true, content: [{ type: 'text', text: 'DATABASE_URL is not configured' }] }
  )

  return server
}

import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { CodebaseService } from '../local/codebase'
import { DatabaseService } from '../local/database'
import { LocalGitAst } from '../local/git-ast'
import { createRouterMcpServer } from '../mcp/server'

const services = {
  git: new LocalGitAst(),
  codebase: new CodebaseService(),
  database: process.env.DATABASE_URL ? new DatabaseService() : undefined
}

// serveStdio takes a factory so each connection gets its own server instance.
void serveStdio(() => createRouterMcpServer(services))

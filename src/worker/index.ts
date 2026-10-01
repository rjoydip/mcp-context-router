import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { McpServer } from '@modelcontextprotocol/server'
import { createMcpHandler } from '@modelcontextprotocol/server'
import * as z from 'zod/v4'
import { routeContext } from '../core/router'
import { applyPolicy, defaultPolicy } from '../core/policy'
import { GitHubService } from '../cloudflare/github-service'
import { CloudflareCodebaseService } from '../cloudflare/codebase-service'
import { CloudflareDatabaseService } from '../cloudflare/database-service'
import { CICDService } from '../cloudflare/cicd-service'
import { DependencyService } from '../cloudflare/dependency-service'
import { ArchitectureService } from '../cloudflare/architecture-service'
import { SentryService } from '../cloudflare/sentry-service'
import { KubernetesService } from '../cloudflare/kubernetes-service'
import { CloudflareService } from '../cloudflare/cloud-service'
import { ObservabilityService } from '../cloudflare/observability-service'
import { SecurityService } from '../cloudflare/security-service'
import type { RouteRequest } from '../core/types'
import type { D1Database, R2Bucket, KVNamespace, Fetcher } from '@cloudflare/workers-types'

export interface CloudflareEnv {
  ASSETS: Fetcher
  DB: D1Database
  CODEBASE_BUCKET: R2Bucket
  CODEBASE_KV: KVNamespace
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  CICD_TOKEN?: string
  CICD_PROVIDER?: string
  SENTRY_TOKEN?: string
  SENTRY_ORG?: string
  KUBERNETES_CONFIG?: string
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_API_TOKEN?: string
}

const app = new Hono<{ Bindings: CloudflareEnv }>()

app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.post('/api/route', async (c) => {
  const env = c.env
  const body = await c.req.json<RouteRequest>()

  const services = buildServices(env)
  const result = routeContext(body, services.servers)
  const policy = applyPolicy(result.tools, body.risk ? [body.risk] : undefined, defaultPolicy)

  return c.json({ ...result, policy })
})

app.get('/api/servers', (c) => {
  const env = c.env
  const services = buildServices(env)
  return c.json(services.servers)
})

function buildServices(env: CloudflareEnv): {
  servers: any[]
  github: GitHubService
  codebase: CloudflareCodebaseService
  database: CloudflareDatabaseService
  cicd: CICDService | undefined
  dependency: DependencyService
  architecture: ArchitectureService
  sentry: SentryService | undefined
  kubernetes: KubernetesService | undefined
  cloudflare: CloudflareService | undefined
  observability: ObservabilityService
  security: SecurityService
} {
  const github = new GitHubService({
    token: env.GITHUB_TOKEN,
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO
  })
  const codebase = new CloudflareCodebaseService(env.CODEBASE_BUCKET, env.CODEBASE_KV)
  const database = new CloudflareDatabaseService(env.DB)
  const cicd = env.CICD_TOKEN
    ? new CICDService({
        provider: (env.CICD_PROVIDER as any) || 'github',
        token: env.CICD_TOKEN,
        owner: env.GITHUB_OWNER,
        repo: env.GITHUB_REPO
      })
    : undefined
  const dependency = new DependencyService()
  const architecture = new ArchitectureService({ codebasePath: '/' })
  const sentry = env.SENTRY_TOKEN
    ? new SentryService({
        token: env.SENTRY_TOKEN,
        org: env.SENTRY_ORG || ''
      })
    : undefined
  const kubernetes = env.KUBERNETES_CONFIG
    ? new KubernetesService({
        provider: 'local',
        kubeconfig: env.KUBERNETES_CONFIG
      })
    : undefined
  const cloudflare = env.CLOUDFLARE_ACCOUNT_ID
    ? new CloudflareService({
        accountId: env.CLOUDFLARE_ACCOUNT_ID,
        apiToken: env.CLOUDFLARE_API_TOKEN || ''
      })
    : undefined
  const observability = new ObservabilityService({
    sentry: env.SENTRY_TOKEN ? { token: env.SENTRY_TOKEN, org: env.SENTRY_ORG || '' } : undefined,
    cloudflare: env.CLOUDFLARE_ACCOUNT_ID
      ? { accountId: env.CLOUDFLARE_ACCOUNT_ID, apiToken: env.CLOUDFLARE_API_TOKEN || '' }
      : undefined
  })
  const security = new SecurityService({})

  const servers = buildServicesMap(
    github,
    codebase,
    database,
    cicd,
    dependency,
    architecture,
    sentry,
    kubernetes,
    cloudflare,
    observability,
    security
  )

  return {
    github,
    codebase,
    database,
    cicd,
    dependency,
    architecture,
    sentry,
    kubernetes,
    cloudflare,
    observability,
    security,
    servers
  }
}

function buildServicesMap(
  github: GitHubService,
  codebase: CloudflareCodebaseService,
  database: CloudflareDatabaseService,
  cicd: CICDService | undefined,
  dependency: DependencyService,
  architecture: ArchitectureService,
  sentry: SentryService | undefined,
  kubernetes: KubernetesService | undefined,
  cloudflare: CloudflareService | undefined,
  observability: ObservabilityService,
  security: SecurityService
) {
  const servers: any[] = [
    {
      id: 'github',
      name: 'GitHub MCP',
      description: 'Repository, pull request, issue and commit metadata from GitHub.',
      category: 'github',
      priority: 12,
      enabled: true,
      source: 'remote' as const,
      risk: 'read' as const,
      tools: github.getTools(),
      capabilities: [
        'github_repo',
        'github_file',
        'github_pr',
        'github_pr_diff',
        'github_issue',
        'github_commit',
        'github_release',
        'github_actions',
        'github_search',
        'git_metadata',
        'ci_metadata'
      ],
      version: '1.0.0',
      metadata: { requires_auth: true, read_only: true }
    },
    {
      id: 'codebase',
      name: 'Codebase MCP',
      description: 'Search, read and inspect source code stored in R2/KV.',
      category: 'codebase',
      priority: 11,
      enabled: true,
      source: 'local' as const,
      risk: 'read' as const,
      tools: codebase.getTools(),
      capabilities: [
        'list_files',
        'read_file',
        'code_search',
        'find_symbol',
        'find_references',
        'find_importers',
        'find_exports',
        'local_search',
        'symbol_navigation',
        'code_navigation'
      ],
      version: '1.0.0',
      metadata: { local_only: true, read_only: true, path_traversal_protection: true }
    },
    {
      id: 'database',
      name: 'Database MCP',
      description: 'Read-only D1 (SQLite) schema inspection and parameterized query execution.',
      category: 'database',
      priority: 10,
      enabled: true,
      source: 'local' as const,
      risk: 'read' as const,
      tools: database.getTools(),
      capabilities: [
        'db_schema',
        'db_query',
        'db_tables',
        'db_indexes',
        'db_explain',
        'db_table_stats',
        'postgres',
        'read_only_sql',
        'schema_inspection'
      ],
      version: '1.0.0',
      metadata: { read_only: true, allowed_statements: ['SELECT', 'WITH', 'EXPLAIN'] }
    }
  ]

  if (cicd) {
    servers.push({
      id: 'cicd',
      name: 'CI/CD MCP',
      description: 'Build, deployment and pipeline metadata.',
      category: 'cicd',
      priority: 9,
      enabled: true,
      source: 'remote' as const,
      risk: 'read' as const,
      tools: cicd.getTools(),
      capabilities: [
        'ci_runs',
        'ci_run',
        'ci_logs',
        'ci_failed_steps',
        'ci_artifacts',
        'deployments',
        'deployment_status',
        'pipeline_metadata',
        'deployment_tracking'
      ],
      version: '1.0.0',
      metadata: { requires_auth: true, read_only: true }
    })
  }

  servers.push({
    id: 'dependency',
    name: 'Dependency MCP',
    description: 'Project dependencies and their relationships.',
    category: 'dependency',
    priority: 7,
    enabled: true,
    source: 'local' as const,
    risk: 'read' as const,
    tools: dependency.getTools(),
    capabilities: [
      'dependencies',
      'dependency_tree',
      'dependency_usage',
      'dependency_updates',
      'dependency_changes',
      'dependency_vulnerabilities',
      'dependency_license',
      'package_analysis',
      'vulnerability_scanning'
    ],
    version: '1.0.0',
    metadata: { local_only: true, read_only: true }
  })

  servers.push({
    id: 'architecture',
    name: 'Architecture MCP',
    description: 'High-level architecture and context graph.',
    category: 'architecture',
    priority: 6,
    enabled: true,
    source: 'local' as const,
    risk: 'read' as const,
    tools: architecture.getTools(),
    capabilities: [
      'architecture_overview',
      'service_dependencies',
      'module_dependencies',
      'data_flow',
      'request_flow',
      'dependency_graph',
      'impact_analysis',
      'context_graph',
      'change_impact'
    ],
    version: '1.0.0',
    metadata: {
      local_only: true,
      read_only: true,
      aggregates: ['git', 'codebase', 'database', 'dependency', 'github', 'cicd']
    }
  })

  if (sentry) {
    servers.push({
      id: 'sentry',
      name: 'Sentry MCP',
      description: 'Production errors, traces, releases and issue events.',
      category: 'sentry',
      priority: 8,
      enabled: true,
      source: 'remote' as const,
      risk: 'read' as const,
      tools: sentry.getTools(),
      capabilities: [
        'sentry_issues',
        'sentry_issue',
        'sentry_events',
        'sentry_release',
        'sentry_errors',
        'sentry_traces',
        'error_tracking',
        'release_tracking'
      ],
      version: '1.0.0',
      metadata: { requires_auth: true, read_only: true }
    })
  }

  if (kubernetes) {
    servers.push({
      id: 'kubernetes',
      name: 'Kubernetes MCP',
      description: 'Draft integration for Kubernetes cluster health, workloads and logs.',
      category: 'kubernetes',
      priority: 6,
      enabled: true,
      source: 'draft' as const,
      risk: 'read' as const,
      tools: kubernetes.getTools(),
      capabilities: [
        'k8s_clusters',
        'k8s_namespaces',
        'k8s_pods',
        'k8s_deployments',
        'k8s_services',
        'k8s_events',
        'k8s_logs',
        'k8s_rollout',
        'cluster_health',
        'workload_inspection'
      ],
      version: '1.0.0',
      metadata: { draft: true, read_only: true }
    })
  }

  if (cloudflare) {
    servers.push({
      id: 'cloud',
      name: 'Cloud MCP',
      description: 'Cloud infrastructure and services.',
      category: 'cloud',
      priority: 7,
      enabled: true,
      source: 'cloudflare' as const,
      risk: 'read' as const,
      tools: cloudflare.getTools(),
      capabilities: [
        'cloud_workers',
        'cloud_d1',
        'cloud_r2',
        'cloud_kv',
        'cloud_vectorize',
        'cloud_queues',
        'cloud_durable_objects',
        'cloud_ai',
        'cloud_routes',
        'cloud_deployments',
        'cloudflare_infrastructure'
      ],
      version: '1.0.0',
      metadata: { cloudflare_native: true, read_only: true }
    })
  }

  servers.push({
    id: 'observability',
    name: 'Observability/Incident MCP',
    description: 'Production incidents, signals and correlation.',
    category: 'observability',
    priority: 7,
    enabled: true,
    source: 'draft' as const,
    risk: 'read' as const,
    tools: observability.getTools(),
    capabilities: [
      'incident_search',
      'incident_timeline',
      'service_health',
      'error_rate',
      'latency',
      'deployment_correlation',
      'release_health',
      'incident_correlation',
      'signal_aggregation'
    ],
    version: '1.0.0',
    metadata: {
      draft: true,
      aggregates: ['sentry', 'kubernetes', 'cloud', 'cicd', 'github'],
      read_only: true
    }
  })

  servers.push({
    id: 'security',
    name: 'Security MCP',
    description: 'Security analysis and vulnerability management.',
    category: 'security',
    priority: 9,
    enabled: true,
    source: 'draft' as const,
    risk: 'read' as const,
    tools: security.getTools(),
    capabilities: [
      'security_scan',
      'dependency_vulnerabilities',
      'secret_detection',
      'sast_findings',
      'sbom',
      'container_findings',
      'configuration_findings',
      'reachable_vulnerabilities',
      'vulnerability_management',
      'supply_chain_security'
    ],
    version: '1.0.0',
    metadata: {
      draft: true,
      aggregates: ['dependency', 'codebase', 'git', 'cloud', 'cicd', 'architecture'],
      read_only: true
    }
  })

  // Add git-ast local server
  servers.unshift({
    id: 'git-ast',
    name: 'Git AST MCP',
    description:
      'Read-only local Git history, status, diffs, repository files and TypeScript AST symbols.',
    category: 'git',
    priority: 12,
    enabled: true,
    source: 'local' as const,
    risk: 'read' as const,
    tools: [
      {
        name: 'git_status',
        description: 'Inspect local Git working tree status',
        tags: ['git', 'status', 'changes'],
        risk: 'read' as const,
        category: 'git'
      },
      {
        name: 'git_log',
        description: 'Inspect local Git commit history',
        tags: ['git', 'history', 'commits'],
        risk: 'read' as const,
        category: 'git'
      },
      {
        name: 'git_diff',
        description: 'Inspect local Git diff',
        tags: ['git', 'diff', 'changes'],
        risk: 'read' as const,
        category: 'git'
      },
      {
        name: 'git_show',
        description: 'Show Git commit details',
        tags: ['git', 'commit', 'show'],
        risk: 'read' as const,
        category: 'git'
      },
      {
        name: 'git_branches',
        description: 'List Git branches',
        tags: ['git', 'branches'],
        risk: 'read' as const,
        category: 'git'
      },
      {
        name: 'ast_symbols',
        description: 'Extract TypeScript/JavaScript AST symbols from local files',
        tags: ['ast', 'typescript', 'javascript', 'symbols'],
        risk: 'read' as const,
        category: 'git'
      },
      {
        name: 'ast_imports',
        description: 'Extract import statements from local files',
        tags: ['ast', 'imports', 'dependencies'],
        risk: 'read' as const,
        category: 'git'
      },
      {
        name: 'ast_exports',
        description: 'Extract export statements from local files',
        tags: ['ast', 'exports', 'api'],
        risk: 'read' as const,
        category: 'git'
      },
      {
        name: 'ast_dependencies',
        description: 'Extract internal dependency graph from AST',
        tags: ['ast', 'dependencies', 'graph'],
        risk: 'read' as const,
        category: 'git'
      }
    ],
    capabilities: [
      'git_status',
      'git_log',
      'git_diff',
      'git_show',
      'git_branches',
      'ast_symbols',
      'ast_imports',
      'ast_exports',
      'ast_dependencies',
      'local_git',
      'ast_parsing',
      'symbol_extraction',
      'dependency_graph'
    ],
    version: '1.0.0',
    metadata: { local_only: true, read_only: true }
  })

  return servers
}

async function createMcpServer(env: CloudflareEnv): Promise<McpServer> {
  const _services = buildServices(env)
  const server = new McpServer({ name: 'mcp-context-router', version: '1.0.0' })

  server.registerTool(
    'route_context',
    {
      description: 'Discover and policy-filter MCP capabilities for an agent intent',
      inputSchema: z.object({
        query: z.string().min(1),
        intent: z.string().optional(),
        maxServers: z.number().int().min(1).max(10).optional(),
        maxTools: z.number().int().min(1).max(50).optional(),
        tokenBudget: z.number().int().min(100).max(50000).optional(),
        allowRisk: z.array(z.enum(['read', 'write', 'execute'])).optional(),
        context: z
          .object({
            repository: z.string().optional(),
            branch: z.string().optional(),
            environment: z.string().optional(),
            service: z.string().optional(),
            commit: z.string().optional(),
            deployment: z.string().optional()
          })
          .optional()
      })
    },
    async ({ query, intent, maxServers, maxTools, tokenBudget, allowRisk, context }) => {
      const services = buildServices(env)
      const result = routeContext(
        {
          query,
          intent,
          maxServers,
          maxTools,
          tokenBudget,
          risk: allowRisk ? allowRisk[0] : undefined,
          context
        },
        services.servers
      )
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  server.registerTool(
    'list_servers',
    { description: 'List all capabilities known by the router' },
    async () => {
      const services = buildServices(env)
      return { content: [{ type: 'text', text: JSON.stringify(services.servers, null, 2) }] }
    }
  )

  server.registerTool(
    'list_tools',
    {
      description: 'List all available tools',
      inputSchema: z.object({ server: z.string().optional() })
    },
    async ({ server }) => {
      const services = buildServices(env)
      if (server) {
        const s = services.servers.find((sv: any) => sv.id === server)
        return { content: [{ type: 'text', text: JSON.stringify(s?.tools || [], null, 2) }] }
      }
      const allTools = services.servers.flatMap((s: any) => s.tools)
      return { content: [{ type: 'text', text: JSON.stringify(allTools, null, 2) }] }
    }
  )

  // GitHub tools
  const github = new GitHubService({
    token: env.GITHUB_TOKEN,
    owner: env.GITHUB_OWNER,
    repo: env.GITHUB_REPO
  })

  for (const tool of github.getTools()) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: z.object({})
      },
      async (args: any) => {
        const method =
          (github as any)[tool.name.replace('github_', 'get')] || (github as any)[tool.name]
        if (method) {
          const result = await method(args)
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        }
        return { content: [{ type: 'text', text: 'Tool not implemented' }] }
      }
    )
  }

  // Codebase tools
  const codebase = new CloudflareCodebaseService(env.CODEBASE_BUCKET, env.CODEBASE_KV)
  for (const tool of codebase.getTools()) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: z.object({
          query: z.string().optional(),
          path: z.string().optional(),
          directory: z.string().optional(),
          symbol: z.string().optional(),
          file: z.string().optional(),
          maxResults: z.number().optional()
        })
      },
      async (args: any) => {
        const method = (codebase as any)[tool.name]
        if (method) {
          const result = await method(
            args.query,
            args.path,
            args.directory,
            args.symbol,
            args.file,
            args.maxResults
          )
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        }
        return { content: [{ type: 'text', text: 'Tool not implemented' }] }
      }
    )
  }

  // Database tools
  const database = new CloudflareDatabaseService(env.DB)
  for (const tool of database.getTools()) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: z.object({
          sql: z.string().optional(),
          params: z.array(z.unknown()).optional()
        })
      },
      async (args: any) => {
        const method = (database as any)[tool.name]
        if (method) {
          const result = await method(args.sql, args.params)
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        }
        return { content: [{ type: 'text', text: 'Tool not implemented' }] }
      }
    )
  }

  return server
}

app.all('/mcp*', async (c) => {
  const env = c.env
  const handler = createMcpHandler(() => createMcpServer(env))
  return handler.fetch(c.req.raw)
})

// Unknown API routes must not fall through to the SPA static handlers: an
// API client should get a JSON 404, not index.html (or a serveStatic crash
// outside the Workers runtime).
app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404))

app.get('*', serveStatic({ root: './dist/web', manifest: {} }))
app.get('*', serveStatic({ path: './dist/web/index.html', manifest: {} }))

export default app

import type { McpServerDefinition } from './types'

export const defaultServers: McpServerDefinition[] = [
  {
    id: 'git-ast',
    name: 'Git AST MCP',
    description:
      'Read-only local Git history, status, diffs, repository files and TypeScript AST symbols.',
    category: 'git',
    priority: 12,
    enabled: true,
    source: 'local',
    risk: 'read',
    tools: [
      {
        name: 'git_status',
        description: 'Inspect local Git working tree status',
        tags: ['git', 'status', 'changes'],
        risk: 'read',
        category: 'git'
      },
      {
        name: 'git_log',
        description: 'Inspect local Git commit history',
        tags: ['git', 'history', 'commits'],
        risk: 'read',
        category: 'git'
      },
      {
        name: 'git_diff',
        description: 'Inspect local Git diff',
        tags: ['git', 'diff', 'changes'],
        risk: 'read',
        category: 'git'
      },
      {
        name: 'git_show',
        description: 'Show Git commit details',
        tags: ['git', 'commit', 'show'],
        risk: 'read',
        category: 'git'
      },
      {
        name: 'git_branches',
        description: 'List Git branches',
        tags: ['git', 'branches'],
        risk: 'read',
        category: 'git'
      },
      {
        name: 'ast_symbols',
        description: 'Extract TypeScript/JavaScript AST symbols from local files',
        tags: ['ast', 'typescript', 'javascript', 'symbols'],
        risk: 'read',
        category: 'git'
      },
      {
        name: 'ast_imports',
        description: 'Extract import statements from local files',
        tags: ['ast', 'imports', 'dependencies'],
        risk: 'read',
        category: 'git'
      },
      {
        name: 'ast_exports',
        description: 'Extract export statements from local files',
        tags: ['ast', 'exports', 'api'],
        risk: 'read',
        category: 'git'
      },
      {
        name: 'ast_dependencies',
        description: 'Extract internal dependency graph from AST',
        tags: ['ast', 'dependencies', 'graph'],
        risk: 'read',
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
  },
  {
    id: 'codebase',
    name: 'Codebase MCP',
    description: 'Search, read and inspect source code in the local repository.',
    category: 'codebase',
    priority: 11,
    enabled: true,
    source: 'local',
    risk: 'read',
    tools: [
      {
        name: 'list_files',
        description: 'List repository source files',
        tags: ['code', 'files', 'repository'],
        risk: 'read',
        category: 'codebase'
      },
      {
        name: 'read_file',
        description: 'Read a local repository file',
        tags: ['code', 'file', 'source'],
        risk: 'read',
        category: 'codebase'
      },
      {
        name: 'code_search',
        description: 'Search source files for symbols, APIs and text',
        tags: ['code', 'search', 'grep', 'symbol'],
        risk: 'read',
        category: 'codebase'
      },
      {
        name: 'find_symbol',
        description: 'Find symbol definition in codebase',
        tags: ['code', 'symbol', 'definition'],
        risk: 'read',
        category: 'codebase'
      },
      {
        name: 'find_references',
        description: 'Find references to a symbol',
        tags: ['code', 'references', 'usage'],
        risk: 'read',
        category: 'codebase'
      },
      {
        name: 'find_importers',
        description: 'Find files importing a symbol',
        tags: ['code', 'importers', 'dependencies'],
        risk: 'read',
        category: 'codebase'
      },
      {
        name: 'find_exports',
        description: 'Find exports in a file or directory',
        tags: ['code', 'exports', 'api'],
        risk: 'read',
        category: 'codebase'
      }
    ],
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
    description: 'Read-only PostgreSQL schema inspection and parameterized query execution.',
    category: 'database',
    priority: 10,
    enabled: true,
    source: 'local',
    risk: 'read',
    tools: [
      {
        name: 'db_schema',
        description: 'Inspect PostgreSQL tables, columns and indexes',
        tags: ['database', 'postgres', 'schema', 'sql'],
        risk: 'read',
        category: 'database'
      },
      {
        name: 'db_query',
        description: 'Execute a read-only PostgreSQL query',
        tags: ['database', 'postgres', 'query', 'sql'],
        risk: 'read',
        category: 'database'
      },
      {
        name: 'db_tables',
        description: 'List database tables',
        tags: ['database', 'tables', 'schema'],
        risk: 'read',
        category: 'database'
      },
      {
        name: 'db_indexes',
        description: 'List database indexes',
        tags: ['database', 'indexes', 'performance'],
        risk: 'read',
        category: 'database'
      },
      {
        name: 'db_explain',
        description: 'Explain query execution plan',
        tags: ['database', 'explain', 'performance'],
        risk: 'read',
        category: 'database'
      },
      {
        name: 'db_table_stats',
        description: 'Get table statistics',
        tags: ['database', 'stats', 'performance'],
        risk: 'read',
        category: 'database'
      }
    ],
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
  },
  {
    id: 'github',
    name: 'GitHub MCP',
    description: 'Repository, pull request, issue and CI metadata from GitHub.',
    category: 'github',
    priority: 8,
    enabled: true,
    source: 'remote',
    risk: 'read',
    tools: [
      {
        name: 'github_repo',
        description: 'Get repository metadata',
        tags: ['github', 'repo', 'metadata'],
        risk: 'read',
        category: 'github'
      },
      {
        name: 'github_file',
        description: 'Get file content from GitHub',
        tags: ['github', 'file', 'content'],
        risk: 'read',
        category: 'github'
      },
      {
        name: 'github_pr',
        description: 'Get pull request details',
        tags: ['github', 'pr', 'pull-request'],
        risk: 'read',
        category: 'github'
      },
      {
        name: 'github_pr_diff',
        description: 'Get pull request diff',
        tags: ['github', 'pr', 'diff', 'changes'],
        risk: 'read',
        category: 'github'
      },
      {
        name: 'github_issue',
        description: 'Get issue details',
        tags: ['github', 'issue', 'bug'],
        risk: 'read',
        category: 'github'
      },
      {
        name: 'github_commit',
        description: 'Get commit details',
        tags: ['github', 'commit', 'history'],
        risk: 'read',
        category: 'github'
      },
      {
        name: 'github_release',
        description: 'Get release information',
        tags: ['github', 'release', 'version'],
        risk: 'read',
        category: 'github'
      },
      {
        name: 'github_actions',
        description: 'Get GitHub Actions workflow runs',
        tags: ['github', 'actions', 'ci', 'workflow'],
        risk: 'read',
        category: 'github'
      },
      {
        name: 'github_search',
        description: 'Search GitHub code/issues/PRs',
        tags: ['github', 'search', 'code', 'issues'],
        risk: 'read',
        category: 'github'
      }
    ],
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
    id: 'cicd',
    name: 'CI/CD MCP',
    description: 'Build, deployment and pipeline metadata.',
    category: 'cicd',
    priority: 9,
    enabled: true,
    source: 'remote',
    risk: 'read',
    tools: [
      {
        name: 'ci_runs',
        description: 'List CI/CD runs',
        tags: ['cicd', 'runs', 'pipeline'],
        risk: 'read',
        category: 'cicd'
      },
      {
        name: 'ci_run',
        description: 'Get CI/CD run details',
        tags: ['cicd', 'run', 'details'],
        risk: 'read',
        category: 'cicd'
      },
      {
        name: 'ci_logs',
        description: 'Get CI/CD logs',
        tags: ['cicd', 'logs', 'debug'],
        risk: 'read',
        category: 'cicd'
      },
      {
        name: 'ci_failed_steps',
        description: 'Get failed CI/CD steps',
        tags: ['cicd', 'failed', 'failure'],
        risk: 'read',
        category: 'cicd'
      },
      {
        name: 'ci_artifacts',
        description: 'List CI/CD artifacts',
        tags: ['cicd', 'artifacts', 'build'],
        risk: 'read',
        category: 'cicd'
      },
      {
        name: 'deployments',
        description: 'List deployments',
        tags: ['cicd', 'deployments', 'releases'],
        risk: 'read',
        category: 'cicd'
      },
      {
        name: 'deployment_status',
        description: 'Get deployment status',
        tags: ['cicd', 'status', 'health'],
        risk: 'read',
        category: 'cicd'
      }
    ],
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
  },
  {
    id: 'dependency',
    name: 'Dependency MCP',
    description: 'Project dependencies and their relationships.',
    category: 'dependency',
    priority: 7,
    enabled: true,
    source: 'local',
    risk: 'read',
    tools: [
      {
        name: 'dependencies',
        description: 'List project dependencies',
        tags: ['dependency', 'list', 'package'],
        risk: 'read',
        category: 'dependency'
      },
      {
        name: 'dependency_tree',
        description: 'Show dependency tree',
        tags: ['dependency', 'tree', 'transitive'],
        risk: 'read',
        category: 'dependency'
      },
      {
        name: 'dependency_usage',
        description: 'Find where dependencies are used',
        tags: ['dependency', 'usage', 'imports'],
        risk: 'read',
        category: 'dependency'
      },
      {
        name: 'dependency_updates',
        description: 'Check for dependency updates',
        tags: ['dependency', 'updates', 'versions'],
        risk: 'read',
        category: 'dependency'
      },
      {
        name: 'dependency_changes',
        description: 'Show dependency changes between commits',
        tags: ['dependency', 'changes', 'diff'],
        risk: 'read',
        category: 'dependency'
      },
      {
        name: 'dependency_vulnerabilities',
        description: 'Check for known vulnerabilities',
        tags: ['dependency', 'vulnerabilities', 'security'],
        risk: 'read',
        category: 'dependency'
      },
      {
        name: 'dependency_license',
        description: 'Check dependency licenses',
        tags: ['dependency', 'license', 'compliance'],
        risk: 'read',
        category: 'dependency'
      }
    ],
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
  },
  {
    id: 'architecture',
    name: 'Architecture MCP',
    description: 'High-level architecture and context graph.',
    category: 'architecture',
    priority: 6,
    enabled: true,
    source: 'local',
    risk: 'read',
    tools: [
      {
        name: 'architecture_overview',
        description: 'Get architecture overview',
        tags: ['architecture', 'overview', 'graph'],
        risk: 'read',
        category: 'architecture'
      },
      {
        name: 'service_dependencies',
        description: 'Show service dependencies',
        tags: ['architecture', 'services', 'dependencies'],
        risk: 'read',
        category: 'architecture'
      },
      {
        name: 'module_dependencies',
        description: 'Show module dependencies',
        tags: ['architecture', 'modules', 'dependencies'],
        risk: 'read',
        category: 'architecture'
      },
      {
        name: 'data_flow',
        description: 'Trace data flow',
        tags: ['architecture', 'data', 'flow'],
        risk: 'read',
        category: 'architecture'
      },
      {
        name: 'request_flow',
        description: 'Trace request flow',
        tags: ['architecture', 'request', 'flow'],
        risk: 'read',
        category: 'architecture'
      },
      {
        name: 'dependency_graph',
        description: 'Show dependency graph',
        tags: ['architecture', 'graph', 'dependencies'],
        risk: 'read',
        category: 'architecture'
      },
      {
        name: 'impact_analysis',
        description: 'Analyze impact of changes',
        tags: ['architecture', 'impact', 'analysis'],
        risk: 'read',
        category: 'architecture'
      }
    ],
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
  },
  {
    id: 'sentry',
    name: 'Sentry MCP',
    description: 'Production errors, traces, releases and issue events.',
    category: 'sentry',
    priority: 8,
    enabled: true,
    source: 'remote',
    risk: 'read',
    tools: [
      {
        name: 'sentry_issues',
        description: 'List Sentry issues',
        tags: ['sentry', 'issues', 'errors'],
        risk: 'read',
        category: 'sentry'
      },
      {
        name: 'sentry_issue',
        description: 'Get Sentry issue details',
        tags: ['sentry', 'issue', 'details'],
        risk: 'read',
        category: 'sentry'
      },
      {
        name: 'sentry_events',
        description: 'Get Sentry error events',
        tags: ['sentry', 'events', 'errors'],
        risk: 'read',
        category: 'sentry'
      },
      {
        name: 'sentry_release',
        description: 'Get Sentry release info',
        tags: ['sentry', 'release', 'version'],
        risk: 'read',
        category: 'sentry'
      },
      {
        name: 'sentry_errors',
        description: 'Search Sentry errors',
        tags: ['sentry', 'errors', 'search'],
        risk: 'read',
        category: 'sentry'
      },
      {
        name: 'sentry_traces',
        description: 'Get Sentry traces',
        tags: ['sentry', 'traces', 'performance'],
        risk: 'read',
        category: 'sentry'
      }
    ],
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
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes MCP',
    description: 'Kubernetes cluster health, workloads and logs.',
    category: 'kubernetes',
    priority: 6,
    enabled: true,
    source: 'draft',
    risk: 'read',
    tools: [
      {
        name: 'k8s_clusters',
        description: 'List Kubernetes clusters',
        tags: ['kubernetes', 'clusters', 'clusters'],
        risk: 'read',
        category: 'kubernetes'
      },
      {
        name: 'k8s_namespaces',
        description: 'List Kubernetes namespaces',
        tags: ['kubernetes', 'namespaces', 'namespaces'],
        risk: 'read',
        category: 'kubernetes'
      },
      {
        name: 'k8s_pods',
        description: 'List Kubernetes pods',
        tags: ['kubernetes', 'pods', 'workloads'],
        risk: 'read',
        category: 'kubernetes'
      },
      {
        name: 'k8s_deployments',
        description: 'List Kubernetes deployments',
        tags: ['kubernetes', 'deployments', 'workloads'],
        risk: 'read',
        category: 'kubernetes'
      },
      {
        name: 'k8s_services',
        description: 'List Kubernetes services',
        tags: ['kubernetes', 'services', 'networking'],
        risk: 'read',
        category: 'kubernetes'
      },
      {
        name: 'k8s_events',
        description: 'Get Kubernetes events',
        tags: ['kubernetes', 'events', 'debug'],
        risk: 'read',
        category: 'kubernetes'
      },
      {
        name: 'k8s_logs',
        description: 'Get Kubernetes pod logs',
        tags: ['kubernetes', 'logs', 'debug'],
        risk: 'read',
        category: 'kubernetes'
      },
      {
        name: 'k8s_rollout',
        description: 'Get rollout status',
        tags: ['kubernetes', 'rollout', 'deployment'],
        risk: 'read',
        category: 'kubernetes'
      }
    ],
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
  },
  {
    id: 'cloud',
    name: 'Cloud MCP',
    description: 'Cloud infrastructure and services.',
    category: 'cloud',
    priority: 7,
    enabled: true,
    source: 'cloudflare',
    risk: 'read',
    tools: [
      {
        name: 'cloud_workers',
        description: 'List Cloudflare Workers',
        tags: ['cloud', 'workers', 'serverless'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_d1',
        description: 'List D1 databases',
        tags: ['cloud', 'd1', 'database'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_r2',
        description: 'List R2 buckets',
        tags: ['cloud', 'r2', 'storage'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_kv',
        description: 'List KV namespaces',
        tags: ['cloud', 'kv', 'key-value'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_vectorize',
        description: 'List Vectorize indexes',
        tags: ['cloud', 'vectorize', 'embeddings'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_queues',
        description: 'List Cloudflare Queues',
        tags: ['cloud', 'queues', 'messaging'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_durable_objects',
        description: 'List Durable Objects',
        tags: ['cloud', 'durable-objects', 'stateful'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_ai',
        description: 'List Workers AI models',
        tags: ['cloud', 'ai', 'models'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_routes',
        description: 'List Cloudflare routes',
        tags: ['cloud', 'routes', 'networking'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_deployments',
        description: 'List Cloudflare deployments',
        tags: ['cloud', 'deployments', 'pages'],
        risk: 'read',
        category: 'cloud'
      }
    ],
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
  },
  {
    id: 'observability',
    name: 'Observability/Incident MCP',
    description: 'Production incidents, signals and correlation.',
    category: 'observability',
    priority: 7,
    enabled: true,
    source: 'draft',
    risk: 'read',
    tools: [
      {
        name: 'incident_search',
        description: 'Search incidents',
        tags: ['observability', 'incidents', 'search'],
        risk: 'read',
        category: 'observability'
      },
      {
        name: 'incident_timeline',
        description: 'Get incident timeline',
        tags: ['observability', 'timeline', 'events'],
        risk: 'read',
        category: 'observability'
      },
      {
        name: 'service_health',
        description: 'Get service health',
        tags: ['observability', 'health', 'status'],
        risk: 'read',
        category: 'observability'
      },
      {
        name: 'error_rate',
        description: 'Get error rate metrics',
        tags: ['observability', 'error-rate', 'metrics'],
        risk: 'read',
        category: 'observability'
      },
      {
        name: 'latency',
        description: 'Get latency metrics',
        tags: ['observability', 'latency', 'metrics'],
        risk: 'read',
        category: 'observability'
      },
      {
        name: 'deployment_correlation',
        description: 'Correlate deployments with incidents',
        tags: ['observability', 'deployment', 'correlation'],
        risk: 'read',
        category: 'observability'
      },
      {
        name: 'release_health',
        description: 'Get release health metrics',
        tags: ['observability', 'release', 'health'],
        risk: 'read',
        category: 'observability'
      }
    ],
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
  },
  {
    id: 'security',
    name: 'Security MCP',
    description: 'Security analysis and vulnerability management.',
    category: 'security',
    priority: 9,
    enabled: true,
    source: 'draft',
    risk: 'read',
    tools: [
      {
        name: 'security_scan',
        description: 'Run security scan',
        tags: ['security', 'scan', 'vulnerabilities'],
        risk: 'read',
        category: 'security'
      },
      {
        name: 'dependency_vulnerabilities',
        description: 'Check dependency vulnerabilities',
        tags: ['security', 'dependencies', 'vulnerabilities'],
        risk: 'read',
        category: 'security'
      },
      {
        name: 'secret_detection',
        description: 'Detect secrets in code',
        tags: ['security', 'secrets', 'detection'],
        risk: 'read',
        category: 'security'
      },
      {
        name: 'sast_findings',
        description: 'Get SAST findings',
        tags: ['security', 'sast', 'static-analysis'],
        risk: 'read',
        category: 'security'
      },
      {
        name: 'sbom',
        description: 'Generate SBOM',
        tags: ['security', 'sbom', 'supply-chain'],
        risk: 'read',
        category: 'security'
      },
      {
        name: 'container_findings',
        description: 'Get container scan findings',
        tags: ['security', 'container', 'findings'],
        risk: 'read',
        category: 'security'
      },
      {
        name: 'configuration_findings',
        description: 'Get configuration findings',
        tags: ['security', 'config', 'compliance'],
        risk: 'read',
        category: 'security'
      },
      {
        name: 'reachable_vulnerabilities',
        description: 'Find reachable vulnerabilities',
        tags: ['security', 'reachable', 'exploitable'],
        risk: 'read',
        category: 'security'
      }
    ],
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
  }
]

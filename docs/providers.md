# MCP Providers Reference

The MCP Context Router connects to 12 MCP servers across 4 source types. Each provider implements the `McpProvider` interface:

```typescript
interface McpProvider {
  id: string
  metadata: McpServerDefinition
  discover(): Promise<McpTool[]>
  invoke(tool: string, args: unknown): Promise<unknown>
  healthCheck?(): Promise<boolean>
}
```

## Provider Catalog

### 1. Git AST MCP (Local)

**Source**: `local` | **Priority**: 12 | **Risk**: read

| Tool               | Description                               | Tags                                 |
| ------------------ | ----------------------------------------- | ------------------------------------ |
| `git_status`       | Inspect local Git working tree status     | git, status, changes                 |
| `git_log`          | Inspect local Git commit history          | git, history, commits                |
| `git_diff`         | Inspect local Git diff                    | git, diff, changes                   |
| `git_show`         | Show Git commit details                   | git, commit, show                    |
| `git_branches`     | List Git branches                         | git, branches                        |
| `ast_symbols`      | Extract TypeScript/JavaScript AST symbols | ast, typescript, javascript, symbols |
| `ast_imports`      | Extract import statements                 | ast, imports, dependencies           |
| `ast_exports`      | Extract export statements                 | ast, exports, api                    |
| `ast_dependencies` | Extract internal dependency graph         | ast, dependencies, graph             |

**Capabilities**: `git_status`, `git_log`, `git_diff`, `git_show`, `git_branches`, `ast_symbols`, `ast_imports`, `ast_exports`, `ast_dependencies`, `local_git`, `ast_parsing`, `symbol_extraction`, `dependency_graph`

**Implementation**: `src/local/git-ast.ts`

- Uses `git` CLI via `child_process`
- TypeScript AST parsing via `typescript` compiler API
- Path traversal protection via `CODEBASE_ROOT`

---

### 2. Codebase MCP (Local)

**Source**: `local` | **Priority**: 11 | **Risk**: read

| Tool              | Description                                 | Tags                          |
| ----------------- | ------------------------------------------- | ----------------------------- |
| `list_files`      | List repository source files                | code, files, repository       |
| `read_file`       | Read a local repository file                | code, file, source            |
| `code_search`     | Search source files for symbols, APIs, text | code, search, grep, symbol    |
| `find_symbol`     | Find symbol definition in codebase          | code, symbol, definition      |
| `find_references` | Find references to a symbol                 | code, references, usage       |
| `find_importers`  | Find files importing a symbol               | code, importers, dependencies |
| `find_exports`    | Find exports in a file/directory            | code, exports, api            |

**Capabilities**: `list_files`, `read_file`, `code_search`, `find_symbol`, `find_references`, `find_importers`, `find_exports`, `local_search`, `symbol_navigation`, `code_navigation`

**Implementation**: `src/local/codebase.ts`

- Path traversal protection via `CODEBASE_ROOT`
- File system operations via `fs/promises`
- In-memory search with line-by-line matching

---

### 3. Database MCP (Local)

**Source**: `local` | **Priority**: 10 | **Risk**: read

| Tool             | Description                                 | Tags                            |
| ---------------- | ------------------------------------------- | ------------------------------- |
| `db_schema`      | Inspect PostgreSQL tables, columns, indexes | database, postgres, schema, sql |
| `db_query`       | Execute read-only PostgreSQL query          | database, postgres, query, sql  |
| `db_tables`      | List database tables                        | database, tables, schema        |
| `db_indexes`     | List database indexes                       | database, indexes, performance  |
| `db_explain`     | Explain query execution plan                | database, explain, performance  |
| `db_table_stats` | Get table statistics                        | database, stats, performance    |

**Capabilities**: `db_schema`, `db_query`, `db_tables`, `db_indexes`, `db_explain`, `db_table_stats`, `postgres`, `read_only_sql`, `schema_inspection`

**Implementation**: `src/local/database.ts`

- Uses `pg` library with connection pooling
- SQL validation: only `SELECT`, `WITH`, `EXPLAIN` allowed
- Parameterized queries for injection prevention

---

### 4. GitHub MCP (Remote)

**Source**: `remote` | **Priority**: 12 | **Risk**: read

| Tool             | Description                      | Tags                          |
| ---------------- | -------------------------------- | ----------------------------- |
| `github_repo`    | Get repository metadata          | github, repo, metadata        |
| `github_file`    | Get file content from GitHub     | github, file, content         |
| `github_pr`      | Get pull request details         | github, pr, pull-request      |
| `github_pr_diff` | Get pull request diff            | github, pr, diff, changes     |
| `github_issue`   | Get issue details                | github, issue, bug            |
| `github_commit`  | Get commit details               | github, commit, history       |
| `github_release` | Get release information          | github, release, version      |
| `github_actions` | Get GitHub Actions workflow runs | github, actions, ci, workflow |
| `github_search`  | Search GitHub code/issues/PRs    | github, search, code, issues  |

**Capabilities**: `github_repo`, `github_file`, `github_pr`, `github_pr_diff`, `github_issue`, `github_commit`, `github_release`, `github_actions`, `github_search`, `git_metadata`, `ci_metadata`

**Implementation**: `src/cloudflare/github-service.ts`

- GitHub REST API v4 (2022-11-28)
- Requires `GITHUB_TOKEN` with `repo` scope
- Pagination support (per_page=30 default)

---

### 5. CI/CD MCP (Remote)

**Source**: `remote` | **Priority**: 9 | **Risk**: read

| Tool                | Description            | Tags                        |
| ------------------- | ---------------------- | --------------------------- |
| `ci_runs`           | List CI/CD runs        | cicd, runs, pipeline        |
| `ci_run`            | Get CI/CD run details  | cicd, run, details          |
| `ci_logs`           | Get CI/CD logs         | cicd, logs, debug           |
| `ci_failed_steps`   | Get failed CI/CD steps | cicd, failed, failure       |
| `ci_artifacts`      | List CI/CD artifacts   | cicd, artifacts, build      |
| `deployments`       | List deployments       | cicd, deployments, releases |
| `deployment_status` | Get deployment status  | cicd, status, health        |

**Capabilities**: `ci_runs`, `ci_run`, `ci_logs`, `ci_failed_steps`, `ci_artifacts`, `deployments`, `deployment_status`, `pipeline_metadata`, `deployment_tracking`

**Implementation**: `src/cloudflare/cicd-service.ts`

- Supports GitHub Actions, GitLab CI, CircleCI, Jenkins
- Configurable via `CICD_PROVIDER`, `CICD_TOKEN`

---

### 6. Dependency MCP (Local)

**Source**: `local` | **Priority**: 7 | **Risk**: read

| Tool                         | Description                             | Tags                                  |
| ---------------------------- | --------------------------------------- | ------------------------------------- |
| `dependencies`               | List project dependencies               | dependency, list, package             |
| `dependency_tree`            | Show dependency tree                    | dependency, tree, transitive          |
| `dependency_usage`           | Find where dependencies are used        | dependency, usage, imports            |
| `dependency_updates`         | Check for dependency updates            | dependency, updates, versions         |
| `dependency_changes`         | Show dependency changes between commits | dependency, changes, diff             |
| `dependency_vulnerabilities` | Check for known vulnerabilities         | dependency, vulnerabilities, security |
| `dependency_license`         | Check dependency licenses               | dependency, license, compliance       |

**Capabilities**: `dependencies`, `dependency_tree`, `dependency_usage`, `dependency_updates`, `dependency_changes`, `dependency_vulnerabilities`, `dependency_license`, `package_analysis`, `vulnerability_scanning`

**Implementation**: `src/cloudflare/dependency-service.ts`

- Parses `package.json` and lock files
- Integrates with vulnerability databases
- License compliance checking

---

### 7. Architecture MCP (Local)

**Source**: `local` | **Priority**: 6 | **Risk**: read

| Tool                    | Description               | Tags                                 |
| ----------------------- | ------------------------- | ------------------------------------ |
| `architecture_overview` | Get architecture overview | architecture, overview, graph        |
| `service_dependencies`  | Show service dependencies | architecture, services, dependencies |
| `module_dependencies`   | Show module dependencies  | architecture, modules, dependencies  |
| `data_flow`             | Trace data flow           | architecture, data, flow             |
| `request_flow`          | Trace request flow        | architecture, request, flow          |
| `dependency_graph`      | Show dependency graph     | architecture, graph, dependencies    |
| `impact_analysis`       | Analyze impact of changes | architecture, impact, analysis       |

**Capabilities**: `architecture_overview`, `service_dependencies`, `module_dependencies`, `data_flow`, `request_flow`, `dependency_graph`, `impact_analysis`, `context_graph`, `change_impact`

**Implementation**: `src/cloudflare/architecture-service.ts`

- Aggregates data from git, codebase, database, dependency, github, cicd MCPs
- Builds context graph for impact analysis

---

### 8. Sentry MCP (Remote)

**Source**: `remote` | **Priority**: 8 | **Risk**: read

| Tool             | Description              | Tags                        |
| ---------------- | ------------------------ | --------------------------- |
| `sentry_issues`  | List Sentry issues       | sentry, issues, errors      |
| `sentry_issue`   | Get Sentry issue details | sentry, issue, details      |
| `sentry_events`  | Get Sentry error events  | sentry, events, errors      |
| `sentry_release` | Get Sentry release info  | sentry, release, version    |
| `sentry_errors`  | Search Sentry errors     | sentry, errors, search      |
| `sentry_traces`  | Get Sentry traces        | sentry, traces, performance |

**Capabilities**: `sentry_issues`, `sentry_issue`, `sentry_events`, `sentry_release`, `sentry_errors`, `sentry_traces`, `error_tracking`, `release_tracking`

**Implementation**: `src/cloudflare/sentry-service.ts`

- Sentry REST API
- Requires `SENTRY_TOKEN`, `SENTRY_ORG`

---

### 9. Kubernetes MCP (Draft)

**Source**: `draft` | **Priority**: 6 | **Risk**: read

| Tool              | Description                 | Tags                               |
| ----------------- | --------------------------- | ---------------------------------- |
| `k8s_clusters`    | List Kubernetes clusters    | kubernetes, clusters               |
| `k8s_namespaces`  | List Kubernetes namespaces  | kubernetes, namespaces             |
| `k8s_pods`        | List Kubernetes pods        | kubernetes, pods, workloads        |
| `k8s_deployments` | List Kubernetes deployments | kubernetes, deployments, workloads |
| `k8s_services`    | List Kubernetes services    | kubernetes, services, networking   |
| `k8s_events`      | Get Kubernetes events       | kubernetes, events, debug          |
| `k8s_logs`        | Get Kubernetes pod logs     | kubernetes, logs, debug            |
| `k8s_rollout`     | Get rollout status          | kubernetes, rollout, deployment    |

**Capabilities**: `k8s_clusters`, `k8s_namespaces`, `k8s_pods`, `k8s_deployments`, `k8s_services`, `k8s_events`, `k8s_logs`, `k8s_rollout`, `cluster_health`, `workload_inspection`

**Implementation**: `src/cloudflare/kubernetes-service.ts`

- Uses Kubernetes client library (mocked for now)
- Supports AKS, EKS, GKE, local

---

### 10. Cloud MCP (Cloudflare)

**Source**: `cloudflare` | **Priority**: 7 | **Risk**: read

| Tool                    | Description                 | Tags                             |
| ----------------------- | --------------------------- | -------------------------------- |
| `cloud_workers`         | List Cloudflare Workers     | cloud, workers, serverless       |
| `cloud_d1`              | List D1 databases           | cloud, d1, database              |
| `cloud_r2`              | List R2 buckets             | cloud, r2, storage               |
| `cloud_kv`              | List KV namespaces          | cloud, kv, key-value             |
| `cloud_vectorize`       | List Vectorize indexes      | cloud, vectorize, embeddings     |
| `cloud_queues`          | List Cloudflare Queues      | cloud, queues, messaging         |
| `cloud_durable_objects` | List Durable Objects        | cloud, durable-objects, stateful |
| `cloud_ai`              | List Workers AI models      | cloud, ai, models                |
| `cloud_routes`          | List Cloudflare routes      | cloud, routes, networking        |
| `cloud_deployments`     | List Cloudflare deployments | cloud, deployments, pages        |

**Capabilities**: `cloud_workers`, `cloud_d1`, `cloud_r2`, `cloud_kv`, `cloud_vectorize`, `cloud_queues`, `cloud_durable_objects`, `cloud_ai`, `cloud_routes`, `cloud_deployments`, `cloudflare_infrastructure`

**Implementation**: `src/cloudflare/cloud-service.ts`

- Cloudflare API v4
- Requires `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`

---

### 11. Observability MCP (Draft)

**Source**: `draft` | **Priority**: 7 | **Risk**: read

| Tool                     | Description                          | Tags                                   |
| ------------------------ | ------------------------------------ | -------------------------------------- |
| `incident_search`        | Search incidents                     | observability, incidents, search       |
| `incident_timeline`      | Get incident timeline                | observability, timeline, events        |
| `service_health`         | Get service health                   | observability, health, status          |
| `error_rate`             | Get error rate metrics               | observability, error-rate, metrics     |
| `latency`                | Get latency metrics                  | observability, latency, metrics        |
| `deployment_correlation` | Correlate deployments with incidents | observability, deployment, correlation |
| `release_health`         | Get release health metrics           | observability, release, health         |

**Capabilities**: `incident_search`, `incident_timeline`, `service_health`, `error_rate`, `latency`, `deployment_correlation`, `release_health`, `incident_correlation`, `signal_aggregation`

**Implementation**: `src/cloudflare/observability-service.ts`

- Aggregates Sentry, Kubernetes, Cloud, CI/CD, GitHub signals

---

### 12. Security MCP (Draft)

**Source**: `draft` | **Priority**: 9 | **Risk**: read

| Tool                         | Description                      | Tags                                    |
| ---------------------------- | -------------------------------- | --------------------------------------- |
| `security_scan`              | Run security scan                | security, scan, vulnerabilities         |
| `dependency_vulnerabilities` | Check dependency vulnerabilities | security, dependencies, vulnerabilities |
| `secret_detection`           | Detect secrets in code           | security, secrets, detection            |
| `sast_findings`              | Get SAST findings                | security, sast, static-analysis         |
| `sbom`                       | Generate SBOM                    | security, sbom, supply-chain            |
| `container_findings`         | Get container scan findings      | security, container, findings           |
| `configuration_findings`     | Get configuration findings       | security, config, compliance            |
| `reachable_vulnerabilities`  | Find reachable vulnerabilities   | security, reachable, exploitable        |

**Capabilities**: `security_scan`, `dependency_vulnerabilities`, `secret_detection`, `sast_findings`, `sbom`, `container_findings`, `configuration_findings`, `reachable_vulnerabilities`, `vulnerability_management`, `supply_chain_security`

**Implementation**: `src/cloudflare/security-service.ts`

- Aggregates Dependency, Codebase, Git AST, Cloud, CI/CD, Architecture MCPs

---

## Provider Status Legend

| Status       | Description                               |
| ------------ | ----------------------------------------- |
| `local`      | Runs locally, no external dependencies    |
| `remote`     | Requires external API credentials         |
| `cloudflare` | Uses Cloudflare Workers bindings          |
| `draft`      | Mock implementation, not production-ready |

---

## Adding Custom Providers

```typescript
import { McpProvider } from './core/types'

class CustomProvider implements McpProvider {
  id = 'custom'
  metadata = {
    id: 'custom',
    name: 'Custom MCP',
    description: 'Custom provider',
    category: 'custom',
    priority: 5,
    enabled: true,
    source: 'local' as const,
    risk: 'read' as const,
    tools: [...],
    capabilities: [...],
    version: '1.0.0'
  }

  async discover(): Promise<McpTool[]> {
    return this.metadata.tools
  }

  async invoke(tool: string, args: unknown): Promise<unknown> {
    // Implementation
  }
}

// Register
toolDiscovery.register(new CustomProvider())
```

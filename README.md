# MCP Context Router

A TypeScript MCP gateway built with Vite+ and Hono that discovers, policy-filters and routes the smallest useful MCP context to an AI agent. Deploys to Cloudflare Workers.

```text
                     AI Agent
                        │
                        ▼
                ┌───────────────┐
                │ Context Router│
                └───────┬───────┘
                        │
               ┌────────┴────────┐
               ▼                 ▼
         Tool Discovery      Policy Engine
               │                 │
               └────────┬────────┘
                        ▼
                  Route / Filter
                        │
           ┌────────────┼────────────┐
           ▼            ▼            ▼
        GitHub        Sentry       Kubernetes
         MCP           MCP           MCP (Draft)
           │
           ├── Codebase MCP (R2/KV)
           └── Database MCP (D1)
```

## Documentation

| Document                                       | Contents                                    |
| ---------------------------------------------- | ------------------------------------------- |
| [docs/architecture.md](docs/architecture.md)   | Components, data flow, deployment           |
| [docs/routing.md](docs/routing.md)             | Scoring, policy and the routing pipeline    |
| [docs/providers.md](docs/providers.md)         | All 12 MCP providers and their tools        |
| [docs/api.md](docs/api.md)                     | REST API reference                          |
| [docs/testing.md](docs/testing.md)             | Test structure and strategy                 |
| [docs/configuration.md](docs/configuration.md) | Environment and configuration               |
| [docs/deployment.md](docs/deployment.md)       | Cloudflare deployment                       |
| [PLAN.md](PLAN.md)                             | Implementation status and remaining work    |
| [AGENTS.md](AGENTS.md)                         | Guidance for AI agents working in this repo |

## Architecture

| Component        | Local Development                   | Cloudflare Workers             |
| ---------------- | ----------------------------------- | ------------------------------ |
| **Git/Codebase** | Local filesystem + TypeScript AST   | GitHub API + R2/KV storage     |
| **Database**     | PostgreSQL (read-only)              | D1 (SQLite, read-only)         |
| **Transport**    | stdio (MCP client launches process) | Streamable HTTP (SSE fallback) |
| **Dashboard**    | Vite dev server                     | Static assets served by Worker |

## Local MCPs (Development)

**Local Git AST MCP** provides `git_status`, `git_log`, `git_diff` and `ast_symbols`. The AST parser uses the TypeScript compiler API.

**Codebase MCP** provides `list_files`, `read_file` and `code_search`, with path traversal protection rooted at `CODEBASE_ROOT`.

**Database MCP** provides `db_schema` and read-only `db_query`. Set `DATABASE_URL`; SQL is restricted to `SELECT`, `WITH` and `EXPLAIN`.

GitHub and Sentry are represented as remote capability definitions; Kubernetes is explicitly marked draft.

## Cloudflare MCPs (Production)

**GitHub MCP** provides `github_pull_requests`, `github_issues`, `github_commits`, `github_repository` via GitHub REST API.

**Codebase MCP** provides `code_search`, `read_file`, `list_files` backed by R2 bucket + KV namespace for fast metadata.

**Database MCP** provides `db_schema`, `db_query` against D1 (SQLite) with read-only enforcement.

## Vite+

There is no ESLint or Prettier. The quality workflow:

```text
vp check
  ↓
Vitest + coverage
  ↓
vp build
  ↓
Playwright
```

`vp check` is the workspace quality gate for Oxfmt, Oxlint and TypeScript.

## Commands

```bash
# Install dependencies
vp install

# Development (all services)
vp dev              # Web dashboard at localhost:5173
vp dev:worker       # Cloudflare Worker at localhost:8787
vp dev:full         # Both dashboard + worker concurrently

# Quality & Testing
vp check
vp test --coverage
vp test:unit
vp test:integration
vp test:e2e

# Build
vp build                    # Web + Router (stdio) + Worker
npm run build:web           # Web dashboard only
npm run build:router        # stdio MCP server only
npm run build:worker        # Cloudflare Worker only

# Cloudflare Deployment
npm run cf:db:create        # Create D1 database
npm run cf:kv:create        # Create KV namespace
npm run cf:r2:create        # Create R2 bucket
npm run cf:db:migrate       # Apply migrations to D1
npm run deploy              # Deploy to Cloudflare Workers
npm run deploy:preview      # Deploy to preview environment
npm run cf:tail             # View live logs
```

For the stdio MCP server (local development):

```bash
vp exec vite --config vite.router.config.ts
```

The router is stdio-based, which makes it directly usable from MCP clients that launch a local server process.

## Environment

### Local Development

```bash
CODEBASE_ROOT=/path/to/repository
DATABASE_URL=postgres://postgres:postgres@localhost:5432/app
```

### Cloudflare Workers (wrangler.toml / Dashboard)

```toml
[vars]
GITHUB_TOKEN = "ghp_xxx"           # GitHub Personal Access Token (repo scope)
GITHUB_OWNER = "your-org"           # GitHub organization/user
GITHUB_REPO = "your-repo"           # Repository name

# Bindings configured in wrangler.toml:
# DB = D1 database
# CODEBASE_BUCKET = R2 bucket
# CODEBASE_KV = KV namespace
```

## Tooling Notes

**zod must stay at `>=4.2.0`.** The MCP SDK's `registerTool` requires
`StandardSchemaWithJSON`, which depends on the `~standard.jsonSchema` property
added in zod 4.2.0. Pinning an older zod makes every tool registration fail to
type-check and emits a runtime fallback warning. Keep it aligned with the SDK's
`^4.2.0` range.

**vite-plus plugin types.** vite-plus re-exports types from its own vite core
fork, while `@vitejs/plugin-react` is typed against upstream `vite`. The two
`Plugin` types are distinct declarations, so the plugin array is cast once at
the boundary in `vite.config.ts` rather than suppressed inline.

## Security

The default policy exposes only `read` risk tools. Local repository access is confined to `CODEBASE_ROOT`, and database execution is read-only (`SELECT`, `WITH`, `EXPLAIN` only). Future write/execute capabilities must be explicitly allowed by policy.

On Cloudflare, the same policy applies: GitHub API is read-only, R2/KV are read-only for codebase, D1 queries are restricted to read-only statements.

## MCP Client Configuration

### Local (stdio)

```json
{
  "mcpServers": {
    "context-router": {
      "command": "node",
      "args": ["dist/router/index.js"],
      "env": {
        "CODEBASE_ROOT": "/path/to/repo",
        "DATABASE_URL": "postgres://..."
      }
    }
  }
}
```

### Cloudflare (HTTP)

```json
{
  "mcpServers": {
    "context-router": {
      "url": "https://mcp-context-router.your-subdomain.workers.dev/mcp",
      "transport": "streamable-http"
    }
  }
}
```

## Project Structure

```bash
# Root configs (discovered automatically by their tools)
├── vite.config.ts      # Web build, Vitest, lint, fmt
├── tsconfig.json       # TypeScript project
└── wrangler.toml       # Cloudflare Workers + D1/R2/KV bindings

config/                 # Secondary build configs
├── vite.router.ts      # stdio MCP server build
├── vite.worker.ts      # Cloudflare Worker build
└── playwright.ts       # Playwright E2E

src/
├── core/               # Routing, registry, policy (shared)
│   ├── router.ts       # Intent-based server/tool selection
│   ├── registry.ts     # Server/tool definitions
│   ├── policy.ts       # Risk-based filtering
│   └── types.ts        # TypeScript interfaces
├── local/              # Local development services
│   ├── git-ast.ts      # Git + TypeScript AST
│   ├── codebase.ts     # Filesystem search/read
│   └── database.ts     # PostgreSQL
├── cloudflare/         # Cloudflare Workers services
│   ├── github-service.ts      # GitHub REST API
│   ├── codebase-service.ts    # R2/KV storage
│   └── database-service.ts    # D1 (SQLite)
├── mcp/
│   └── server.ts       # MCP server factory (shared tools)
├── server/
│   └── index.ts        # stdio entrypoint (local)
├── worker/
│   └── index.ts        # Hono + StreamableHTTP entrypoint (Cloudflare)
├── web/
│   ├── main.tsx        # React dashboard
│   └── styles.css
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

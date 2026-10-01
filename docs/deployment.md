# Deployment Guide

## Overview

The MCP Context Router deploys to **Cloudflare Workers** with the dashboard served via **Workers Assets**. The stdio MCP server runs locally for development.

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`bunx wrangler`)
- [Bun](https://bun.sh/) v1.4+
- Node.js 22+ (for local development)

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Create Cloudflare resources
bun run cf:db:create        # Create D1 database
bun run cf:kv:create        # Create KV namespace
bun run cf:r2:create        # Create R2 bucket
bun run cf:db:migrate:local # Apply migrations locally

# 3. Configure secrets
bunx wrangler secret put GITHUB_TOKEN
bunx wrangler secret put SENTRY_TOKEN
bunx wrangler secret put CICD_TOKEN

# 4. Deploy
bun run deploy
```

## Configuration

### wrangler.toml

```toml
name = "mcp-context-router"
main = "dist/worker/index.js"
compatibility_date = "2026-09-29"
compatibility_flags = ["nodejs_compat"]

[build]
command = "bun run build:worker:vite"

[assets]
directory = "dist/web"
binding = "ASSETS"

[[d1_databases]]
binding = "DB"
database_name = "mcp-context-router-db"
database_id = "your-d1-database-id"

[[r2_buckets]]
binding = "CODEBASE_BUCKET"
bucket_name = "mcp-codebase"

[[kv_namespaces]]
binding = "CODEBASE_KV"
id = "your-kv-namespace-id"

[vars]
GITHUB_OWNER = "your-org"
GITHUB_REPO = "your-repo"
# Secrets set via: wrangler secret put GITHUB_TOKEN
```

### Required Secrets

| Secret                 | Description                  | Required       |
| ---------------------- | ---------------------------- | -------------- |
| `GITHUB_TOKEN`         | GitHub PAT with `repo` scope | Yes            |
| `SENTRY_TOKEN`         | Sentry API token             | For Sentry MCP |
| `CICD_TOKEN`           | CI/CD provider token         | For CI/CD MCP  |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token         | For Cloud MCP  |

### Environment Variables

| Variable            | Description                                             | Default             |
| ------------------- | ------------------------------------------------------- | ------------------- |
| `GITHUB_OWNER`      | GitHub organization/user                                | Required            |
| `GITHUB_REPO`       | Repository name                                         | Required            |
| `CICD_PROVIDER`     | CI/CD provider (`github`/`gitlab`/`circleci`/`jenkins`) | `github`            |
| `SENTRY_ORG`        | Sentry organization                                     | Required for Sentry |
| `KUBERNETES_CONFIG` | Path to kubeconfig                                      | For Kubernetes MCP  |
| `CODEBASE_ROOT`     | Local codebase path (stdio)                             | `process.cwd()`     |
| `DATABASE_URL`      | PostgreSQL URL (stdio)                                  | Optional            |

## Local Development

### Dashboard + Worker

```bash
# Terminal 1: Dashboard
bun run dev

# Terminal 2: Worker
bun run dev:worker

# Or both
bun run dev:full
```

### Stdio MCP Server (for local agents)

```bash
# With local PostgreSQL
DATABASE_URL=postgres://user:pass@localhost:5432/db \
CODEBASE_ROOT=/path/to/repo \
bunx vite --config vite.router.ts
```

### Worker Development

```bash
# Start worker with local bindings
bun run dev:worker

# Test MCP endpoint
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Production Deployment

### GitHub Actions (Automatic)

Push to `main` triggers:

1. `vp check` (format, lint, type-check)
2. `vp test` (unit + integration)
3. `vp build` (web, router, worker)
4. `playwright test` (E2E)
5. `wrangler deploy` (on main branch)

### Manual Deploy

```bash
# Build all targets
bun run build

# Deploy to production
bun run deploy

# Deploy to preview environment
bun run deploy:preview
```

### Manual Build

```bash
# Web dashboard
bun run build:web

# Stdio MCP server
bun run build:router

# Cloudflare Worker
bun run build:worker
```

## Cloudflare Resources

### Create Resources

```bash
# D1 Database
bun run cf:db:create
# Output: database_id = "abc123..."
# Update wrangler.toml with database_id

# KV Namespace
bun run cf:kv:create
# Output: id = "xyz789..."
# Update wrangler.toml with id

# R2 Bucket
bun run cf:r2:create

# Apply migrations
bun run cf:db:migrate:local  # Local
bun run cf:db:migrate        # Remote (production)
```

### Migrations

```sql
-- migrations/0001_initial_schema.sql
CREATE TABLE IF NOT EXISTS route_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id TEXT UNIQUE NOT NULL,
  query TEXT NOT NULL,
  intent TEXT,
  selected_servers TEXT NOT NULL,
  selected_tools TEXT NOT NULL,
  policy TEXT NOT NULL,
  token_budget INTEGER,
  estimated_tokens INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_route_decisions_query ON route_decisions(query);
CREATE INDEX idx_route_decisions_created ON route_decisions(created_at);
```

Apply:

```bash
bun run cf:db:migrate:local  # Local D1
bun run cf:db:migrate        # Production D1
```

## Verification

### Health Check

```bash
curl https://mcp-context-router.your-subdomain.workers.dev/api/health
# {"status":"ok","timestamp":"2026-09-29T..."}
```

### List Servers

```bash
curl https://mcp-context-router.your-subdomain.workers.dev/api/servers
```

### Route Context

```bash
curl -X POST https://mcp-context-router.your-subdomain.workers.dev/api/route \
  -H "Content-Type: application/json" \
  -d '{"query": "Why did latency increase after deployment?"}'
```

### MCP Endpoint

```bash
# List tools
curl -X POST https://mcp-context-router.your-subdomain.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Route context via MCP
curl -X POST https://mcp-context-router.your-subdomain.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"route_context","arguments":{"query":"Why is API slow?"}}}'
```

## Monitoring

### Logs

```bash
# Real-time logs
bun run cf:tail

# Filter by level
bun run cf:tail --level error
```

### Metrics

- **Dashboard**: Cloudflare Workers Analytics
- **Logs**: `wrangler tail` or Workers Logs dashboard
- **Metrics**: Request count, latency, errors, CPU time

### Health Endpoints

| Endpoint           | Description           |
| ------------------ | --------------------- |
| `GET /api/health`  | Basic health check    |
| `GET /api/servers` | List all MCP servers  |
| `POST /api/route`  | Route a query         |
| `POST /mcp`        | MCP protocol endpoint |

## Rollback

```bash
# List deployments
bunx wrangler deployments list

# Rollback to previous
bunx wrangler rollback <deployment-id>
```

## Troubleshooting

### Common Issues

| Issue                        | Solution                                                               |
| ---------------------------- | ---------------------------------------------------------------------- |
| `D1: database not found`     | Run `bun run cf:db:create` and update `database_id` in `wrangler.toml` |
| `KV: namespace not found`    | Run `bun run cf:kv:create` and update `id` in `wrangler.toml`          |
| `R2: bucket not found`       | Run `bun run cf:r2:create`                                             |
| `GitHub API 401`             | Check `GITHUB_TOKEN` secret has `repo` scope                           |
| `Build fails: out of memory` | Increase Node memory: `NODE_OPTIONS="--max-old-space-size=8192"`       |
| `Worker: binding not found`  | Check `wrangler.toml` bindings match `CloudflareEnv` interface         |

### Debug Mode

```bash
# Worker with verbose logs
bun run dev:worker --log-level debug

# Dashboard with debug
DEBUG=* bun run dev
```

## Performance Tuning

### Token Budget

- Default: 8000 tokens
- Adjust per request: `tokenBudget` in request
- Estimate: ~100 tokens per tool + overhead

### Caching

- KV: Route results (TTL: 5min), tool metadata (TTL: 1hr)
- R2: Large artifacts, repository snapshots
- D1: Route history, metadata

### Scaling

- Workers auto-scale
- D1: 100K reads/day free, then $0.001/1K
- KV: 100K reads/day free, then $0.50/M
- R2: 10GB free, then $0.015/GB/month

## Security Checklist

- [ ] All secrets in Wrangler secrets (not vars)
- [ ] GitHub token has minimal `repo` scope
- [ ] Sentry token has minimal `event:read` scope
- [ ] Cloudflare token has `Workers Scripts:Edit`, `D1:Edit`, `R2:Edit`, `KV:Edit`, `Vectorize:Edit`
- [ ] No secrets in code or `wrangler.toml`
- [ ] `CODEBASE_ROOT` restricts filesystem access
- [ ] Database queries restricted to SELECT/WITH/EXPLAIN
- [ ] Rate limiting via Cloudflare WAF (optional)

## Rollback Procedure

```bash
# 1. List recent deployments
wrangler deployments list

# 2. Identify last good deployment
wrangler deployments list | head -5

# 3. Rollback
wrangler rollback <deployment-id>

# 3b. Or redeploy previous commit
git revert <bad-commit>
git push origin main  # Triggers CI/CD
```

## Support

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/
- **MCP Protocol**: https://modelcontextprotocol.io/

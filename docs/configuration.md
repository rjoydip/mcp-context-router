# Configuration Guide

## Environment Variables

### Required

| Variable       | Description                 | Example  |
| -------------- | --------------------------- | -------- |
| `GITHUB_OWNER` | GitHub organization or user | `myorg`  |
| `GITHUB_REPO`  | Repository name             | `myrepo` |

### Optional

| Variable            | Description                                                | Default         |
| ------------------- | ---------------------------------------------------------- | --------------- |
| `CICD_PROVIDER`     | CI/CD provider (`github`, `gitlab`, `circleci`, `jenkins`) | `github`        |
| `SENTRY_ORG`        | Sentry organization slug                                   | -               |
| `KUBERNETES_CONFIG` | Path to kubeconfig file                                    | -               |
| `CODEBASE_ROOT`     | Local repository root (stdio mode)                         | `process.cwd()` |
| `DATABASE_URL`      | PostgreSQL connection string                               | -               |

### Secrets (set via `wrangler secret put`)

| Secret                 | Description                  | Required For |
| ---------------------- | ---------------------------- | ------------ |
| `GITHUB_TOKEN`         | GitHub PAT with `repo` scope | GitHub MCP   |
| `SENTRY_TOKEN`         | Sentry API token             | Sentry MCP   |
| `CICD_TOKEN`           | CI/CD provider token         | CI/CD MCP    |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token         | Cloud MCP    |

---

## wrangler.toml Configuration

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
migrations_dir = "migrations"

[[r2_buckets]]
binding = "CODEBASE_BUCKET"
bucket_name = "mcp-codebase"

[[kv_namespaces]]
binding = "CODEBASE_KV"
id = "your-kv-namespace-id"

[vars]
GITHUB_OWNER = "your-org"
GITHUB_REPO = "your-repo"
# Secrets: GITHUB_TOKEN, SENTRY_TOKEN, CICD_TOKEN, CLOUDFLARE_API_TOKEN
```

### Bindings Reference

| Binding           | Type          | Purpose                 |
| ----------------- | ------------- | ----------------------- |
| `ASSETS`          | `Fetcher`     | Static asset serving    |
| `DB`              | `D1Database`  | D1 SQLite database      |
| `CODEBASE_BUCKET` | `R2Bucket`    | Codebase artifacts      |
| `CODEBASE_KV`     | `KVNamespace` | Codebase metadata cache |

---

## TypeScript Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": ["node", "@cloudflare/workers-types"]
  },
  "include": [
    "src",
    "tests",
    "vite.config.ts",
    "vite.router.ts",
    "vite.worker.ts",
    "playwright.config.ts"
  ]
}
```

### Key Settings Explained

| Setting                      | Value  | Reason                             |
| ---------------------------- | ------ | ---------------------------------- |
| `strict`                     | `true` | Maximum type safety                |
| `noUncheckedIndexedAccess`   | `true` | Prevents undefined access          |
| `exactOptionalPropertyTypes` | `true` | Distinguishes `?` from `undefined` |
| `verbatimModuleSyntax`       | `true` | Preserves import/export semantics  |
| `isolatedModules`            | `true` | Enables single-file transpilation  |

---

## Vite Configuration

### vite.config.ts (Web Dashboard)

```typescript
import { defineConfig } from 'vite-plus'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@router': '/src/core' }
  },
  build: {
    outDir: 'dist/web',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8787' }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/web/**', 'src/server/**', 'src/worker/**', 'src/cloudflare/**']
    }
  },
  lint: {
    ignorePatterns: ['dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**'],
    options: { typeAware: true, typeCheck: true },
    rules: { 'no-console': ['warn', { allow: ['error', 'warn'] }] }
  },
  fmt: { singleQuote: true, semi: false, trailingComma: 'none' },
  staged: { '*.{ts,tsx,js,jsx,json,md,yml,yaml}': 'vp check --fix' }
})
```

### vite.router.ts (stdio MCP Server)

```typescript
import { defineConfig } from 'vite-plus'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    ssr: resolve(root, 'src/server/index.ts'),
    outDir: 'dist/router',
    rollupOptions: {
      output: { format: 'es', entryFileNames: 'index.js' }
    }
  }
})
```

### vite.worker.ts (Cloudflare Worker)

```typescript
import { defineConfig } from 'vite-plus'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    ssr: resolve(root, 'src/worker/index.ts'),
    outDir: 'dist/worker',
    rollupOptions: {
      output: { format: 'es', entryFileNames: 'index.js' }
    },
    target: 'es2022'
  },
  ssr: {
    external: ['@modelcontextprotocol/server', '@modelcontextprotocol/node', 'hono', 'zod/v4']
  }
})
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "vp dev",
    "dev:router": "vp exec vite --config vite.router.ts --host 127.0.0.1",
    "dev:worker": "wrangler dev --port 8787",
    "dev:full": "concurrently -k \"vp dev --host 127.0.0.1\" \"wrangler dev --port 8787\"",
    "build": "bun run build:web && bun run build:router && bun run build:worker:vite",
    "build:web": "vp exec vite build",
    "build:router": "vp exec vite build --config config/vite.router.ts",
    "build:worker": "wrangler deploy --dry-run --outdir=dist/worker",
    "build:worker:vite": "vp exec vite build --config config/vite.worker.ts",
    "check": "vp check",
    "test": "vp test",
    "test:coverage": "vp test --coverage",
    "test:unit": "vp test tests/unit",
    "test:integration": "vp test tests/integration",
    "test:e2e": "playwright test --config config/playwright.ts",
    "preview": "vp exec vite preview",
    "format": "vp fmt",
    "format:check": "vp fmt --check",
    "lint": "vp lint",
    "prepare": "vp hooks enable",
    "deploy": "wrangler deploy",
    "deploy:preview": "wrangler deploy --env preview",
    "cf:db:create": "wrangler d1 create mcp-context-router-db",
    "cf:db:migrate": "wrangler d1 migrations apply mcp-context-router-db --remote",
    "cf:db:migrate:local": "wrangler d1 migrations apply mcp-context-router-db --local",
    "cf:kv:create": "wrangler kv:namespace create CODEBASE_KV",
    "cf:r2:create": "wrangler r2 bucket create mcp-codebase",
    "cf:tail": "wrangler tail"
  }
}
```

---

## Feature Flags

Control MCP availability via environment:

```typescript
// In buildServices function
const isProduction = env.ENVIRONMENT === 'production'

const servers = [
  { ...gitAst, enabled: true },
  { ...github, enabled: !!env.GITHUB_TOKEN },
  { ...sentry, enabled: !!env.SENTRY_TOKEN && isProduction },
  { ...kubernetes, enabled: !!env.KUBERNETES_CONFIG },
  { ...cloudflare, enabled: !!env.CLOUDFLARE_ACCOUNT_ID && isProduction },
  { ...observability, enabled: isProduction },
  { ...security, enabled: isProduction }
]
```

### Per-MCP Configuration

| MCP           | Required Config                                               | Optional Config             |
| ------------- | ------------------------------------------------------------- | --------------------------- |
| Git AST       | `CODEBASE_ROOT`                                               | -                           |
| Codebase      | `CODEBASE_ROOT`                                               | `R2` bucket, `KV` namespace |
| Database      | `DATABASE_URL`                                                | D1 binding                  |
| GitHub        | `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`                 | -                           |
| CI/CD         | `CICD_TOKEN`, `CICD_PROVIDER`                                 | `owner`, `repo`             |
| Sentry        | `SENTRY_TOKEN`, `SENTRY_ORG`                                  | -                           |
| Kubernetes    | `KUBERNETES_CONFIG`                                           | `provider`                  |
| Cloud         | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`               | -                           |
| Observability | Any of: Sentry, Kubernetes, Cloud, CI/CD                      | -                           |
| Security      | Any of: Dependency, Codebase, Git, Cloud, CI/CD, Architecture | -                           |

---

## Cloudflare Resource IDs

After creating resources, update `wrangler.toml`:

```bash
# D1 Database
bun run cf:db:create
# → database_id = "abc123..."

# KV Namespace
bun run cf:kv:create
# → id = "xyz789..."

# Update wrangler.toml:
# [[d1_databases]]
# database_id = "abc123..."
# [[kv_namespaces]]
# id = "xyz789..."
```

---

## Playwright Configuration

```typescript
// config/playwright.ts
import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  testDir: resolve(root, 'tests/e2e'),
  use: { baseURL: 'http://127.0.0.1:5173' },
  webServer: [
    {
      command: 'vp dev --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      cwd: root,
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'node scripts/e2e-api.mjs',
      url: 'http://127.0.0.1:3000/health',
      cwd: root,
      reuseExistingServer: !process.env.CI
    }
  ],
  outputDir: resolve(root, 'test-results'),
  reporter: process.env.CI ? 'github' : 'list'
})
```

---

## GitHub Actions Secrets

Required secrets in repository settings:

| Secret                  | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API token with Workers/D1/R2/KV permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID                                  |
| `GITHUB_TOKEN`          | GitHub PAT (auto-provided)                             |

---

## Node.js Version

```json
// package.json
{
  "engines": { "node": ">=22.12.0" },
  "packageManager": "bun@1.4.2"
}
```

---

## IDE Configuration

### VSCode (`.vscode/settings.json`)

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": "explicit",
    "source.organizeImports": "explicit"
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "files.associations": {
    "*.ts": "typescript",
    "*.tsx": "typescriptreact"
  }
}
```

### Recommended Extensions

- `esbenp.prettier-vscode`
- `dbaeumer.vscode-eslint`
- `bradlc.vscode-tailwindcss`
- `ms-playwright.playwright`

---

## Build Output Structure

```
dist/
├── web/                    # React dashboard
│   ├── index.html
│   └── assets/
│       ├── index-*.js
│       └── index-*.css
├── router/                 # stdio MCP server
│   └── index.js
└── worker/                 # Cloudflare Worker
    ├── index.js
    └── _worker.js          # Worker entry point
```

---

## Migration Commands

```bash
# Local development
bun run cf:db:migrate:local

# Production
bun run cf:db:migrate

# Create new migration
bunx wrangler d1 migrations create mcp-context-router-db migration_name
```

---

## Logging Configuration

```typescript
// Worker logging level
// Set via environment or wrangler.toml
log_level = "info"  // debug, info, warn, error

// Structured logging
console.log(JSON.stringify({
  level: "info",
  message: "Route decision",
  routeId: "...",
  query: "...",
  selectedServers: [...],
  durationMs: 123
}))
```

---

## Feature Toggles

```typescript
// In buildServices or via environment
const features = {
  semanticRouting: false, // Requires Vectorize + Workers AI
  contextGraph: true, // Context graph building
  tokenBudgeting: true, // Token budget enforcement
  semanticSearch: false, // Requires Workers AI
  advancedTracing: true // RouteTracer with full events
}
```

---

## Migration from Previous Versions

### v0.2 → v0.3

1. **RouteRequest changes**: `intent` → `query` (required), `intent` now optional
2. **Policy**: `allowRisk` → `risk` (single value instead of array)
3. **Registry**: `source: 'local'|'remote'|'draft'` instead of boolean
4. **Tools**: Added `category` field to `McpTool`

Run migration script:

```bash
bun run scripts/migrate-v0.3.ts
```

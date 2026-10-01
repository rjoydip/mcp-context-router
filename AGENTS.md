# AGENTS.md

Guidance for AI agents working in this repository.

## What this is

MCP Context Router — a TypeScript MCP gateway that discovers, policy-filters and
routes tool context to AI agents by intent. One shared core produces three
build targets: a web dashboard, a stdio MCP server, and a Cloudflare Worker.

- Usage, commands, environment: [README.md](README.md)
- Deep-dive topics: [docs/](docs/) (see "Docs map" below)
- Status and remaining work: [PLAN.md](PLAN.md)

## Commands

Use the `bun run <script>` form (scripts are defined in `package.json`).

```bash
bun run check              # THE quality gate: format + lint + type-check
vp check --fix             # autofix formatting/lint issues in place
bun run test               # unit + integration (vitest)
bun run test:unit          # unit only
bun run test:integration   # integration only
bun run test:e2e           # Playwright e2e (auto-starts mock API, see below)
bun run test:coverage      # coverage (what CI uploads to Codecov)
bun run build              # all three targets: web, router, worker
bun run dev                # dashboard at localhost:5173 (proxies /api → 8787)
bun run dev:worker         # wrangler dev at localhost:8787
bun run format             # oxfmt format in place
```

Always run `bun run check` before finishing a task. It must pass with zero
errors and zero warnings.

## Quality workflow

There is **no ESLint and no Prettier**. Everything is configured in
`vite.config.ts` and runs through vite-plus (`vp`):

- **Format**: oxfmt — `singleQuote: true`, `semi: false`,
  `trailingComma: 'none'`
- **Lint**: oxlint, `typeAware: true` and `typeCheck: true`. The only custom
  rule is `no-console`, which allows `console.error` / `console.warn` only —
  in scripts use `process.stdout.write(...)` instead of `console.log`.
- **Type-check**: `tsc` via the same `vp check` invocation.
- **Pre-commit hook**: `vp hooks enable` installs a hook that runs
  `vp check --fix` on staged files (see `staged` in `vite.config.ts`).

CI (`.github/workflows/ci.yml`): check → test:coverage → build → e2e →
deploy (preview on PRs, production on main).

## TypeScript conventions

- `tsconfig.json` is `strict` with `noUncheckedIndexedAccess: true`, so
  `arr[i]` is `T | undefined`. After an explicit length/`toBeDefined`
  assertion, use `arr[i]!`; otherwise prefer `arr[i]?.prop`.
- `verbatimModuleSyntax: true`: type-only imports must be written
  `import type { ... }`.
- Mocked provider fixtures must use real `McpCategory` values (git, codebase,
  database, github, cicd, dependency, architecture, sentry, kubernetes, cloud,
  observability, security) — invented categories like `'test'` fail type-check.
- `scripts/` is included in `tsconfig.json` so files there get node types.

## Testing

Three tiers, all under `tests/`:

- `tests/unit/` — pure logic (`src/core`) plus local services with temp dirs
  and mocks. Vitest, node environment.
- `tests/integration/` — the Hono app via `app.request(...)` with a stub
  `CloudflareEnv`, and services with mocked bindings (no emulators).
- `tests/e2e/` — Playwright against the built dashboard and a mock API.

E2E specifics:

- `scripts/e2e-api.ts` is the mock API. Playwright's `webServer` starts it on
  **port 8787** with URL `http://127.0.0.1:8787/health`. The vite dev proxy
  forwards `/api` to `127.0.0.1:8787`, so anything on 8787 must speak the same
  contract as the worker. The mock uses the real core routing logic
  (`routeContext`, `applyPolicy`, `defaultServers`) — keep it in sync with
  `src/worker/index.ts` response shapes.
- Stale processes can hold port 8787; kill them before re-running e2e
  (`netstat -ano | findstr :8787` then `taskkill //F //PID <pid>`).
- Playwright JSON-serializes request bodies: to send malformed JSON, pass
  `Buffer.from('{ not valid json')`, not a string.
- Assert actual behavior, not aspirational behavior (e.g. policy `riskLevel`
  is the lowercase string `"read"`, not `"READ"`).

## Architecture map

- `src/core/` — pure routing, no I/O: `router`, `scoring`, `policy`,
  `discovery`, `graph`, `tracing`, `registry`, `types`
- `src/local/` — `git-ast` (child_process + TypeScript compiler API),
  `codebase` (filesystem, path-traversal guard), `database` (pg, read-only)
- `src/cloudflare/` — REST-backed services; GitHub-style responses arrive as
  envelopes (`{ total_count, items: [...] }`) and must be unwrapped
- `src/mcp/server.ts` — MCP server factory shared by stdio and HTTP transports
- `src/worker/index.ts` — Hono app; `/api/*` JSON 404 handler sits before the
  static-asset catch-all (unknown API paths must not fall through to assets)
- `src/web/` — React dashboard
- `scripts/e2e-api.ts` — e2e mock API (bun script)

## Environment

- `CODEBASE_ROOT` — root for local codebase access; reads outside it are
  rejected (`Path is outside CODEBASE_ROOT`)
- `DATABASE_URL` — Postgres; SQL is restricted to `SELECT`, `WITH`, `EXPLAIN`
- Worker vars: `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`; optional
  `CICD_TOKEN`, `SENTRY_TOKEN`/`SENTRY_ORG`, `KUBERNETES_CONFIG`,
  `CLOUDFLARE_ACCOUNT_ID` gate token-dependent entries in `/api/servers`

## Constraints

- **Default policy is read-only.** Only `read`-risk tools are allowed unless
  policy explicitly opts in to `write`/`execute`. Don't weaken this in tests
  or fixtures without an explicit decision.
- **zod must stay `>=4.2.0`** — the MCP SDK's `registerTool` needs
  `~standard.jsonSchema` (see "Tooling Notes" in the README).
- The react plugin cast at the top of `vite.config.ts` is a deliberate
  boundary between vite-plus's forked vite types and upstream
  `@vitejs/plugin-react` types — keep it contained; don't spread the cast.

## Docs map

| Doc                     | Contents                                    |
| ----------------------- | ------------------------------------------- |
| `docs/architecture.md`  | Components, data flow, deployment, security |
| `docs/routing.md`       | Scoring, policy and the routing pipeline    |
| `docs/providers.md`     | All 12 providers and their tool inventories |
| `docs/api.md`           | REST API endpoints                          |
| `docs/testing.md`       | Test structure, strategy, coverage          |
| `docs/configuration.md` | Environment variables and configuration     |
| `docs/deployment.md`    | Cloudflare Workers deployment               |
| `PLAN.md`               | Completion status and remaining work        |

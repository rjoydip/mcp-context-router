# Testing Guide

## Test Structure

```
tests/
├── unit/           # Unit tests (fast, isolated)
├── integration/    # Integration tests (MCP server, providers)
└── e2e/           # End-to-end tests (Playwright)
```

## Running Tests

```bash
# All tests
bun run test

# Unit tests only
bun run test:unit

# Integration tests
bun run test:integration

# E2E tests (requires Playwright)
bun run test:e2e

# Coverage
bun run test:coverage
```

## Test Categories

### Unit Tests (`tests/unit/`)

Fast, isolated tests for pure logic:

```bash
bun run test:unit
```

**Current tests** (`tests/unit/router.test.ts`):

- Routes git/AST intents to Git AST MCP
- Routes database intents to Database MCP
- Routes production error intents to Sentry + Kubernetes
- Default policy is read-only

```typescript
import { routeContext } from '../../src/core/router'
import { defaultServers } from '../../src/core/registry'

it('routes git and AST intents to local Git AST', () => {
  const result = routeContext(
    { query: 'inspect git diff and TypeScript AST symbols' },
    defaultServers
  )
  expect(result.servers.map((s) => s.serverId)).toContain('git-ast')
  expect(result.tools.map((t) => t.tool.name)).toContain('ast_symbols')
})
```

### Writing Unit Tests

```typescript
import { describe, expect, it } from 'vitest'
import { scoreServer, scoreTool } from '../../src/core/scoring'

describe('scoring', () => {
  it('scores git-related queries high for git-ast', () => {
    const server = defaultServers.find((s) => s.id === 'git-ast')!
    const result = scoreServer(server, ['git', 'diff', 'ast'])
    expect(result.score).toBeGreaterThan(50)
  })
})
```

---

### Integration Tests (`tests/integration/`)

Tests against real MCP server instances:

```bash
bun run test:integration
```

**Current tests**:

- `mcp.test.ts`: MCP server exposes tools correctly
- `factory.test.ts`: Server factory creates independent instances, enforces read-only policy

```typescript
import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import { createRouterMcpServer } from '../../src/mcp/server'

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
})
```

### Writing Integration Tests

```typescript
import { describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import { MyProvider } from '../../src/cloudflare/my-service'

describe('MyProvider', () => {
  it('returns expected data', async () => {
    const provider = new MyProvider({/* config */})
    const tools = await provider.discover()
    expect(tools.length).toBeGreaterThan(0)

    const result = await provider.invoke('my_tool', { arg: 'value' })
    expect(result).toBeDefined()
  })
})
```

---

### E2E Tests (`tests/e2e/`)

Full browser tests with Playwright:

```bash
bun run test:e2e
# or
npx playwright test --config config/playwright.ts
```

**Requirements**:

```bash
npx playwright install --with-deps chromium
```

**Current test** (`tests/e2e/router.spec.ts`):

```typescript
import { test, expect } from '@playwright/test'

test('routes an intent from the dashboard', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Context Router' })).toBeVisible()

  await page.getByLabel('Intent').fill('Investigate production errors after deployment')
  await page.getByRole('button', { name: 'Route context' }).click()

  await expect(page.getByTestId('route-result')).toContainText('sentry')
})
```

### Writing E2E Tests

```typescript
import { test, expect } from '@playwright/test'

test('complete routing workflow', async ({ page }) => {
  await page.goto('/')

  // Fill intent
  await page.getByLabel('Intent').fill('Why did the API slow down after deploy?')

  // Submit
  await page.getByRole('button', { name: 'Route context' }).click()

  // Verify results
  await expect(page.getByTestId('route-result')).toBeVisible()
  await expect(page.getByTestId('route-result')).toContainText('observability')
  await expect(page.getByTestId('route-result')).toContainText('sentry')
  await expect(page.getByTestId('route-result')).toContainText('cicd')

  // Check policy
  await expect(page.getByText('READ     ✓ allowed')).toBeVisible()
  await expect(page.getByText('WRITE    ✕ denied')).toBeVisible()
})
```

## Running Specific Tests

```bash
# Single test file
bun run test tests/unit/router.test.ts

# Specific test
bun run test --filter "routes git"

# Watch mode
bun run test --watch

# With coverage
bun run test:coverage
```

## Coverage

```bash
bun run test:coverage
```

Output:

```
File                         | % Stmts | % Branch | % Funcs | % Lines
-----------------------------|---------|----------|---------|--------
src/core/router.ts           | 100     | 100      | 100     | 100
src/core/scoring.ts          | 95      | 90       | 100     | 95
src/core/policy.ts           | 100     | 100      | 100     | 100
src/core/graph.ts            | 90      | 85       | 100     | 90
src/core/discovery.ts        | 85      | 80       | 100     | 85
src/local/git-ast.ts         | 80      | 75       | 90      | 80
src/local/codebase.ts        | 90      | 85       | 100     | 90
src/local/database.ts        | 95      | 90       | 100     | 95
```

---

## Mock Providers

All external services have mock implementations in `src/cloudflare/*-service.ts`:

```typescript
export class MockGitHubProvider implements McpProvider {
  id = 'github'
  metadata = {/* ... */}

  async discover() {
    return this.metadata.tools
  }
  async invoke(tool, args) {
    return mockData[tool]
  }
}

// In tests
const server = createRouterMcpServer({
  git: new LocalGitAst(),
  codebase: new CodebaseService(process.cwd())
  // GitHub uses mock
})
```

---

## CI/CD Integration

GitHub Actions workflow (`.github/workflows/ci.yml`):

```yaml
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run check

  test:
    needs: check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run test:coverage

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build

  e2e:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run build:web
      - run: bunx playwright install --with-deps chromium
      - run: bun run test:e2e
```

---

## Best Practices

1. **Isolate external dependencies**: All external services behind provider interfaces
2. **Deterministic mocks**: Fixed test data, no randomness
3. **Test behavior, not implementation**: Focus on input/output contracts
4. **Fast feedback**: Unit tests < 1s, integration < 10s
5. **Deterministic tests**: No flakiness, fixed timestamps/UUIDs
6. **No external credentials in CI**: Use mocks

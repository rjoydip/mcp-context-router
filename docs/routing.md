# Routing Algorithm

## Overview

The routing algorithm is the core intelligence of the MCP Context Router. It takes an agent's query/intent and returns a ranked list of MCP servers and tools that are most relevant to the agent's intent.

## Algorithm Overview

The routing algorithm operates in 5 stages:

```
Query → Extract Terms → Score Servers → Select Top N → Score Tools → Apply Policy → Return Decision
```

## Stage 1: Term Extraction

```typescript
function terms(value: string): string[] {
  return [
    ...new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length > 2 && !stopWords.has(term))
    )
  ]
}
```

- Converts to lowercase
- Splits on non-alphanumeric characters
- Filters stop words (the, a, an, and, or, to, for, of, after, with, in, on, my, our, etc.)
- Removes terms ≤ 2 characters
- Deduplicates terms

## Stage 2: Server Scoring

Each of the 12 MCP servers is scored against the intent terms:

### Scoring Components

| Component          | Weight         | Formula                                                                |
| ------------------ | -------------- | ---------------------------------------------------------------------- |
| Term Match         | 10 pts/term    | Exact term in server name, description, tool names, descriptions, tags |
| Capability Match   | 8 pts/match    | Intent term in server capability list                                  |
| Tool Match         | 5 pts/match    | Intent term in tool names, descriptions, tags                          |
| Category Relevance | 5 pts/relation | Intent term matches related categories                                 |
| Priority           | 1 pt           | Server priority (1-12)                                                 |
| Context Bonus      | Variable       | Repository, environment, service matches                               |

### Category Weight Multipliers

| Category      | Weight | Rationale                                |
| ------------- | ------ | ---------------------------------------- |
| observability | 1.3    | Production incidents need high relevance |
| security      | 1.2    | Security issues need high relevance      |
| cicd          | 1.2    | Pipeline failures are time-critical      |
| sentry        | 1.2    | Error tracking is operational            |
| kubernetes    | 1.1    | Cluster issues are operational           |
| cloud         | 1.1    | Infrastructure is operational            |
| architecture  | 1.1    | Structural understanding needed          |
| git           | 1.0    | Baseline                                 |
| codebase      | 1.0    | Baseline                                 |
| database      | 1.0    | Baseline                                 |
| github        | 1.0    | Baseline                                 |
| dependency    | 1.0    | Baseline                                 |

### Category Relationships (Boosts Related Categories)

```typescript
const CATEGORY_RELATIONSHIPS = {
  git: ['github', 'cicd', 'codebase', 'architecture'],
  codebase: ['git', 'dependency', 'architecture', 'database', 'security'],
  database: ['codebase', 'architecture', 'cloud', 'kubernetes'],
  github: ['git', 'cicd', 'codebase', 'architecture'],
  cicd: ['github', 'git', 'codebase', 'architecture', 'kubernetes', 'cloud'],
  dependency: ['codebase', 'architecture', 'security'],
  architecture: ['codebase', 'database', 'dependency', 'github', 'cicd', 'cloud', 'kubernetes'],
  sentry: ['architecture', 'observability', 'cicd', 'github'],
  kubernetes: ['cloud', 'architecture', 'cicd', 'observability'],
  cloud: ['kubernetes', 'database', 'architecture', 'cicd', 'observability'],
  observability: ['sentry', 'kubernetes', 'cloud', 'cicd', 'architecture'],
  security: ['dependency', 'codebase', 'architecture', 'github', 'cicd']
}
```

### Context Bonuses

- Repository match in description: +10
- Environment match: +5
- Service name in tool name/description: +15

## Stage 3: Server Selection

1. Filter enabled servers with score > 0
2. Sort by score descending, then name ascending
3. Take top N (default: 3)

## Stage 4: Tool Scoring

For tools within selected servers:

```typescript
function scoreTool(tool, intentTerms, serverScore, context) {
  let score = matchedTerms.length * 5

  // Deprioritize write/execute by default
  if (tool.risk === 'write' || tool.risk === 'execute') {
    score *= 0.5
  }

  // Category match bonus
  if (tool.category && intentTerms.includes(tool.category)) {
    score += 20
  }

  // Server score contribution
  score += serverScore * 0.1

  // Context service bonus
  if (context?.service) {
    if (
      tool.name.toLowerCase().includes(context.service) ||
      tool.description.toLowerCase().includes(context.service)
    ) {
      score += 25
    }
  }

  return score
}
```

## Stage 5: Policy Filtering

```typescript
function applyPolicy(tools, requestedRisks, config = defaultPolicy) {
  const risks = requestedRisks?.length
    ? requestedRisks.filter((risk) => config.allowRisks.includes(risk))
    : config.allowRisks

  const filteredTools = tools.filter(
    (tool) => risks.includes(tool.tool.risk) && !config.deniedToolNames.includes(tool.tool.name)
  )

  return {
    allowed: filteredTools.length > 0,
    reason:
      filteredTools.length === tools.length
        ? 'All selected tools satisfy the active policy'
        : filteredTools.length
          ? 'Policy filtered one or more selected tools'
          : 'Policy removed every selected tool',
    filteredTools,
    riskLevel: filteredTools[0]?.tool.risk ?? 'read'
  }
}
```

Default policy: `allowRisks: ['read']`, `deniedToolNames: []`

## Output: RouteDecision

```typescript
interface RouteDecision {
  query: string
  intent?: string
  servers: RouteCandidate[]
  tools: SelectedTool[]
  reasoning: RouteReason[]
  policy: PolicyDecision
  tokenBudget: number
  estimatedTokens: number
  timestamp: string
  routeId: string
}
```

Each `RouteReason` includes:

- `serverId`, `serverName`
- `score`, `signals` (matched terms), `matchedCapabilities`
- `reasoning` (human-readable explanation)
- `policy`: 'allowed' | 'denied'

## Example

**Query**: "Why did the /users endpoint become slower after yesterday's deployment?"

**Extracted Terms**: `users`, `endpoint`, `slower`, `deployment`, `yesterday`

**Scoring**:

| Server        | Score | Signals               | Reasoning                                        |
| ------------- | ----- | --------------------- | ------------------------------------------------ |
| observability | 94    | latency, deployment   | High relevance: latency + deployment correlation |
| sentry        | 87    | errors, deployment    | Error tracking + deployment correlation          |
| cicd          | 82    | deployment            | CI/CD pipeline deployment tracking               |
| github        | 78    | deployment, commit    | Deployment commits                               |
| git-ast       | 75    | deployment, yesterday | Local git history                                |
| kubernetes    | 72    | deployment            | Kubernetes rollout status                        |
| database      | 68    | latency               | Database query latency                           |

**Selected Tools** (after policy filter, read-only):

- `observability.incident_search` (query: latency deployment)
- `observability.latency` (service: /users)
- `sentry.sentry_errors` (query: /users)
- `cicd.deployments` (environment: production)
- `github.github_commits` (since: yesterday)
- `kubernetes.k8s_rollout` (deployment: /users)

**Policy Decision**: Allowed (all read-only)
**Estimated Tokens**: ~1,200

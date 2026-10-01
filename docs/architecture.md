# Architecture Overview

The MCP Context Router is a gateway that intelligently routes agent requests to the most relevant MCP (Model Context Protocol) capabilities. It acts as a single entry point to 12 specialized MCP servers, minimizing context sent to agents while maximizing relevance.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AI Agent                              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Context Router     │
                    │  (Port 8787/5173)    │
                    └──────────┬───────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │ Tool        │    │ Policy      │    │ Context     │
    │ Discovery   │    │ Engine      │    │ Graph       │
    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
           │                   │                   │
           └───────────────────┼───────────────────┘
                               ▼
                    ┌──────────────────────┐
                    │   12 MCP Servers     │
                    └──────────────────────┘
```

## Core Components

### 1. Context Router (`src/core/router.ts`)

The central orchestration component that:

- Receives agent queries with intent and context
- Scores all 12 MCP servers against the query
- Selects top N servers and M tools
- Applies policy filtering
- Returns structured route decision with reasoning

### 2. Scoring Engine (`src/core/scoring.ts`)

Multi-factor scoring algorithm:

- **Term Matching**: Exact keyword matches in server name, description, tools, tags
- **Capability Matching**: Matches against declared server capabilities
- **Category Relationships**: Boosts related categories (e.g., GitHub → CI/CD)
- **Context Bonuses**: Repository, environment, service context
- **Category Weights**: Operational categories (observability, security, CI/CD) get higher base weights

### 3. Policy Engine (`src/core/policy.ts`)

- Default: Read-only access (`allowRisks: ['read']`)
- Filters tools by risk level (read/write/execute)
- Token budget estimation (~100 tokens/tool + overhead)
- Deny-list for specific tool names

### 4. Tool Discovery (`src/core/discovery.ts`)

- Provider registry with registration/unregistration
- Tool search by query, category, source
- Tool invocation with argument validation

### 5. Context Graph (`src/core/graph.ts`)

- Nodes: Services, modules, databases, commits, PRs, deployments
- Edges: calls, imports, depends_on, stores_in, publishes_to, consumes_from
- Path finding between nodes
- Graph serialization for visualization

### 6. Tracing (`src/core/tracing.ts`)

- Route decision tracing with full reasoning
- Phase tracing: discovery → scoring → selection → policy → execution
- Route ID generation for correlation

## MCP Registry (12 Servers)

| ID            | Name              | Category      | Priority | Source     | Tools |
| ------------- | ----------------- | ------------- | -------- | ---------- | ----- |
| git-ast       | Git AST MCP       | git           | 12       | local      | 9     |
| github        | GitHub MCP        | github        | 12       | remote     | 9     |
| codebase      | Codebase MCP      | codebase      | 11       | local      | 7     |
| database      | Database MCP      | database      | 10       | local      | 6     |
| cicd          | CI/CD MCP         | cicd          | 9        | remote     | 7     |
| sentry        | Sentry MCP        | sentry        | 8        | remote     | 6     |
| dependency    | Dependency MCP    | dependency    | 7        | local      | 7     |
| cloud         | Cloud MCP         | cloud         | 7        | cloudflare | 10    |
| architecture  | Architecture MCP  | architecture  | 6        | local      | 7     |
| observability | Observability MCP | observability | 7        | draft      | 7     |
| security      | Security MCP      | security      | 9        | draft      | 8     |
| kubernetes    | Kubernetes MCP    | kubernetes    | 6        | draft      | 8     |

**Total: 86 tools across 12 servers**

## Data Flow

```
Agent Query
    │
    ▼
┌────────────────────────────────────────┐
│ 1. Parse Query → Extract Terms         │
└────────────────────────────┬───────────┘
                             │
                             ▼
┌────────────────────────────────────────┐
│ 2. Score All 12 Servers                │
│    - Term matching (10pts each)        │
│    - Capability matching (8pts each)   │
│    - Tool matching (5pts each)         │
│    - Category relevance (5pts each)    │
│    - Priority + Context bonuses        │
└────────────────────────────┬───────────┘
                             │
                             ▼
┌────────────────────────────────────────┐
│ 3. Select Top N Servers (default 3)    │
└────────────────────────────┬───────────┘
                             │
                             ▼
┌────────────────────────────────────────┐
│ 4. Score & Select Top M Tools (default 8)│
└────────────────────────────┬───────────┘
                             │
                             ▼
┌────────────────────────────────────────┐
│ 4. Apply Policy (read-only default)    │
└────────────────────────────┬───────────┘
                             │
                             ▼
┌────────────────────────────────────────┐
│ 5. Build Route Decision with Reasoning │
└────────────────────────────────────────┘
```

## Deployment Architecture

### Local Development

- **stdio MCP Server**: Direct process launch (`src/server/index.ts`)
- **Web Dashboard**: Vite dev server at `localhost:5173`
- **Worker**: `wrangler dev` at `localhost:8787`

### Cloudflare Production

- **Worker**: Cloudflare Workers with StreamableHTTP transport
- **Assets**: Static dashboard served via Workers Assets
- **Bindings**: D1 (SQLite), R2 (blob storage), KV (cache), Vectorize (embeddings)
- **Services**: D1 for metadata, R2 for artifacts, KV for caching, Vectorize for semantic search

## Security Model

1. **Read-Only Default**: All tools default to `risk: 'read'`
2. **Explicit Escalation**: Write/execute requires explicit `allowRisk` in request
3. **Path Traversal Protection**: Codebase MCP validates paths against `CODEBASE_ROOT`
4. **SQL Injection Prevention**: Database MCP only allows SELECT/WITH/EXPLAIN
5. **Secret Redaction**: No secrets in logs or responses
6. **Authentication Hook**: Designed for auth boundary before policy engine

## Scalability Considerations

- **Token Budget**: Configurable per-request (default 8000 tokens)
- **Caching**: KV for route results, tool metadata, provider availability
- **Vectorize**: Semantic tool search for future enhancement
- **Durable Objects**: For stateful context graph updates
- **Queues**: Async route decision logging and analytics

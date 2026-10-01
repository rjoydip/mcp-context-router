# API Reference

## Base URL

| Environment       | URL                                                     |
| ----------------- | ------------------------------------------------------- |
| Local Development | `http://localhost:8787`                                 |
| Production        | `https://mcp-context-router.your-subdomain.workers.dev` |

## Authentication

Currently no authentication required for API endpoints. Production should implement authentication at the edge (Cloudflare Access, API keys, etc.).

## Endpoints

### Health Check

```http
GET /api/health
```

**Response** (200 OK):

```json
{
  "status": "ok",
  "timestamp": "2026-09-29T12:00:00.000Z"
}
```

---

### List All Servers

```http
GET /api/servers
```

**Response** (200 OK):

```json
[
  {
    "id": "git-ast",
    "name": "Git AST MCP",
    "description": "Read-only local Git history, status, diffs, repository files and TypeScript AST symbols.",
    "category": "git",
    "priority": 12,
    "enabled": true,
    "source": "local",
    "risk": "read",
    "tools": [...],
    "capabilities": [...],
    "version": "1.0.0",
    "metadata": { "local_only": true, "read_only": true }
  },
  ...
]
```

---

### Route Context

```http
POST /api/route
Content-Type: application/json
```

**Request Body**:

```json
{
  "query": "string (required)",
  "intent": "string (optional)",
  "maxServers": "integer (optional, default: 3)",
  "maxTools": "integer (optional, default: 8)",
  "tokenBudget": "integer (optional, default: 8000)",
  "risk": "string (optional, enum: read|write|execute)",
  "context": {
    "repository": "string (optional)",
    "branch": "string (optional)",
    "environment": "string (optional)",
    "service": "string (optional)",
    "commit": "string (optional)",
    "deployment": "string (optional)"
  }
}
```

**Response** (200 OK):

```json
{
  "query": "Why did the /users endpoint become slower after yesterday's deployment?",
  "intent": "Investigate latency regression",
  "servers": [
    {
      "serverId": "observability",
      "serverName": "Observability/Incident MCP",
      "category": "observability",
      "score": 94,
      "matchedTerms": ["latency", "deployment"],
      "matchedCapabilities": ["incident_search", "latency", "deployment_correlation"],
      "tools": [...],
      "reasoning": [
        "Category: observability (39 pts)",
        "Term matches: latency, deployment",
        "Capability matches: 2",
        "Priority: 7",
        "Context bonus: 15"
      ]
    }
  ],
  "tools": [
    {
      "serverId": "observability",
      "serverName": "Observability/Incident MCP",
      "tool": {
        "name": "incident_search",
        "description": "Search incidents",
        "tags": ["observability", "incidents", "search"],
        "risk": "read",
        "category": "observability"
      },
      "score": 89,
      "reasoning": "Matched: latency, incident, search, deployment"
    }
  ],
  "reasoning": [
    {
      "serverId": "observability",
      "serverName": "Observability/Incident MCP",
      "score": 94,
      "signals": ["latency", "deployment"],
      "matchedCapabilities": ["incident_search", "latency", "deployment_correlation"],
      "reasoning": "Category: observability (39 pts); Term matches: latency, deployment; Capability matches: 2; Priority: 7; Context bonus: 15",
      "policy": "allowed"
    }
  ],
  "policy": {
    "allowed": true,
    "reason": "All selected tools satisfy the active policy",
    "filteredTools": [...],
    "riskLevel": "read"
  },
  "tokenBudget": 8000,
  "estimatedTokens": 1200,
  "timestamp": "2026-09-29T12:00:00.000Z",
  "routeId": "route_1727611200_abc123"
}
```

---

### MCP Endpoint

```http
POST /mcp
Content-Type: application/json
```

The MCP endpoint implements the [MCP Protocol](https://modelcontextprotocol.io/) over StreamableHTTP transport.

#### Methods

| Method           | Description                      |
| ---------------- | -------------------------------- |
| `tools/list`     | List all available tools         |
| `tools/call`     | Invoke a tool                    |
| `resources/list` | List resources (not implemented) |
| `prompts/list`   | List prompts (not implemented)   |

#### List Tools

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**Response**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "route_context",
        "description": "Discover and policy-filter MCP capabilities for an agent intent",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": { "type": "string", "minLength": 1 },
            "intent": { "type": "string" },
            "maxServers": { "type": "integer", "minimum": 1, "maximum": 10 },
            "maxTools": { "type": "integer", "minimum": 1, "maximum": 50 },
            "tokenBudget": { "type": "integer", "minimum": 100, "maximum": 50000 },
            "allowRisk": { "type": "array", "items": { "type": "string", "enum": ["read", "write", "execute"] } },
            "context": {
              "type": "object",
              "properties": {
                "repository": { "type": "string" },
                "branch": { "type": "string" },
                "environment": { "type": "string" },
                "service": { "type": "string" },
                "commit": { "type": "string" },
                "deployment": { "type": "string" }
              }
            }
          },
          "required": ["query"]
        }
      },
      ...
    ]
  }
}
```

#### Call Tool

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "route_context",
    "arguments": {
      "query": "Why is the API slow?",
      "intent": "Investigate latency",
      "maxServers": 3,
      "maxTools": 8,
      "allowRisk": ["read"]
    }
  }
}
```

**Response**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{ \"query\": \"Why is the API slow?\", \"servers\": [...], \"tools\": [...], \"policy\": {...} }"
      }
    ]
  }
}
```

---

### Dashboard Assets

```http
GET /
GET /assets/*
```

Serves the React dashboard static assets (HTML, JS, CSS).

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

### Error Codes

| Code                      | HTTP Status | Description                     |
| ------------------------- | ----------- | ------------------------------- |
| `INVALID_REQUEST`         | 400         | Invalid request body            |
| `VALIDATION_ERROR`        | 400         | Request validation failed       |
| `ROUTE_NOT_FOUND`         | 404         | Endpoint not found              |
| `POLICY_DENIED`           | 403         | Tool execution denied by policy |
| `PROVIDER_UNAVAILABLE`    | 503         | MCP provider not available      |
| `TOOL_NOT_FOUND`          | 404         | Tool not found                  |
| `INVALID_ARGUMENT`        | 400         | Invalid tool argument           |
| `RATE_LIMITED`            | 429         | Rate limit exceeded             |
| `DATABASE_ERROR`          | 500         | Database error                  |
| `EXTERNAL_PROVIDER_ERROR` | 502         | Upstream provider error         |
| `INTERNAL_ERROR`          | 500         | Internal server error           |

---

## MCP Protocol Details

### Transport

The MCP endpoint uses **StreamableHTTP** transport (modern MCP standard with SSE fallback).

### Initialization

Client should initialize connection:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "capabilities": {},
    "clientInfo": {
      "name": "my-agent",
      "version": "1.0.0"
    }
  }
}
```

### Tool Schema Format

All tools follow JSON Schema format for input validation:

```json
{
  "name": "tool_name",
  "description": "Tool description",
  "inputSchema": {
    "type": "object",
    "properties": {
      "param1": { "type": "string", "description": "Description" },
      "param2": { "type": "integer", "minimum": 1 }
    },
    "required": ["param1"]
  }
}
```

### Tool Result Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "Result text or JSON"
    }
  ],
  "isError": false
}
```

Error result:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error message"
    }
  ],
  "isError": true
}
```

---

## Rate Limiting

Not currently implemented. Recommended production setup:

```toml
# wrangler.toml
[rate_limiting]
enabled = true
rules = [
  { path = "/api/route", limit = 100, window = "60s" },
  { path = "/mcp", limit = 50, window = "60s" }
]
```

Can be implemented via Cloudflare Workers Rate Limiting or WAF rules.

---

## Versioning

API version in route: `/api/v1/...` (future)

Current: implicit v1 (no version prefix)

### Breaking Changes

- Adding required fields to request bodies
- Removing response fields
- Changing error codes
- Changing tool schemas (backwards compatible additions OK)

---

## SDK / Client Libraries

### TypeScript

```typescript
interface RouteRequest {
  query: string
  intent?: string
  maxServers?: number
  maxTools?: number
  tokenBudget?: number
  risk?: 'read' | 'write' | 'execute'
  context?: {
    repository?: string
    branch?: string
    environment?: string
    service?: string
    commit?: string
    deployment?: string
  }
}

async function routeContext(baseUrl: string, request: RouteRequest) {
  const response = await fetch(`${baseUrl}/api/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  return response.json()
}

// Usage
const result = await routeContext('https://mcp.example.com', {
  query: 'Why is the API slow after deployment?',
  intent: 'Investigate latency regression',
  risk: 'read'
})
```

### MCP Client

```typescript
import { Client } from '@modelcontextprotocol/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

const transport = new StreamableHTTPClientTransport(new URL('https://mcp.example.com/mcp'))
const client = new Client({ name: 'my-agent', version: '1.0.0' })
await client.connect(transport)

const result = await client.callTool({
  name: 'route_context',
  arguments: { query: 'Why is the API slow?' }
})
```

---

## WebSocket (Future)

Planned: WebSocket transport for real-time updates and streaming responses.

```javascript
const ws = new WebSocket('wss://mcp.example.com/mcp/ws')
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  // Handle streaming responses
}
```

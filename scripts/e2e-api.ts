import { createServer } from 'node:http'
import { routeContext } from '../src/core/router'
import { applyPolicy, defaultPolicy } from '../src/core/policy'
import { defaultServers } from '../src/core/registry'

// Stands in for the Cloudflare Worker during Playwright runs. It listens on
// 8787 because the Vite dev server proxies /api to 127.0.0.1:8787 (see
// vite.config.ts), so this must match the worker's port.
const PORT = 8787

export function route(body: Record<string, unknown>) {
  const result = routeContext(body as never, defaultServers)
  const policy = applyPolicy(
    result.tools,
    typeof body.risk === 'string' ? [body.risk as 'read' | 'write' | 'execute'] : undefined,
    defaultPolicy
  )
  return { ...result, policy }
}

const api = createServer((req, res) => {
  const url = req.url ?? '/'
  const send = (status: number, payload: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(payload))
  }

  if ((url === '/health' || url === '/api/health') && req.method === 'GET') {
    send(200, { status: 'ok', timestamp: new Date().toISOString() })
    return
  }

  if (url === '/api/servers' && req.method === 'GET') {
    send(200, defaultServers)
    return
  }

  if (url === '/api/route' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        send(200, route(JSON.parse(body)))
      } catch (error) {
        send(400, { error: error instanceof Error ? error.message : 'Invalid request' })
      }
    })
    return
  }

  send(404, { error: 'Not found' })
})

api.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`e2e api listening on http://127.0.0.1:${PORT}\n`)
})

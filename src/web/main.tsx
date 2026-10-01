import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const examples = [
  'Investigate production errors after the latest deployment',
  'Find the database query causing high latency',
  'Review the latest pull request and related tests'
]

interface RouteResult {
  intent: string
  candidates: Array<{
    serverId: string
    serverName: string
    score: number
    matchedTerms: string[]
    tools: Array<{ name: string; description: string; tags: string[]; risk: string }>
  }>
  selectedServerIds: string[]
  selectedTools: Array<{ name: string; description: string; tags: string[]; risk: string }>
  policy: {
    allowed: boolean
    reason: string
    filteredTools: Array<{ name: string; description: string; tags: string[]; risk: string }>
  }
}

function App() {
  const [intent, setIntent] = React.useState(examples[0] ?? '')
  const [result, setResult] = React.useState<RouteResult | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function route() {
    setLoading(true)
    try {
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intent })
      })
      setResult(await response.json())
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="shell">
      <header>
        <p className="eyebrow">MCP infrastructure</p>
        <h1>Context Router</h1>
        <p className="subtitle">Route an agent to only the context and tools it needs.</p>
      </header>

      <section className="card">
        <label htmlFor="intent">Intent</label>
        <textarea id="intent" value={intent} onChange={(event) => setIntent(event.target.value)} />
        <div className="examples">
          {examples.map((example) => (
            <button key={example} onClick={() => setIntent(example)}>
              {example}
            </button>
          ))}
        </div>
        <button
          className="primary"
          onClick={() => void route()}
          disabled={loading || !intent.trim()}
        >
          {loading ? 'Routing…' : 'Route context'}
        </button>
      </section>

      {result && (
        <section className="card result" data-testid="route-result">
          <h2>Selected context</h2>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </section>
      )}
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<App />)

import type {
  McpServerDefinition,
  McpTool,
  RouteRequest,
  RouteCandidate,
  McpCategory
} from './types'

const stopWords = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'to',
  'for',
  'of',
  'after',
  'with',
  'in',
  'on',
  'my',
  'our',
  'why',
  'what',
  'how',
  'when',
  'where',
  'which',
  'who',
  'is',
  'was',
  'are',
  'were',
  'been',
  'has',
  'have',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'can',
  'must',
  'shall',
  'this',
  'that',
  'these',
  'those',
  'here',
  'there',
  'then',
  'than',
  'more',
  'less',
  'most',
  'least',
  'very',
  'too',
  'also',
  'just',
  'only',
  'even',
  'still',
  'already',
  'yet',
  'since',
  'because',
  'while',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'among',
  'through',
  'across',
  'against',
  'without',
  'within',
  'along',
  'behind',
  'beyond',
  'around',
  'about',
  'into',
  'onto',
  'upon',
  'toward',
  'from',
  'with',
  'by',
  'at',
  'as',
  'if',
  'else',
  'than',
  'then',
  'when',
  'where',
  'why',
  'how',
  'what',
  'who',
  'which',
  'whose',
  'whom',
  'each',
  'every',
  'any',
  'some',
  'all',
  'both',
  'either',
  'neither',
  'none',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten'
])

export function terms(value: string): string[] {
  return [
    ...new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length > 2 && !stopWords.has(term))
    )
  ]
}

export interface ScoreBreakdown {
  termMatch: number
  capabilityMatch: number
  categoryRelevance: number
  priority: number
  toolMatch: number
  contextBonus: number
  total: number
}

const CATEGORY_WEIGHTS: Record<string, number> = {
  observability: 1.3,
  security: 1.2,
  cicd: 1.2,
  sentry: 1.2,
  kubernetes: 1.1,
  cloud: 1.1,
  architecture: 1.1,
  git: 1.0,
  codebase: 1.0,
  database: 1.0,
  github: 1.0,
  dependency: 1.0
}

const CATEGORY_RELATIONSHIPS: Record<McpCategory, McpCategory[]> = {
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

export function scoreServer(
  server: McpServerDefinition,
  intentTerms: string[],
  context?: RouteRequest['context']
): { score: number; matchedTerms: string[]; breakdown: ScoreBreakdown } {
  if (!server.enabled) {
    return {
      score: 0,
      matchedTerms: [],
      breakdown: {
        termMatch: 0,
        capabilityMatch: 0,
        categoryRelevance: 0,
        priority: 0,
        toolMatch: 0,
        contextBonus: 0,
        total: 0
      }
    }
  }

  const searchable = terms(
    [
      server.name,
      server.description,
      server.category,
      ...server.tools.flatMap((tool) => [
        tool.name,
        tool.description,
        ...tool.tags,
        tool.category || ''
      ])
    ].join(' ')
  )

  const matchedTerms = intentTerms.filter((term) => searchable.includes(term))

  const toolMatches = server.tools.reduce((count, tool) => {
    const toolTerms = terms(
      [tool.name, tool.description, ...tool.tags, tool.category || ''].join(' ')
    )
    return count + intentTerms.filter((term) => toolTerms.includes(term)).length
  }, 0)

  const capabilityMatches = server.capabilities.reduce((count, cap) => {
    const capTerms = terms(cap)
    return count + intentTerms.filter((term) => capTerms.includes(term)).length
  }, 0)

  const relatedCategories = CATEGORY_RELATIONSHIPS[server.category] || []
  let categoryRelevance = 0
  for (const term of intentTerms) {
    for (const related of relatedCategories) {
      if (related.includes(term) || term.includes(related)) {
        categoryRelevance += 5
      }
    }
  }

  let contextBonus = 0
  if (context) {
    if (
      context.repository &&
      server.description.toLowerCase().includes(context.repository.toLowerCase())
    ) {
      contextBonus += 10
    }
    if (
      context.environment &&
      server.description.toLowerCase().includes(context.environment.toLowerCase())
    ) {
      contextBonus += 5
    }
    if (context.service) {
      for (const tool of server.tools) {
        if (
          tool.name.toLowerCase().includes(context.service.toLowerCase()) ||
          tool.description.toLowerCase().includes(context.service.toLowerCase())
        ) {
          contextBonus += 15
        }
      }
    }
  }

  const termMatch = matchedTerms.length * 10
  const capabilityMatch = capabilityMatches * 8
  const toolMatch = toolMatches * 5
  const priority = server.priority
  const categoryWeight = CATEGORY_WEIGHTS[server.category] || 1.0

  const total = Math.round(
    (termMatch + capabilityMatch + toolMatch + categoryRelevance + priority + contextBonus) *
      categoryWeight
  )

  return {
    score: total,
    matchedTerms,
    breakdown: {
      termMatch,
      capabilityMatch,
      categoryRelevance,
      priority,
      toolMatch,
      contextBonus,
      total
    }
  }
}

export function scoreTool(
  tool: McpTool,
  intentTerms: string[],
  serverScore: number,
  context?: RouteRequest['context']
): number {
  const toolTerms = terms(
    [tool.name, tool.description, ...tool.tags, tool.category || ''].join(' ')
  )
  const matchedTerms = intentTerms.filter((term) => toolTerms.includes(term))

  let score = matchedTerms.length * 5

  if (tool.risk === 'write' || tool.risk === 'execute') {
    score *= 0.5
  }

  if (tool.category && intentTerms.includes(tool.category)) {
    score += 20
  }

  score += serverScore * 0.1

  if (context?.service) {
    if (
      tool.name.toLowerCase().includes(context.service.toLowerCase()) ||
      tool.description.toLowerCase().includes(context.service.toLowerCase())
    ) {
      score += 25
    }
  }

  return score
}

export function routeContext(
  request: RouteRequest,
  servers: McpServerDefinition[]
): {
  candidates: RouteCandidate[]
  selectedTools: Array<{
    serverId: string
    serverName: string
    tool: McpTool
    score: number
    reasoning: string
  }>
} {
  const intentTerms = terms(request.query || request.intent || '')
  const _maxServers = request.maxServers ?? 3
  const _maxTools = request.maxTools ?? 8

  const scoredServers = servers
    .filter((s) => s.enabled)
    .map((server) => {
      const result = scoreServer(server, intentTerms, request.context)
      return {
        server,
        ...result
      }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.server.name.localeCompare(b.server.name))

  const candidates: RouteCandidate[] = scoredServers.slice(0, request.maxServers ?? 3).map((s) => ({
    serverId: s.server.id,
    serverName: s.server.name,
    category: s.server.category,
    score: s.score,
    matchedTerms: s.matchedTerms,
    matchedCapabilities: s.server.capabilities.filter((cap) =>
      intentTerms.some((term) => cap.toLowerCase().includes(term))
    ),
    tools: s.server.tools,
    reasoning: [
      `Category: ${s.server.category} (${s.breakdown.categoryRelevance} pts)`,
      `Term matches: ${s.matchedTerms.join(', ') || 'none'}`,
      `Capability matches: ${s.breakdown.capabilityMatch / 8}`,
      `Tool matches: ${s.breakdown.toolMatch / 5}`,
      `Priority: ${s.server.priority}`,
      `Context bonus: ${s.breakdown.contextBonus}`
    ].filter((r) => !r.endsWith('0 pts') && !r.endsWith(': none') && !r.endsWith(': 0'))
  }))

  const toolScores: Array<{
    serverId: string
    serverName: string
    tool: McpTool
    score: number
    reasoning: string
  }> = []

  for (const candidate of candidates) {
    for (const tool of candidate.tools) {
      const toolScore = scoreTool(tool, intentTerms, candidate.score, request.context)
      if (toolScore > 0) {
        toolScores.push({
          serverId: candidate.serverId,
          serverName: candidate.serverName,
          tool,
          score: toolScore,
          reasoning: `Matched: ${terms([tool.name, tool.description, ...tool.tags].join(' '))
            .filter((t) => intentTerms.includes(t))
            .join(', ')}`
        })
      }
    }
  }

  const selectedTools = toolScores
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
    .slice(0, request.maxTools ?? 8)

  return { candidates, selectedTools }
}

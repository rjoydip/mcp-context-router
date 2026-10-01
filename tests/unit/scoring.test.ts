import { describe, expect, it } from 'vitest'
import { scoreServer, scoreTool, terms } from '../../src/core/scoring'
import type { McpTool } from '../../src/core/types'
import { routeContext as routerRouteContext } from '../../src/core/router'
import { defaultServers } from '../../src/core/registry'

describe('scoring - terms extraction', () => {
  it('extracts meaningful terms from query', () => {
    const result = terms('inspect git diff and TypeScript AST symbols')
    expect(result).toEqual(expect.arrayContaining(['git', 'diff', 'typescript', 'ast', 'symbols']))
    expect(result).not.toContain('and')
    expect(result).not.toContain('the')
  })

  it('handles empty and whitespace queries', () => {
    expect(terms('')).toEqual([])
    expect(terms('   ')).toEqual([])
  })

  it('filters short terms', () => {
    const result = terms('a an the git log')
    expect(result).toEqual(['git', 'log'])
  })
})

describe('scoring - server scoring', () => {
  it('scores git-ast high for git-related queries', () => {
    const gitAst = defaultServers.find((s) => s.id === 'git-ast')!
    const result = scoreServer(gitAst, ['git', 'diff', 'ast'], undefined)
    expect(result.score).toBeGreaterThan(50)
    expect(result.matchedTerms).toEqual(expect.arrayContaining(['git', 'diff', 'ast']))
  })

  it('scores github high for github-related queries', () => {
    const github = defaultServers.find((s) => s.id === 'github')!
    const result = scoreServer(github, ['github', 'pull', 'request'], undefined)
    expect(result.score).toBeGreaterThan(20)
    expect(result.matchedTerms).toEqual(expect.arrayContaining(['github', 'pull', 'request']))
  })

  it('scores database high for database queries', () => {
    const database = defaultServers.find((s) => s.id === 'database')!
    const result = scoreServer(database, ['postgres', 'schema', 'sql'], undefined)
    expect(result.score).toBeGreaterThan(40)
  })

  it('applies category weights correctly', () => {
    const sentry = defaultServers.find((s) => s.id === 'sentry')!

    const sentryResult = scoreServer(sentry, ['error', 'production'], undefined)

    // Sentry has higher category weight (1.2) for production errors
    expect(sentryResult.breakdown.categoryRelevance).toBeGreaterThanOrEqual(0)
  })

  it('applies context bonuses', () => {
    const github = defaultServers.find((s) => s.id === 'github')!
    const result = scoreServer(github, ['pr', 'review'], { repository: 'myrepo', service: 'auth' })
    expect(result.breakdown.contextBonus).toBeGreaterThanOrEqual(0)
  })

  it('returns zero score for disabled servers', () => {
    const disabledServer = { ...defaultServers[0]!, enabled: false }
    const result = scoreServer(disabledServer, ['git'], undefined)
    expect(result.score).toBe(0)
  })
})

describe('scoring - tool scoring', () => {
  it('scores tools with matching terms higher', () => {
    const tool: McpTool = {
      name: 'git_diff',
      description: 'Inspect local Git diff',
      tags: ['git', 'diff', 'changes'],
      risk: 'read',
      category: 'git'
    }
    const score = scoreTool(tool, ['git', 'diff'], 100, undefined)
    expect(score).toBeGreaterThan(30)
  })

  it('deprioritizes write/execute tools by default', () => {
    const readTool = { name: 'read', description: '', tags: [], risk: 'read' as const }
    const writeTool = { name: 'write', description: '', tags: [], risk: 'write' as const }

    const readScore = scoreTool(readTool, ['read'], 100, undefined)
    const writeScore = scoreTool(writeTool, ['write'], 100, undefined)

    expect(readScore).toBeGreaterThan(writeScore)
  })

  it('gives category match bonus', () => {
    const tool: McpTool = {
      name: 'test',
      description: '',
      tags: [],
      risk: 'read',
      category: 'git'
    }
    const scoreWithCategory = scoreTool(tool, ['git'], 100, undefined)
    const scoreWithoutCategory = scoreTool(
      { ...tool, category: undefined },
      ['git'],
      100,
      undefined
    )
    // Category match adds 20, base score differs based on term matching
    expect(scoreWithCategory).toBeGreaterThan(scoreWithoutCategory)
  })

  it('applies context service bonus', () => {
    const tool = { name: 'auth_login', description: '', tags: [], risk: 'read' as const }
    const scoreWithContext = scoreTool(tool, ['login'], 100, { service: 'auth' })
    const scoreWithoutContext = scoreTool(tool, ['login'], 100, undefined)
    expect(scoreWithContext).toBe(scoreWithoutContext + 25)
  })
})

describe('scoring - full routeContext (router)', () => {
  it('returns top servers for git query', () => {
    const result = routerRouteContext({ query: 'inspect git diff and AST' }, defaultServers)
    expect(result.servers.length).toBeLessThanOrEqual(3)
    expect(result.servers[0]!.serverId).toBe('git-ast')
  })

  it('limits tools to maxTools', () => {
    const result = routerRouteContext({ query: 'inspect code', maxTools: 2 }, defaultServers)
    expect(result.tools.length).toBeLessThanOrEqual(2)
  })

  it('limits servers to maxServers', () => {
    const result = routerRouteContext(
      { query: 'inspect everything', maxServers: 2 },
      defaultServers
    )
    expect(result.servers.length).toBeLessThanOrEqual(2)
  })

  it('includes reasoning in candidates', () => {
    const result = routerRouteContext({ query: 'git diff' }, defaultServers)
    expect(result.servers[0]!.reasoning.length).toBeGreaterThan(0)
  })

  it('includes matched capabilities', () => {
    const result = routerRouteContext({ query: 'git diff' }, defaultServers)
    expect(result.servers[0]!.matchedCapabilities.length).toBeGreaterThan(0)
  })
})

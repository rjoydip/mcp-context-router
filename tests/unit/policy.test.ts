import { describe, expect, it } from 'vitest'
import { applyPolicy, defaultPolicy, estimateTokens } from '../../src/core/policy'
import type { PolicyConfig, SelectedTool } from '../../src/core/types'

describe('policy - applyPolicy', () => {
  const mockTools: SelectedTool[] = [
    {
      serverId: 'a',
      serverName: 'A',
      tool: { name: 'read_file', description: '', tags: [], risk: 'read', category: 'codebase' },
      score: 10,
      reasoning: ''
    },
    {
      serverId: 'a',
      serverName: 'A',
      tool: { name: 'write_file', description: '', tags: [], risk: 'write', category: 'codebase' },
      score: 10,
      reasoning: ''
    },
    {
      serverId: 'b',
      serverName: 'B',
      tool: {
        name: 'execute_cmd',
        description: '',
        tags: [],
        risk: 'execute',
        category: 'security'
      },
      score: 10,
      reasoning: ''
    }
  ]

  it('allows all tools when all risks allowed', () => {
    const config: PolicyConfig = { ...defaultPolicy, allowRisks: ['read', 'write', 'execute'] }
    const result = applyPolicy(mockTools, ['read', 'write', 'execute'], config)
    expect(result.allowed).toBe(true)
    expect(result.filteredTools.length).toBe(3)
  })

  it('filters to read-only by default', () => {
    const result = applyPolicy(mockTools, undefined)
    expect(result.allowed).toBe(true)
    expect(result.filteredTools.length).toBe(1)
    expect(result.filteredTools[0]!.tool.risk).toBe('read')
  })

  it('allows only requested risks', () => {
    const config: PolicyConfig = { ...defaultPolicy, allowRisks: ['read', 'write'] }
    const result = applyPolicy(mockTools, ['read', 'write'], config)
    expect(result.filteredTools.length).toBe(2)
    expect(result.filteredTools.every((t) => t.tool.risk !== 'execute')).toBe(true)
  })

  it('respects denied tool names', () => {
    const config = { ...defaultPolicy, deniedToolNames: ['write_file'] }
    const result = applyPolicy(mockTools, ['read', 'write'], config)
    expect(result.filteredTools.length).toBe(1)
    expect(result.filteredTools[0]!.tool.name).toBe('read_file')
  })

  it('returns not allowed when no tools pass filter', () => {
    const result = applyPolicy(mockTools, ['execute'], {
      ...defaultPolicy,
      allowRisks: ['execute'],
      deniedToolNames: ['execute_cmd']
    })
    expect(result.allowed).toBe(false)
    expect(result.filteredTools.length).toBe(0)
  })

  it('sets risk level to first filtered tool risk', () => {
    const result = applyPolicy(mockTools, ['read', 'write'])
    expect(result.riskLevel).toBe('read')
  })

  it('handles empty tool list', () => {
    const result = applyPolicy([], ['read'])
    expect(result.allowed).toBe(false)
    expect(result.filteredTools.length).toBe(0)
  })
})

describe('policy - estimateTokens', () => {
  const mockTools: SelectedTool[] = [
    {
      serverId: 'a',
      serverName: 'A',
      tool: {
        name: 'tool1',
        description: 'A short description',
        tags: [],
        risk: 'read',
        category: 'codebase'
      },
      score: 10,
      reasoning: ''
    },
    {
      serverId: 'a',
      serverName: 'A',
      tool: {
        name: 'tool2',
        description:
          'A much longer description that should increase the token estimate significantly because it has more characters',
        tags: [],
        risk: 'read',
        category: 'codebase'
      },
      score: 10,
      reasoning: ''
    }
  ]

  it('estimates tokens based on description length', () => {
    const tokens = estimateTokens([
      {
        serverId: 'a',
        serverName: 'A',
        tool: { name: 't', description: 'short', tags: [], risk: 'read' as const },
        score: 1,
        reasoning: ''
      }
    ])
    // ~100 base + description.length/4
    expect(tokens).toBeGreaterThan(100)
  })

  it('returns 0 for empty list', () => {
    expect(estimateTokens([])).toBe(0)
  })

  it('scales with number of tools', () => {
    const tokens1 = estimateTokens(mockTools.slice(0, 1))
    const tokens2 = estimateTokens(mockTools)
    expect(tokens2).toBeGreaterThan(tokens1)
  })
})

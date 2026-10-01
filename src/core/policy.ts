import type { PolicyConfig, PolicyDecision, ToolRisk, SelectedTool } from './types'

export const defaultPolicy: PolicyConfig = {
  allowRisks: ['read'],
  deniedToolNames: [],
  maxTokens: 8000
}

export function applyPolicy(
  tools: SelectedTool[],
  requestedRisks: ToolRisk[] | undefined,
  config: PolicyConfig = defaultPolicy
): PolicyDecision {
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

export function estimateTokens(tools: SelectedTool[]): number {
  // Rough estimation: ~100 tokens per tool description + overhead
  return tools.reduce((sum, t) => sum + t.tool.description.length / 4 + 100, 0)
}

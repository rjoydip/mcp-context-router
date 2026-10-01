import type { McpTool } from '../core/types'

export interface CICDConfig {
  provider: 'github' | 'gitlab' | 'circleci' | 'jenkins'
  token: string
  owner?: string
  repo?: string
  url?: string
}

export interface CICDRun {
  id: string
  name: string
  status: string
  conclusion: string
  branch: string
  created_at: string
  updated_at: string
  html_url: string
}

export interface CICDArtifact {
  id: string
  name: string
  size: number
  download_url: string
}

export interface CICDDeployment {
  id: string
  environment: string
  status: string
  created_at: string
  updated_at: string
  html_url: string
}

// GitHub returns numeric ids; the service contract exposes string ids.
type RawWithId<T> = Omit<T, 'id'> & { id: number | string }

function withStringId<T extends { id: number | string }>(item: T): Omit<T, 'id'> & { id: string } {
  return { ...item, id: String(item.id) }
}

interface RawCICDRun extends Omit<CICDRun, 'id'> {
  id: number | string
  jobs?: Array<{
    id: number | string
    name: string
    status: string
    conclusion: string
    steps?: Array<{
      name: string
      status: string
      conclusion: string
      started_at: string
      completed_at: string
    }>
  }>
}

interface CICDDeploymentStatus {
  id: string
  state: string
  description: string
  environment: string
  created_at: string
  updated_at: string
}

export class CICDService {
  private readonly config: CICDConfig

  constructor(config: CICDConfig) {
    this.config = config
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.config.provider === 'github') {
      headers.Authorization = `Bearer ${this.config.token}`
      headers.Accept = 'application/vnd.github+json'
      headers['X-GitHub-Api-Version'] = '2022-11-28'
    }

    if (options.headers) {
      Object.assign(headers, options.headers)
    }

    const baseUrl = this.getBaseUrl()
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers
    })

    if (!response.ok) {
      throw new Error(`CI/CD API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  private getBaseUrl(): string {
    switch (this.config.provider) {
      case 'github':
        return `https://api.github.com/repos/${this.config.owner}/${this.config.repo}`
      case 'gitlab':
        return `${this.config.url || 'https://gitlab.com'}/api/v4/projects/${encodeURIComponent(this.config.repo || '')}`
      case 'circleci':
        return `https://circleci.com/api/v2/project/gh/${this.config.owner}/${this.config.repo}`
      case 'jenkins':
        return `${this.config.url}/api/json`
      default:
        throw new Error(`Unsupported CI/CD provider: ${this.config.provider as string}`)
    }
  }

  async getRuns(branch?: string, status?: string): Promise<CICDRun[]> {
    if (this.config.provider === 'github') {
      const params = new URLSearchParams()
      if (branch) params.set('branch', branch)
      if (status) params.set('status', status)
      // GitHub wraps workflow runs in a { workflow_runs: [...] } envelope.
      const data = await this.request<{ workflow_runs: Array<RawWithId<CICDRun>> }>(
        `/actions/runs?${params}`
      )
      return (data.workflow_runs ?? []).map(withStringId)
    }
    return []
  }

  async getRun(runId: string): Promise<
    CICDRun & {
      jobs: Array<{
        id: string
        name: string
        status: string
        conclusion: string
        steps: Array<{
          name: string
          status: string
          conclusion: string
          started_at: string
          completed_at: string
        }>
      }>
    }
  > {
    if (this.config.provider === 'github') {
      const run = await this.request<RawCICDRun>(`/actions/runs/${runId}`)
      return {
        ...run,
        id: String(run.id ?? runId),
        jobs: (run.jobs ?? []).map((job) => ({
          ...job,
          id: String(job.id ?? ''),
          steps: job.steps ?? []
        }))
      }
    }
    throw new Error('Not implemented for this provider')
  }

  async getLogs(runId: string): Promise<string> {
    if (this.config.provider === 'github') {
      const response = await fetch(
        `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/actions/runs/${runId}/logs`,
        {
          headers: {
            Authorization: `Bearer ${this.config.token}`,
            Accept: 'application/vnd.github+json'
          }
        }
      )
      return response.text()
    }
    throw new Error('Not implemented for this provider')
  }

  async getFailedSteps(runId: string): Promise<
    Array<{
      job: string
      step: string
      error: string
    }>
  > {
    const run = await this.getRun(runId)
    const failed: Array<{ job: string; step: string; error: string }> = []

    for (const job of run.jobs || []) {
      if (job.conclusion === 'failure') {
        for (const step of job.steps || []) {
          if (step.conclusion === 'failure') {
            failed.push({
              job: job.name,
              step: step.name,
              error: `Step "${step.name}" in job "${job.name}" failed`
            })
          }
        }
      }
    }

    return failed
  }

  async getArtifacts(runId: string): Promise<CICDArtifact[]> {
    if (this.config.provider === 'github') {
      // GitHub wraps artifacts in an { artifacts: [...] } envelope.
      const data = await this.request<{ artifacts: Array<RawWithId<CICDArtifact>> }>(
        `/actions/runs/${runId}/artifacts`
      )
      return (data.artifacts ?? []).map(withStringId)
    }
    return []
  }

  async getDeployments(environment?: string): Promise<CICDDeployment[]> {
    if (this.config.provider === 'github') {
      const params = new URLSearchParams()
      if (environment) params.set('environment', environment)
      // GitHub wraps deployments in a { deployments: [...] } envelope.
      const data = await this.request<{ deployments: Array<RawWithId<CICDDeployment>> }>(
        `/deployments?${params}`
      )
      return (data.deployments ?? []).map(withStringId)
    }
    return []
  }

  async getDeploymentStatus(deploymentId: string): Promise<CICDDeploymentStatus> {
    if (this.config.provider === 'github') {
      // GitHub returns a list of statuses for a deployment; expose the latest one.
      type RawStatus = Omit<CICDDeploymentStatus, 'id'> & { id: number | string }
      const data = await this.request<RawStatus[] | RawStatus>(
        `/deployments/${deploymentId}/statuses`
      )
      const latest = (Array.isArray(data) ? data[0] : data) ?? {
        id: deploymentId,
        state: 'unknown'
      }
      return { ...latest, id: String(latest.id) } as CICDDeploymentStatus
    }
    throw new Error('Not implemented for this provider')
  }

  getTools(): McpTool[] {
    return [
      {
        name: 'ci_runs',
        description: 'List CI/CD runs',
        tags: ['cicd', 'runs', 'pipeline'],
        risk: 'read',
        category: 'cicd'
      },
      {
        name: 'ci_run',
        description: 'Get CI/CD run details',
        tags: ['cicd', 'run', 'details'],
        risk: 'read',
        category: 'cicd'
      },
      {
        name: 'ci_logs',
        description: 'Get CI/CD logs',
        tags: ['cicd', 'logs', 'debug'],
        risk: 'read',
        category: 'cicd'
      },
      {
        name: 'ci_failed_steps',
        description: 'Get failed CI/CD steps',
        tags: ['cicd', 'failed', 'failure'],
        risk: 'read',
        category: 'cicd'
      },
      {
        name: 'ci_artifacts',
        description: 'List CI/CD artifacts',
        tags: ['cicd', 'artifacts', 'build'],
        risk: 'read',
        category: 'cicd'
      },
      {
        name: 'deployments',
        description: 'List deployments',
        tags: ['cicd', 'deployments', 'releases'],
        risk: 'read',
        category: 'cicd'
      },
      {
        name: 'deployment_status',
        description: 'Get deployment status',
        tags: ['cicd', 'status', 'health'],
        risk: 'read',
        category: 'cicd'
      }
    ]
  }
}

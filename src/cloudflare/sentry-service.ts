import type { McpTool } from '../core/types'

export interface SentryConfig {
  token: string
  org: string
  project?: string
  baseUrl?: string
}

export class SentryService {
  private readonly config: SentryConfig
  private readonly baseUrl: string

  constructor(config: SentryConfig) {
    this.config = config
    this.baseUrl = config.baseUrl || 'https://sentry.io/api/0'
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.token}`,
      'Content-Type': 'application/json'
    }
    if (options.headers) {
      Object.assign(headers, options.headers)
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers
    })

    if (!response.ok) {
      throw new Error(`Sentry API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getIssues(
    query?: string,
    statsPeriod?: string
  ): Promise<
    Array<{
      id: string
      title: string
      shortId: string
      status: string
      level: string
      count: string
      userCount: string
      firstSeen: string
      lastSeen: string
      project: { id: string; name: string; slug: string }
      type: string
    }>
  > {
    const params = new URLSearchParams()
    if (query) params.set('query', query)
    if (statsPeriod) params.set('statsPeriod', statsPeriod)
    params.set('limit', '30')

    return this.request(`/organizations/${this.config.org}/issues/?${params}`)
  }

  async getIssue(issueId: string): Promise<{
    id: string
    title: string
    shortId: string
    status: string
    level: string
    count: string
    userCount: string
    firstSeen: string
    lastSeen: string
    project: { id: string; name: string; slug: string }
    type: string
    metadata: Record<string, unknown>
    annotations: Array<{ title: string; value: string }>
    latestEvent: {
      id: string
      timestamp: string
      platform: string
      message: string
      culprit: string
      tags: Record<string, string>
    }
  }> {
    return this.request(`/issues/${issueId}/`)
  }

  async getEvents(issueId: string): Promise<
    Array<{
      id: string
      timestamp: string
      platform: string
      message: string
      culprit: string
      tags: Record<string, string>
      user?: { id: string; username: string; email: string }
    }>
  > {
    return this.request(`/issues/${issueId}/events/`)
  }

  async getReleases(): Promise<
    Array<{
      version: string
      shortVersion: string
      dateCreated: string
      dateReleased: string
      commitCount: number
      data: Record<string, unknown>
    }>
  > {
    return this.request(`/organizations/${this.config.org}/releases/`)
  }

  async getRelease(version: string): Promise<{
    version: string
    shortVersion: string
    dateCreated: string
    dateReleased: string
    commitCount: number
    data: Record<string, unknown>
    projects: Array<{ id: string; name: string; slug: string }>
    commits: Array<{ id: string; message: string; author: string; timestamp: string }>
    deploys: Array<{ environment: string; name: string; timestamp: string }>
  }> {
    return this.request(`/organizations/${this.config.org}/releases/${version}/`)
  }

  async getErrors(
    projectId: string,
    query?: string
  ): Promise<
    Array<{
      id: string
      title: string
      count: number
      firstSeen: string
      lastSeen: string
      culprit: string
    }>
  > {
    const params = new URLSearchParams()
    if (query) params.set('query', query)
    return this.request(`/projects/${this.config.org}/${projectId}/issues/?${params}`)
  }

  async getTraces(issueId: string): Promise<
    {
      id: string
      traceId: string
      spanId: string
      timestamp: string
      duration: number
      service: string
      operation: string
      tags: Record<string, string>
      data: Record<string, unknown>
    }[]
  > {
    return this.request(`/issues/${issueId}/traces/`)
  }

  getTools(): McpTool[] {
    return [
      {
        name: 'sentry_issues',
        description: 'List Sentry issues',
        tags: ['sentry', 'issues', 'errors'],
        risk: 'read',
        category: 'sentry'
      },
      {
        name: 'sentry_issue',
        description: 'Get Sentry issue details',
        tags: ['sentry', 'issue', 'details'],
        risk: 'read',
        category: 'sentry'
      },
      {
        name: 'sentry_events',
        description: 'Get Sentry error events',
        tags: ['sentry', 'events', 'errors'],
        risk: 'read',
        category: 'sentry'
      },
      {
        name: 'sentry_release',
        description: 'Get Sentry release info',
        tags: ['sentry', 'release', 'version'],
        risk: 'read',
        category: 'sentry'
      },
      {
        name: 'sentry_errors',
        description: 'Search Sentry errors',
        tags: ['sentry', 'errors', 'search'],
        risk: 'read',
        category: 'sentry'
      },
      {
        name: 'sentry_traces',
        description: 'Get Sentry traces',
        tags: ['sentry', 'traces', 'performance'],
        risk: 'read',
        category: 'sentry'
      }
    ]
  }
}

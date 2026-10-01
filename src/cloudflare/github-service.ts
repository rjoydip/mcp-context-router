import type { McpTool } from '../core/types'

export interface GitHubConfig {
  token: string
  owner: string
  repo: string
}

export class GitHubService {
  private readonly baseUrl = 'https://api.github.com'
  private readonly config: GitHubConfig

  constructor(config: GitHubConfig) {
    this.config = config
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
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
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getPullRequests(
    state: 'open' | 'closed' | 'all' = 'open',
    options: { headers?: Record<string, string> } = {}
  ) {
    return this.request<
      Array<{
        number: number
        title: string
        state: string
        user: { login: string }
        created_at: string
        updated_at: string
        html_url: string
        draft: boolean
        mergeable: boolean | null
      }>
    >(
      `/repos/${this.config.owner}/${this.config.repo}/pulls?state=${state}&sort=updated&per_page=30`,
      { headers: options.headers }
    )
  }

  async getPullRequest(number: number) {
    return this.request<{
      number: number
      title: string
      body: string | null
      state: string
      user: { login: string }
      head: { ref: string; sha: string }
      base: { ref: string; sha: string }
      mergeable: boolean | null
      html_url: string
    }>(`/repos/${this.config.owner}/${this.config.repo}/pulls/${number}`)
  }

  async getPullRequestFiles(number: number) {
    return this.request<
      Array<{
        filename: string
        status: string
        additions: number
        deletions: number
        changes: number
        patch?: string
      }>
    >(`/repos/${this.config.owner}/${this.config.repo}/pulls/${number}/files`)
  }

  async getIssues(state: 'open' | 'closed' | 'all' = 'open') {
    return this.request<
      Array<{
        number: number
        title: string
        state: string
        user: { login: string }
        labels: Array<{ name: string }>
        created_at: string
        updated_at: string
        html_url: string
      }>
    >(
      `/repos/${this.config.owner}/${this.config.repo}/issues?state=${state}&sort=updated&per_page=30`
    )
  }

  async getCommits(sha: string, perPage = 30) {
    return this.request<
      Array<{
        sha: string
        commit: {
          message: string
          author: { name: string; date: string }
          committer: { name: string; date: string }
        }
        html_url: string
      }>
    >(`/repos/${this.config.owner}/${this.config.repo}/commits?sha=${sha}&per_page=${perPage}`)
  }

  async getRepository() {
    return this.request<{
      name: string
      full_name: string
      description: string | null
      default_branch: string
      stargazers_count: number
      forks_count: number
      open_issues_count: number
    }>(`/repos/${this.config.owner}/${this.config.repo}`)
  }

  getTools(): McpTool[] {
    return [
      {
        name: 'github_pull_requests',
        description: 'List and inspect pull requests from GitHub',
        tags: ['github', 'pr', 'review', 'ci'],
        risk: 'read'
      },
      {
        name: 'github_issues',
        description: 'List and inspect GitHub issues',
        tags: ['github', 'issues', 'bugs'],
        risk: 'read'
      },
      {
        name: 'github_commits',
        description: 'Inspect commit history from GitHub',
        tags: ['github', 'commits', 'history'],
        risk: 'read'
      },
      {
        name: 'github_repository',
        description: 'Get repository metadata from GitHub',
        tags: ['github', 'repo', 'metadata'],
        risk: 'read'
      }
    ]
  }
}

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GitHubService } from '../../src/cloudflare/github-service'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('GitHubService', () => {
  let service: GitHubService

  beforeEach(() => {
    service = new GitHubService({ token: 'test-token', owner: 'test-org', repo: 'test-repo' })
    mockFetch.mockReset()
  })

  it('builds correct request headers', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] })
    await service.getPullRequests()

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/test-org/test-repo/pulls?state=open&sort=updated&per_page=30',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        })
      })
    )
  })

  it('handles API errors', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' })

    await expect(service.getPullRequests()).rejects.toThrow('GitHub API error: 401 Unauthorized')
  })

  it('getPullRequests with different states', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] })

    await service.getPullRequests('closed')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('state=closed'),
      expect.any(Object)
    )

    await service.getPullRequests('all')
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('state=all'), expect.any(Object))
  })

  it('gets single pull request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ number: 1, title: 'Test PR' })
    })

    const pr = await service.getPullRequest(1)
    expect(pr.number).toBe(1)
    expect(pr.title).toBe('Test PR')
  })

  it('gets pull request files', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ filename: 'test.ts', status: 'modified' }]
    })

    const files = await service.getPullRequestFiles(1)
    expect(files).toHaveLength(1)
    expect(files[0]!.filename).toBe('test.ts')
  })

  it('gets issues', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ number: 1, title: 'Test Issue' }]
    })

    const issues = await service.getIssues()
    expect(issues).toHaveLength(1)
  })

  it('gets commits', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ sha: 'abc123', commit: { message: 'Test' } }]
    })

    const commits = await service.getCommits('main', 10)
    expect(commits).toHaveLength(1)
  })

  it('gets repository info', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'test-repo', full_name: 'test-org/test-repo' })
    })

    const repo = await service.getRepository()
    expect(repo.name).toBe('test-repo')
  })

  it('exposes correct tools', () => {
    const tools = service.getTools()
    expect(tools).toHaveLength(4)
    expect(tools.map((t) => t.name)).toEqual([
      'github_pull_requests',
      'github_issues',
      'github_commits',
      'github_repository'
    ])
  })

  it('handles custom headers in requests', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] })
    await service.getPullRequests('open', { headers: { 'Custom-Header': 'value' } })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Custom-Header': 'value'
        })
      })
    )
  })
})

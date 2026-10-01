import { describe, expect, it, vi, beforeEach } from 'vitest'
import { SentryService } from '../../src/cloudflare/sentry-service'
import { KubernetesService } from '../../src/cloudflare/kubernetes-service'
import { CloudflareService } from '../../src/cloudflare/cloud-service'
import { ObservabilityService } from '../../src/cloudflare/observability-service'
import { SecurityService } from '../../src/cloudflare/security-service'
import { CICDService } from '../../src/cloudflare/cicd-service'
import { DependencyService } from '../../src/cloudflare/dependency-service'
import { ArchitectureService } from '../../src/cloudflare/architecture-service'

describe('SentryService', () => {
  let service: SentryService
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch as unknown as typeof fetch
    service = new SentryService({ token: 'test-token', org: 'test-org' })
  })

  it('gets issues', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', title: 'Test Error', status: 'unresolved' }]
    })
    const issues = await service.getIssues()
    expect(issues).toHaveLength(1)
  })

  it('gets issue details', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1', title: 'Test Error', culprit: 'test.py' })
    })
    const issue = await service.getIssue('1')
    expect(issue.id).toBe('1')
  })

  it('gets events', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', message: 'Error message' }]
    })
    const events = await service.getEvents('1')
    expect(events).toHaveLength(1)
  })

  it('gets releases', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ version: '1.0.0', dateCreated: '2024-01-01' }]
    })
    const releases = await service.getReleases()
    expect(releases).toHaveLength(1)
  })

  it('gets release details', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '1.0.0', commits: [] })
    })
    const release = await service.getRelease('1.0.0')
    expect(release.version).toBe('1.0.0')
  })

  it('gets errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', title: 'Error', count: 10 }]
    })
    const errors = await service.getErrors('project-1')
    expect(errors).toHaveLength(1)
  })

  it('gets traces', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', traceId: 'abc', duration: 100 }]
    })
    const traces = await service.getTraces('1')
    expect(traces).toHaveLength(1)
  })

  it('exposes tools', () => {
    const tools = service.getTools()
    expect(tools).toHaveLength(6)
    expect(tools.map((t) => t.name)).toEqual([
      'sentry_issues',
      'sentry_issue',
      'sentry_events',
      'sentry_release',
      'sentry_errors',
      'sentry_traces'
    ])
  })
})

describe('KubernetesService', () => {
  let service: KubernetesService

  beforeEach(() => {
    service = new KubernetesService({ provider: 'local', kubeconfig: '/path/to/config' })
  })

  it('gets clusters', async () => {
    const clusters = await service.getClusters()
    expect(clusters).toEqual([])
  })

  it('gets namespaces', async () => {
    const namespaces = await service.getNamespaces('cluster-1')
    expect(namespaces).toEqual([])
  })

  it('gets pods', async () => {
    const pods = await service.getPods('cluster-1', 'default')
    expect(pods).toEqual([])
  })

  it('gets deployments', async () => {
    const deployments = await service.getDeployments('cluster-1', 'default')
    expect(deployments).toEqual([])
  })

  it('gets services', async () => {
    const services = await service.getServices('cluster-1', 'default')
    expect(services).toEqual([])
  })

  it('gets events', async () => {
    const events = await service.getEvents('cluster-1', 'default')
    expect(events).toEqual([])
  })

  it('gets logs', async () => {
    const logs = await service.getLogs('cluster-1', 'default', 'pod-1')
    expect(logs).toContain('Logs for pod pod-1')
  })

  it('gets rollout status', async () => {
    const status = await service.getRolloutStatus('cluster-1', 'default', 'deployment-1')
    expect(status.name).toBe('deployment-1')
    expect(status.replicas).toBe(0)
  })

  it('exposes tools', () => {
    const tools = service.getTools()
    expect(tools).toHaveLength(8)
    expect(tools.map((t) => t.name)).toEqual([
      'k8s_clusters',
      'k8s_namespaces',
      'k8s_pods',
      'k8s_deployments',
      'k8s_services',
      'k8s_events',
      'k8s_logs',
      'k8s_rollout'
    ])
  })
})

describe('CloudflareService', () => {
  let service: CloudflareService
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch as unknown as typeof fetch
    service = new CloudflareService({ accountId: 'test-account', apiToken: 'test-token' })
  })

  it('gets workers', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, result: [{ id: '1', name: 'worker1' }] })
    })
    const workers = await service.getWorkers()
    expect(workers).toHaveLength(1)
  })

  it('gets D1 databases', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, result: [{ uuid: '1', name: 'db1' }] })
    })
    const dbs = await service.getD1Databases()
    expect(dbs).toHaveLength(1)
  })

  it('gets R2 buckets', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, result: [{ name: 'bucket1' }] })
    })
    const buckets = await service.getR2Buckets()
    expect(buckets).toHaveLength(1)
  })

  it('gets KV namespaces', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, result: [{ id: '1', title: 'kv1' }] })
    })
    const kvs = await service.getKVNamespaces()
    expect(kvs).toHaveLength(1)
  })

  it('gets Vectorize indexes', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, result: [{ name: 'idx1', dimensions: 768 }] })
    })
    const indexes = await service.getVectorizeIndexes()
    expect(indexes).toHaveLength(1)
  })

  it('gets queues', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, result: [{ name: 'queue1' }] })
    })
    const queues = await service.getQueues()
    expect(queues).toHaveLength(1)
  })

  it('gets Durable Objects', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, result: [{ name: 'do1', className: 'DO' }] })
    })
    const dos = await service.getDurableObjects()
    expect(dos).toHaveLength(1)
  })

  it('gets AI runs', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, result: [{ id: '1', model: 'llama' }] })
    })
    const runs = await service.getAIRuns()
    expect(runs).toHaveLength(1)
  })

  it('gets routes', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, result: [{ id: '1', pattern: 'example.com/*' }] })
    })
    const routes = await service.getRoutes()
    expect(routes).toHaveLength(1)
  })

  it('gets deployments', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, result: [{ id: '1', projectName: 'proj1' }] })
    })
    const deploys = await service.getDeployments()
    expect(deploys).toHaveLength(1)
  })

  it('handles API errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    })
    await expect(service.getWorkers()).rejects.toThrow('Cloudflare API error: 401 Unauthorized')
  })

  it('exposes tools', () => {
    const tools = service.getTools()
    expect(tools).toHaveLength(10)
  })
})

describe('ObservabilityService', () => {
  let service: ObservabilityService

  beforeEach(() => {
    service = new ObservabilityService({
      sentry: { token: 'token', org: 'org' },
      cloudflare: { accountId: 'account', apiToken: 'token' }
    })
  })

  it('searches incidents', async () => {
    const results = await service.searchIncidents('error')
    expect(results).toEqual([])
  })

  it('gets incident timeline', async () => {
    const timeline = await service.getIncidentTimeline('incident-1')
    expect(timeline).toEqual([])
  })

  it('gets service health', async () => {
    const health = await service.getServiceHealth()
    expect(health).toEqual([])
  })

  it('gets error rate', async () => {
    const rate = await service.getErrorRate('service-1', '1h')
    expect(rate.errorRate).toBe(0)
  })

  it('gets latency', async () => {
    const latency = await service.getLatency('service-1', '1h')
    expect(latency.p50).toBe(0)
  })

  it('gets deployment correlation', async () => {
    const correlation = await service.getDeploymentCorrelation('prod', '24h')
    expect(correlation).toEqual([])
  })

  it('gets release health', async () => {
    const health = await service.getReleaseHealth('1.0.0')
    expect(health.status).toBe('')
  })

  it('exposes tools', () => {
    const tools = service.getTools()
    expect(tools).toHaveLength(7)
  })
})

describe('SecurityService', () => {
  let service: SecurityService

  beforeEach(() => {
    service = new SecurityService({})
  })

  it('runs security scan', async () => {
    const result = await service.runScan('dependencies')
    expect(result.target).toBe('dependencies')
    expect(result.summary.critical).toBe(0)
  })

  it('gets dependency vulnerabilities', async () => {
    const vulns = await service.getDependencyVulnerabilities()
    expect(vulns).toEqual([])
  })

  it('detects secrets', async () => {
    const secrets = await service.detectSecrets(['file1.ts'])
    expect(secrets).toEqual([])
  })

  it('gets SAST findings', async () => {
    const findings = await service.getSASTFindings()
    expect(findings).toEqual([])
  })

  it('generates SBOM', async () => {
    const sbom = await service.generateSBOM('spdx')
    expect(typeof sbom).toBe('string')
  })

  it('gets container findings', async () => {
    const findings = await service.getContainerFindings('image:latest')
    expect(findings).toEqual([])
  })

  it('gets configuration findings', async () => {
    const findings = await service.getConfigurationFindings()
    expect(findings).toEqual([])
  })

  it('gets reachable vulnerabilities', async () => {
    const vulns = await service.getReachableVulnerabilities()
    expect(vulns).toEqual([])
  })

  it('exposes tools', () => {
    const tools = service.getTools()
    expect(tools).toHaveLength(8)
  })
})

describe('CICDService', () => {
  let service: CICDService
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch as unknown as typeof fetch
    service = new CICDService({ provider: 'github', token: 'token', owner: 'org', repo: 'repo' })
  })

  it('gets runs', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ workflow_runs: [{ id: 1, name: 'CI', status: 'completed' }] })
    })
    const runs = await service.getRuns()
    expect(runs).toHaveLength(1)
  })

  it('gets run details', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, name: 'CI', jobs: [] })
    })
    const run = await service.getRun('1')
    expect(run.id).toBe('1')
  })

  it('gets logs', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'build logs'
    })
    const logs = await service.getLogs('1')
    expect(logs).toBe('build logs')
  })

  it('gets failed steps', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [
          { name: 'test', conclusion: 'failure', steps: [{ name: 'test', conclusion: 'failure' }] }
        ]
      })
    })
    const failed = await service.getFailedSteps('1')
    expect(failed.length).toBe(1)
  })

  it('gets artifacts', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ artifacts: [{ id: 1, name: 'artifact' }] })
    })
    const artifacts = await service.getArtifacts('1')
    expect(artifacts).toHaveLength(1)
  })

  it('gets deployments', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ deployments: [{ id: 1, environment: 'prod' }] })
    })
    const deploys = await service.getDeployments()
    expect(deploys).toHaveLength(1)
  })

  it('gets deployment status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, state: 'success', environment: 'prod' })
    })
    const status = await service.getDeploymentStatus('1')
    expect(status.state).toBe('success')
  })

  it('exposes tools', () => {
    const tools = service.getTools()
    expect(tools).toHaveLength(7)
  })
})

describe('DependencyService', () => {
  let service: DependencyService

  beforeEach(() => {
    service = new DependencyService()
  })

  it('gets dependencies', async () => {
    const deps = await service.getDependencies()
    expect(deps).toEqual([])
  })

  it('gets dependency tree', async () => {
    const tree = await service.getDependencyTree()
    expect(tree.name).toBe('root')
  })

  it('gets dependency usage', async () => {
    const usage = await service.getDependencyUsage('lodash')
    expect(usage).toEqual([])
  })

  it('gets updates', async () => {
    const updates = await service.getUpdates()
    expect(updates).toEqual([])
  })

  it('gets changes', async () => {
    const changes = await service.getChanges('main', 'feature')
    expect(changes).toEqual([])
  })

  it('gets vulnerabilities', async () => {
    const vulns = await service.getVulnerabilities()
    expect(vulns).toEqual([])
  })

  it('gets licenses', async () => {
    const licenses = await service.getLicenses()
    expect(licenses).toEqual([])
  })

  it('exposes tools', () => {
    const tools = service.getTools()
    expect(tools).toHaveLength(7)
  })
})

describe('ArchitectureService', () => {
  let service: ArchitectureService

  beforeEach(() => {
    service = new ArchitectureService({ codebasePath: '/' })
  })

  it('gets overview', async () => {
    const overview = await service.getOverview()
    expect(overview.services).toEqual([])
  })

  it('gets service dependencies', async () => {
    const deps = await service.getServiceDependencies()
    expect(deps).toEqual([])
  })

  it('gets module dependencies', async () => {
    const deps = await service.getModuleDependencies()
    expect(deps).toEqual([])
  })

  it('gets data flow', async () => {
    const flow = await service.getDataFlow()
    expect(flow).toEqual([])
  })

  it('gets request flow', async () => {
    const flow = await service.getRequestFlow('/api/users')
    expect(flow).toEqual([])
  })

  it('gets dependency graph', async () => {
    const graph = await service.getDependencyGraph()
    expect(graph.nodes).toEqual([])
  })

  it('gets impact analysis', async () => {
    const impact = await service.getImpactAnalysis({ file: 'src/file.ts', type: 'modify' })
    expect(impact.riskLevel).toBe('low')
  })

  it('exposes tools', () => {
    const tools = service.getTools()
    expect(tools).toHaveLength(7)
  })
})

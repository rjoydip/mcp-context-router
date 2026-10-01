import type { McpTool } from '../core/types'

export interface CloudflareConfig {
  accountId: string
  apiToken: string
  baseUrl?: string
}

export class CloudflareService {
  private readonly config: CloudflareConfig
  private readonly baseUrl: string

  constructor(config: CloudflareConfig) {
    this.config = config
    this.baseUrl =
      config.baseUrl || `https://api.cloudflare.com/client/v4/accounts/${config.accountId}`
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiToken}`,
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
      throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}`)
    }

    const result = (await response.json()) as {
      success: boolean
      errors?: Array<{ message: string }>
      result: T
    }
    if (!result.success) {
      throw new Error(`Cloudflare API error: ${result.errors?.[0]?.message || 'Unknown error'}`)
    }

    return result.result
  }

  async getWorkers(): Promise<
    Array<{
      id: string
      name: string
      scriptName: string
      createdOn: string
      modifiedOn: string
      status: string
    }>
  > {
    return this.request('/workers/scripts')
  }

  async getD1Databases(): Promise<
    Array<{
      uuid: string
      name: string
      version: string
      tables: number
      size: number
      created: string
    }>
  > {
    return this.request('/d1/database')
  }

  async getR2Buckets(): Promise<
    Array<{
      name: string
      creationDate: string
      fileCount: number
      size: number
    }>
  > {
    return this.request('/r2/buckets')
  }

  async getKVNamespaces(): Promise<
    Array<{
      id: string
      title: string
      count: number
      size: number
    }>
  > {
    return this.request('/storage/kv/namespaces')
  }

  async getVectorizeIndexes(): Promise<
    Array<{
      name: string
      description: string
      dimensions: number
      metric: string
      vectorCount: number
    }>
  > {
    return this.request('/vectorize/indexes')
  }

  async getQueues(): Promise<
    Array<{
      name: string
      producerCount: number
      consumerCount: number
      messageCount: number
    }>
  > {
    return this.request('/queues')
  }

  async getDurableObjects(): Promise<
    Array<{
      name: string
      className: string
      scriptName: string
    }>
  > {
    return this.request('/workers/durable-objects/namespaces')
  }

  async getAIRuns(): Promise<
    Array<{
      id: string
      model: string
      status: string
      input: unknown
      output: unknown
      created: string
    }>
  > {
    return this.request('/ai/runs')
  }

  async getRoutes(): Promise<
    Array<{
      id: string
      pattern: string
      script: string
      zoneId: string
      zoneName: string
    }>
  > {
    return this.request('/workers/routes')
  }

  async getDeployments(): Promise<
    Array<{
      id: string
      projectName: string
      environment: string
      alias: string
      status: string
      createdOn: string
    }>
  > {
    return this.request('/pages/projects')
  }

  getTools(): McpTool[] {
    return [
      {
        name: 'cloud_workers',
        description: 'List Cloudflare Workers',
        tags: ['cloud', 'workers', 'serverless'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_d1',
        description: 'List D1 databases',
        tags: ['cloud', 'd1', 'database'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_r2',
        description: 'List R2 buckets',
        tags: ['cloud', 'r2', 'storage'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_kv',
        description: 'List KV namespaces',
        tags: ['cloud', 'kv', 'key-value'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_vectorize',
        description: 'List Vectorize indexes',
        tags: ['cloud', 'vectorize', 'embeddings'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_queues',
        description: 'List Cloudflare Queues',
        tags: ['cloud', 'queues', 'messaging'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_durable_objects',
        description: 'List Durable Objects',
        tags: ['cloud', 'durable-objects', 'stateful'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_ai',
        description: 'List Workers AI models',
        tags: ['cloud', 'ai', 'models'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_routes',
        description: 'List Cloudflare routes',
        tags: ['cloud', 'routes', 'networking'],
        risk: 'read',
        category: 'cloud'
      },
      {
        name: 'cloud_deployments',
        description: 'List Cloudflare deployments',
        tags: ['cloud', 'deployments', 'pages'],
        risk: 'read',
        category: 'cloud'
      }
    ]
  }
}

import type { McpTool } from '../core/types'

export interface DependencyConfig {
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun'
  packageJsonPath?: string
  lockFilePath?: string
}

export interface Dependency {
  name: string
  version: string
  latestVersion?: string
  type: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies'
  description?: string
  homepage?: string
  repository?: string
  license?: string
  vulnerabilities?: Array<{
    id: string
    severity: string
    title: string
    url: string
  }>
}

export class DependencyService {
  private readonly config: DependencyConfig

  constructor(config: DependencyConfig = { packageManager: 'npm' }) {
    this.config = config
  }

  async getDependencies(): Promise<Dependency[]> {
    // This would typically read package.json and lock files
    // For now, return mock data
    return []
  }

  async getDependencyTree(): Promise<{
    name: string
    version: string
    dependencies: Record<string, string>
  }> {
    return { name: 'root', version: '1.0.0', dependencies: {} }
  }

  async getDependencyUsage(_dependencyName: string): Promise<
    Array<{
      file: string
      line: number
      importType: 'import' | 'require'
    }>
  > {
    return []
  }

  async getUpdates(): Promise<
    Array<{
      name: string
      current: string
      latest: string
      type: 'patch' | 'minor' | 'major'
    }>
  > {
    return []
  }

  async getChanges(
    _baseRef: string,
    _headRef: string
  ): Promise<
    Array<{
      name: string
      oldVersion?: string
      newVersion?: string
      change: 'added' | 'removed' | 'updated'
    }>
  > {
    return []
  }

  async getVulnerabilities(): Promise<
    Array<{
      name: string
      version: string
      vulnerabilities: Array<{
        id: string
        severity: string
        title: string
        url: string
        fixedIn?: string
      }>
    }>
  > {
    return []
  }

  async getLicenses(): Promise<
    Array<{
      name: string
      version: string
      license: string
      licenseUrl?: string
    }>
  > {
    return []
  }

  getTools(): McpTool[] {
    return [
      {
        name: 'dependencies',
        description: 'List project dependencies',
        tags: ['dependency', 'list', 'package'],
        risk: 'read',
        category: 'dependency'
      },
      {
        name: 'dependency_tree',
        description: 'Show dependency tree',
        tags: ['dependency', 'tree', 'transitive'],
        risk: 'read',
        category: 'dependency'
      },
      {
        name: 'dependency_usage',
        description: 'Find where dependencies are used',
        tags: ['dependency', 'usage', 'imports'],
        risk: 'read',
        category: 'dependency'
      },
      {
        name: 'dependency_updates',
        description: 'Check for dependency updates',
        tags: ['dependency', 'updates', 'versions'],
        risk: 'read',
        category: 'dependency'
      },
      {
        name: 'dependency_changes',
        description: 'Show dependency changes between commits',
        tags: ['dependency', 'changes', 'diff'],
        risk: 'read',
        category: 'dependency'
      },
      {
        name: 'dependency_vulnerabilities',
        description: 'Check for known vulnerabilities',
        tags: ['dependency', 'vulnerabilities', 'security'],
        risk: 'read',
        category: 'dependency'
      },
      {
        name: 'dependency_license',
        description: 'Check dependency licenses',
        tags: ['dependency', 'license', 'compliance'],
        risk: 'read',
        category: 'dependency'
      }
    ]
  }
}

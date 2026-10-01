import type { R2Bucket, KVNamespace } from '@cloudflare/workers-types'
import type { McpTool } from '../core/types'

export interface CodebaseFile {
  path: string
  content: string
  size: number
  modified: number
}

export interface SearchResult {
  file: string
  line: number
  text: string
}

export class CloudflareCodebaseService {
  private readonly bucket: R2Bucket
  private readonly kv: KVNamespace
  private readonly prefix = 'codebase/'

  constructor(bucket: R2Bucket, kv: KVNamespace) {
    this.bucket = bucket
    this.kv = kv
  }

  async listFiles(directory = ''): Promise<string[]> {
    const prefix = this.prefix + directory
    const objects = await this.bucket.list({ prefix, delimiter: '/' })
    return objects.objects.map((obj: { key: string }) => obj.key.slice(this.prefix.length)).sort()
  }

  async readFile(relativePath: string): Promise<string> {
    const object = await this.bucket.get(this.prefix + relativePath)
    if (!object) throw new Error(`File not found: ${relativePath}`)
    return object.text()
  }

  async search(query: string, maxResults = 30): Promise<SearchResult[]> {
    const results: SearchResult[] = []
    const lowerQuery = query.toLowerCase()

    const files = await this.listFiles()
    for (const file of files) {
      if (results.length >= maxResults) break

      try {
        const content = await this.readFile(file)
        for (const [i, line] of content.split(/\r?\n/).entries()) {
          if (results.length >= maxResults) break
          if (line.toLowerCase().includes(lowerQuery)) {
            results.push({ file, line: i + 1, text: line.trim().slice(0, 300) })
          }
        }
      } catch {
        continue
      }
    }

    return results
  }

  async writeFile(relativePath: string, content: string): Promise<void> {
    await this.bucket.put(this.prefix + relativePath, content)
    await this.kv.put(`file:${relativePath}`, content)
  }

  async deleteFile(relativePath: string): Promise<void> {
    await this.bucket.delete(this.prefix + relativePath)
    await this.kv.delete(`file:${relativePath}`)
  }

  async syncFromGitHub(githubService: {
    request: <T>(path: string) => Promise<T>
    config: { owner: string; repo: string; default_branch: string }
  }): Promise<number> {
    let count = 0
    const tree = await githubService.request<{ tree: Array<{ path: string; type: string }> }>(
      `/repos/${githubService.config.owner}/${githubService.config.repo}/git/trees/${githubService.config.default_branch}?recursive=1`
    )

    for (const item of tree.tree) {
      if (item.type === 'blob' && this.isTextFile(item.path)) {
        try {
          const content = await githubService.request<string>(
            `/repos/${githubService.config.owner}/${githubService.config.repo}/contents/${item.path}`
          )
          await this.writeFile(item.path, content)
          count++
        } catch {
          continue
        }
      }
    }

    return count
  }

  private isTextFile(path: string): boolean {
    const textExtensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.json',
      '.md',
      '.txt',
      '.yaml',
      '.yml',
      '.toml',
      '.css',
      '.html',
      '.vue',
      '.svelte',
      '.py',
      '.rs',
      '.go',
      '.java',
      '.kt',
      '.swift',
      '.rb',
      '.php',
      '.sh',
      '.sql',
      '.graphql',
      '.proto'
    ]
    return (
      textExtensions.some((ext) => path.endsWith(ext)) ||
      path.includes('.github/') ||
      path.includes('.vscode/')
    )
  }

  getTools(): McpTool[] {
    return [
      {
        name: 'code_search',
        description: 'Search source files for symbols, APIs and text',
        tags: ['code', 'search', 'grep', 'symbol'],
        risk: 'read',
        category: 'codebase'
      },
      {
        name: 'read_file',
        description: 'Read a codebase file from R2',
        tags: ['code', 'file', 'source'],
        risk: 'read',
        category: 'codebase'
      },
      {
        name: 'list_files',
        description: 'List repository source files',
        tags: ['code', 'files', 'repository'],
        risk: 'read',
        category: 'codebase'
      },
      {
        name: 'find_symbol',
        description: 'Find symbol definition in codebase',
        tags: ['code', 'symbol', 'definition'],
        risk: 'read',
        category: 'codebase'
      },
      {
        name: 'find_references',
        description: 'Find references to a symbol',
        tags: ['code', 'references', 'usage'],
        risk: 'read',
        category: 'codebase'
      },
      {
        name: 'find_importers',
        description: 'Find files importing a symbol',
        tags: ['code', 'importers', 'dependencies'],
        risk: 'read',
        category: 'codebase'
      },
      {
        name: 'find_exports',
        description: 'Find exports in a file or directory',
        tags: ['code', 'exports', 'api'],
        risk: 'read',
        category: 'codebase'
      }
    ]
  }
}

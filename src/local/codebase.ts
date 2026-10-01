import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
const ignored = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  'playwright-report',
  'test-results'
])

export class CodebaseService {
  readonly root: string
  constructor(root = process.env.CODEBASE_ROOT ?? process.cwd()) {
    this.root = path.resolve(root)
  }
  private safe(relative: string) {
    const absolute = path.resolve(this.root, relative)
    if (!absolute.startsWith(this.root + path.sep) && absolute !== this.root)
      throw new Error('Path is outside CODEBASE_ROOT')
    return absolute
  }
  async listFiles(relative = '') {
    const result: string[] = []
    const walk = async (dir: string) => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (ignored.has(entry.name)) continue
        const absolute = path.join(dir, entry.name)
        if (entry.isDirectory()) await walk(absolute)
        else result.push(path.relative(this.root, absolute).replaceAll(path.sep, '/'))
      }
    }
    await walk(this.safe(relative))
    return result.sort()
  }
  readFile(relative: string) {
    return readFile(this.safe(relative), 'utf8')
  }
  async search(query: string, maxResults = 30) {
    const results: Array<{ file: string; line: number; text: string }> = []
    for (const file of await this.listFiles()) {
      if (results.length >= maxResults) break
      let content = ''
      try {
        content = await readFile(this.safe(file), 'utf8')
      } catch {
        continue
      }
      for (const [i, line] of content.split(/\r?\n/).entries())
        if (results.length < maxResults && line.toLowerCase().includes(query.toLowerCase()))
          results.push({ file, line: i + 1, text: line.trim().slice(0, 300) })
    }
    return results
  }
}

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { CodebaseService } from '../../src/local/codebase'

describe('codebase - local CodebaseService', () => {
  let fixtureDir: string
  let service: CodebaseService

  beforeEach(async () => {
    fixtureDir = await mkdtemp(path.join(tmpdir(), 'codebase-'))
    await mkdir(path.join(fixtureDir, 'src'), { recursive: true })
    await mkdir(path.join(fixtureDir, 'node_modules'), { recursive: true })
    await writeFile(
      path.join(fixtureDir, 'src', 'index.ts'),
      ['export function greet() {', "  return 'hello'", '}'].join('\n')
    )
    await writeFile(path.join(fixtureDir, 'src', 'util.ts'), 'export const VERSION = 1\n')
    await writeFile(path.join(fixtureDir, 'README.md'), '# Fixture\n')
    await writeFile(path.join(fixtureDir, 'node_modules', 'dep.js'), 'module.exports = {}\n')
    service = new CodebaseService(fixtureDir)
  })

  afterEach(async () => {
    await rm(fixtureDir, { recursive: true, force: true })
  })

  it('resolves root from constructor argument', () => {
    expect(service.root).toBe(path.resolve(fixtureDir))
  })

  describe('listFiles', () => {
    it('lists files recursively and sorted', async () => {
      expect(await service.listFiles()).toEqual(['README.md', 'src/index.ts', 'src/util.ts'])
    })

    it('skips ignored directories', async () => {
      const files = await service.listFiles()
      expect(files.some((file) => file.includes('node_modules'))).toBe(false)
    })

    it('lists files under a subdirectory, relative to the root', async () => {
      expect(await service.listFiles('src')).toEqual(['src/index.ts', 'src/util.ts'])
    })

    it('rejects paths outside the root', async () => {
      await expect(service.listFiles('../outside')).rejects.toThrow('Path is outside CODEBASE_ROOT')
    })
  })

  describe('readFile', () => {
    it('reads file content', async () => {
      const content = await service.readFile('README.md')
      expect(content).toContain('# Fixture')
    })

    it('reads nested files', async () => {
      const content = await service.readFile('src/index.ts')
      expect(content).toContain('export function greet')
    })

    it('rejects path traversal', () => {
      // readFile validates synchronously before touching the filesystem.
      expect(() => service.readFile('../../etc/passwd')).toThrow('Path is outside CODEBASE_ROOT')
    })
  })

  describe('search', () => {
    it('finds matching lines with file and line number', async () => {
      const results = await service.search('greet')
      expect(results).toHaveLength(1)
      expect(results[0]!.file).toBe('src/index.ts')
      expect(results[0]!.line).toBe(1)
      expect(results[0]!.text).toContain('greet')
    })

    it('is case insensitive', async () => {
      expect(await service.search('EXPORT FUNCTION')).toHaveLength(1)
    })

    it('respects maxResults', async () => {
      const results = await service.search('export', 1)
      expect(results).toHaveLength(1)
    })

    it('returns empty for no matches', async () => {
      expect(await service.search('definitely-not-in-the-fixture')).toEqual([])
    })
  })
})

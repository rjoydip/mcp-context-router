import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { LocalGitAst } from '../../src/local/git-ast'

const execFileAsync = promisify(execFile)

describe('git-ast - LocalGitAst', () => {
  let fixtureDir: string
  let git: LocalGitAst
  const run = (args: string[]) => execFileAsync('git', args, { cwd: fixtureDir })

  beforeEach(async () => {
    fixtureDir = await mkdtemp(path.join(tmpdir(), 'git-ast-'))
    git = new LocalGitAst(fixtureDir)
  })

  afterEach(async () => {
    await rm(fixtureDir, { recursive: true, force: true })
  })

  async function initRepo() {
    await run(['init'])
    await run(['config', 'user.email', 'test@example.com'])
    await run(['config', 'user.name', 'Test User'])
  }

  async function initRepoWithCommit() {
    await initRepo()
    await writeFile(path.join(fixtureDir, 'file.txt'), 'hello\n')
    await run(['add', 'file.txt'])
    await run(['commit', '-m', 'initial commit'])
  }

  it('resolves root from constructor argument', () => {
    expect(git.root).toBe(path.resolve(fixtureDir))
  })

  describe('log', () => {
    it('resolves to an empty string when git log fails', async () => {
      // Regression: log() used to wrap an un-awaited promise in try/catch, so
      // the rejection escaped and the MCP git_log tool returned isError.
      await expect(git.log()).resolves.toBe('')
    })

    it('clamps the limit to a valid git revision range', async () => {
      // No commits in the fixture repo, so this still resolves (to '') rather
      // than rejecting with a malformed -N argument.
      await expect(git.log(0)).resolves.toBe('')
      await expect(git.log(9999)).resolves.toBe('')
      await expect(git.log(-5)).resolves.toBe('')
    })

    it('works against a repository that has commits', async () => {
      await initRepoWithCommit()

      const log = await git.log(5)
      expect(log.split('\n').filter(Boolean).length).toBeGreaterThanOrEqual(1)
      // pretty=format:%h|%ad|%an|%s
      expect(log).toMatch(/^[0-9a-f]+\|\d{4}-\d{2}-\d{2}[^|]*\|[^|]*\|initial commit$/m)
    })
  })

  describe('symbols', () => {
    it('extracts declarations from a TypeScript file', async () => {
      const file = path.join(fixtureDir, 'sample.ts')
      await writeFile(
        file,
        [
          'export interface Widget { id: string }',
          'export type WidgetId = string',
          'export function buildWidget() { return null }',
          'export class Registry { private items: Widget[] = [] }',
          'export const MAX_WIDGETS = 10'
        ].join('\n')
      )

      const result = await git.symbols('sample.ts')
      expect(result.file).toBe('sample.ts')
      const names = result.symbols.map((symbol) => symbol.name)
      expect(names).toEqual(
        expect.arrayContaining(['Widget', 'WidgetId', 'buildWidget', 'Registry'])
      )
      expect(result.symbols.every((symbol) => symbol.line >= 1)).toBe(true)
    })

    it('rejects files outside the repository root', async () => {
      await expect(git.symbols('../outside.ts')).rejects.toThrow('File is outside CODEBASE_ROOT')
    })

    it('rejects missing files', async () => {
      await expect(git.symbols('missing.ts')).rejects.toThrow()
    })
  })

  describe('status', () => {
    it('reports the branch for an empty repository', async () => {
      await initRepo()
      const status = await git.status()
      expect(status).toContain('##')
    })

    it('rejects outside a git repository', async () => {
      // status() is not wrapped in try/catch, so callers see the raw failure.
      await expect(git.status()).rejects.toThrow()
    })
  })

  describe('diff', () => {
    it('returns an empty diff for a clean repository', async () => {
      await initRepoWithCommit()
      await expect(git.diff()).resolves.toBe('')
      await expect(git.diff(true)).resolves.toBe('')
    })

    it('rejects outside a git repository', async () => {
      await expect(git.diff()).rejects.toThrow()
    })
  })
})

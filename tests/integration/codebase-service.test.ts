import { describe, expect, it, beforeEach, vi } from 'vitest'
import { CloudflareCodebaseService } from '../../src/cloudflare/codebase-service'

const mockBucket = {
  list: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
}

const mockKv = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn()
}

describe('CloudflareCodebaseService', () => {
  let service: CloudflareCodebaseService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new CloudflareCodebaseService(mockBucket as any, mockKv as any)
  })

  describe('listFiles', () => {
    it('lists files with prefix', async () => {
      // R2 bucket list filters by prefix, so only return objects with the correct prefix
      mockBucket.list.mockResolvedValue({
        objects: [{ key: 'codebase/src/file1.ts' }, { key: 'codebase/src/file2.ts' }]
      })

      const files = await service.listFiles('src/')
      expect(files).toEqual(['src/file1.ts', 'src/file2.ts'])
    })

    it('handles empty results', async () => {
      mockBucket.list.mockResolvedValue({ objects: [] })
      const files = await service.listFiles()
      expect(files).toEqual([])
    })

    it('sorts files', async () => {
      mockBucket.list.mockResolvedValue({
        objects: [{ key: 'codebase/z.ts' }, { key: 'codebase/a.ts' }]
      })
      const files = await service.listFiles()
      expect(files).toEqual(['a.ts', 'z.ts'])
    })
  })

  describe('readFile', () => {
    it('reads file content', async () => {
      const mockObject = { text: vi.fn().mockResolvedValue('file content') }
      mockBucket.get.mockResolvedValue(mockObject)

      const content = await service.readFile('test.ts')
      expect(content).toBe('file content')
      expect(mockObject.text).toHaveBeenCalled()
    })

    it('throws for non-existent file', async () => {
      mockBucket.get.mockResolvedValue(null)
      await expect(service.readFile('missing.ts')).rejects.toThrow('File not found: missing.ts')
    })
  })

  describe('search', () => {
    it('searches files for query', async () => {
      mockBucket.list.mockResolvedValue({
        objects: [{ key: 'codebase/file1.ts' }, { key: 'codebase/file2.ts' }]
      })
      mockBucket.get
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue('function test() {}') })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue('const x = 1') })

      const results = await service.search('function')
      expect(results).toHaveLength(1)
      expect(results[0]!.file).toBe('file1.ts')
      expect(results[0]!.text).toContain('function')
    })

    it('limits results', async () => {
      mockBucket.list.mockResolvedValue({
        objects: Array.from({ length: 100 }, (_, i) => ({ key: `codebase/file${i}.ts` }))
      })
      mockBucket.get.mockResolvedValue({ text: vi.fn().mockResolvedValue('test query') })

      const results = await service.search('query', 5)
      expect(results.length).toBe(5)
    })

    it('handles file read errors gracefully', async () => {
      mockBucket.list.mockResolvedValue({
        objects: [{ key: 'codebase/file1.ts' }, { key: 'codebase/file2.ts' }]
      })
      mockBucket.get
        .mockResolvedValueOnce({ text: vi.fn().mockRejectedValue(new Error('read error')) })
        .mockResolvedValueOnce({ text: vi.fn().mockResolvedValue('test query') })

      const results = await service.search('query')
      expect(results).toHaveLength(1)
    })

    it('is case insensitive', async () => {
      mockBucket.list.mockResolvedValue({
        objects: [{ key: 'codebase/file.ts' }]
      })
      mockBucket.get.mockResolvedValue({ text: vi.fn().mockResolvedValue('FUNCTION test()') })

      const results = await service.search('function')
      expect(results).toHaveLength(1)
    })
  })

  describe('writeFile', () => {
    it('writes to bucket and KV', async () => {
      await service.writeFile('test.ts', 'content')
      expect(mockBucket.put).toHaveBeenCalledWith('codebase/test.ts', 'content')
      expect(mockKv.put).toHaveBeenCalledWith('file:test.ts', 'content')
    })
  })

  describe('deleteFile', () => {
    it('deletes from bucket and KV', async () => {
      await service.deleteFile('test.ts')
      expect(mockBucket.delete).toHaveBeenCalledWith('codebase/test.ts')
      expect(mockKv.delete).toHaveBeenCalledWith('file:test.ts')
    })
  })

  describe('syncFromGitHub', () => {
    it('syncs text files from GitHub', async () => {
      const mockGitHub = {
        config: { owner: 'test-org', repo: 'test-repo', default_branch: 'main' },
        request: vi
          .fn()
          .mockResolvedValueOnce({
            tree: [
              { path: 'src/file.ts', type: 'blob' },
              { path: 'README.md', type: 'blob' },
              { path: 'image.png', type: 'blob' }
            ]
          })
          .mockResolvedValueOnce('file content')
          .mockResolvedValueOnce('readme content')
      }

      const count = await service.syncFromGitHub(mockGitHub)
      expect(count).toBe(2)
      expect(mockGitHub.request).toHaveBeenCalledTimes(3)
    })

    it('skips non-text files', async () => {
      const mockGitHub = {
        config: { owner: 'test-org', repo: 'test-repo', default_branch: 'main' },
        request: vi.fn().mockResolvedValueOnce({
          tree: [
            { path: 'image.png', type: 'blob' },
            { path: 'binary.bin', type: 'blob' }
          ]
        })
      }

      const count = await service.syncFromGitHub(mockGitHub)
      expect(count).toBe(0)
    })

    it('handles errors gracefully', async () => {
      const mockGitHub = {
        config: { owner: 'test-org', repo: 'test-repo', default_branch: 'main' },
        request: vi
          .fn()
          .mockResolvedValueOnce({ tree: [{ path: 'file.ts', type: 'blob' }] })
          .mockRejectedValueOnce(new Error('GitHub error'))
      }

      const count = await service.syncFromGitHub(mockGitHub)
      expect(count).toBe(0)
    })

    it('identifies text files by extension', () => {
      const textFiles = [
        'file.ts',
        'file.tsx',
        'file.js',
        'file.jsx',
        'file.json',
        'file.md',
        'file.txt',
        'file.yaml',
        'file.yml',
        'file.toml',
        'file.css',
        'file.html',
        'file.vue',
        'file.svelte',
        'file.py',
        'file.rs',
        'file.go',
        'file.java',
        'file.kt',
        'file.swift',
        'file.rb',
        'file.php',
        'file.sh',
        'file.sql',
        'file.graphql',
        'file.proto'
      ]

      for (const file of textFiles) {
        expect(service['isTextFile'](file)).toBe(true)
      }

      expect(service['isTextFile']('image.png')).toBe(false)
      expect(service['isTextFile']('binary.bin')).toBe(false)
    })

    it('includes special directories', () => {
      expect(service['isTextFile']('.github/workflow.yml')).toBe(true)
      expect(service['isTextFile']('.vscode/settings.json')).toBe(true)
    })
  })
})

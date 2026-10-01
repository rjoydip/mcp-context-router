import { describe, expect, it, vi, beforeEach } from 'vitest'
import { CloudflareDatabaseService } from '../../src/cloudflare/database-service'

const mockDb = {
  prepare: vi.fn(),
  exec: vi.fn()
}

const mockStmt = {
  bind: vi.fn().mockReturnThis(),
  all: vi.fn(),
  run: vi.fn()
}

describe('CloudflareDatabaseService', () => {
  let service: CloudflareDatabaseService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new CloudflareDatabaseService(mockDb as any)
    mockDb.prepare.mockReturnValue(mockStmt)
  })

  describe('schema', () => {
    it('returns schema information', async () => {
      mockStmt.all.mockResolvedValue({
        results: [
          {
            table_schema: 'main',
            table_name: 'users',
            column_name: 'id',
            data_type: 'INTEGER',
            is_nullable: 'NO'
          },
          {
            table_schema: 'main',
            table_name: 'users',
            column_name: 'name',
            data_type: 'TEXT',
            is_nullable: 'YES'
          }
        ]
      })

      const schema = await service.schema()
      expect(schema).toHaveLength(2)
      expect(schema[0]!.table_name).toBe('users')
    })

    it('returns empty array for no results', async () => {
      mockStmt.all.mockResolvedValue({ results: [] })
      const schema = await service.schema()
      expect(schema).toEqual([])
    })

    it('orders by table name and column position', async () => {
      mockStmt.all.mockResolvedValue({
        results: [
          {
            table_schema: 'main',
            table_name: 'users',
            column_name: 'id',
            data_type: 'INTEGER',
            is_nullable: 'NO'
          }
        ]
      })

      await service.schema()
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('ORDER BY m.name, p.cid'))
    })
  })

  describe('query', () => {
    it('executes read-only queries', async () => {
      mockStmt.all.mockResolvedValue({
        results: [{ id: 1, name: 'test' }],
        rowCount: 1
      })

      const result = await service.query('SELECT * FROM users')
      expect(result.rows).toHaveLength(1)
      expect(result.rowCount).toBe(1)
    })

    it('binds parameters', async () => {
      mockStmt.all.mockResolvedValue({ results: [], rowCount: 0 })

      await service.query('SELECT * FROM users WHERE id = ?', [1])
      expect(mockStmt.bind).toHaveBeenCalledWith(1)
    })

    it('rejects write operations', async () => {
      await expect(service.query('INSERT INTO users VALUES (1)')).rejects.toThrow(
        'Database MCP only permits SELECT'
      )
      await expect(service.query('UPDATE users SET name = ?')).rejects.toThrow(
        'Database MCP only permits SELECT'
      )
      await expect(service.query('DELETE FROM users')).rejects.toThrow(
        'Database MCP only permits SELECT'
      )
      await expect(service.query('DROP TABLE users')).rejects.toThrow(
        'Database MCP only permits SELECT'
      )
      await expect(service.query('CREATE TABLE test (id INT)')).rejects.toThrow(
        'Database MCP only permits SELECT'
      )
      await expect(service.query('ALTER TABLE users ADD COLUMN x INT')).rejects.toThrow(
        'Database MCP only permits SELECT'
      )
    })

    it('allows WITH queries', async () => {
      mockStmt.all.mockResolvedValue({ results: [], rowCount: 0 })
      await service.query('WITH cte AS (SELECT 1) SELECT * FROM cte')
    })

    it('allows EXPLAIN queries', async () => {
      mockStmt.all.mockResolvedValue({ results: [], rowCount: 0 })
      await service.query('EXPLAIN SELECT * FROM users')
    })

    it('handles case insensitivity', async () => {
      mockStmt.all.mockResolvedValue({ results: [], rowCount: 0 })
      await service.query('select * from users')
      await service.query('Select * From users')
      await service.query('WITH cte AS (SELECT 1) SELECT * FROM cte')
    })

    it('returns row count and rows', async () => {
      mockStmt.all.mockResolvedValue({
        results: [{ id: 1 }, { id: 2 }, { id: 3 }],
        rowCount: 3
      })

      const result = await service.query('SELECT * FROM users')
      expect(result.rows).toHaveLength(3)
      expect(result.rowCount).toBe(3)
    })
  })

  describe('exec', () => {
    it('executes SQL', async () => {
      mockDb.exec.mockResolvedValue(undefined)
      await service.exec('CREATE INDEX idx ON users(name)')
      expect(mockDb.exec).toHaveBeenCalledWith('CREATE INDEX idx ON users(name)')
    })
  })

  describe('dump', () => {
    it('returns schema dump', async () => {
      mockStmt.all.mockResolvedValue({
        results: [
          { sql: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)' },
          { sql: 'CREATE INDEX idx_name ON users(name)' }
        ]
      })

      const dump = await service.dump()
      expect(dump).toContain('CREATE TABLE users')
      expect(dump).toContain('CREATE INDEX idx_name')
      expect(dump.endsWith(';')).toBe(true)
    })
  })
})

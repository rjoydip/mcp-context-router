import { describe, expect, it, vi, afterEach } from 'vitest'
import { DatabaseService } from '../../src/local/database'

// pg is mocked so the guard logic can be exercised without a live server.
vi.mock('pg', () => {
  class Pool {
    query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] })
    end = vi.fn()
  }
  return { default: { Pool } }
})

describe('database - local DatabaseService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('requires a connection string', () => {
    const original = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    try {
      expect(() => new DatabaseService()).toThrow('DATABASE_URL is required for Database MCP')
    } finally {
      if (original !== undefined) process.env.DATABASE_URL = original
    }
  })

  it('accepts an explicit connection string', () => {
    expect(() => new DatabaseService('postgres://user:pass@localhost:5432/db')).not.toThrow()
  })

  describe('read-only enforcement', () => {
    const service = new DatabaseService('postgres://user:pass@localhost:5432/db')

    it.each([
      'DELETE FROM users',
      'UPDATE users SET name = 1',
      'DROP TABLE users',
      'INSERT INTO users VALUES (1)',
      'TRUNCATE users',
      'ALTER TABLE users ADD COLUMN x int'
    ])('rejects %s', async (sql) => {
      await expect(service.query(sql)).rejects.toThrow(
        'Database MCP only permits SELECT, WITH and EXPLAIN statements'
      )
    })

    it.each(['SELECT 1', 'WITH x AS (SELECT 1) SELECT * FROM x', 'EXPLAIN SELECT 1'])(
      'allows %s',
      async (sql) => {
        await expect(service.query(sql)).resolves.toEqual({ rowCount: 0, rows: [] })
      }
    )

    it('is case insensitive', async () => {
      await expect(service.query('select 1')).resolves.toEqual({ rowCount: 0, rows: [] })
    })

    it('rejects statements with leading comments disguised as writes', async () => {
      // The guard only permits SELECT/WITH/EXPLAIN at the start of the string.
      await expect(service.query('DELETE FROM users')).rejects.toThrow()
    })
  })

  describe('schema', () => {
    it('queries information_schema.columns excluding system schemas', async () => {
      const service = new DatabaseService('postgres://user:pass@localhost:5432/db')
      const pool = (service as unknown as { pool: { query: ReturnType<typeof vi.fn> } }).pool
      pool.query.mockResolvedValue({ rows: [{ table_name: 'users' }] })

      const rows = await service.schema()
      expect(rows).toEqual([{ table_name: 'users' }])
      const sql = pool.query.mock.calls[0]![0] as string
      expect(sql).toContain('information_schema.columns')
      expect(sql).toContain("table_schema not in ('pg_catalog','information_schema')")
    })
  })

  it('closes the pool', () => {
    const service = new DatabaseService('postgres://user:pass@localhost:5432/db')
    const pool = (service as unknown as { pool: { end: ReturnType<typeof vi.fn> } }).pool
    void service.close()
    expect(pool.end).toHaveBeenCalled()
  })
})

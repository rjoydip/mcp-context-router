import type { D1Database } from '@cloudflare/workers-types'
import type { McpTool } from '../core/types'

export interface D1SchemaResult {
  table_schema: string
  table_name: string
  column_name: string
  data_type: string
  is_nullable: string
}

export interface D1QueryResult {
  rowCount: number
  rows: Record<string, unknown>[]
}

export class CloudflareDatabaseService {
  private readonly db: D1Database

  constructor(db: D1Database) {
    this.db = db
  }

  async schema(): Promise<D1SchemaResult[]> {
    const result = await this.db
      .prepare(`
      SELECT
        'main' as table_schema,
        m.name as table_name,
        p.name as column_name,
        p.type as data_type,
        CASE WHEN p.notnull = 1 THEN 'NO' ELSE 'YES' END as is_nullable
      FROM sqlite_master m
      JOIN pragma_table_info(m.name) p
      WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%'
      ORDER BY m.name, p.cid
    `)
      .all<D1SchemaResult>()

    return result.results ?? []
  }

  async query(sql: string, params: unknown[] = []): Promise<D1QueryResult> {
    if (!/^\s*(select|with|explain)\b/i.test(sql)) {
      throw new Error('Database MCP only permits SELECT, WITH and EXPLAIN statements')
    }

    const stmt = this.db.prepare(sql).bind(...params)
    const result = await stmt.all()
    return { rowCount: result.results?.length ?? 0, rows: result.results ?? [] }
  }

  async exec(sql: string): Promise<void> {
    await this.db.exec(sql)
  }

  async dump(): Promise<string> {
    const result = await this.db
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all<{ sql: string }>()
    return (result.results ?? []).map((r: { sql: string }) => r.sql).join(';\n') + ';'
  }

  getTools(): McpTool[] {
    return [
      {
        name: 'db_schema',
        description: 'Inspect D1 tables, columns and indexes',
        tags: ['database', 'sqlite', 'schema', 'sql'],
        risk: 'read',
        category: 'database'
      },
      {
        name: 'db_query',
        description: 'Execute a read-only D1 query',
        tags: ['database', 'sqlite', 'query', 'sql'],
        risk: 'read',
        category: 'database'
      },
      {
        name: 'db_tables',
        description: 'List database tables',
        tags: ['database', 'tables', 'schema'],
        risk: 'read',
        category: 'database'
      },
      {
        name: 'db_indexes',
        description: 'List database indexes',
        tags: ['database', 'indexes', 'performance'],
        risk: 'read',
        category: 'database'
      },
      {
        name: 'db_explain',
        description: 'Explain query execution plan',
        tags: ['database', 'explain', 'performance'],
        risk: 'read',
        category: 'database'
      },
      {
        name: 'db_table_stats',
        description: 'Get table statistics',
        tags: ['database', 'stats', 'performance'],
        risk: 'read',
        category: 'database'
      }
    ]
  }
}

import pg from 'pg'

export class DatabaseService {
  private readonly pool: pg.Pool
  constructor(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) throw new Error('DATABASE_URL is required for Database MCP')
    this.pool = new pg.Pool({ connectionString, max: 2 })
  }
  async schema() {
    const result = await this.pool.query(
      `select table_schema, table_name, column_name, data_type, is_nullable from information_schema.columns where table_schema not in ('pg_catalog','information_schema') order by table_schema, table_name, ordinal_position`
    )
    return result.rows
  }
  async query(sql: string, params: unknown[] = []) {
    if (!/^\s*(select|with|explain)\b/i.test(sql))
      throw new Error('Database MCP only permits SELECT, WITH and EXPLAIN statements')
    const result = await this.pool.query(sql, params)
    return { rowCount: result.rowCount, rows: result.rows }
  }
  close() {
    return this.pool.end()
  }
}

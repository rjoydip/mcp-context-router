-- Initial schema for MCP Context Router D1 database
-- Run with: wrangler d1 migrations apply mcp-context-router-db --local

CREATE TABLE IF NOT EXISTS repositories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  description TEXT,
  synced_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_repositories_owner_name ON repositories(owner, name);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  size INTEGER NOT NULL,
  sha TEXT NOT NULL,
  modified_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(repo_id, path)
);

CREATE INDEX IF NOT EXISTS idx_files_repo_path ON files(repo_id, path);
CREATE INDEX IF NOT EXISTS idx_files_sha ON files(sha);

CREATE TABLE IF NOT EXISTS symbols (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  line INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_symbols_file ON symbols(file_id);
CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);

CREATE TABLE IF NOT EXISTS pull_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  state TEXT NOT NULL,
  author TEXT NOT NULL,
  head_ref TEXT NOT NULL,
  base_ref TEXT NOT NULL,
  head_sha TEXT NOT NULL,
  base_sha TEXT NOT NULL,
  draft INTEGER NOT NULL DEFAULT 0,
  mergeable INTEGER,
  html_url TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(repo_id, number)
);

CREATE INDEX IF NOT EXISTS idx_prs_repo_state ON pull_requests(repo_id, state);
CREATE INDEX IF NOT EXISTS idx_prs_updated ON pull_requests(updated_at);

CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  state TEXT NOT NULL,
  author TEXT NOT NULL,
  labels TEXT,
  html_url TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(repo_id, number)
);

CREATE INDEX IF NOT EXISTS idx_issues_repo_state ON issues(repo_id, state);
CREATE INDEX IF NOT EXISTS idx_issues_updated ON issues(updated_at);

CREATE TABLE IF NOT EXISTS commits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  sha TEXT NOT NULL,
  message TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT,
  author_date INTEGER NOT NULL,
  committer_name TEXT NOT NULL,
  committer_email TEXT,
  committer_date INTEGER NOT NULL,
  html_url TEXT NOT NULL,
  synced_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(repo_id, sha)
);

CREATE INDEX IF NOT EXISTS idx_commits_repo_date ON commits(repo_id, author_date);
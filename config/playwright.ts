import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export default defineConfig({
  testDir: resolve(root, 'tests/e2e'),
  use: {
    baseURL: 'http://127.0.0.1:5173'
  },
  webServer: [
    {
      command: 'vp dev --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      cwd: root,
      reuseExistingServer: !process.env.CI
    },
    {
      command: 'bun scripts/e2e-api.ts',
      url: 'http://127.0.0.1:8787/health',
      cwd: root,
      reuseExistingServer: !process.env.CI
    }
  ],
  outputDir: resolve(root, 'test-results'),
  reporter: process.env.CI ? 'github' : 'list'
})

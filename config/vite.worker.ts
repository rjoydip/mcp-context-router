import { defineConfig } from 'vite-plus'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export default defineConfig({
  build: {
    ssr: resolve(root, 'src/worker/index.ts'),
    outDir: resolve(root, 'dist/worker'),
    rollupOptions: {
      output: {
        format: 'es',
        entryFileNames: 'index.js'
      }
    },
    target: 'es2022'
  },
  ssr: {
    external: ['@modelcontextprotocol/server', '@modelcontextprotocol/node', 'hono', 'zod/v4']
  }
})

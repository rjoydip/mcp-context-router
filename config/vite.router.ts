import { defineConfig } from 'vite-plus'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export default defineConfig({
  build: {
    ssr: resolve(root, 'src/server/index.ts'),
    outDir: resolve(root, 'dist/router'),
    rollupOptions: {
      output: {
        format: 'es',
        entryFileNames: 'index.js'
      }
    }
  }
})

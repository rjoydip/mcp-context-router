import { defineConfig, type PluginOption } from 'vite-plus'
import react from '@vitejs/plugin-react'

// vite-plus re-exports types from its own vite core fork
// (@voidzero-dev/vite-plus-core), while `@vitejs/plugin-react` is typed against
// upstream `vite`. The two `Plugin` types are structurally similar but are
// distinct declarations, so TypeScript cannot unify them and reports TS2321
// ("excessive stack depth") when comparing the plugin array against
// `PluginOption[]`.
//
// This is a single, contained cast at the boundary between the two type
// universes: it narrows the plugin list to the fork's own `PluginOption` and is
// verified at runtime by `bun run build` and `bun run test`.
const plugins = react() as unknown as PluginOption[]

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      '@router': '/src/core'
    }
  },
  build: {
    outDir: 'dist/web',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8787'
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/web/**', 'src/server/**', 'src/worker/**', 'src/cloudflare/**']
    }
  },
  lint: {
    ignorePatterns: ['dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**'],
    options: {
      typeAware: true,
      typeCheck: true
    },
    rules: {
      'no-console': ['warn', { allow: ['error', 'warn'] }]
    }
  },
  fmt: {
    singleQuote: true,
    semi: false,
    trailingComma: 'none'
  },
  staged: {
    '*.{ts,tsx,js,jsx,json,md,yml,yaml}': 'vp check --fix'
  }
})

import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@db': resolve(__dirname, 'src/db'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    isolate: true,
    exclude: ['e2e/**', 'node_modules/**'],
  },
})

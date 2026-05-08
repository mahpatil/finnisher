import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: { baseURL: 'http://localhost:3142' },
  webServer: {
    command: 'npm run dev:test',
    url: 'http://localhost:3142',
    reuseExistingServer: !process.env['CI'],
    timeout: 60000,
  },
})

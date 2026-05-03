import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: { baseURL: 'http://localhost:3141' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3141',
    reuseExistingServer: !process.env['CI'],
    timeout: 30000,
  },
})

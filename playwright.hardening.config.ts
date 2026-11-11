import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e', testMatch: ['hardening.spec.ts', 'code.spec.ts'], workers: 1,
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5186' },
  reporter: 'list',
  webServer: { command: 'npm run dev -- --port 5186', url: 'http://localhost:5186', timeout: 30000 },
})

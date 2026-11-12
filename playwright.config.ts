import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}/bare-bones-kiro/`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: 0,
  forbidOnly: Boolean(process.env['CI']),
  reporter: process.env['CI'] ? 'github' : 'list',
  use: { baseURL: BASE, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/serve.mjs',
    url: BASE,
    reuseExistingServer: !process.env['CI'],
    env: { PORT: String(PORT) },
  },
});

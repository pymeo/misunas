import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  webServer: {
    command: 'npm run build && npm run preview -- --port 4322',
    url: 'http://localhost:4322/es/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  use: {
    baseURL: 'http://localhost:4322',
  },
});

import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 45000, expect: { timeout: 15000 }, fullyParallel: false, workers: 1,
  use: { baseURL: 'http://localhost:5180', channel: 'chrome', headless: true },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5180 --strictPort', url: 'http://localhost:5180', reuseExistingServer: !process.env.CI },
});

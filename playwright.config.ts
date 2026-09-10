import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:4329',
    headless: true,
    launchOptions: process.platform === 'win32' ? { channel: 'msedge' } : {},
  },
  webServer: {
    command: 'node tests/dev-server.mjs',
    url: 'http://127.0.0.1:4329',
    timeout: 180000,
    reuseExistingServer: false,
    env: { ASTRO_TELEMETRY_DISABLED: '1' },
  },
});

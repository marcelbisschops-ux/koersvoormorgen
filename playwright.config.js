import { defineConfig, devices } from '@playwright/test';

// UI-tests draaien tegen een lokale static-server (mna.html) + de LIVE worker.
// De static-server serveert de repo-root zodat /mna.html bereikbaar is.
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8799',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'node tests/statische-server.mjs 8799', // N-156: robuust onder belasting (was python3 -m http.server)
    url: 'http://localhost:8799/mna.html',
    reuseExistingServer: true,
    timeout: 20000,
  },
});

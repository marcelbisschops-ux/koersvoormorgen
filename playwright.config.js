import { defineConfig, devices } from '@playwright/test';
// N-205 (13-11-2026): de staging-CORS staat alleen localhost:8799 toe, dus de poort blijft 8799. Met
// reuseExistingServer kon een server uit een ANDERE werkboom worden hergebruikt (testte dan andere bestanden);
// globalSetup controleert daarom dat de draaiende server exact deze werkboom serveert en stopt anders met een fout.
const PORT = 8799;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  globalSetup: './tests/global-setup-server.mjs',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:' + PORT,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'node tests/statische-server.mjs ' + PORT, // N-156: robuust onder belasting (was python3 -m http.server)
    url: 'http://localhost:' + PORT + '/mna.html',
    reuseExistingServer: true,
    timeout: 20000,
  },
});

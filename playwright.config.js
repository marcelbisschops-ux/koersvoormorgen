import { defineConfig, devices } from '@playwright/test';
import { createHash } from 'node:crypto';

// 13-11-2026: elke werkboom krijgt een eigen, vaste poort (afgeleid van het pad). Met één vaste poort 8799 en
// reuseExistingServer hergebruikte een test in werkboom B ongemerkt een server die de bestanden van werkboom A serveerde;
// browsertests en de pre-push-suite testten dan andere bestanden dan de releasekandidaat. KVM_TEST_PORT overschrijft.
const PORT = Number(process.env.KVM_TEST_PORT) || 8800 + (parseInt(createHash('sha256').update(process.cwd()).digest('hex').slice(0, 6), 16) % 900);

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

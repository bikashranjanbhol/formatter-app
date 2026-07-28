import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3100;
const baseURL = `http://localhost:${PORT}`;

// In this managed environment a full Chromium is pre-installed and exposed via
// a stable symlink; use it instead of downloading a version-matched browser.
const PREINSTALLED_CHROMIUM = '/opt/pw-browsers/chromium';
const chromiumExecutable = existsSync(PREINSTALLED_CHROMIUM) ? PREINSTALLED_CHROMIUM : undefined;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromiumExecutable ? { executablePath: chromiumExecutable } : {},
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

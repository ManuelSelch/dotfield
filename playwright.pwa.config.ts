import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/pwa',
  workers: 1,
  use: {
    headless: true,
    viewport: { width: 320, height: 568 },
    channel: process.env.PLAYWRIGHT_CHANNEL,
  },
});

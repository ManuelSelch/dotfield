import { test as base } from '@playwright/test';

import { DotfieldDriver } from './dotfield-driver';

export const test = base.extend<{ app: DotfieldDriver }>({
  app: async ({ page }, provide) => {
    await provide(new DotfieldDriver(page));
  },
});

import { expect, test } from '@playwright/test';

test('small-screen gameplay hides branding but Home and desktop retain it', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  const logo = page.getByRole('heading', { name: 'dotfield', exact: true });
  await expect(logo).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(logo).toBeHidden();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  for (const name of ['Home', 'Restart', 'Resume', 'Show enemy dashboard']) {
    await page.getByRole('button', { name, exact: true }).click({ trial: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(logo).toBeVisible();
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(logo).toBeHidden();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(logo).toBeVisible();
});

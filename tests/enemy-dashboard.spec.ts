import { expect, test } from '@playwright/test';
import { openAuthoredMatch } from './helpers/openAuthoredMatch';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await openAuthoredMatch(page);
});

test('shows real enemy decisions in a dismissible mobile overlay without resizing the map', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const board = page.getByRole('img', { name: 'Territory board' });
  const boardBox = await board.boundingBox();
  const toggle = page.getByRole('button', { name: 'Show enemy dashboard' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  const dashboard = page.getByRole('complementary', { name: 'Enemy dashboard' });
  await expect(dashboard).toBeVisible();
  expect(await board.boundingBox()).toEqual(boardBox);

  await page.clock.runFor(2050);
  await expect(dashboard).toContainText('Enemy 1 · City 1 → Neutral · City 2');
  await expect(dashboard).toContainText('AI score');
  await expect(dashboard.getByText(/Other viable actions/)).toBeVisible();
  await expect(dashboard.getByText(/Why others were blocked/)).toBeVisible();
  await dashboard.locator('.enemy-dashboard__details').first().locator('summary').click();
  await dashboard.locator('.enemy-dashboard__candidate').first().click();
  await expect(page.locator('.enemy-dashboard-map-marker')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/enemy-dashboard-mobile.png' });

  await page.keyboard.press('Escape');
  await expect(dashboard).toHaveCount(0);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

test('explains a real no-action decision with its actual blockers', async ({ page }) => {
  await page.goto('/tests/fixtures/ai-dashboard.html');
  await page.getByRole('button', { name: 'Show enemy dashboard' }).click();
  await page.clock.runFor(2050);
  const dashboard = page.getByRole('complementary', { name: 'Enemy dashboard' });
  await expect(dashboard).toContainText('No action selected');
  await expect(dashboard.getByText(/Why no action/)).toBeVisible();
  await expect(dashboard).toContainText('Too few dispatchable troops');
  const blockerExample = dashboard.locator('.enemy-dashboard__example').first();
  await expect(blockerExample).not.toContainText('Relay');
  await page.screenshot({ path: 'test-results/enemy-dashboard-no-action.png' });
  await blockerExample.click();
  await expect(page.locator('.enemy-dashboard-map-marker')).toHaveCount(1);
});

test('fits the overlay in a short 320px mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.getByRole('button', { name: 'Show enemy dashboard' }).click();
  const dashboard = page.getByRole('complementary', { name: 'Enemy dashboard' });
  const panelBox = await dashboard.boundingBox();
  expect(panelBox!.x).toBeGreaterThanOrEqual(0);
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(320);
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(480);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('lists each configured enemy faction', async ({ page }) => {
  await page.goto('/tests/fixtures/round.html?passive');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Show enemy dashboard' }).click();
  const dashboard = page.getByRole('complementary', { name: 'Enemy dashboard' });
  await expect(dashboard.getByRole('region', { name: 'Enemy 1' })).toBeVisible();
  await expect(dashboard.getByRole('region', { name: 'Enemy 2' })).toBeVisible();
});

test('docks beside the field on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('button', { name: 'Show enemy dashboard' }).click();
  const board = page.getByRole('img', { name: 'Territory board' });
  const dashboard = page.getByRole('complementary', { name: 'Enemy dashboard' });
  const boardBox = await board.boundingBox();
  const panelBox = await dashboard.boundingBox();
  expect(panelBox!.x).toBeGreaterThanOrEqual(boardBox!.x + boardBox!.width);
  expect(boardBox!.width).toBeGreaterThan(300);
  await page.screenshot({ path: 'test-results/enemy-dashboard-desktop.png' });
});

import { expect, test, type Page } from '@playwright/test';
const key = (enemy = 'enemy') => `dotfield.bot-project.v1.${enemy}`;
async function open(page: Page, enemy = 1) {
  await page.getByText('Enemy settings', { exact: true }).click();
  await page.getByRole('button', { name: `Edit Enemy ${enemy} logic`, exact: true }).click();
  await expect(
    page.getByRole('heading', { name: `Enemy ${enemy} logic`, exact: true }),
  ).toBeVisible();
}
async function select(page: Page, id: string) {
  await page.getByLabel('Selected step', { exact: true }).selectOption(id);
}
async function stored(page: Page, enemy = 'enemy') {
  return page.evaluate((k) => localStorage.getItem(k), key(enemy));
}

test('lazy editor saves/reopens shared edits; custom activation remains visibly gated', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/');
  expect(requests.some((u) => u.includes('blockly'))).toBe(false);
  await open(page);
  await page.getByRole('button', { name: 'Capture', exact: true }).click();
  await select(page, 'select-sources');
  await page.getByLabel('minimum army value', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Editor status' })).toContainText('Saved');
  const saved = await stored(page);
  expect(saved).toContain('20');
  await page.getByRole('button', { name: 'Back to Home', exact: true }).click();
  await expect(page.getByLabel('Enemy 1 logic', { exact: true })).toHaveValue('normal');
  await expect(
    page.getByLabel('Enemy 1 logic', { exact: true }).locator('option[value="custom"]'),
  ).toHaveAttribute('disabled', '');
  await open(page);
  await select(page, 'select-sources');
  await expect(page.getByLabel('minimum army value', { exact: true })).toHaveValue('20');
  await page.getByLabel('minimum army value', { exact: true }).fill('25');
  await page.getByRole('button', { name: 'Back to Home', exact: true }).click();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(page.getByLabel('minimum army value', { exact: true })).toHaveValue('25');
  await page.getByRole('button', { name: 'Back to Home', exact: true }).click();
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  expect(await stored(page)).toBe(saved);
  await expect(page.locator('.blocklySvg')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('invalid save, reset/undo, signature edits and referenced deletion protect the saved source', async ({
  page,
}) => {
  await page.goto('/');
  await open(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const saved = await stored(page);
  await page.getByRole('button', { name: 'Capture', exact: true }).click();
  await page.getByText('Tactics and inputs', { exact: true }).click();
  await page.getByRole('button', { name: 'Delete tactic', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('referenced');
  await select(page, 'forecast');
  await page.getByLabel('forecast ms value', { exact: true }).fill('60000');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('15000');
  expect(await stored(page)).toBe(saved);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Add input', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Supply');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Reset draft', exact: true }).click();
  expect(await stored(page)).toBe(saved);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Editor status' })).toContainText('Saved');
});
test('storage/version failures retain drafts and require explicit replacement', async ({
  page,
}) => {
  await page.addInitScript((k) => localStorage.setItem(k, '{"version":999}'), key());
  await page.goto('/');
  await open(page);
  await expect(page.getByRole('alert')).toContainText('cannot be loaded');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  expect(await stored(page)).toBe('{"version":999}');
  await page.getByRole('button', { name: 'Replace unreadable save', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm replacement', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Editor status' })).toContainText('Saved');
  await select(page, 'neutral-call');
  await page.getByLabel('target class value', { exact: true }).selectOption('enemy');
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota', 'QuotaExceededError');
    };
  });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('full');
  await expect(page.getByLabel('target class value', { exact: true })).toHaveValue('enemy');
});
for (const [width, height] of [
  [320, 480],
  [430, 932],
  [1280, 900],
])
  test(`native tap/keyboard steps and layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await open(page);
    await select(page, 'enemy-call');
    await page.getByRole('button', { name: 'Move up', exact: true }).click();
    await expect(page.getByLabel('Selected step')).toHaveValue('enemy-call');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await select(page, 'main-priority');
    await page.getByRole('button', { name: 'Add Sequence', exact: true }).click();
    await page.getByRole('button', { name: 'Delete step', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('button', { name: 'Back to Home', exact: true }).click();
    if (await page.getByRole('button', { name: 'Discard changes', exact: true }).isVisible())
      await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
    await expect(page.locator('.blocklySvg')).toHaveCount(0);
  });

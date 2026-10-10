import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/tests/fixtures/round.html?bridges');
});

async function getTransfer(page: ReturnType<typeof expect>['page']) {
  return page.getByRole('list', { name: 'Unit transfers' });
}

test('stages to a bridge city then crosses to the paired endpoint', async ({ page }) => {
  const transfers = await getTransfer(page);
  const bridge = page.getByRole('button', { name: /Select west-south region/ });
  const farBank = page.getByRole('button', { name: /Select west-north region/ });

  // Stage from south to west-south (same bank).
  const south = page.getByRole('button', { name: /Select south region:/ });
  await south.focus();
  await page.keyboard.press('Enter');
  await bridge.focus();
  await page.keyboard.press('Enter');
  await expect(transfers.getByRole('listitem').filter({ hasText: 'south → west-south' })).not.toHaveCount(0);
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toContainText('31 units');

  // Resolve arrival so west-south has troops to cross.
  await page.clock.runFor(5000);
  await expect(page.getByRole('listitem').filter({ hasText: /^west-south:/ })).toContainText('You');

  // Cross from west-south to west-north (paired bridge cities).
  await bridge.focus();
  await page.keyboard.press('Enter');
  await farBank.focus();
  await page.keyboard.press('Enter');
  await expect(transfers.getByRole('listitem').filter({ hasText: 'west-south → west-north' })).not.toHaveCount(0);
});

test('rejects invalid cross-bank orders and preserves existing queues', async ({ page }) => {
  const transfers = await getTransfer(page);

  // Start a valid same-bank order via keyboard.
  const south = page.getByRole('button', { name: /Select south region:/ });
  const bridge = page.getByRole('button', { name: /Select west-south region/ });
  await south.focus(); await page.keyboard.press('Enter');
  await bridge.focus(); await page.keyboard.press('Enter');
  const initialCount = await transfers.getByRole('listitem').count();
  expect(initialCount).toBeGreaterThan(0);

  // Try an illegal cross-bank order to an unpaired northern city.
  const north = page.getByRole('button', { name: /Select north region:/ });
  await south.focus(); await page.keyboard.press('Enter');
  await north.focus(); await page.keyboard.press('Enter');
  await expect(transfers.getByRole('listitem')).toHaveCount(initialCount);
});

test('river map renders bridge decks and prevents river-area selection', async ({ page }) => {
  const canvas = page.getByRole('img', { name: 'Territory board' });
  const box = await canvas.boundingBox();
  // A point in the middle of the river should not select any city.
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height * 0.5);
  await page.mouse.down();
  // Nothing should happen (no source selected).
  const south = page.getByRole('button', { name: /Select south region:/ });
  await south.focus();
  await page.keyboard.press('Enter');
  // Drag from south to the river area; release should cancel, not dispatch.
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height * 0.5);
  await page.mouse.up();
  const transfers = await getTransfer(page);
  await expect(transfers.getByRole('listitem').filter({ hasText: 'south →' })).toHaveCount(0);
});

test('AI stages reinforcements at bridge cities before crossing', async ({ page }) => {
  const transfers = await getTransfer(page);
  await page.clock.runFor(3000);
  // The AI should not attempt illegal cross-bank skips; it stages or sends within its bank.
  const aiTransfers = transfers.getByRole('listitem').filter({ hasText: /north|north-east|north-west/ });
  const count = await aiTransfers.count();
  for (let i = 0; i < count; i++) {
    const text = await aiTransfers.nth(i).textContent();
    const target = text?.match(/→ (\w+)/)?.[1];
    if (target) {
      // If the target is on the far bank, the source must be its paired bridge city.
      const isFarBank = ['west-north', 'east-north', 'north'].includes(target);
      if (isFarBank) {
        const source = text?.match(/(\w+) →/)?.[1];
        expect(['west-north', 'east-north']).toContain(source);
      }
    }
  }
});

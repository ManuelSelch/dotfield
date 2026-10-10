import { expect, test } from '@playwright/test';
import { SAVED_GAME_KEY } from '../src/game/persistence';
import { MATCH_PREFERENCES_KEY, defaultMatchPreferences } from '../src/game/matchPreferences';
import { generateMap } from '../src/board/generateMap';
import { compileRoundSetup } from '../src/game/upgrades/compile';
import { createSimulation } from '../src/game/state';
import { TERRITORY_RADIUS } from '../src/game/settings';

async function saved(page: import('@playwright/test').Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVED_GAME_KEY);
}
for (const viewport of [{ width: 320, height: 480 }, { width: 430, height: 932 }, { width: 1280, height: 900 }]) {
  test(`generated setup, real upgrades and fixed mobile Play at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'A fresh field. Every time.' })).toHaveCount(0);
    await expect(page.getByText('Choose your match. We’ll make the map.')).toHaveCount(0);
    for (const helper of ['Total cities on the field', 'Opposing factions, not cities', 'Factories worth fighting for', 'Crossings shape your strategy'])
      await expect(page.getByText(helper, { exact: true })).toHaveCount(0);
    await expect(page.getByText(/^You \+ \d+ enemies? · \d+ neutral cities$/)).toHaveCount(0);
    const play = page.getByRole('button', { name: 'Play', exact: true });
    const preview = page.getByRole('img', { name: 'Generated map preview' });
    await expect(preview.locator('circle[cx]')).toHaveCount(12);
    await expect(preview.locator('g[aria-label="River with two paired bridge crossings"] rect[rx="3"]')).toHaveCount(2);
    await expect(page.locator('.home-preview').getByRole('button', { name: 'Reroll' })).toHaveCount(0);
    for (const circle of await preview.locator('circle[cx]').all()) await expect(circle).toHaveAttribute('r', String(TERRITORY_RADIUS));
    for (const counter of await preview.locator('text').all()) await expect(counter).toHaveAttribute('font-size', String(TERRITORY_RADIUS));
    await expect(page.getByRole('button', { name: /Next map|Previous map|Hide preview|Random/ })).toHaveCount(0);
    const artillery = page.getByRole('group', { name: 'Artillery' });
    const watchtower = page.getByRole('group', { name: 'Watchtower' });
    const slowZone = page.getByRole('group', { name: 'Slow Zone' });
    await expect(artillery.getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(watchtower.getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(slowZone.getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(preview.locator('[aria-label="Artillery range"]')).toHaveCount(0);
    await artillery.getByRole('button', { name: 'On', exact: true }).click();
    await expect(preview.locator('[aria-label="Artillery range"]')).toHaveAttribute('r', '90');
    await expect(preview.locator('[aria-label="Artillery"]')).toHaveCount(1);
    await artillery.getByRole('button', { name: 'Off', exact: true }).click();
    await watchtower.getByRole('button', { name: 'On', exact: true }).click();
    await expect(preview.locator('[aria-label="Watchtower coverage"]')).toHaveCount(3);
    await slowZone.getByRole('button', { name: 'On', exact: true }).click();
    await expect(preview.locator('[aria-label="Slow Zone coverage"]')).toHaveCount(1);
    await watchtower.getByRole('button', { name: 'Off', exact: true }).click();
    await slowZone.getByRole('button', { name: 'Off', exact: true }).click();
    await expect(play).toBeInViewport();
    const initialRerollBox = (await page.getByRole('button', { name: 'Reroll' }).boundingBox())!;
    const initialPlayBox = (await play.boundingBox())!;
    expect(Math.abs(initialRerollBox.y - initialPlayBox.y)).toBeLessThan(1);
    expect(initialRerollBox.x + initialRerollBox.width).toBeLessThanOrEqual(initialPlayBox.x);
    expect((await artillery.getByRole('button', { name: 'Off', exact: true }).boundingBox())!.height).toBeLessThanOrEqual(32);
    await expect.poll(() => play.evaluate(button => getComputedStyle(button).backgroundColor)).toBe('rgb(38, 124, 114)');
    await page.screenshot({ path: `test-results/generated-setup-${viewport.width}.png` });
    await page.getByRole('button', { name: 'More cities' }).click();
    await page.getByRole('group', { name: 'Number of enemy factions' }).getByRole('button', { name: '4', exact: true }).click();
    await page.getByRole('group', { name: 'River and bridges' }).getByRole('button', { name: 'Off', exact: true }).click();
    await page.getByRole('group', { name: 'Map industry' }).getByRole('button', { name: 'Off', exact: true }).click();
    await artillery.getByRole('button', { name: 'On', exact: true }).click();
    await expect(preview.locator('[aria-label="Artillery range"]')).toHaveAttribute('r', '90');
    await page.getByText('Your upgrades', { exact: true }).click();
    const playerUpgrades = page.getByRole('group', { name: 'Your upgrades' });
    await expect(playerUpgrades.getByRole('checkbox', { name: 'Watchtower' })).toHaveCount(0);
    await expect(playerUpgrades.getByRole('checkbox', { name: 'Slow Zone' })).toHaveCount(0);
    await playerUpgrades.getByRole('checkbox', { name: 'Industry' }).check();
    await page.getByRole('group', { name: 'Your upgrades' }).getByRole('checkbox', { name: 'Factory', exact: false }).check();
    await page.getByRole('group', { name: 'Your upgrades' }).getByRole('checkbox', { name: 'Capture shield', exact: true }).check();
    await expect(page.locator('summary').filter({ hasText: 'Your upgrades' })).toContainText('3 enabled');
    await page.getByText('Enemy settings', { exact: true }).click();
    await page.getByLabel('Enemy 4 behavior').selectOption('defensive');
    await expect(page.getByRole('group', { name: 'enemy-4 upgrades' }).getByRole('checkbox', { name: 'Watchtower' })).toHaveCount(0);
    await watchtower.getByRole('button', { name: 'On', exact: true }).click();
    await slowZone.getByRole('button', { name: 'On', exact: true }).click();
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).map, MATCH_PREFERENCES_KEY)).toMatchObject({ watchtower: true, slowZone: true });
    await play.scrollIntoViewIfNeeded();
    await expect(play).toBeInViewport();
    if (viewport.width < 761) {
      expect(await play.evaluate(el => getComputedStyle(el.parentElement!).position)).toBe('fixed');
      await page.getByRole('button', { name: 'Reroll' }).scrollIntoViewIfNeeded();
      await expect(play).toBeInViewport();
    }
    const before = await preview.locator('circle[cx]').first().getAttribute('cx');
    await page.getByRole('button', { name: 'Reroll' }).click();
    expect(await preview.locator('circle[cx]').first().getAttribute('cx')).not.toBe(before);
    const previewCoordinates = await preview.locator('circle[cx]').evaluateAll(circles => circles.map(c => [Number(c.getAttribute('cx')), Number(c.getAttribute('cy'))]));
    await play.click();
    await expect(page.getByRole('img', { name: 'Territory board' })).toBeVisible();
    const initial = await saved(page);
    expect(initial.territories).toHaveLength(13);
    expect(initial.state.river).toBeUndefined();
    expect(initial.generated.preferences.map.artillery).toBe(true);
    expect(initial.state.terrain?.barriers[0].kind).toBe('mountain');
    expect(initial.territories.filter((city: { features?: { kind: string }[] }) => city.features?.some(feature => feature.kind === 'artillery'))).toHaveLength(1);
    expect(Object.keys(initial.ai)).toHaveLength(4);
    expect(initial.state.rules.factions.player.unitsPerSecond).toBe(1.25);
    expect(initial.state.rules.factions.player.captureShieldBatches).toBe(3);
    expect(initial.territories.filter((c: { features?: { kind: string }[] }) => c.features?.some(feature => feature.kind === 'watchtower'))).toHaveLength(5);
    expect(initial.territories.filter((c: { features?: { kind: string }[] }) => c.features?.some(feature => feature.kind === 'slow-zone'))).toHaveLength(1);
    expect(initial.territories.find((c: { owner: string }) => c.owner === 'player').features.some((feature: { kind: string }) => feature.kind === 'factory')).toBe(true);
    expect(initial.territories.map((c: { x: number; y: number }) => [c.x, c.y])).not.toEqual(previewCoordinates);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    expect((await saved(page)).territories).toEqual(initial.territories);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'New map', exact: true }).click();
    const next = await saved(page);
    expect(next.generated.seed).not.toBe(initial.generated.seed);
    expect(next.territories).not.toEqual(initial.territories);
    expect(next.generated.preferences).toEqual(initial.generated.preferences);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Paused', exact: true })).toBeVisible();
    expect((await saved(page)).territories).toEqual(next.territories);
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await expect(play).toBeFocused();
    await page.reload();
    await expect(preview.locator('circle[cx][r="14"]')).toHaveCount(13);
    await page.getByText('Your upgrades', { exact: true }).click();
    await expect(page.getByRole('group', { name: 'Your upgrades' }).getByRole('checkbox', { name: 'Industry' })).toBeChecked();
    await expect(page.getByRole('group', { name: 'Artillery' }).getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(errors).toEqual([]);
  });
}

test('inactive enemy settings are retained but not compiled into smaller matches', async ({ page }) => {
  await page.goto('/');
  const count = page.getByRole('group', { name: 'Number of enemy factions' });
  await count.getByRole('button', { name: '4', exact: true }).click();
  await page.getByText('Enemy settings', { exact: true }).click();
  await page.getByLabel('Enemy 4 behavior').selectOption('aggressive');
  await page.getByRole('group', { name: 'enemy-4 upgrades' }).getByRole('checkbox', { name: 'Industry' }).check();
  await count.getByRole('button', { name: '1', exact: true }).click();
  await expect(page.getByLabel('Enemy 4 behavior')).toHaveCount(0);
  await count.getByRole('button', { name: '4', exact: true }).click();
  await expect(page.getByLabel('Enemy 4 behavior')).toHaveValue('aggressive');
  await expect(page.getByRole('group', { name: 'enemy-4 upgrades' }).getByRole('checkbox', { name: 'Industry' })).toBeChecked();
  await count.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Territory board' })).toBeVisible();
  expect(Object.keys((await saved(page)).ai)).toEqual(['enemy']);
});

test('terminal New map preserves settings and upgrades, including a minimal four-enemy river field', async ({ page }) => {
  const preferences = { ...defaultMatchPreferences(), map: { ...defaultMatchPreferences().map, cities: 6, enemies: 4, river: true, industry: true, artillery: false },
    upgrades: { player: ['factory' as const], 'enemy-4': ['industry' as const] } };
  const map = generateMap(preferences.map, 17);
  const setup = compileRoundSetup(map.territories, preferences.upgrades, undefined, {}, map.river);
  const initial = createSimulation(setup.territories, setup.rules, setup.river);
  const game = { territories: setup.territories, ai: setup.ai, phase: 'running', generated: { seed: 17, preferences },
    state: { ...initial, roundStatus: 'victory', territories: initial.territories.map(city => ({ ...city, owner: 'player' })) } };
  await page.addInitScript(({ key, game }) => localStorage.setItem(key, JSON.stringify(game)), { key: SAVED_GAME_KEY, game });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Victory', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New map', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Victory', exact: true })).toHaveCount(0);
  const next = await saved(page);
  expect(next.generated.preferences).toEqual(preferences);
  expect(next.generated.seed).not.toBe(17);
  expect(next.territories).toHaveLength(6);
  expect(next.state.river.bridges).toHaveLength(2);
  expect(Object.keys(next.ai)).toHaveLength(4);
  expect(next.state.rules.factions['enemy-4'].unitsPerSecond).toBe(1.25);
  expect(next.territories.find((city: { owner: string }) => city.owner === 'player').features[0].kind).toBe('factory');
});

test('bad preferences fall back safely and city controls work with the keyboard', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{broken'), MATCH_PREFERENCES_KEY);
  await page.goto('/');
  const range = page.getByRole('slider', { name: 'Total cities' });
  await range.focus(); await page.keyboard.press('ArrowRight');
  await expect(range).toHaveValue('13');
  await page.getByRole('button', { name: 'Fewer cities' }).click();
  await expect(range).toHaveValue('12');
});

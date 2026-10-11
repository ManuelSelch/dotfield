import { expect, test } from '@playwright/test';

const city = (page: import('@playwright/test').Page, id: string) => page.getByRole('list', { name: 'Territory details' }).getByRole('listitem').filter({ hasText: new RegExp(`^${id}:`) });
async function fixture(page: import('@playwright/test').Page, query='') {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto(`/tests/fixtures/round.html?siege&no-growth${query}`);
}
async function send(page: import('@playwright/test').Page, source: string, target: string) {
  await page.getByRole('button', { name: new RegExp(`^Select ${source} region:`) }).focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: new RegExp(`^Select ${target} region:`) }).focus(); await page.keyboard.press('Enter');
}
for (const width of [320, 430]) {
  test(`Artillery captures activate garrison fire, pauses and replay resets at ${width}px`, async ({ page }) => {
    await page.setViewportSize({width,height:width===320?480:932});
    await fixture(page);
    await page.clock.runFor(2000);
    await expect(city(page,'near')).toHaveText('near: Opponent, 12 units.');
    await expect(city(page,'artillery')).toContainText('Artillery inactive');
    await send(page,'south','artillery');
    await page.clock.runFor(5850);
    await expect(city(page,'artillery')).toContainText('Artillery controlled by player');
    await page.clock.runFor(1950);
    await expect(city(page,'near')).toHaveText('near: Opponent, 7 units.');
    await page.clock.runFor(350);
    await expect(city(page,'near')).toHaveText('near: Opponent, 6 units.');
    await expect(page.getByRole('status',{name:'Artillery feedback'})).toContainText('artillery fired at near');
    await expect(city(page,'blocked')).toHaveText('blocked: Opponent, 12 units.');
    await expect(city(page,'neutral')).toHaveText('neutral: Neutral, 8 units.');
    await page.screenshot({ path: `test-results/artillery-${width}.png` });
    await page.getByRole('button',{name:'Pause',exact:true}).click();
    await page.clock.runFor(10000);
    await expect(city(page,'near')).toHaveText('near: Opponent, 6 units.');
    await page.getByRole('button',{name:'Restart',exact:true}).click();
    await expect(city(page,'artillery')).toContainText('Artillery inactive');
    await expect(city(page,'near')).toHaveText('near: Opponent, 12 units.');
    await expect(page.getByRole('list',{name:'Unit transfers'}).getByRole('listitem')).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  });
}
test('enemy-owned Artillery targets the player and real recapture transfers firing control', async ({page})=>{
  await fixture(page,'&gun-owner=enemy');
  await page.clock.runFor(2050); // First RAF establishes the session clock.
  await expect(city(page,'friendly')).toHaveText('friendly: You, 6 units.');
  await expect(city(page,'near')).toHaveText('near: Opponent, 12 units.');
  await send(page,'south','artillery');await page.clock.runFor(5850);
  await expect(city(page,'artillery')).toContainText('Artillery controlled by player');
  const before=await city(page,'friendly').textContent();
  await page.clock.runFor(2000);
  await expect(city(page,'near')).toHaveText('near: Opponent, 6 units.');
  expect(await city(page,'friendly').textContent()).toBe(before);
});
test('zero defenders retain hostile ownership and artillery orders reach without mountain block',async({page})=>{
  await fixture(page,'&gun-owner=player');
  await expect(city(page,'artillery')).toContainText('14 units.');
  await page.clock.runFor(24100);
  await expect(city(page,'near')).toHaveText('near: Opponent, 0 units.');
  await expect(city(page,'blocked')).toHaveText('blocked: Opponent, 0 units.');
  await expect(page.getByRole('region',{name:'Victory'})).toHaveCount(0);
  await send(page,'artillery','near');await page.clock.runFor(1250);
  await expect(city(page,'near')).toHaveText('near: You, 5 units.');
});
test('authored Siege field and paused reload preserve Artillery metadata with no mountain barriers',async({page})=>{
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  // The fresh-match Home intentionally does not select from authored regression maps.
  await page.goto('/tests/fixtures/round.html?siege&passive');
  await expect(city(page,'artillery')).toContainText('Artillery inactive');
  await expect(city(page,'near')).toHaveText('near: Opponent, 12 units.');
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  await page.reload();
  await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();
  await expect(city(page,'artillery')).toContainText('Artillery inactive');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('dotfield.saved-game.v1')!));
  expect(saved.state.terrain.barriers).toHaveLength(0);
  expect(saved.state.territories.find((c:{id:string})=>c.id==='artillery').features[0].kind).toBe('artillery');
});

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
    await expect(city(page,'near')).toHaveText('near: Opponent, 12 units.');
    await page.clock.runFor(50);
    await expect(city(page,'near')).toHaveText('near: Opponent, 11 units.');
    await expect(page.getByRole('status',{name:'Artillery feedback'})).toContainText('artillery fired at near');
    await expect(city(page,'blocked')).toHaveText('blocked: Opponent, 12 units.');
    await expect(city(page,'neutral')).toHaveText('neutral: Neutral, 8 units.');
    await page.screenshot({ path: `test-results/artillery-${width}.png` });
    await page.getByRole('button',{name:'Pause',exact:true}).click();
    await page.clock.runFor(10000);
    await expect(city(page,'near')).toHaveText('near: Opponent, 11 units.');
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
  await expect(city(page,'friendly')).toHaveText('friendly: You, 11 units.');
  await expect(city(page,'near')).toHaveText('near: Opponent, 12 units.');
  await send(page,'south','artillery');await page.clock.runFor(5850);
  await expect(city(page,'artillery')).toContainText('Artillery controlled by player');
  const before=await city(page,'friendly').textContent();
  await page.clock.runFor(2000);
  await expect(city(page,'near')).toHaveText('near: Opponent, 11 units.');
  expect(await city(page,'friendly').textContent()).toBe(before);
});
test('zero defenders retain hostile ownership and mountain-blocked direct orders spend nothing',async({page})=>{
  await fixture(page,'&gun-owner=player');
  await send(page,'artillery','blocked');
  await expect(page.getByRole('list',{name:'Unit transfers'}).getByRole('listitem')).toHaveCount(0);
  await expect(city(page,'artillery')).toContainText('14 units.');
  await page.clock.runFor(24100);
  await expect(city(page,'near')).toHaveText('near: Opponent, 0 units.');
  await expect(city(page,'blocked')).toHaveText('blocked: Opponent, 12 units.');
  await expect(page.getByRole('region',{name:'Victory'})).toHaveCount(0);
  await send(page,'artillery','near');await page.clock.runFor(1250);
  await expect(city(page,'near')).toHaveText('near: You, 5 units.');
});
test('Siege preview and paused reload preserve mountain geometry and Artillery metadata',async({page})=>{
  await page.goto('/');for(let n=0;n<7;n++)await page.getByRole('button',{name:'Next map'}).click();
  const preview=page.getByRole('img',{name:'Map 8 preview'});
  await expect(preview.locator('[aria-label="Artillery"]')).toHaveCount(1);
  await expect(preview.locator('[aria-label="Artillery range"]')).toHaveAttribute('r','90');
  await expect(preview.locator('[aria-label="Mountain blocks direct orders and shots"]')).toHaveCount(1);
  await page.getByRole('button',{name:'Play',exact:true}).click();
  await expect(city(page,'artillery')).toContainText('Artillery inactive');
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  await page.reload();
  await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();
  await expect(city(page,'artillery')).toContainText('Artillery inactive');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('dotfield.saved-game.v1')!));
  expect(saved.state.terrain.barriers[0].kind).toBe('mountain');
  expect(saved.state.territories.find((c:{id:string})=>c.id==='artillery').features[0].kind).toBe('artillery');
});

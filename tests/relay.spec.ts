import { expect, test } from '@playwright/test';
import { createSimulation } from '../src/game/state';
import { SAVED_GAME_KEY } from '../src/game/persistence';
import type { Territory } from '../src/game/types';

for (const width of [320, 430, 1280]) test(`Relay field toggle, preview and five-faction HUD at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: width===320?480:900 });
  await page.goto('/');
  const toggle=page.getByRole('button',{name:'Relay',exact:true});
  await expect(toggle).toHaveAttribute('aria-pressed','false');
  const toggleBox=(await toggle.boundingBox())!;
  expect(toggleBox.width).toBeGreaterThanOrEqual(44);expect(toggleBox.height).toBeGreaterThanOrEqual(44);
  await toggle.click();
  await expect(page.locator('[data-relay-city-id]')).toHaveCount(1);
  await page.getByRole('group',{name:'Number of enemy factions'}).getByRole('button',{name:'4',exact:true}).click();
  for(const name of ['Open field','River','Mountains','Courtyard','Open field']) {
    await page.getByRole('button',{name,exact:true}).click();
    await expect(toggle).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('[data-relay-city-id]')).toHaveCount(1);
  }
  await page.getByRole('group',{name:'Number of enemy factions'}).getByRole('button',{name:'4',exact:true}).click();
  const host=await page.locator('[data-relay-city-id]').getAttribute('data-relay-city-id');
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-pressed','true');
  // Reload rerolls Home; capture the exact currently displayed opening.
  const currentHost=await page.locator('[data-relay-city-id]').getAttribute('data-relay-city-id');
  expect(host).toBeTruthy();
  await page.getByRole('button',{name:'Play',exact:true}).click();
  const hud=page.getByRole('region',{name:'Relay scoreboard'});
  await expect(hud.getByRole('meter')).toHaveCount(5);
  await expect(page.getByRole('list',{name:'Territory details'}).getByRole('listitem').filter({hasText:currentHost!})).toContainText('Relay objective');
  const canvas=page.getByRole('img',{name:'Territory board'}), before=await canvas.boundingBox();
  const resolution=await canvas.evaluate(c=>({width:(c as HTMLCanvasElement).width,height:(c as HTMLCanvasElement).height}));
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  expect(await canvas.evaluate(c=>({width:(c as HTMLCanvasElement).width,height:(c as HTMLCanvasElement).height}))).toEqual(resolution);
  expect(await canvas.boundingBox()).toEqual(before);
  expect(await hud.evaluate(el=>el.getBoundingClientRect().height)).toBe(100);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByRole('button',{name:'Restart',exact:true})).toBeVisible();
});

const cities: Territory[]=[{id:'home',owner:'player',units:50,x:60,y:420},
  {id:'relay',owner:'player',units:50,x:180,y:240}, {id:'enemy',owner:'enemy',units:50,x:300,y:60}];
function saved(elapsedMs: number, score: number) {
  const state=createSimulation(cities,{unitsPerSecond:0},undefined,undefined,{cityId:'relay',activateAtMs:120000,targetMs:180000});
  return {territories:cities,ai:null,phase:'paused',state:{...state,elapsedMs,relay:{...state.relay!,scoresMs:{player:score,enemy:0}}}};
}

test('activation, holding, role conversion, pause/reload and restart preserve the exact relay',async({page})=>{
  await page.clock.install();
  await page.addInitScript(({key,value})=>{if(!sessionStorage.getItem('relay-fixture')){localStorage.setItem(key,JSON.stringify(value));sessionStorage.setItem('relay-fixture','set');}}, {key:SAVED_GAME_KEY,value:saved(119000,0)});
  await page.goto('/');
  const canvas=page.getByRole('img',{name:'Territory board'});
  const box=await canvas.boundingBox();
  await page.getByRole('button',{name:'Resume',exact:true}).click();
  await page.clock.runFor(2200);
  await expect(page.getByRole('region',{name:'Relay scoreboard'})).toContainText('You win in 179s');
  await page.getByRole('button',{name:/Select relay region/}).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button',{name:/Build Defender for/}).click();
  await expect(page.getByRole('list',{name:'Territory details'}).getByRole('listitem').filter({hasText:'relay:'})).toContainText('Defender city');
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  const score=await page.getByRole('meter',{name:'You relay holding seconds'}).getAttribute('aria-valuenow');
  await page.clock.runFor(10000);
  expect(await page.getByRole('meter',{name:'You relay holding seconds'}).getAttribute('aria-valuenow')).toBe(score);
  expect(await canvas.boundingBox()).toEqual(box);
  await page.reload();
  await expect(page.getByRole('meter',{name:'You relay holding seconds'})).toHaveAttribute('aria-valuenow',score!);
  await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Restart',exact:true}).click();
  await expect(page.getByRole('region',{name:'Relay scoreboard'})).toContainText('Relay activates in 2:00');
  await expect(page.getByRole('meter',{name:'You relay holding seconds'})).toHaveAttribute('aria-valuenow','0');
});

test('relay victory freezes with enemies alive and no popup explanation; replay resets it',async({page})=>{
  await page.clock.install();
  await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:SAVED_GAME_KEY,value:saved(299900,179900)});
  await page.goto('/');
  await page.getByRole('button',{name:'Resume',exact:true}).click();
  await page.clock.runFor(500);
  const result=page.getByRole('region',{name:'Victory',exact:true});
  await expect(result).toBeVisible();
  await expect(result).not.toContainText(/held|relay|conquer/i);
  await expect(page.getByRole('meter',{name:'You relay holding seconds'})).toHaveAttribute('aria-valuenow','180');
  await expect(page.getByRole('list',{name:'Territory details'})).toContainText('enemy: Opponent');
  await page.clock.runFor(5000);
  await expect(page.getByRole('meter',{name:'You relay holding seconds'})).toHaveAttribute('aria-valuenow','180');
  await page.getByRole('button',{name:'Play again',exact:true}).click();
  await expect(page.getByRole('region',{name:'Relay scoreboard'})).toContainText('Relay activates in 2:00');
});

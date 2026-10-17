import { expect, test } from '@playwright/test';
import { createSimulation } from '../src/game/state';
import { resolveAiBehavior } from '../src/game/ai/behaviors';
import { SAVED_GAME_KEY } from '../src/game/persistence';

test('real Network-enabled worker captures and scores the relay; player recapture preserves both totals', async ({ page }) => {
  await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const cities=[{id:'base',owner:'enemy',units:40,x:180,y:100},{id:'ordinary',owner:'neutral',units:5,x:80,y:100},
    {id:'relay',owner:'neutral',units:5,x:280,y:100},{id:'player',owner:'player',units:100,x:180,y:450}];
  const original=createSimulation(cities,{unitsPerSecond:0},undefined,undefined,{cityId:'relay',activateAtMs:120000,targetMs:180000});
  const state={...original,elapsedMs:120000,rules:{factions:{...original.rules.factions,enemy:{...original.rules.factions.enemy,connectedDefense:true}}}};
  await page.addInitScript(({key,game})=>localStorage.setItem(key,JSON.stringify(game)),{key:SAVED_GAME_KEY,
    game:{territories:cities,state,ai:{enemy:resolveAiBehavior('aggressive')},phase:'running'}});
  await page.goto('/');
  const details=page.getByRole('list',{name:'Territory details'}).getByRole('listitem').filter({hasText:'relay:'});
  for(let i=0;i<8;i++){await page.clock.runFor(1000);await page.waitForTimeout(20);}
  await expect(details).toContainText('Opponent');
  const enemyScore=page.getByRole('meter',{name:'Enemy 1 relay holding seconds'});
  await expect.poll(async()=>Number(await enemyScore.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  const earned=Number(await enemyScore.getAttribute('aria-valuenow'));
  await page.getByRole('button',{name:/Select player region/}).focus();await page.keyboard.press('Enter');
  await page.getByRole('button',{name:/Select relay region/}).focus();await page.keyboard.press('Enter');
  for(let i=0;i<25;i++){await page.clock.runFor(1000);await page.waitForTimeout(10);}
  await expect(details).toContainText('You');
  expect(Number(await enemyScore.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(earned);
  await expect.poll(async()=>Number(await page.getByRole('meter',{name:'You relay holding seconds'}).getAttribute('aria-valuenow'))).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

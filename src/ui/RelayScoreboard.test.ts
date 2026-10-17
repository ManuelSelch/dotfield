import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { RelayScoreboard } from './RelayScoreboard';
import { createSimulation } from '../game/state';
import { advanceRound } from '../game/round';
const cities = ['player','enemy','enemy-2','enemy-3','enemy-4'].map((owner,i)=>({id:`city-${i}`,owner,units:10,x:30+i*60,y:100}));
const state = () => createSimulation(cities, undefined, undefined, undefined, {cityId:'city-0',activateAtMs:120000,targetMs:180000});
it('shows the confirmed activation countdown and all five independent scores without live score announcements', () => {
  const html=renderToStaticMarkup(createElement(RelayScoreboard,{state:state(),phase:'running'}));
  expect(html).toContain('Relay activates in 2:00');
  expect(html.match(/role="meter"/g)).toHaveLength(5);
  expect(html).toContain('HOLD 180s TOTAL');
  expect(html).not.toContain('aria-live');
});
it('shows remaining holding time and pauses its holder indicator', () => {
  const held=advanceRound(state(),121000);
  expect(renderToStaticMarkup(createElement(RelayScoreboard,{state:held,phase:'running'}))).toContain('You win in 179s');
  const paused=renderToStaticMarkup(createElement(RelayScoreboard,{state:held,phase:'paused'}));
  expect(paused).toContain('Paused');expect(paused).not.toContain('+1/s');
});
it('omits the HUD in conquest rounds', () => {
  expect(renderToStaticMarkup(createElement(RelayScoreboard,{state:createSimulation(cities),phase:'running'}))).toBe('');
});

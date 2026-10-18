import {test,expect,type Page} from '@playwright/test';
async function open(page:Page,n=1){await page.getByText('Enemy settings',{exact:true}).click();await page.getByRole('button',{name:`Edit Enemy ${n} logic`,exact:true}).click();await expect(page.getByLabel('Selected step',{exact:true})).toBeVisible();}
const status=(page:Page)=>page.getByRole('status',{name:'Editor status'});

test('create/rename/delete tactic and inputs undo together; new tabs target their own body',async({page})=>{
 await page.goto('/');await open(page);await page.getByText('Tactics and inputs',{exact:true}).click();
 await page.getByLabel('New tactic name',{exact:true}).fill('Probe');await page.getByRole('button',{name:'Create tactic',exact:true}).click();
 await expect(page.getByRole('button',{name:'Probe',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByLabel('Selected step',{exact:true})).not.toHaveValue('main-entry');
 await page.getByRole('button',{name:'Add Clear set',exact:true}).click();
 await page.getByLabel('Tactic name',{exact:true}).fill('Sweep');await page.getByRole('button',{name:'Save',exact:true}).click();await expect(status(page)).toContainText('Saved');
 await page.getByRole('button',{name:'Delete tactic',exact:true}).click();await expect(page.getByRole('button',{name:'Sweep',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await page.getByRole('button',{name:'Sweep',exact:true}).click();
 await page.getByRole('button',{name:'Add input',exact:true}).click();await page.getByRole('button',{name:'Undo',exact:true}).click();
 await expect(page.getByLabel('input1 type',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Save',exact:true}).click();await expect(status(page)).toContainText('Saved');
 const source=await page.evaluate(()=>JSON.parse(localStorage.getItem('dotfield.bot-project.v1.enemy')!));
 expect(source.tabs[0].workspace.blocks.blocks[0].inputs.BODY.block.id).toBe('main-priority');
 const definition=source.tabs.find((t:{id:string})=>t.id!=='main'&&t.id!=='capture');
 expect(definition.workspace.blocks.blocks[0].inputs.BODY.block.type).toBe('df_clear_set');
});
test('saved projects remain independent between enemy slots',async({page})=>{
 await page.goto('/');await open(page);await page.getByLabel('Selected step',{exact:true}).selectOption('neutral-call');
 await page.getByLabel('target class value',{exact:true}).selectOption('enemy');await page.getByRole('button',{name:'Save',exact:true}).click();await expect(status(page)).toContainText('Saved');
 await page.getByRole('button',{name:'Back to Home',exact:true}).click();await open(page,2);await page.getByLabel('Selected step',{exact:true}).selectOption('neutral-call');
 await expect(page.getByLabel('target class value',{exact:true})).toHaveValue('neutral');
 await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('button',{name:'Back to Home',exact:true}).click();await open(page);
 await page.getByLabel('Selected step',{exact:true}).selectOption('neutral-call');await expect(page.getByLabel('target class value',{exact:true})).toHaveValue('enemy');
});
test('real SVG inline field editing and project keyboard undo use the same source',async({page})=>{
 await page.goto('/');await open(page);await page.getByRole('button',{name:'Capture',exact:true}).click();
 const pane=page.locator('.bot-workspace:not([hidden])');await expect(pane.locator('.blocklyPath').first()).toBeVisible();
 const army=pane.getByRole('button',{name:'Edit number: 6',exact:true});await army.click();
 await page.locator('.blocklyHtmlInput').fill('18');await page.locator('.blocklyHtmlInput').press('Enter');
 await page.getByLabel('Selected step',{exact:true}).selectOption('select-sources');await expect(page.getByLabel('minimum army value',{exact:true})).toHaveValue('18');
 await page.getByLabel('minimum army value',{exact:true}).focus();await page.keyboard.press('ControlOrMeta+z');
 await expect(page.getByLabel('minimum army value',{exact:true})).toHaveValue('6');await page.keyboard.press('ControlOrMeta+Shift+z');
 await expect(page.getByLabel('minimum army value',{exact:true})).toHaveValue('18');
});
test('signature rename preserves identity and forwarding; type edits remain invalid until resolved or undone',async({page})=>{
 await page.goto('/');await open(page);await page.getByRole('button',{name:'Capture',exact:true}).click();await page.getByText('Tactics and inputs',{exact:true}).click();
 await page.getByLabel('kind input name',{exact:true}).fill('which');await page.getByLabel('Selected step',{exact:true}).selectOption('select-target');
 await expect(page.getByLabel('target class binding',{exact:true})).toHaveValue('parameter:kind');
 await page.getByLabel('target class binding',{exact:true}).selectOption('literal');await page.getByLabel('target class binding',{exact:true}).selectOption('parameter:kind');
 await page.getByRole('button',{name:'Save',exact:true}).click();await expect(status(page)).toContainText('Saved');
 const before=await page.evaluate(()=>localStorage.getItem('dotfield.bot-project.v1.enemy'));
 await page.getByLabel('which type',{exact:true}).selectOption('army');await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByRole('alert')).toContainText('incompatible');
 expect(await page.evaluate(()=>localStorage.getItem('dotfield.bot-project.v1.enemy'))).toBe(before);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.getByLabel('which type',{exact:true})).toHaveValue('query');
 await page.getByRole('button',{name:'Main',exact:true}).click();await page.getByLabel('Selected step',{exact:true}).selectOption('neutral-call');await expect(page.getByLabel('which binding',{exact:true})).toHaveValue('literal');
 await expect(page.getByLabel('target class value',{exact:true})).toHaveValue('neutral');
});
test('lazy chunk failure explains recovery without touching saved projects',async({page})=>{
 await page.route('**/src/botEditor/BotEditor.tsx',route=>route.abort());await page.goto('/');await page.getByText('Enemy settings',{exact:true}).click();await page.getByRole('button',{name:'Edit Enemy 1 logic',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Editor unavailable');await page.getByRole('button',{name:'Back to Home',exact:true}).click();await expect(page.getByRole('button',{name:'Play',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('dotfield.bot-project.v1.enemy'))).toBeNull();
});
test('partial canvas mounting failures dispose workspaces/observers and cannot falsely save',async({page})=>{
 await page.addInitScript(()=>{
  let active=0;(window as unknown as {botObserverCount:()=>number}).botObserverCount=()=>active;
  const Original=window.ResizeObserver;
  window.ResizeObserver=class extends Original {private owned=false;observe(target:Element,options?:ResizeObserverOptions){if(target.classList.contains('bot-canvas')){this.owned=true;active++;throw Error('Editor observer failed');}super.observe(target,options);}disconnect(){if(this.owned){active--;this.owned=false;}super.disconnect();}};
 });
 await page.goto('/');await page.getByText('Enemy settings',{exact:true}).click();await page.getByRole('button',{name:'Edit Enemy 1 logic',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Editor observer failed');await expect(page.getByRole('button',{name:'Save',exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>(window as unknown as {botObserverCount:()=>number}).botObserverCount())).toBe(0);
 await page.getByRole('button',{name:'Back to Home',exact:true}).click();await expect(page.locator('.blocklySvg')).toHaveCount(0);
});
test('repeated mount/disposal releases workspace DOM and owned resize observers',async({page})=>{
 await page.addInitScript(()=>{
  const active=new Set<ResizeObserver>();(window as unknown as {botObservers:Set<ResizeObserver>}).botObservers=active;
  const Original=window.ResizeObserver;
  window.ResizeObserver=class extends Original {observe(target:Element,options?:ResizeObserverOptions){if(target.classList.contains('bot-canvas'))active.add(this);super.observe(target,options);}disconnect(){active.delete(this);super.disconnect();}};
 });
 await page.goto('/');for(let n=0;n<4;n++){
  await open(page);await expect(page.locator('.blocklySvg')).toHaveCount(2);
  await page.getByRole('button',{name:'Back to Home',exact:true}).click();await expect(page.locator('.blocklySvg')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as unknown as {botObservers:Set<ResizeObserver>}).botObservers.size)).toBe(0);
 }
});

import {test,expect,type Page} from '@playwright/test';
import {createServer,type Server} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
let server:Server,url:string,revision=0;
const types:Record<string,string>={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.gif':'image/gif','.txt':'text/plain','.webmanifest':'application/manifest+json'};
test.use({viewport:{width:430,height:932}});
test.beforeAll(async()=>{
 server=createServer(async(req,res)=>{const path=new URL(req.url??'/','http://localhost').pathname;try{const file=path==='/'?'index.html':`.${path}`;const body=await readFile(resolve('dist',file));res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(path==='/sw.js'?Buffer.concat([body,Buffer.from(`\n// editor test deployment ${revision}\n`)]):body);}catch{res.writeHead(404);res.end();}});
 await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const address=server.address();if(!address||typeof address==='string')throw Error('No address');url=`http://127.0.0.1:${address.port}`;
});
test.afterAll(async()=>{await new Promise<void>((done,reject)=>server.close(e=>e?reject(e):done()));});
async function controlled(page:Page){await page.goto(url);await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);}
async function open(page:Page){await page.getByText('Enemy settings',{exact:true}).click();await page.getByRole('button',{name:'Edit Enemy 1 logic',exact:true}).click();await expect(page.getByLabel('Selected step',{exact:true})).toBeVisible();}
test('first editor visit offline uses precached lazy code/media/licenses and preserves a saved draft',async({page,context})=>{
 const external:string[]=[];page.on('request',r=>{if(!r.url().startsWith(url)&&r.url().startsWith('http'))external.push(r.url());});
 await controlled(page);await expect(page.locator('.blocklySvg')).toHaveCount(0);
 await context.setOffline(true);await open(page);await page.getByRole('button',{name:'Capture',exact:true}).click();await page.getByLabel('Selected step',{exact:true}).selectOption('select-sources');
 await page.getByLabel('minimum army value',{exact:true}).fill('17');await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByRole('status',{name:'Editor status'})).toContainText('Saved');
 expect(await page.evaluate(async()=>{const response=await fetch('/licenses/BLOCKLY-LICENSE.txt');return response.ok&&(await response.text()).includes('Apache');})).toBe(true);
 expect(await page.evaluate(async()=>(await fetch('/blockly-media/sprites.svg')).ok)).toBe(true);
 await page.getByRole('button',{name:'Back to Home',exact:true}).click();await page.reload();await open(page);
 await page.getByLabel('Selected step',{exact:true}).selectOption('select-sources');await expect(page.getByLabel('minimum army value',{exact:true})).toHaveValue('17');expect(external).toEqual([]);
});
test('downloaded updates cannot discard an open editor draft through the Home update action',async({page})=>{
 await controlled(page);await open(page);await page.getByRole('button',{name:'Capture',exact:true}).click();await page.getByLabel('Selected step',{exact:true}).selectOption('select-sources');await page.getByLabel('minimum army value',{exact:true}).fill('19');
 revision++;await page.evaluate(async()=>{await(await navigator.serviceWorker.ready).update();});await expect(page.locator('header').getByRole('status')).toHaveText('Update ready');
 await expect(page.getByRole('button',{name:'Update now',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Back to Home',exact:true}).click();await page.getByRole('button',{name:'Keep editing',exact:true}).click();await expect(page.getByLabel('minimum army value',{exact:true})).toHaveValue('19');
 await page.getByRole('button',{name:'Back to Home',exact:true}).click();await page.getByRole('button',{name:'Discard changes',exact:true}).click();await expect(page.getByRole('button',{name:'Update now',exact:true})).toBeVisible();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
async function boot(directory){
 const child=spawn(process.execPath,['scripts/dev-local.mjs'],{
  cwd:path.join(root,'modern'),
  env:{...process.env,AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory,
   AKIMONO_E2E_FIXED_NOW:'1000000',
   AKIMONO_E2E_DETERMINISTIC_RNG:'1',
   AKIMONO_E2E_USE_SCENARIO:'mixed',
  },stdio:['ignore','pipe','pipe'],
 });
 let err='';
 child.stderr.on('data',x=>err+=x);
 const url=await Promise.race([
  new Promise((resolve,reject)=>{
   let output='';
   child.stdout.on('data',x=>{
    output+=x;
    const address=output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
    if(address)resolve(address);
   });
   child.once('error',reject);
   child.once('exit',code=>reject(Error('R3 HTTP exited '+code+' '+err)));
  }),
  new Promise((_,reject)=>setTimeout(
   ()=>reject(Error('R3 HTTP boot timed out '+err)),15000)),
 ]);
 const get=async()=>await(await fetch(url+'/api/state')).json();
 const post=async(endpoint,payload={})=>{
  const response=await fetch(url+endpoint,{method:'POST',
   headers:{'content-type':'application/json'},
   body:JSON.stringify(payload)});
  return {status:response.status,...await response.json()};
 };
 const stop=()=>child.exitCode!==null?Promise.resolve():
  new Promise(resolve=>{child.once('exit',resolve);child.kill();});
 return {get,post,stop,url};
}
test('R3 original #14 USE swords -> real zh-Hant HTTP shared sale -> CAS two-slot save -> process reboot and next sale',async t=>{
 const directory=await mkdtemp(path.join(tmpdir(),'akimono-r3-http-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 let server=await boot(directory);
 t.after(async()=>await server.stop());
 const api=async(path,payload={})=>server.post(path,payload);
 assert.equal((await api('/api/initialize')).code,'COMMITTED');
 assert.equal((await api('/api/open-shop',{
  expectedRevision:1,ownerName:'來源商人',shopName:'R3 劍商',
 })).code,'COMMITTED');
 assert.equal((await api('/api/supply',{
  expectedRevision:2,timespanSeconds:3600,
 })).code,'COMMITTED');
 let state=await server.get();
 const map=state.marketOffers.find(x=>x.itemId===14);
 assert.equal(map.canBuy,true);
 const bought=await api('/api/buy',{
  expectedRevision:state.world.revision,itemId:14,
  marketShelf:map.shelf,expectedPrice:map.price,requestedCount:1,
 });
 assert.equal(bought.code,'COMMITTED',JSON.stringify(bought));
 state=bought.state;
 const made=await api('/api/use',{
  expectedRevision:state.world.revision,itemId:14,useId:0,requestedCount:1,
 });
 assert.equal(made.code,'COMMITTED',JSON.stringify(made));
 state=made.state;
 for(let id=40;id<=44;id++){
  assert.equal(state.shop.item[id-1],2);
  const rule=state.showcaseOffers.find(x=>x.itemId===id);
  assert.equal(rule.canShow,true);
  assert.equal(rule.owned,2);
 }
 const wrong=await api('/api/showcase',{
  expectedRevision:state.world.revision,itemId:41,priceOverride:1,
 });
 assert.equal(wrong.ok,false);
 assert.equal(wrong.state.world.revision,state.world.revision);
 const stale=await api('/api/showcase',{
  expectedRevision:state.world.revision-1,itemId:41,priceOverride:1500,
 });
 assert.equal(stale.ok,false);
 assert.equal(stale.state.world.revision,state.world.revision);
 const shelf=await api('/api/showcase',{
  expectedRevision:state.world.revision,itemId:41,priceOverride:1500,
 });
 assert.equal(shelf.code,'COMMITTED',JSON.stringify(shelf));
 const sold=await api('/api/advance-time',{
  expectedRevision:shelf.state.world.revision,minutes:30,
 });
 assert.equal(sold.code,'COMMITTED',JSON.stringify(sold));
 assert.equal(sold.details.soldItemId,41);
 assert.equal(sold.state.shop.showcase[0],41);
 assert.ok(sold.state.shop.item[40]<2);
 assert.equal(sold.state.world.period.eventState,null,
  'B-41 must record unknown EVENT state, never pretend no event');
 const saved1=await api('/api/save',{
  expectedRevision:sold.state.world.revision,expectedGeneration:0,
 });
 assert.equal(saved1.code,'SAVED',JSON.stringify(saved1));
 const snapshot=saved1.state;
 await server.stop();
 server=await boot(directory);
 const loaded=await api('/api/load');
 assert.equal(loaded.code,'LOADED',JSON.stringify(loaded));
 assert.equal(loaded.state.world.revision,snapshot.world.revision);
 assert.equal(loaded.state.shop.money,snapshot.shop.money);
 assert.deepEqual(loaded.state.shop.itemtoday,snapshot.shop.itemtoday);
 const secondShelf=await api('/api/showcase',{
  expectedRevision:loaded.state.world.revision,itemId:42,priceOverride:3200,
 });
 assert.equal(secondShelf.code,'COMMITTED',JSON.stringify(secondShelf));
 const secondSale=await api('/api/advance-time',{
  expectedRevision:secondShelf.state.world.revision,minutes:30,
 });
 assert.equal(secondSale.ok,false,'unknown EVENT must refuse later sword sale');
 assert.match(secondSale.error,/EVENT state unknown/);
 assert.equal(secondSale.state.world.revision,secondShelf.state.world.revision);
 assert.equal(secondSale.state.shop.item[41],secondShelf.state.shop.item[41]);
 assert.deepEqual(secondSale.state.world,secondShelf.state.world);
 const saved2=await api('/api/save',{
  expectedRevision:secondShelf.state.world.revision,expectedGeneration:1,
 });
 assert.equal(saved2.code,'SAVED',JSON.stringify(saved2));
 await server.stop();
 server=await boot(directory);
 const finalLoad=await api('/api/load');
 assert.equal(finalLoad.code,'LOADED',JSON.stringify(finalLoad));
 assert.equal(finalLoad.state.save.generation,2);
 assert.equal(finalLoad.state.shop.item[40],secondShelf.state.shop.item[40]);
 assert.equal(finalLoad.state.shop.item[41],secondShelf.state.shop.item[41]);
});

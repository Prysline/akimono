/**
 * R2 original potion lostbook path from a real local HTTP shop.
 * 5 original vouchers -> mountain map -> herb gathering -> source
 * PLUS and real book purchase -> ten medicine batches -> advanced
 * potion (source lostbook callback, no-loss deterministic draw).
 *
 * This validates live USE, proficiency gates and CAS; persistence of
 * advanced product output requires independent B-43 proof.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
async function start(dir){
  const child=spawn(process.execPath,['tests/support/legacy-dev-local.mjs'],{
    cwd:join(root,'modern'),
    env:{...process.env,AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:dir,
      AKIMONO_E2E_FIXED_NOW:'1000000',
      AKIMONO_E2E_DETERMINISTIC_RNG:'1'},
    stdio:['ignore','pipe','pipe'],
  });
  let stderr='';
  child.stderr.on('data',b=>stderr+=b);
  const url=await Promise.race([
    new Promise((resolve,reject)=>{
      let out='';
      child.stdout.on('data',b=>{
        out+=b;const match=out.match(/http:\/\/127\.0\.0\.1:\d+/);
        if(match)resolve(match[0]);
      });
      child.once('exit',code=>reject(Error(
        'R2 potion test server exit '+code+': '+stderr)));
      child.once('error',reject);
    }),
    new Promise((_,reject)=>setTimeout(()=>reject(Error(
      'R2 potion test server timeout: '+stderr)),15000)),
  ]);
  const state=async()=>await(await fetch(url+'/api/state')).json();
  const post=async(endpoint,body={})=>{
    const response=await fetch(url+endpoint,{method:'POST',
      headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    return {status:response.status,...await response.json()};
  };
  return {state,post,stop:()=>child.exitCode===null?
    new Promise(resolve=>{child.once('exit',resolve);child.kill();}):
    Promise.resolve()};
}
async function use(server,itemId,useId=0,requestedCount=1){
  const before=await server.state();
  const after=await server.post('/api/use',{
    expectedRevision:before.world.revision,itemId,useId,requestedCount});
  assert.equal(after.code,'COMMITTED',JSON.stringify(after));
  assert.equal(after.state.world.revision,before.world.revision+1);
  return after;
}
test('R2 #15/1 true player gate, 25-permille lostbook and source CAS',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-r2-potion-http-'));
  const server=await start(dir);
  t.after(async()=>{await server.stop();await rm(dir,{recursive:true,force:true});});
  assert.equal((await server.post('/api/initialize')).code,'COMMITTED');
  assert.equal((await server.post('/api/open-shop',{
    expectedRevision:1,ownerName:'原版藥劑師',shopName:'藥草調製測試',
  })).code,'COMMITTED');
  const gift=await use(server,79,0);
  assert.equal(gift.state.shop.item[78],3);
  const mountain1=await use(server,12,0);
  const mountain2=await use(server,12,0);
  assert.equal(mountain1.details.mapDestroyed,false);
  assert.equal(mountain2.details.mapDestroyed,false);
  assert.ok(mountain2.state.shop.item[0]>=100,'herbs for 10 batches');
  const supply=await server.post('/api/supply',{
    expectedRevision:mountain2.state.world.revision,
    timespanSeconds:3600,
  });
  assert.equal(supply.code,'COMMITTED',JSON.stringify(supply));
  const quoted=supply.state.marketOffers.find(row=>row.itemId===15);
  assert.equal(quoted?.canBuy,true,'original market PLUS must supply the book');
  const buy=await server.post('/api/buy',{
    expectedRevision:supply.state.world.revision,
    itemId:15,requestedCount:1,
    marketShelf:quoted.shelf,expectedPrice:quoted.price,
  });
  assert.equal(buy.code,'COMMITTED',JSON.stringify(buy));
  assert.equal(buy.state.shop.item[14],1);
  const pre=await server.state();
  const missingExp=await server.post('/api/use',{
    expectedRevision:pre.world.revision,
    itemId:15,useId:1,requestedCount:1,
  });
  assert.equal(missingExp.status,409);
  assert.equal(missingExp.ok,false);
  assert.deepEqual((await server.state()).world,pre.world,
    'failed advanced potion cannot consume materials or advance time');
  const trained=await use(server,15,0,10);
  assert.equal(trained.details.effectiveCount,10);
  assert.equal(trained.state.shop.exp['15'],200);
  assert.ok(trained.state.shop.item[29]>=10);
  const high=await use(server,15,1);
  assert.equal(high.details.mapDestroyed,false);
  assert.equal(high.details.experienceGain,20);
  assert.equal(high.state.shop.exp['15'],220);
  assert.equal(high.state.shop.item[14],1,
    'no-loss source callback preserves the potion book');
  assert.ok(high.state.shop.item[30]>0,
    'advanced potion output uses original 80 percent MakeAmount');
  const advanced=high.state;
  const tooEarly=await server.post('/api/use',{
    expectedRevision:advanced.world.revision,
    itemId:15,useId:3,requestedCount:1,
  });
  assert.equal(tooEarly.status,409);
  assert.deepEqual((await server.state()).world,advanced.world);
});

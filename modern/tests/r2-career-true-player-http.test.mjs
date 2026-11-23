/**
 * R2 real source #78 guide route: original positive market PLUS ->
 * genuine market purchase -> career change to dairy profession ->
 * voucher cow and job-reduced original milking. No injected stock, EXP,
 * money or random draws. B-43 career provenance is separately gated.
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
  const child=spawn(process.execPath,['scripts/dev-local.mjs'],{
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

test('R2 true player buys career guide and switches to cow job before milking',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-r2-career-http-'));
  const server=await start(dir);
  t.after(async()=>{
    await server.stop();
    await rm(dir,{recursive:true,force:true});
  });
  assert.equal((await server.post('/api/initialize')).code,'COMMITTED');
  assert.equal((await server.post('/api/open-shop',{
    expectedRevision:1,ownerName:'原版轉職者',shopName:'合法轉職驗證店',
  })).code,'COMMITTED');
  const initial=await server.state();
  assert.equal(initial.shop.item[77],0);
  const supplied=await server.post('/api/supply',{
    expectedRevision:initial.world.revision,timespanSeconds:3600,
  });
  assert.equal(supplied.code,'COMMITTED',JSON.stringify(supplied));
  const quote=supplied.state.marketOffers.find(x=>x.itemId===78);
  assert.equal(quote?.canBuy,true,
    'original 1h PLUS must yield the purchasable source guide');
  const bought=await server.post('/api/buy',{
    expectedRevision:supplied.state.world.revision,
    itemId:78,requestedCount:1,marketShelf:quote.shelf,
    expectedPrice:quote.price,
  });
  assert.equal(bought.code,'COMMITTED',JSON.stringify(bought));
  assert.equal(bought.state.shop.item[77],1);
  const switched=await use(server,78,11);
  assert.equal(switched.state.shop.job,'cow');
  assert.equal(switched.state.shop.item[77],0);
  assert.equal(switched.state.shop.exp['25'],0);
  assert.match(switched.details.originalFunctionReturn,/酪農家/);
  assert.equal(switched.details.originalInlineLogCalls.length,1);
  const cow=await use(server,79,4);
  assert.equal(cow.state.shop.item[24],1);
  const beforeMilk=await server.state();
  const milk=await use(server,25,0);
  assert.ok(milk.state.shop.item[25]>0);
  assert.equal(milk.state.shop.exp['25'],10);
  assert.equal(milk.state.shop.time-beforeMilk.shop.time,2400,
    'frozen cow time rate 1.5 applies only after real career change');
  assert.equal(milk.details.randomDrawsUsed,2);
});

/**
 * Real initial-player source chain: five original #79/4 vouchers -> five
 * minotaurs -> #25 dairy callback -> #26 fermentation -> #35 consumption
 * and #26 drinking rank callback. All actions are real HTTP/GameCore CAS.
 * No injected cows, milk, shop inventory or client-controlled random draws.
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
async function boot(dir){
  const process=spawn(globalThis.process.execPath,['scripts/dev-local.mjs'],{
    cwd:join(root,'modern'),env:{...globalThis.process.env,
      AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:dir,
      AKIMONO_E2E_FIXED_NOW:'1000000',
      AKIMONO_E2E_DETERMINISTIC_RNG:'1'},
    stdio:['ignore','pipe','pipe'],
  });
  let stderr='';
  process.stderr.on('data',b=>stderr+=b);
  const url=await Promise.race([
    new Promise((resolve,reject)=>{
      let output='';
      process.stdout.on('data',b=>{
        output+=b;
        const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if(match)resolve(match[0]);
      });
      process.once('exit',code=>reject(Error(
        'R2 dairy server exited '+code+': '+stderr)));
      process.once('error',reject);
    }),
    new Promise((_,reject)=>setTimeout(()=>reject(Error(
      'R2 dairy HTTP boot timeout '+stderr)),15000)),
  ]);
  let stopping=null;
  return {
    state:async()=>await(await fetch(url+'/api/state')).json(),
    post:async(path,data={})=>{
      const response=await fetch(url+path,{method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(data)});
      return {status:response.status,...await response.json()};
    },
    stop:()=>stopping??=(process.exitCode!==null?
      Promise.resolve():new Promise(resolve=>{
        process.once('exit',resolve);process.kill();
      })),
  };
}
async function use(server,itemId,useId,count=1){
  const old=await server.state();
  const result=await server.post('/api/use',{
    expectedRevision:old.world.revision,
    itemId,useId,requestedCount:count,
  });
  assert.equal(result.status,200,JSON.stringify(result));
  assert.equal(result.code,'COMMITTED',JSON.stringify(result));
  assert.equal(result.state.world.revision,old.world.revision+1);
  return {old,result};
}
test('R2 real player cows, milk, yogurt, milk drinking and failing cheese NEED',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-r2-dairy-source-'));
  const server=await boot(dir);
  t.after(async()=>{await server.stop();await rm(dir,{recursive:true,force:true});});
  assert.equal((await server.post('/api/initialize')).code,'COMMITTED');
  assert.equal((await server.post('/api/open-shop',{
    expectedRevision:1,ownerName:'原版酪農',shopName:'奶牛來源實測',
  })).code,'COMMITTED');
  for(let i=0;i<5;i++){
    const exchange=await use(server,79,4);
    assert.equal(exchange.result.state.shop.item[24],i+1);
    assert.equal(exchange.result.state.shop.item[78],4-i);
  }
  const ready=await server.state();
  assert.equal(ready.shop.item[25],0);
  assert.equal(ready.useOffers.find(x=>x.itemId===25&&x.useId===0)?.canUse,
    true);
  const first=await use(server,25,0,3);
  assert.equal(first.result.state.shop.item[25],8);
  assert.equal(first.result.state.shop.item[24],5);
  assert.equal(first.result.state.shop.exp['25'],30);
  assert.equal(first.result.details.randomDrawsUsed,4);
  const second=await use(server,25,1,3);
  assert.equal(second.result.state.shop.item[25],24);
  assert.equal(second.result.state.shop.exp['25'],60);
  assert.equal(second.result.details.randomDrawsUsed,4);
  const yogurt=await use(server,26,1);
  assert.equal(yogurt.result.state.shop.item[25],9);
  assert.equal(yogurt.result.state.shop.item[34],2);
  assert.equal(yogurt.result.details.randomDrawsUsed,0);
  const eaten=await use(server,35,0);
  assert.equal(eaten.result.state.shop.item[34],1);
  const beforeDrink=await server.state();
  const drinking=await use(server,26,0);
  assert.equal(drinking.result.state.shop.item[25],8);
  assert.equal(drinking.result.state.shop.rank,
    Math.min(10000,beforeDrink.shop.rank+2));
  assert.equal(drinking.result.details.randomDrawsUsed,1);
  const beforeCheese=await server.state();
  const denied=await server.post('/api/use',{
    expectedRevision:beforeCheese.world.revision,
    itemId:26,useId:2,requestedCount:1,
  });
  assert.equal(denied.ok,false);
  assert.equal(denied.status,409);
  assert.deepEqual((await server.state()).world,beforeCheese.world);
});

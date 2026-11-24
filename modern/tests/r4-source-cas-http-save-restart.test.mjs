import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
async function boot(directory){
  const child=spawn(process.execPath,['tests/support/legacy-dev-local.mjs'],{
    cwd:path.join(root,'modern'),
    env:{...process.env,AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory,
      AKIMONO_E2E_FIXED_NOW:'1025980',
      AKIMONO_E2E_DETERMINISTIC_RNG:'1'},
    stdio:['ignore','pipe','pipe'],
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
      child.once('exit',code=>reject(Error('R4 HTTP exited '+code+' '+err)));
    }),
    new Promise((_,reject)=>setTimeout(()=>
      reject(Error('R4 HTTP source guard boot timed out '+err)),15000)),
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
  return {get,post,stop};
}

test('R4 real HTTP source world refuses 36h rollover, saves TWO generations and reloads unchanged after Node restart',async t=>{
  const directory=await mkdtemp(path.join(tmpdir(),'akimono-r4-http-cas-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  let server=await boot(directory);
  t.after(async()=>await server.stop());
  const api=(p,data={})=>server.post(p,data);
  const initialized=await api('/api/initialize');
  assert.equal(initialized.code,'COMMITTED',JSON.stringify(initialized));
  assert.equal(initialized.state.world.nowSeconds,1025980);
  assert.equal(initialized.state.world.period.settledCount,0);
  const opened=await api('/api/open-shop',{
    expectedRevision:initialized.state.world.revision,
    ownerName:'來源期界測試',shopName:'無假結算商店',
  });
  assert.equal(opened.code,'COMMITTED',JSON.stringify(opened));
  const supplied=await api('/api/supply',{
    expectedRevision:opened.state.world.revision,timespanSeconds:3600,
  });
  assert.equal(supplied.code,'COMMITTED',JSON.stringify(supplied));
  const before=await server.get();
  const offer=before.marketOffers.find(x=>x.itemId===10&&x.canBuy);
  assert.ok(offer,'source PLUS supplies real #10 before boundary');
  const bought=await api('/api/buy',{
    expectedRevision:before.world.revision,itemId:10,requestedCount:1,
    marketShelf:offer.shelf,expectedPrice:offer.price,
  });
  assert.equal(bought.code,'COMMITTED',JSON.stringify(bought));
  const checkpoint=bought.state;
  // 1025980+60 crosses the shifted 36h original boundary at 1026000.
  const rejected=await api('/api/advance-time',{
    expectedRevision:checkpoint.world.revision,minutes:1,
  });
  assert.equal(rejected.ok,false);
  assert.match(rejected.error??rejected.details?.reason??'',
    /period settlement|period|期末|36h|時間片/i);
  assert.deepEqual(rejected.state.world,checkpoint.world,
    'HTTP never fabricated a settled world or advanced the clock');
  assert.equal(rejected.state.world.period.settledCount,0);
  assert.equal(rejected.state.world.revision,checkpoint.world.revision);
  const save1=await api('/api/save',{
    expectedRevision:checkpoint.world.revision,expectedGeneration:0,
  });
  assert.equal(save1.code,'SAVED',JSON.stringify(save1));
  assert.equal(save1.state.save.generation,1);
  const save2=await api('/api/save',{
    expectedRevision:checkpoint.world.revision,expectedGeneration:1,
  });
  assert.equal(save2.code,'SAVED',JSON.stringify(save2));
  assert.equal(save2.state.save.generation,2);
  await server.stop();
  server=await boot(directory);
  const loaded=await api('/api/load');
  assert.equal(loaded.code,'LOADED',JSON.stringify(loaded));
  assert.deepEqual(loaded.state.world,checkpoint.world,
    'source-reviewed CAS adapter accepts real B43 two-slot reload');
  assert.equal(loaded.state.save.generation,2);
  assert.equal(loaded.state.world.period.settledCount,0);
  // Verify loaded instance still refuses a period after restart.
  const again=await api('/api/advance-time',{
    expectedRevision:loaded.state.world.revision,minutes:1,
  });
  assert.equal(again.ok,false);
  assert.deepEqual(again.state.world,loaded.state.world);
  assert.equal(again.state.save.generation,2);
});

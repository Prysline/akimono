/**
 * R2 true-player chain: #79 gift -> #12 gather #1..#4 materials ->
 * original positive market PLUS -> buy #15/#16/#17 books ->
 * three source-selected original USEs -> strict B-43 save -> restart ->
 * further gathering and manufacturing -> second durable save/restart.
 * No injected initial stock, EXP, random samples or fake market shelves.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {encodeMemorySnapshot,validateMemoryWorld}
  from '../src/game-core-contract.mjs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
async function boot(directory){
  const child=spawn(process.execPath,['tests/support/legacy-dev-local.mjs'],{
    cwd:join(root,'modern'),env:{...process.env,
      AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory,
      AKIMONO_E2E_FIXED_NOW:'1000000',
      AKIMONO_E2E_DETERMINISTIC_RNG:'1',
    },stdio:['ignore','pipe','pipe'],
  });
  let stderr='';
  child.stderr.on('data',chunk=>stderr+=chunk);
  const url=await Promise.race([
    new Promise((resolve,reject)=>{
      let output='';
      child.stdout.on('data',chunk=>{
        output+=chunk;
        const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if(match)resolve(match[0]);
      });
      child.once('error',reject);
      child.once('exit',code=>reject(Error(
        'R2 source manufacture process exited '+code+': '+stderr)));
    }),
    new Promise((_,reject)=>setTimeout(()=>reject(Error(
      'R2 source manufacture startup timeout '+stderr)),15000)),
  ]);
  const state=async()=>await(await fetch(url+'/api/state')).json();
  const post=async(endpoint,body={})=>{
    const response=await fetch(url+endpoint,{method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(body)});
    return {status:response.status,...await response.json()};
  };
  let stopping=null;
  const stop=()=>stopping??=(child.exitCode!==null||child.signalCode!==null?
    Promise.resolve():new Promise(resolve=>{
      child.once('exit',resolve);child.kill();
    }));
  return {state,post,stop};
}
async function use(srv,itemId,useId=0){
  const before=await srv.state();
  const result=await srv.post('/api/use',{expectedRevision:before.world.revision,
    itemId,useId,requestedCount:1});
  assert.equal(result.status,200,JSON.stringify(result));
  assert.equal(result.code,'COMMITTED',JSON.stringify(result));
  assert.equal(result.state.world.revision,before.world.revision+1);
  return {before,result};
}
async function buy(srv,itemId){
  const before=await srv.state();
  const offer=before.marketOffers.find(o=>o.itemId===itemId);
  assert.equal(offer?.canBuy,true,'source positive PLUS must stock #'+itemId);
  const result=await srv.post('/api/buy',{
    expectedRevision:before.world.revision,
    itemId,requestedCount:1,
    marketShelf:offer.shelf,expectedPrice:offer.price,
  });
  assert.equal(result.code,'COMMITTED',JSON.stringify(result));
  assert.equal(result.state.shop.item[itemId-1],before.shop.item[itemId-1]+1);
}
async function save(srv,expectedGeneration){
  const before=await srv.state();
  const result=await srv.post('/api/save',{
    expectedRevision:before.world.revision,expectedGeneration,
  });
  assert.equal(result.code,'SAVED',JSON.stringify(result));
  return result.state.world;
}
test('R2 #15/#16/#17 sourced books craft from true #12 gathering, persist twice',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-r2-manufacture-'));
  const servers=[];
  t.after(async()=>{
    for(const s of servers)await s.stop();
    await rm(directory,{recursive:true,force:true});
  });
  let srv=await boot(directory);servers.push(srv);
  assert.equal((await srv.post('/api/initialize')).code,'COMMITTED');
  assert.equal((await srv.post('/api/open-shop',{
    expectedRevision:1,ownerName:'來源工匠',shopName:'採集製作保存',
  })).code,'COMMITTED');
  const unowned=(await srv.state()).useOffers
    .find(x=>x.itemId===16&&x.useId===0);
  assert.equal(unowned?.canUse,false);
  assert.match(unowned.reason,/尚未持有/);
  const gift=await use(srv,79);
  assert.equal(gift.result.state.shop.item[78],3);
  for(const useId of [0,1,2]){
    const gathering=await use(srv,12,useId);
    assert.equal(gathering.result.details.mapDestroyed,false);
  }
  const gathered=await srv.state();
  assert.ok(gathered.shop.item[0]>=10,'source herb #1');
  assert.ok(gathered.shop.item[1]>=24,'source hides #2');
  assert.ok(gathered.shop.item[2]>=20,'source branches #3');
  const supply=await srv.post('/api/supply',{
    expectedRevision:gathered.world.revision,
    timespanSeconds:3600,
  });
  assert.equal(supply.code,'COMMITTED',JSON.stringify(supply));
  for(const id of [15,16,17])await buy(srv,id);
  for(const [itemId,useId,materialIndex] of [
    [15,0,0],[16,0,1],[17,0,2],
  ]){
    const before=await srv.state();
    const made=await use(srv,itemId,useId);
    assert.ok(made.result.state.shop.item[materialIndex]<
      before.shop.item[materialIndex],'legal crafting consumes raw material');
    assert.equal(made.result.details.experienceGain,20);
    assert.equal(made.result.state.shop.exp[String(itemId)],20);
  }
  const crafted=await srv.state();
  assert.ok(crafted.shop.item[29]>0,'#30 medicine made');
  assert.ok(crafted.shop.item[44]>0,'#45 leather shield made');
  assert.ok(crafted.shop.item[39]>0,'#40 wood sword made');
  assert.equal(crafted.shop.item[78],3);
  const denied=await srv.post('/api/use',{
    expectedRevision:crafted.world.revision,
    itemId:15,useId:1,requestedCount:1,
  });
  assert.equal(denied.status,409);
  assert.equal(denied.ok,false,'unreviewed lostbook cannot run');
  assert.deepEqual((await srv.state()).world,crafted.world);
  const checkpoint=await save(srv,0);
  await srv.stop();
  srv=await boot(directory);servers.push(srv);
  const loaded=await srv.post('/api/load');
  assert.equal(loaded.code,'LOADED',JSON.stringify(loaded));
  assert.deepEqual(loaded.state.world,checkpoint);
  const moreGather=await use(srv,12,1);
  assert.equal(moreGather.result.state.shop.exp['12'],80);
  const woodStaff=await use(srv,17,1);
  assert.equal(woodStaff.result.state.shop.exp['17'],40);
  assert.ok(woodStaff.result.state.shop.item[56]>0,'#57 wood staff made');
  const checkpoint2=await save(srv,1);
  await srv.stop();
  srv=await boot(directory);servers.push(srv);
  const loaded2=await srv.post('/api/load');
  assert.equal(loaded2.code,'LOADED',JSON.stringify(loaded2));
  assert.deepEqual(loaded2.state.world,checkpoint2);
  assert.equal(loaded2.state.shop.exp['17'],40);
  assert.equal(loaded2.state.shop.exp['15'],20);
  assert.equal(loaded2.state.shop.exp['16'],20);
  // A forged newest generation with a valid digest and canonical world
  // shape must not create more leather shields than the source's one USE.
  // The other disk slot stays intact and remains recoverable.
  await srv.stop();
  const slot=join(directory,'world-a.json'); // generation 2: even slot A
  const record=JSON.parse(await readFile(slot,'utf8'));
  assert.equal(record.generation,2);
  const forged=JSON.parse(record.world);
  forged.shops[0].item[44]=100; // #45 > original one-run GET max 30
  record.world=encodeMemorySnapshot(validateMemoryWorld(forged));
  record.sha256=createHash('sha256').update(record.world,'utf8')
    .digest('hex');
  await writeFile(slot,JSON.stringify(record)+'\n');
  srv=await boot(directory);servers.push(srv);
  const recovered=await srv.post('/api/load');
  assert.equal(recovered.code,'LOADED',JSON.stringify(recovered));
  assert.deepEqual(recovered.state.world,checkpoint,
    'valid checksum cannot bypass source manufacturing provenance');
  assert.equal(recovered.state.save.recoveryWarning,true);
});

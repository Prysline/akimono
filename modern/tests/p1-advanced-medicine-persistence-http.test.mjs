/**
 * P1 true-player #15 high medicine -> B-43 generation 1 -> Node restart ->
 * #15/3 and #15/4 -> generation 2 -> Node restart. No injected resources.
 * Only the NEGATIVE tamper cases rewrite a checksum-correct save file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {encodeMemorySnapshot,validateMemoryWorld}
  from '../src/game-core-contract.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
async function boot(directory){
  const child=spawn(process.execPath,['scripts/dev-local.mjs'],{
    cwd:join(root,'modern'),env:{...process.env,
      AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory,
      AKIMONO_E2E_FIXED_NOW:'1000000',
      AKIMONO_E2E_DETERMINISTIC_RNG:'1',
    },stdio:['ignore','pipe','pipe'],
  });
  let stderr='';
  child.stderr.on('data',b=>stderr+=b);
  const url=await Promise.race([
    new Promise((resolve,reject)=>{
      let output='';
      child.stdout.on('data',b=>{
        output+=b;
        const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if(match)resolve(match[0]);
      });
      child.once('exit',code=>reject(Error(
        'P1 source medicine server exited '+code+': '+stderr)));
      child.once('error',reject);
    }),
    new Promise((_,reject)=>setTimeout(()=>reject(Error(
      'P1 source medicine startup timeout: '+stderr)),15000)),
  ]);
  const state=async()=>await(await fetch(url+'/api/state')).json();
  const post=async(route,body={})=>{
    const response=await fetch(url+route,{method:'POST',
      headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    return {status:response.status,...await response.json()};
  };
  let stopping=null;
  const stop=()=>stopping??=child.exitCode!==null||child.signalCode!==null?
    Promise.resolve():new Promise(resolve=>{
      child.once('exit',resolve);child.kill();
    });
  return {state,post,stop};
}
async function use(s,itemId,useId=0,requestedCount=1){
  const before=await s.state();
  const result=await s.post('/api/use',{
    expectedRevision:before.world.revision,
    itemId,useId,requestedCount,
  });
  assert.equal(result.code,'COMMITTED',JSON.stringify(result));
  assert.equal(result.status,200);
  assert.equal(result.state.world.revision,before.world.revision+1);
  return result;
}
async function save(s,expectedGeneration){
  const before=await s.state();
  const result=await s.post('/api/save',{
    expectedRevision:before.world.revision,expectedGeneration,
  });
  assert.equal(result.code,'SAVED',JSON.stringify(result));
  assert.equal(result.state.save.generation,expectedGeneration+1);
  return result.state.world;
}
async function checkedDenial(s,body){
  const before=await s.state();
  const result=await s.post('/api/use',{
    expectedRevision:before.world.revision,...body,
  });
  assert.equal(result.status,409,JSON.stringify(result));
  assert.deepEqual((await s.state()).world,before.world,
    'failure must preserve all WorldState fields and revision');
}
test('P1 original #15/1, #15/3, #15/4 legal HTTP chain persists across two Node restarts',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'akimono-p1-medicine-'));
  const servers=[];
  t.after(async()=>{
    for(const s of servers)await s.stop();
    await rm(directory,{recursive:true,force:true});
  });
  let srv=await boot(directory);servers.push(srv);
  assert.equal((await srv.post('/api/initialize')).code,'COMMITTED');
  assert.equal((await srv.post('/api/open-shop',{
    expectedRevision:1,ownerName:'製藥來源玩家',shopName:'藥劑原版存檔',
  })).code,'COMMITTED');
  await checkedDenial(srv,{itemId:15,useId:4,requestedCount:1});
  const gift=await use(srv,79,0);
  assert.equal(gift.state.shop.item[78],3);
  for(let i=0;i<3;i++){
    const gathered=await use(srv,12,0);
    assert.equal(gathered.details.mapDestroyed,false);
  }
  const afterGather=await srv.state();
  assert.ok(afterGather.shop.item[0]>=160,
    'source #12 gathered enough real herbs for advanced potion chain');
  const supplied=await srv.post('/api/supply',{
    expectedRevision:afterGather.world.revision,timespanSeconds:3600,
  });
  assert.equal(supplied.code,'COMMITTED',JSON.stringify(supplied));
  const offer=supplied.state.marketOffers.find(o=>o.itemId===15);
  assert.equal(offer?.canBuy,true,'real PLUS must stock original #15 book');
  const purchased=await srv.post('/api/buy',{
    expectedRevision:supplied.state.world.revision,itemId:15,
    requestedCount:1,marketShelf:offer.shelf,expectedPrice:offer.price,
  });
  assert.equal(purchased.code,'COMMITTED',JSON.stringify(purchased));
  assert.equal(purchased.state.shop.item[14],1);
  await checkedDenial(srv,{itemId:15,useId:1,requestedCount:1});
  await checkedDenial(srv,{itemId:15,useId:2,requestedCount:1});
  for(let i=0;i<10;i++)await use(srv,15,0);
  const trained=await srv.state();
  assert.equal(trained.shop.exp['15'],200);
  const high=await use(srv,15,1);
  assert.equal(high.details.mapDestroyed,false);
  assert.ok(high.state.shop.item[30]>=10,'source high healing output');
  await checkedDenial(srv,{itemId:15,useId:3,requestedCount:1});
  await checkedDenial(srv,{itemId:15,useId:4,requestedCount:1});
  const stale=await srv.post('/api/use',{
    expectedRevision:high.state.world.revision-1,itemId:15,
    useId:0,requestedCount:1,
  });
  assert.equal(stale.status,409);
  assert.deepEqual((await srv.state()).world,high.state.world);
  const first=await save(srv,0);
  await srv.stop();
  srv=await boot(directory);servers.push(srv);
  const loaded=await srv.post('/api/load');
  assert.equal(loaded.code,'LOADED',JSON.stringify(loaded));
  assert.deepEqual(loaded.state.world,first);
  assert.equal(loaded.state.shop.exp['15'],220);
  assert.equal(loaded.state.shop.item[30],high.state.shop.item[30]);
  // Two more healing batches and two ether batches supply the raw outputs.
  // Advanced healing batches fill the 30-USE training gate without minting
  // unnecessary herbs or bypassing the 12-hour original action clock.
  for(let i=0;i<2;i++)await use(srv,15,0);
  for(let i=0;i<2;i++)await use(srv,15,2);
  for(let i=0;i<15;i++)await use(srv,15,1);
  const eligible=await srv.state();
  assert.equal(eligible.shop.exp['15'],600);
  assert.ok(eligible.shop.item[31]>=20,'source ether crafted, not injected');
  for(let i=0;i<2;i++)await use(srv,15,3);
  const beforeElixir=await srv.state();
  assert.ok(beforeElixir.shop.item[32]>=10,'real high ether available');
  const erikusa=await use(srv,15,4);
  assert.ok(erikusa.state.shop.item[33]>0,'original #34 erikusa crafted');
  assert.ok(erikusa.state.shop.item[30]<
    beforeElixir.shop.item[30],'high medicine is consumed');
  assert.ok(erikusa.state.shop.item[32]<
    beforeElixir.shop.item[32],'high ether is consumed');
  assert.equal(erikusa.state.shop.exp['15'],660);
  const second=await save(srv,1);
  await srv.stop();
  srv=await boot(directory);servers.push(srv);
  const loaded2=await srv.post('/api/load');
  assert.equal(loaded2.code,'LOADED',JSON.stringify(loaded2));
  assert.deepEqual(loaded2.state.world,second);
  assert.equal(loaded2.state.shop.item[33],erikusa.state.shop.item[33]);
  assert.equal(loaded2.state.shop.exp['15'],660);
  assert.equal(loaded2.state.shop.money,erikusa.state.shop.money);
  assert.equal(loaded2.state.shop.time,erikusa.state.shop.time);

  // Saving with an obsolete disk generation must not overwrite either slot.
  const staleSave=await srv.post('/api/save',{
    expectedRevision:second.revision,expectedGeneration:1,
  });
  assert.equal(staleSave.status,400,JSON.stringify(staleSave));
  assert.match(staleSave.error,/存檔世代衝突/);
  assert.deepEqual((await srv.state()).world,second);
  // Test malformed requests against the same authoritative WorldState.
  const invalid=await srv.post('/api/use',{
    expectedRevision:second.revision,
    itemId:15,useId:4,requestedCount:-1,
  });
  assert.notEqual(invalid.status,200);
  assert.deepEqual((await srv.state()).world,second);

  // All cases are ATTACK fixtures, never a shortcut in the player flow.
  // Generation 1 stays untouched and is the expected recovery candidate.
  await srv.stop();
  const slot=join(directory,'world-a.json'); // second generation
  const original=await readFile(slot,'utf8');
  assert.equal(JSON.parse(original).generation,2);
  for(const variant of ['forged-erikusa','forged-herbs',
      'forged-proficiency','broken-checksum']){
    const record=JSON.parse(original);
    if(variant==='broken-checksum'){
      record.sha256='0'.repeat(64);
    }else{
      const forged=JSON.parse(record.world);
      if(variant==='forged-erikusa')
        forged.shops[0].item[33]=60; // under stock limit, impossible source
      if(variant==='forged-herbs')
        forged.shops[0].item[0]=3000; // below catalog limit, beyond #12 origin
      if(variant==='forged-proficiency')
        forged.shops[0].exp['15']=999; // below 1000, illegal EXP increment
      record.world=encodeMemorySnapshot(validateMemoryWorld(forged));
      record.sha256=createHash('sha256').update(record.world,'utf8')
        .digest('hex');
    }
    await writeFile(slot,JSON.stringify(record)+'\n');
    srv=await boot(directory);servers.push(srv);
    const recovered=await srv.post('/api/load');
    assert.equal(recovered.code,'LOADED',
      variant+': '+JSON.stringify(recovered));
    assert.deepEqual(recovered.state.world,first,
      variant+': invalid latest generation must not win recovery');
    assert.equal(recovered.state.save.recoveryWarning,true,variant);
    await srv.stop();
  }
});

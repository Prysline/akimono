/**
 * P2: only genuine HTTP actions produce the positive career states.
 * On-disk rewriting below is exclusively the negative corruption/forgery test.
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
import {encodeMemorySnapshot,validateMemoryWorld} from '../src/game-core-contract.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
async function boot(directory){
  const child=spawn(process.execPath,['scripts/dev-local.mjs'],{
    cwd:join(root,'modern'),env:{...process.env,
      AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:directory,
      AKIMONO_E2E_FIXED_NOW:'1000000',AKIMONO_E2E_DETERMINISTIC_RNG:'1',
    },stdio:['ignore','pipe','pipe'],
  });
  let stderr='';
  child.stderr.on('data',b=>stderr+=b);
  let timer;
  const url=await Promise.race([
    new Promise((resolve,reject)=>{
      let output='';
      child.stdout.on('data',b=>{
        output+=b;
        const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if(match)resolve(match[0]);
      });
      child.once('exit',code=>reject(Error('P2 server exit '+code+': '+stderr)));
      child.once('error',reject);
    }),
    new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(Error('P2 startup timeout '+stderr)),15000);
    }),
  ]).finally(()=>clearTimeout(timer));
  const state=async()=>await(await fetch(url+'/api/state')).json();
  const post=async(route,body={})=>{
    const response=await fetch(url+route,{method:'POST',
      headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    return {status:response.status,...await response.json()};
  };
  let stopping=null;
  const stop=()=>stopping??=child.exitCode!==null||child.signalCode!==null?
    Promise.resolve():new Promise(resolve=>{child.once('exit',resolve);child.kill();});
  return {state,post,stop};
}
async function open(s){
  assert.equal((await s.post('/api/initialize')).code,'COMMITTED');
  assert.equal((await s.post('/api/open-shop',{
    expectedRevision:1,ownerName:'來源轉職者',shopName:'P2 轉職存檔',
  })).code,'COMMITTED');
}
async function use(s,itemId,useId,requestedCount=1){
  const before=await s.state();
  const result=await s.post('/api/use',{expectedRevision:before.world.revision,
    itemId,useId,requestedCount});
  assert.equal(result.code,'COMMITTED',JSON.stringify(result));
  assert.equal(result.state.world.revision,before.world.revision+1);
  return result;
}
async function supply(s){
  const before=await s.state();
  const result=await s.post('/api/supply',{expectedRevision:before.world.revision,
    timespanSeconds:3600});
  assert.equal(result.code,'COMMITTED',JSON.stringify(result));
  return result;
}
async function buy(s,itemId){
  const before=await s.state();
  const offer=before.marketOffers.find(o=>o.itemId===itemId);
  assert.equal(offer?.canBuy,true,'original PLUS quote #'+itemId);
  const result=await s.post('/api/buy',{expectedRevision:before.world.revision,
    itemId,requestedCount:1,marketShelf:offer.shelf,expectedPrice:offer.price});
  assert.equal(result.code,'COMMITTED',JSON.stringify(result));
  return result;
}
async function save(s,generation){
  const before=await s.state();
  const result=await s.post('/api/save',{expectedRevision:before.world.revision,
    expectedGeneration:generation});
  assert.equal(result.code,'SAVED',JSON.stringify(result));
  assert.equal(result.state.save.generation,generation+1);
  return result.state.world;
}
async function denied(s,fields,status=409){
  const before=await s.state();
  const result=await s.post('/api/use',{expectedRevision:before.world.revision,
    itemId:78,useId:0,requestedCount:1,...fields});
  assert.equal(result.status,status,JSON.stringify(result));
  assert.deepEqual((await s.state()).world,before.world);
}
async function restartLoad(s,dir,servers){
  await s.stop();
  const next=await boot(dir);servers.push(next);
  const loaded=await next.post('/api/load');
  assert.equal(loaded.code,'LOADED',JSON.stringify(loaded));
  return {s:next,loaded};
}
const hash=s=>createHash('sha256').update(s,'utf8').digest('hex');
const rehash=record=>{
  record.sha256=hash(Object.hasOwn(record,'careerProof')?
    JSON.stringify([record.world,record.careerProof]):record.world);
};
test('P2 real player transfers earned EXP, retains old products and both careers across two disk generations',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-p2-career-'));
  const servers=[];
  t.after(async()=>{for(const s of servers)await s.stop();
    await rm(dir,{recursive:true,force:true});});
  let s=await boot(dir);servers.push(s);
  await open(s);
  await denied(s,{}); // no guide
  await use(s,79,0);
  await use(s,12,0);
  await supply(s);
  await buy(s,15);
  const medicine=await use(s,15,0);
  assert.equal(medicine.state.shop.exp['12'],20);
  assert.equal(medicine.state.shop.exp['15'],20);
  assert.ok(medicine.state.shop.item[29]>0);
  await buy(s,78);
  await denied(s,{requestedCount:2});
  await denied(s,{useId:14});
  await denied(s,{randomDraws:[0]},400);
  const stale=(await s.state()).world.revision-1;
  await denied(s,{expectedRevision:stale});
  const cowCareer=await use(s,78,11);
  assert.equal(cowCareer.state.shop.job,'cow');
  assert.deepEqual(cowCareer.state.shop.exp,{'25':20});
  assert.equal(cowCareer.state.shop.item[77],0);
  assert.equal(cowCareer.state.shop.item[29],medicine.state.shop.item[29]);
  await denied(s,{useId:11});
  await use(s,79,4);
  const beforeMilk=await s.state();
  const milk=await use(s,25,0);
  assert.equal(milk.state.shop.exp['25'],30);
  assert.ok(milk.state.shop.item[25]>0);
  assert.equal(milk.state.shop.time-beforeMilk.shop.time,2400);
  const first=await save(s,0);

  let step=await restartLoad(s,dir,servers);s=step.s;
  assert.deepEqual(step.loaded.state.world,first);
  assert.equal(step.loaded.state.shop.job,'cow');
  await supply(s);await buy(s,78);
  const drugCareer=await use(s,78,0);
  assert.equal(drugCareer.state.shop.job,'drug');
  assert.deepEqual(drugCareer.state.shop.exp,{'15':15});
  assert.equal(drugCareer.state.shop.item[25],milk.state.shop.item[25]);
  const brew=await use(s,15,0);
  assert.equal(brew.state.shop.exp['15'],35);
  assert.equal(brew.state.shop.time-drugCareer.state.shop.time,594);
  const second=await save(s,1);

  step=await restartLoad(s,dir,servers);s=step.s;
  assert.deepEqual(step.loaded.state.world,second);
  assert.equal(step.loaded.state.shop.job,'drug');
  assert.equal(step.loaded.state.shop.exp['15'],35);
  const more=await use(s,15,0);
  assert.equal(more.state.shop.exp['15'],55);
  assert.ok(more.state.shop.item[29]>second.shops[0].item[29]);
  const staleSave=await s.post('/api/save',{expectedRevision:more.state.world.revision,
    expectedGeneration:1});
  assert.equal(staleSave.ok,false);
  assert.match(staleSave.error,/存檔世代衝突/);
  assert.deepEqual((await s.state()).world,more.state.world);

  await s.stop();
  const slot=join(dir,'world-a.json');
  const good=await readFile(slot,'utf8');
  const original=JSON.parse(good);
  assert.equal(original.generation,2);
  assert.equal(typeof original.careerProof,'string');
  for(const variant of ['job','experience','product','missing-proof','history',
      'rng','corrupt']){
    const record=JSON.parse(good);
    if(variant==='corrupt')record.sha256='0'.repeat(64);
    else{
      const forged=JSON.parse(record.world);
      if(variant==='job')forged.shops[0].job='weapon';
      if(variant==='experience')forged.shops[0].exp['15']=995;
      if(variant==='product')forged.shops[0].item[25]+=100;
      record.world=encodeMemorySnapshot(validateMemoryWorld(forged));
      if(variant==='missing-proof')delete record.careerProof;
      if(variant==='history'||variant==='rng'){
        const proof=JSON.parse(record.careerProof);
        if(variant==='history')proof.commands.pop();
        else{
          const command=proof.commands.find(c=>c.randomDraws?.length);
          command.randomDraws[0]=(command.randomDraws[0]+1)%1000000;
        }
        record.careerProof=JSON.stringify(proof);
      }
      rehash(record);
    }
    await writeFile(slot,JSON.stringify(record)+'\n');
    s=await boot(dir);servers.push(s);
    const recovered=await s.post('/api/load');
    assert.equal(recovered.code,'LOADED',variant+': '+JSON.stringify(recovered));
    assert.deepEqual(recovered.state.world,first,variant);
    assert.equal(recovered.state.save.recoveryWarning,true,variant);
    await s.stop();
  }
});
test('P2 all thirteen source career choices and release are obtainable and saveable, no injected EXP',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-p2-career-options-'));
  const s=await boot(dir);
  t.after(async()=>{await s.stop();await rm(dir,{recursive:true,force:true});});
  const targets=[15,16,17,66,20,21,22,23,9,12,10,25,14];
  const jobs=['drug','tool','tool','tool','weapon','armor','armor','weapon',
    'material','material','book','cow','peddle'];
  for(let id=0;id<13;id++){
    await open(s);await use(s,79,0);await use(s,12,0);
    await supply(s);await buy(s,78);
    const changed=await use(s,78,id);
    assert.equal(changed.state.shop.job,jobs[id]);
    // The original target is also in the donor list; same-target transfer
    // of 20 points becomes 30, not 20 or 10.
    assert.deepEqual(changed.state.shop.exp,{[targets[id]]:id===9?30:10});
    const first=await save(s,0);
    assert.equal((await s.state()).save.generation,1);
    if(id===0){
      await supply(s);await buy(s,78);
      const released=await use(s,78,13);
      assert.equal(released.state.shop.job,'');
      assert.deepEqual(released.state.shop.exp,first.shops[0].exp);
      await save(s,1);
    }
    const state=await s.state();
    const reset=await s.post('/api/reset',{
      confirm:'RESET_LOCAL_TEST_WORLD',
      expectedGeneration:state.save.generation,
      expectedRevision:state.world.revision,
      expectedWorldId:state.world.worldId,
    });
    assert.equal(reset.code,'RESET',JSON.stringify(reset));
  }
});

/**
 * R2 source player path: initial gift maps -> real USE gathering -> B-43
 * strictly reviewed two-generation disk save -> process restart -> load.
 * No test inventory injections, no client RNG injection or fake PLUS.
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
  const child=spawn(process.execPath,['scripts/dev-local.mjs'],{
    cwd:join(root,'modern'),env:{...process.env,
      AKIMONO_PORT:'0',AKIMONO_SAVE_DIR:dir,
      AKIMONO_E2E_FIXED_NOW:'1000000',
      AKIMONO_E2E_DETERMINISTIC_RNG:'1',
    },stdio:['ignore','pipe','pipe'],
  });
  let stderr='';
  child.stderr.on('data',c=>stderr+=c);
  const url=await Promise.race([
    new Promise((resolve,reject)=>{
      let text='';
      child.stdout.on('data',b=>{
        text+=b;
        const match=text.match(/http:\/\/127\.0\.0\.1:\d+/);
        if(match)resolve(match[0]);
      });
      child.once('error',reject);
      child.once('exit',code=>reject(Error(
        'R2 gathering server terminated '+code+': '+stderr)));
    }),
    new Promise((_,reject)=>setTimeout(()=>reject(Error(
      'R2 gathering server start timed out '+stderr)),15000)),
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
const payload=(s,itemId,useId=0)=>({
  expectedRevision:s.world.revision,itemId,useId,requestedCount:1,
});
const use=async(srv,itemId,useId=0)=>{
  const before=await srv.state();
  const r=await srv.post('/api/use',payload(before,itemId,useId));
  assert.equal(r.code,'COMMITTED',JSON.stringify(r));
  assert.equal(r.state.world.revision,before.world.revision+1);
  return r;
};
test('R2 original voucher maps gather #12/#9, save, restart and keep sources',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'akimono-r2-gather-disk-'));
  const servers=[];
  t.after(async()=>{
    for(const s of servers)await s.stop();
    await rm(dir,{recursive:true,force:true});
  });
  let srv=await boot(dir);servers.push(srv);
  assert.equal((await srv.post('/api/initialize')).code,'COMMITTED');
  assert.equal((await srv.post('/api/open-shop',{
    expectedRevision:1,ownerName:'來源採集者',shopName:'山礦材料驗證',
  })).code,'COMMITTED');
  const initial=await srv.state();
  assert.equal(initial.shop.item[78],5);
  assert.equal((await use(srv,79)).state.shop.item[78],3);
  let state=await srv.state();
  assert.equal(state.shop.item[8],1);
  assert.equal(state.shop.item[11],1);
  assert.equal(state.shop.item[13],1);
  const mountain=await use(srv,12,0);
  assert.equal(mountain.details.mapDestroyed,false);
  assert.equal(mountain.details.experienceGain,20);
  assert.equal(mountain.state.shop.exp['12'],20);
  assert.ok(mountain.state.shop.item[0]>0,
    'original mountain source must supply actual herb materials');
  const mine=await use(srv,9,0);
  assert.equal(mine.details.mapDestroyed,false);
  assert.equal(mine.details.experienceGain,20);
  assert.equal(mine.state.shop.exp['9'],20);
  assert.ok(mine.state.shop.item[4]>0,
    'original mine source must supply actual iron materials');
  const beforeSave=await srv.state();
  assert.equal(beforeSave.shop.item[78],3);
  assert.ok(beforeSave.useOffers.some(x=>x.itemId===9&&x.useId===2));
  assert.ok(beforeSave.useOffers.some(x=>x.itemId===12&&x.useId===3));
  const save=await srv.post('/api/save',{
    expectedRevision:beforeSave.world.revision,expectedGeneration:0,
  });
  assert.equal(save.code,'SAVED',JSON.stringify(save));
  const checkpoint=save.state.world;
  await srv.stop();
  srv=await boot(dir);servers.push(srv);
  const loaded=await srv.post('/api/load');
  assert.equal(loaded.code,'LOADED',JSON.stringify(loaded));
  assert.deepEqual(loaded.state.world,checkpoint);
  assert.equal(loaded.state.shop.exp['9'],20);
  assert.equal(loaded.state.shop.exp['12'],20);
  const second=await use(srv,12,1);
  assert.equal(second.state.shop.exp['12'],40);
  const save2=await srv.post('/api/save',{
    expectedRevision:second.state.world.revision,expectedGeneration:1,
  });
  assert.equal(save2.code,'SAVED',JSON.stringify(save2));
  await srv.stop();
  srv=await boot(dir);servers.push(srv);
  const loaded2=await srv.post('/api/load');
  assert.equal(loaded2.code,'LOADED',JSON.stringify(loaded2));
  assert.deepEqual(loaded2.state.world,second.state.world);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createIndependentPeriodDiskStore} from '../src/r4-independent-period-disk-store.mjs';
import {auditPlayer} from './support/r1-http-audit-player.mjs';

test('R1 formal HTTP: malformed and stale commands do not alter live state or saved bytes',async t=>{
 const p=await auditPlayer(t),s=await p.open();
 await p.command('/api/save',{expectedRevision:s.world.revision,expectedGeneration:s.save.generation},'SAVED');
 const before=await p.snapshot(),rev=before.world.revision,gen=before.generation;
 const buy={expectedRevision:rev,itemId:13,requestedCount:1,marketShelf:0,expectedPrice:0};
 const use={expectedRevision:rev,itemId:79,useId:0,requestedCount:1};
 const cases=[
  ['/api/initialize',{}],['/api/open-shop',{expectedRevision:rev,ownerName:'另一人',shopName:'另一店'}],
  ['/api/load',{}],['/api/buy',{...buy,requestedCount:0}],['/api/buy',{...buy,expectedPrice:-1}],
  ['/api/buy',{...buy,marketShelf:'0'}],['/api/use',{...use,useId:-1}],
  ['/api/use',{...use,requestedCount:0}],['/api/use',{...use,expectedRevision:rev-1}],
  ['/api/discard',{expectedRevision:rev,itemId:79,count:0}],
  ['/api/discard',{expectedRevision:rev-1,itemId:79,count:1}],
  ['/api/showcase',{expectedRevision:rev,itemId:0,per:201,shelf:0}],
  ['/api/showcase',{expectedRevision:rev,itemId:0,per:100,shelf:1}],
  ['/api/advance-reviewed-time',{expectedRevision:rev,minutes:0}],
  ['/api/save',{expectedRevision:rev,expectedGeneration:gen-1}],
  ['/api/save',{expectedRevision:rev-1,expectedGeneration:gen}],
  ['/api/reset',{confirm:'RESET_LOCAL_TEST_WORLD',expectedRevision:rev,expectedGeneration:gen,expectedWorldId:'foreign'}],
  ['/api/not-a-command',{}]
 ];
 for(const [route,body] of cases){
   const r=await p.post(route,body);
   assert.ok(r.status>=400&&r.status<500,route+' '+r.status);
   assert.equal(r.body.ok,false,route);
   assert.deepEqual(await p.snapshot(),before,route+' must not change state/history/save bytes');
 }
 await p.stop();await p.boot();
 await p.command('/api/load',{},'LOADED');
 assert.deepEqual(await p.snapshot(),before);
});

const sha=value=>createHash('sha256').update(value).digest('hex');
// The v2 slot is the publication pointer. A successful preflight is allowed
// to materialize exactly the committed world's immutable period-file layout.
function projectedPeriodFiles(world){
 const d=world.period.disk,root='reviewed-period-files-v1/'+sha(JSON.stringify(d))+'/';
 const out={};
 function collect(prefix,files){
  for(const [name,file] of Object.entries(files))out[root+prefix+name]=sha(file.bytes);
 }
 collect('',d.live);collect('backup/',d.backup);
 d.generations.forEach((g,i)=>{if(g!==null)collect('backup'+(i+1)+'/',g);});
 return out;
}

test('R1 same-revision competing discard and same-generation competing saves commit once',async t=>{
 const p=await auditPlayer(t),s=await p.open(),rev=s.world.revision;
 assert.ok(s.shop.item[78]>=2,'legitimate starting vouchers');
 await p.command('/api/save',{expectedRevision:rev,expectedGeneration:0},'SAVED');
 const body={expectedRevision:rev,itemId:79,count:1};
 const before=await p.snapshot();
 const results=await Promise.all([p.post('/api/discard',body),p.post('/api/discard',body)]);
 assert.equal(results.filter(r=>r.body.code==='COMMITTED').length,1);
 assert.equal(results.filter(r=>r.body.ok===false&&r.status===409).length,1);
 const after=await p.snapshot();
 assert.equal(after.world.revision,rev+1);
 assert.equal(after.world.shops[0].item[78],s.shop.item[78]-1);
 assert.equal(after.world.shops[0].money,s.shop.money);
 assert.equal(after.world.nowSeconds,before.world.nowSeconds);
 assert.deepEqual(after.world.period.eventState,before.world.period.eventState);
 assert.equal(after.world.period.settledCount,before.world.period.settledCount);
 assert.equal(after.historyCommands,before.historyCommands+1);
 assert.equal(after.generation,before.generation);
 // Preserve every prior file, including the generation-one publication
 // pointer; only the exact successor's materialized files may be added.
 assert.deepEqual(after.disk,{...before.disk,...projectedPeriodFiles(after.world)});
 for(const [name,hash] of Object.entries(before.disk))assert.equal(after.disk[name],hash,name);
 assert.equal(createIndependentPeriodDiskStore({directory:p.directory}).verify(after.world),true);
 assert.equal(Object.hasOwn(after.disk,'world-a.json'),false);
 const stale=await p.post('/api/discard',body);
 assert.equal(stale.status,409);assert.equal(stale.body.ok,false);
 assert.deepEqual(await p.snapshot(),after,'isolated losing revision must not stage or mutate files');
 const save={expectedRevision:rev+1,expectedGeneration:after.generation};
 const saves=await Promise.all([p.post('/api/save',save),p.post('/api/save',save)]);
 assert.equal(saves.filter(r=>r.body.code==='SAVED').length,1);
 assert.equal(saves.filter(r=>r.body.ok===false&&r.status>=400).length,1);
 const saved=await p.snapshot();
 assert.equal(saved.generation,after.generation+1);
 assert.deepEqual(saved.world,after.world);
 assert.equal(saved.historyCommands,after.historyCommands);
 const wire=await readFile(join(p.directory,'world-a.json'),'utf8'),record=JSON.parse(wire);
 assert.equal(record.format,'akimono.local-world-save.v2');
 assert.equal(record.generation,2);
 assert.deepEqual(JSON.parse(record.world),after.world);
 assert.equal(record.sha256,sha(JSON.stringify([record.format,record.generation,record.world,record.careerProof])));
 assert.deepEqual(saved.disk,{...after.disk,'world-a.json':sha(wire)});
 const staleSave=await p.post('/api/save',save);
 assert.ok(staleSave.status>=400&&staleSave.status<500);
 assert.equal(staleSave.body.ok,false);
 assert.deepEqual(await p.snapshot(),saved,'isolated losing generation must preserve all bytes');
 await p.stop();await p.boot();await p.command('/api/load',{},'LOADED');
 assert.deepEqual(await p.snapshot(),saved);
});

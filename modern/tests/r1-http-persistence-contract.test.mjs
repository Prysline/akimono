import test from 'node:test';
import assert from 'node:assert/strict';
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

test('R1 same-revision competing discard and same-generation competing saves commit once',async t=>{
 const p=await auditPlayer(t),s=await p.open(),rev=s.world.revision;
 assert.ok(s.shop.item[78]>=2,'legitimate starting vouchers');
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
 assert.deepEqual(after.disk,before.disk);
 const save={expectedRevision:rev+1,expectedGeneration:after.generation};
 const saves=await Promise.all([p.post('/api/save',save),p.post('/api/save',save)]);
 assert.equal(saves.filter(r=>r.body.code==='SAVED').length,1);
 assert.equal(saves.filter(r=>r.body.ok===false&&r.status>=400).length,1);
 const saved=await p.snapshot();
 assert.equal(saved.generation,after.generation+1);
 assert.deepEqual(saved.world,after.world);
 assert.equal(saved.historyCommands,after.historyCommands);
 await p.stop();await p.boot();await p.command('/api/load',{},'LOADED');
 assert.deepEqual(await p.snapshot(),saved);
});

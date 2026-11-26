// C exact strict R1-HTTP-01 assertions, now part of npm test.
// Original reproduction: #26 e43339680eda08d30ebc9a5c70f56635361ace12.
import test from 'node:test';
import assert from 'node:assert/strict';
import {auditPlayer} from './support/r1-http-audit-player.mjs';
function summary(s){return {revision:s.world?.revision??null,worldId:s.world?.worldId??null,shop:s.world?.shops?.[0]??null,historyCommands:s.historyCommands,checkpoint:s.historyCheckpointRevision,generation:s.generation,disk:s.disk};}
async function probe(t,p,route,body){
 const before=await p.snapshot(),r=await p.post(route,body),after=await p.snapshot();
 t.diagnostic('R1_HTTP_01 '+JSON.stringify({route,request:body,status:r.status,response:r.body,before:summary(before),after:summary(after),worldUnchanged:JSON.stringify(before.world)===JSON.stringify(after.world)}));
 return {before,r,after};
}
function reject({before,r,after}){
 assert.ok(r.status>=400&&r.status<500,'expected 4xx; observed '+r.status+' '+r.body.code);
 assert.equal(r.body.ok,false);
 assert.deepEqual(after,before,'rejected request must not mutate live state, history or save bytes');
}
test('R1-HTTP-01 initialize: empty body control versus unknown money',async t=>{
 const control=await auditPlayer(t),p=await auditPlayer(t);
 const good=await probe(t,control,'/api/initialize',{});
 assert.equal(good.r.body.code,'COMMITTED');
 reject(await probe(t,p,'/api/initialize',{money:999999}));
});
test('R1-HTTP-01 open-shop: legal control versus unknown shopId and money',async t=>{
 const control=await auditPlayer(t),p=await auditPlayer(t);
 for(const x of [control,p])await x.command('/api/initialize');
 const body={ownerName:'稽核玩家',shopName:'稽核店'};
 const good=await probe(t,control,'/api/open-shop',{...body,expectedRevision:(await control.state()).world.revision});
 assert.equal(good.r.body.code,'COMMITTED');
 reject(await probe(t,p,'/api/open-shop',{...body,expectedRevision:(await p.state()).world.revision,shopId:99,money:999999}));
});
test('R1-HTTP-01 load: same genuine saved world across two clean boots',async t=>{
 const p=await auditPlayer(t);const opened=await p.open();
 const saved=await p.command('/api/save',{expectedRevision:opened.world.revision,expectedGeneration:opened.save.generation},'SAVED');
 await p.stop();await p.boot();
 const good=await probe(t,p,'/api/load',{});
 assert.equal(good.r.body.code,'LOADED');
 assert.deepEqual(good.after.world,saved.world);
 assert.deepEqual(good.before.disk,good.after.disk);
 await p.stop();await p.boot();
 const bad=await probe(t,p,'/api/load',{worldId:'foreign-world',expectedRevision:-1,money:999999});
 assert.deepEqual(bad.before.disk,good.before.disk,'same genuine bytes before control and probe');
 reject(bad);
});

test('R1-HTTP-01 key boundaries: malformed and comma-joined keys cannot alias an exact payload',async t=>{
 const p=await auditPlayer(t);
 for(const body of [null,[],{constructor:1},{'':1}]){
   reject(await probe(t,p,'/api/initialize',body));
 }
 const initial=await p.command('/api/initialize');
 const expectedRevision=initial.world.revision;
 for(const body of [
   {expectedRevision,ownerName:'稽核玩家'},
   {'expectedRevision,ownerName,shopName':expectedRevision},
   {expectedRevision,ownerName:'稽核玩家',shopName:'稽核店','':1},
   {expectedRevision,ownerName:'稽核玩家',shopName:'稽核店',constructor:1}
 ])reject(await probe(t,p,'/api/open-shop',body));
 const opened=await p.command('/api/open-shop',{expectedRevision,ownerName:'稽核玩家',shopName:'稽核店'});
 assert.equal(opened.world.shops.length,1);
});

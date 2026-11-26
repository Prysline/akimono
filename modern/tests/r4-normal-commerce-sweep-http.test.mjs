/** Controlled HTTP/v2 integration; real server inventory/time, no selected RNG. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
test('R4 source sweep from real discard, across settlement, two v2 generations',async t=>{
 const p=await genuinePlayer(t,{now:'1022380',crossPeriod:true,fullCommerce:true});
 assert.equal(p.state.sweep.canSweep,false);
 // Five starting gifts, at source price 10000, generate exactly 10000 waste.
 await p.discard(79,5);
 assert.equal(p.state.shop.trush,10000);
 assert.equal(p.state.sweep.garbageKg,1);assert.equal(p.state.sweep.canSweep,p.remaining()>=3600);
 await p.enoughTime(3600);
 const first=await p.saveAndRestart(0);
 assert.equal(p.state.sweep.canSweep,true);
 const before=p.state.world,shop=before.shops[0];
 for(const body of [{requestedHours:0},{requestedHours:1,trush:0},{requestedHours:1,expectedRevision:before.revision-1}]){
   const rejected=await p.post('/api/sweep',{expectedRevision:before.revision,...body});
   assert.equal(rejected.ok,false);assert.deepEqual(p.state.world,before);
 }
 const r=await p.post('/api/sweep',{expectedRevision:before.revision,requestedHours:99});
 assert.equal(r.ok,true,JSON.stringify(r.details));assert.equal(r.details.source,'r4-frozen-sweep-s.v1');
 const garbage=shop.trush,hours=Math.min(99,Math.trunc(Math.min(before.nowSeconds-shop.time,259200)/3600));
 const spent=Math.min(Math.trunc(1200*garbage/100000)+1200,hours*3600);
 assert.equal(r.details.effectiveHours,hours);assert.equal(r.details.timeSpentSeconds,spent);
 assert.equal(p.state.shop.trush,Math.max(0,garbage-hours*300000));assert.equal(p.state.shop.time,Math.max(shop.time,before.nowSeconds-259200)+spent);
 assert.equal(p.state.shop.lastlogin,before.nowSeconds);assert.equal(p.state.shop.money,shop.money);
 assert.deepEqual(p.state.world.market,before.market);assert.deepEqual(p.state.shop.item,shop.item);
 assert.equal(p.state.world.period.disk.live['log0.cgi'].bytes,before.period.disk.live['log0.cgi'].bytes,'original sweep does not PushLog');
 for(let n=0;p.state.world.period.settledCount===first.period.settledCount;n++){
   assert.ok(n<37);await p.tick(Math.min(60,Math.max(1,Math.ceil(p.boundary()/60))));
 }
 const second=await p.saveAndRestart(1);
 assert.equal(second.period.settledCount,first.period.settledCount+1);
 assert.equal(p.state.sweep.garbage,p.state.shop.trush);
});

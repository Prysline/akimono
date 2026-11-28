/** Real D local HTTP/CAS/v2; not an authenticated multi-shop player test. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
test('D58 source sweep HTTP exact command, rejection and two v2 generations',async t=>{
 const p=await genuinePlayer(t,{now:'1022380',crossPeriod:true,marketCommerce:true});
 assert.equal(p.state.sweep.canSweep,false);
 await p.enoughTime(3600);
 const first=await p.saveAndRestart(0);
 const before=p.state.world,shop=before.shops[0];
 for(const body of [{requestedHours:0},{requestedHours:1,trush:0},{requestedHours:1,expectedRevision:before.revision-1},{requestedHours:1,shopId:2}]){
   const r=await p.post('/api/sweep',{expectedRevision:before.revision,...body});
   assert.equal(r.ok,false);assert.deepEqual(p.state.world,before);
 }
 // Original submit is not gated by the form's 1kg visibility threshold.
 const r=await p.post('/api/sweep',{expectedRevision:before.revision,requestedHours:99});
 assert.equal(r.ok,true,JSON.stringify(r.details));assert.equal(r.details.source,'r4-frozen-sweep-s.v1');
 const garbage=shop.trush??0,hours=Math.min(99,Math.trunc(Math.min(before.nowSeconds-shop.time,259200)/3600));
 const spent=Math.min(garbage===0?0:Math.trunc(1200*garbage/100000)+1200,hours*3600);
 assert.equal(r.details.effectiveHours,hours);assert.equal(r.details.timeSpentSeconds,spent);
 assert.equal(p.state.shop.trush,Math.max(0,garbage-hours*300000));
 assert.equal(p.state.shop.time,Math.max(shop.time,before.nowSeconds-259200)+spent);
 assert.equal(p.state.shop.lastlogin,before.nowSeconds);assert.equal(p.state.shop.money,shop.money);
 assert.deepEqual(p.state.world.market,before.market);assert.deepEqual(p.state.shop.item,shop.item);
 assert.equal(p.state.world.period.disk.live['log0.cgi'].bytes,before.period.disk.live['log0.cgi'].bytes);
 assert.equal(p.state.world.revision,before.revision+1);
 const after=structuredClone(p.state.world);
 const second=await p.saveAndRestart(1);assert.deepEqual(second,after);
 assert.equal(p.state.sweep.garbage,p.state.shop.trush);
 assert.equal(second.period.settledCount,first.period.settledCount);
});

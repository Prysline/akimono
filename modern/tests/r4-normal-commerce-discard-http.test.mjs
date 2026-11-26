/** Controlled actual player commands and v2 persistence, not formal C acceptance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
test('R4 no-guild discard returns wholesale, adds waste, writes source log and replays across settlement',async t=>{
 const p=await genuinePlayer(t,{now:'1022380',crossPeriod:true,fullCommerce:true});
 await p.use(79,0);
 async function discard(id){
   assert.ok(p.stock(id)>0);await p.tick(1);
   const before=p.state.world,s=before.shops[0],i=id-1;
   const bad=await p.post('/api/discard',{itemId:id,count:1,expectedRevision:before.revision-1});
   assert.equal(bad.ok,false);assert.deepEqual(p.state.world,before);
   const result=await p.post('/api/discard',{itemId:id,count:99,expectedRevision:before.revision});
   assert.equal(result.ok,true,JSON.stringify(result.details));assert.equal(result.details.source,'r4-frozen-item-t-no-guild.v1');
   const after=p.state.world,n=after.shops[0],count=s.item[i];
   assert.equal(n.item[i],0);assert.equal(n.trush,s.trush+Math.trunc(10000*count/5));
   assert.equal(n.lastlogin,before.nowSeconds);assert.equal(n.time,s.time);assert.equal(n.money,s.money);
   assert.equal(after.market.wholesale[i],Math.min(3,before.market.wholesale[i]+count));
   assert.ok(after.market.sparseWrittenSlots.includes(i));
   assert.equal(result.details.discardedCount,count);
   assert.ok(after.period.disk.live['log0.cgi'].bytes.startsWith([before.nowSeconds,0,1,result.details.originalMessage].join('\t')+'\n'));
 }
 await discard(9);
 const first=await p.saveAndRestart(0);
 for(let n=0;p.state.world.period.settledCount===first.period.settledCount;n++){
   assert.ok(n<37);await p.tick(Math.min(60,Math.max(1,Math.ceil(p.boundary()/60))));
 }
 await discard(12);
 const second=await p.saveAndRestart(1);
 assert.equal(second.period.settledCount,first.period.settledCount+1);
});

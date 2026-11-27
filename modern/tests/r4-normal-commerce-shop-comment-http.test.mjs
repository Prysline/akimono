/** Controlled real HTTP and v2 replay, not formal player acceptance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
test('R4 owner comment uses exact CAS, Unicode source limits, silent logs and v2 reload',async t=>{
 const p=await genuinePlayer(t,{crossPeriod:true,fullCommerce:true});
 assert.equal(p.state.reviewedShopComment,true);
 const before=p.state.world,rev=before.revision;
 const post=comment=>p.post('/api/shop-comment',{expectedRevision:p.state.world.revision,comment});
 for(const bad of ['管理','支','11','12','aa','http','?',',',':',';','\t','\r','\n','<','>','&','字'.repeat(37)]){
   const r=await post(bad);assert.equal(r.ok,false,bad);assert.deepEqual(p.state.world,before);
 }
 const stale=await p.post('/api/shop-comment',{expectedRevision:rev-1,comment:'有效'});
 assert.equal(stale.ok,false);assert.deepEqual(p.state.world,before);
 const valid='😀'.repeat(36),r=await post(valid);
 assert.equal(r.ok,true,JSON.stringify(r.details));
 assert.equal(p.state.shop.comment,valid);
 assert.deepEqual(p.state.shop,{...before.shops[0],comment:valid,lastlogin:before.nowSeconds});
 assert.deepEqual(p.state.world.market,before.market);
 for(const key of ['log0.cgi','log1.cgi','log2.cgi'])assert.deepEqual(p.state.world.period.disk.live[key],before.period.disk.live[key]);
 assert.equal(p.state.world.revision,rev+1);
 assert.equal(p.state.world.nowSeconds,before.nowSeconds);
 const first=await p.saveAndRestart(0);assert.equal(first.shops[0].comment,valid);
 assert.equal((await post('')).ok,true);assert.equal(p.state.shop.comment,'');
 const second=await p.saveAndRestart(1);assert.equal(second.shops[0].comment,'');
});

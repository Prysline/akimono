/** Controlled real HTTP, not formal player acceptance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
test('R4 owner icon form read, exact CAS, silent logs and v2 replay',async t=>{
 const p=await genuinePlayer(t,{crossPeriod:true,fullCommerce:true,selectOwnerIcon:true});
 assert.equal(p.state.reviewedOwnerIcon,true);
 const before=p.state.world,rev=before.revision;
 assert.ok(before.shops[0].icon>=1&&before.shops[0].icon<=25);
 const form=await p.request('/api/owner-icon-form?kind=procedures');
 assert.equal(form.icons.length,25);assert.ok(form.randomIcon>=1&&form.randomIcon<=25);
 assert.deepEqual((await p.request('/api/state')).world,before);
 for(const bad of [{icon:0},{icon:26},{icon:'1'},{icon:1,shopId:2},{icon:1,randomDraws:[0]},{icon:1,expectedRevision:rev-1}]){
   const r=await p.post('/api/owner-icon',{expectedRevision:rev,...bad});
   assert.equal(r.ok,false);assert.deepEqual(p.state.world,before);
 }
 const r=await p.post('/api/owner-icon',{expectedRevision:rev,icon:25});assert.equal(r.ok,true,JSON.stringify(r.details));
 assert.deepEqual(p.state.shop,{...before.shops[0],icon:25,lastlogin:before.nowSeconds});
 assert.equal(p.state.world.revision,rev+1);assert.equal(p.state.world.nowSeconds,before.nowSeconds);
 assert.deepEqual(p.state.world.market,before.market);
 for(const key of ['log0.cgi','log1.cgi','log2.cgi'])assert.deepEqual(p.state.world.period.disk.live[key],before.period.disk.live[key]);
 const first=await p.saveAndRestart(0);assert.equal(first.shops[0].icon,25);
 assert.equal((await p.post('/api/owner-icon',{expectedRevision:p.state.world.revision,icon:form.randomIcon})).ok,true);
 const second=await p.saveAndRestart(1);assert.equal(second.shops[0].icon,form.randomIcon);
});

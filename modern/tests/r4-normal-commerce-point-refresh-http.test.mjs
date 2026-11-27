import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

// Controlled HTTP regression (fixed clock, legal initial grant, no RNG
// injection): DataRead must refresh GetDTPoint at every action boundary.
test('R4 non-crossing full commerce refreshes source point on open and paid USE, then replays it',async t=>{
  const p=await genuinePlayer(t,{crossPeriod:false,fullCommerce:true});
  const before=p.state.shop;
  assert.equal(before.rank,5010);
  assert.equal(before.point,5010);
  assert.equal(p.state.shopSummary.point,5010);
  assert.equal(p.stock(63),1);
  const revision=p.state.world.revision;
  await p.use(63,1,1); // frozen #63: two shelves, 20000, consumes tool
  const after=p.state.shop;
  assert.equal(after.showcasecount,2);
  assert.equal(p.stock(63),0);
  assert.equal(after.paytoday,before.paytoday+20000);
  assert.equal(after.point,4817); // int(5010 / (2 - (1 - 20000/500000)))
  assert.equal(p.state.shopSummary.point,after.point);
  const snapshot=structuredClone(p.state.world);
  const rejected=await p.post('/api/use',{expectedRevision:revision,itemId:63,useId:1,requestedCount:1});
  assert.equal(rejected.ok,false);
  assert.deepEqual(rejected.state.world,snapshot);
  await p.saveAndRestart(0);
  assert.deepEqual(p.state.world,snapshot);
  assert.equal(p.state.shop.point,4817);
  assert.equal(p.state.shopSummary.point,4817);
});

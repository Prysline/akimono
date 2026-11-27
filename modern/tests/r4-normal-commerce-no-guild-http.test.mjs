import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

test('R4 real player obtains #62 and executes original no-guild advertisement result, persists consumption and denies stale reuse',async t=>{
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true});
  await p.market(13);await p.market(62);
  assert.equal(p.stock(62),1);
  assert.ok(!p.state.shop.guild);
  assert.equal(p.quote(62,2).timePerUseSeconds,28800);
  assert.equal(p.quote(62,2).randomSampleRequired,false);
  await p.enoughTime(28800);
  const before=await p.saveAndRestart(0);
  const old=p.state.shop,revision=p.state.world.revision;
  const used=await p.use(62,2);
  assert.equal(used.details.originalFunctionReturn,'沒有加入商會無法進行商會廣告');
  assert.equal(used.details.randomDrawsUsed,0);
  assert.equal(p.stock(62),0);
  for(const key of ['money','paytoday','rank','guild'])assert.deepEqual(p.state.shop[key],old[key],key);
  assert.deepEqual(p.state.shop.exp,old.exp);
  assert.equal(p.state.shop.time,Math.max(old.time,before.nowSeconds-259200)+28800);
  assert.equal(p.state.world.revision,revision+1);
  assert.equal(p.quote(62,2).canUse,false);
  await p.deny(62,2,{expectedRevision:revision});
  await p.deny(62,2);
  const after=await p.saveAndRestart(1);
  assert.equal(after.shops[0].item[61],0);
  assert.deepEqual(after.shops[0].exp,before.shops[0].exp);
});

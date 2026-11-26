import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

test('R4 genuine local #62/1 self-target consumes advertisement, rejects other target, persists result',async t=>{
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true});
  await p.market(13);await p.market(62);await p.enoughTime(18000);
  assert.equal(p.quote(62,1).targetShopId,1);
  assert.equal(p.quote(62,1).randomSampleRequired,false);
  await p.deny(62,1,{targetShopId:2});
  await p.deny(62,1);
  const before=await p.saveAndRestart(0),shop=p.state.shop;
  const result=await p.use(62,1);
  assert.equal(result.details.originalFunctionReturn,'沒辦法指定自己的商店');
  assert.equal(result.details.targetShopId,1);
  assert.equal(result.details.randomDrawsUsed,0);
  assert.equal(p.stock(62),0);
  assert.equal(p.state.shop.rank,shop.rank);
  assert.equal(p.state.shop.money,shop.money);
  assert.deepEqual(p.state.shop.exp,shop.exp);
  assert.equal(p.state.shop.time,Math.max(shop.time,before.nowSeconds-259200)+18000);
  await p.deny(62,1,{targetShopId:1});
  await p.saveAndRestart(1);
});
test('R4 genuine forbidden book exposes original point gate, denies unowned target and below-gate self actions',async t=>{
  const p=await genuinePlayer(t,{now:null,crossPeriod:true,fullCommerce:true,fundMarketWithWork:true});
  await p.market(13);await p.market(65);await p.enoughTime(18000);
  assert.ok(p.state.shop.point<20000);
  for(const [useId,fee] of [[0,0],[1,50000]]){
    const q=p.quote(65,useId);
    assert.equal(q.targetShopId,1);assert.equal(q.moneyPerUse,fee);
    assert.equal(q.canUse,false);assert.match(q.reason,/點數不足/);
    await p.deny(65,useId,{targetShopId:2});
    await p.deny(65,useId,{targetShopId:1});
    await p.deny(65,useId);
    assert.equal(p.stock(65),1);
  }
  await p.saveAndRestart(0);
  assert.equal(p.stock(65),1);
});

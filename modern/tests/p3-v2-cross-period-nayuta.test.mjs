import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

test('P3 source #66/3 from genuine cross-period player, three skills, earned EXP, sale and actual lostbook persistence',async t=>{
  const p=await genuinePlayer(t,{crossPeriod:true});
  const products=[67,68,69,70];
  const book=async id=>{if(!p.stock(id))await p.market(id,1,{sell:products});};
  await p.use(79,0);await p.use(79,3);
  await p.ore(6,25);await p.ore(7,23);await p.ore(5,310);
  await p.use(37,0);
  await book(37);await p.stones(30,products);await p.use(37,1);
  assert.equal(p.stock(18),1);assert.equal(p.stock(19),1);
  await book(66);await book(78);
  await p.use(78,3);
  // Build legitimate accessory EXP and revenue before the appraiser course.
  async function lower(){
    await book(66);await p.ore(5,20);
    const made=await p.use(66,0);
    assert.equal(made.details.experienceGain,20);
    if(p.stock(67))await p.list(67);
  }
  async function reach500(){
    for(let n=0;p.exp(66)<500;n++){
      assert.ok(n<70,'source accessory training budget');
      await lower();
    }
  }
  await reach500();
  assert.equal(p.stock(24),0);
  await p.deny(66,3);
  // Repeated source training uses the actual one-copy skill limit and
  // re-evaluates the EXP gate after elapsed time/period decay.
  for(let n=0;!p.stock(24);n++){
    assert.ok(n<24,'source appraiser training budget');
    await book(37);
    if(p.exp(37)<200){
      await p.stones(30,products);
      if(p.stock(19))await p.discard(19,1);
      await p.use(37,1);
    }else{
      for(const id of [1,2,3,4])await p.gather(id,3);
      for(const id of [5,6,7])await p.ore(id,3);
      await p.stones(3,products);
      await p.enoughTime(p.quote(37,2).timePerUseSeconds);
      if(p.exp(37)<200)continue;
      await p.use(37,2);
    }
  }
  for(const id of [18,19,24])assert.equal(p.stock(id),1);
  assert.ok(p.state.world.period.settledCount>0,'real 36h settlement was required');
  let first=null, destroyed=false, callbackObserved=false,salesObserved=0;
  // Randomness is server-owned. No selected UUID, reroll, fixture RNG or
  // state edit. Bound attempts and fail if no actual destruction occurs.
  for(let attempt=0;attempt<32&&!destroyed;attempt++){
    for(let n=0;;n++){
      assert.ok(n<20,'source #66/3 readiness after period decay');
      await reach500();await book(66);
      for(const id of [5,6,7])await p.ore(id,20);
      await p.stones(6,products);
      await p.enoughTime(p.quote(66,3).timePerUseSeconds);
      if(p.exp(66)>=500&&p.remaining()>=p.quote(66,3).timePerUseSeconds)break;
    }
    if(!first)first=await p.saveAndRestart(0);
    assert.ok(p.exp(66)>=500);
    assert.equal(p.stock(70),0);
    const before=p.state.shop,clock=p.state.world.nowSeconds,offer=p.quote(66,3);
    const result=await p.use(66,3);
    assert.equal(result.details.experienceGain,20);
    assert.equal(p.exp(66),before.exp['66']+20);
    for(const id of [18,19,24])assert.equal(p.stock(id),1);
    for(const [id,count] of [[5,20],[6,20],[7,20],[8,6]])assert.equal(p.stock(id),before.item[id-1]-count);
    assert.equal(p.stock(70),1);
    assert.equal(p.state.world.nowSeconds,clock);
    assert.equal(p.state.shop.time-before.time,offer.timePerUseSeconds);
    destroyed=result.details.mapDestroyed===true;
    assert.equal(p.stock(66),before.item[65]-(destroyed?1:0));
    t.diagnostic('P3 #66/3 actual source EXP '+before.exp['66']+'→'+p.exp(66)+', lostbook='+destroyed+', period='+p.state.world.period.settledCount);
    await p.list(70);
    // #70 is one-copy; genuinely sell before another manufacture. Each
    // time receipt comes from the same source-reviewed natural sale/ITEM
    // stage. Do not infer a FUNCTURN gain from a net rank change (EVENT
    // and natural-sale popularity can independently change rank).
    for(let n=0;p.stock(70)>0;n++){
      assert.ok(n<144,'source #70 sale budget');
      const beforeTick=p.state.shop;
      const shortSlice=n===0&&p.boundary()>120;
      const r=await p.tick(shortSlice?2:60);
      if(shortSlice&&beforeTick.rank<10000&&beforeTick.price[0]<=50000&&
         r.details.naturalSaleCount===0&&p.stock(70)===1){
        assert.equal(r.details.itemTurnAffectedSlices,1,'eligible unsold necklace invokes positive source FUNCTURN');
      }
      if(r.details.itemTurnAffectedSlices>0)callbackObserved=true;
      salesObserved+=r.details.naturalSaleCount;
    }
    assert.equal(p.stock(70),0);
    assert.ok(salesObserved>=attempt+1,'actual necklace sale receipt');
  }
  assert.ok(destroyed,'real server-owned lostbook outcome observed');
  // It may sell immediately or be at the 100% popularity cap, so a
  // positive callback is conditional, not a fabricated mandatory gain.
  t.diagnostic('P3 #70 natural sales '+salesObserved+', positive FUNCTURN observed='+callbackObserved);
  assert.ok(first);
  const second=await p.saveAndRestart(1);
  assert.equal(second.shops[0].item[65],0);
  assert.equal(second.shops[0].item[69],0);
  for(const id of [18,19,24])assert.equal(p.stock(id),1);
  assert.ok(second.revision>first.revision);
  assert.ok(second.period.settledCount>=first.period.settledCount);
});

/** Controlled HTTP/v2 clock integration, not formal player acceptance.
 * Fixed start clock only. All inventory, career, EXP, market and RNG are
 * obtained through the real server. No injected state, selected tape or retries
 * with a new world. The source's lostbook branch is permitted, not forced.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

// #9 DSL: TIME 2h, EXPTIME 30m, ITEMUSETIMERATE .5, material times/1.5.
// USE #1 inherits only USE #0's job function through CheckUseItem.
const sourceClock=exp=>2400-Math.trunc((2400-600)*exp/1000);
test('R4 controlled HTTP material fallback survives real period and two v2 replays',async t=>{
  const p=await genuinePlayer(t,{now:'1022380',crossPeriod:true,fullCommerce:true});
  await p.use(79,0);
  assert.equal(p.quote(9,1).timePerUseSeconds,3600);
  await p.market(78);
  await p.use(78,8);
  assert.equal(p.state.shop.job,'material');
  const verifyQuote=()=>{
    const expected=sourceClock(p.exp(9));
    for(const no of [0,1,2])assert.equal(p.quote(9,no).timePerUseSeconds,expected,'#9/'+no);
    return expected;
  };
  async function mine(){
    if(!p.stock(9))await p.market(9);
    for(let n=0;;n++){
      assert.ok(n<8,'source clock did not converge');
      const seconds=verifyQuote();
      if(p.remaining()>=seconds)break;
      await p.enoughTime(seconds);
    }
    const seconds=verifyQuote(),before=p.state.world,shop=before.shops[0];
    assert.equal(p.quote(9,1).canUse,true);
    const history=p.state.historyCommands;
    await p.deny(9,1,{randomDraws:[0,0,0,999999]});
    await p.deny(9,1,{expectedRevision:before.revision-1});
    assert.equal(p.state.historyCommands,history);
    const result=await p.use(9,1);
    assert.equal(result.details.timeSpentSeconds,seconds);
    assert.equal(p.state.world.revision,before.revision+1);
    assert.equal(p.state.world.nowSeconds,before.nowSeconds);
    assert.equal(p.state.shop.time,Math.max(shop.time,before.nowSeconds-259200)+seconds);
    assert.equal(p.exp(9),Math.min(1000,(shop.exp['9']??0)+20));
    assert.equal(p.stock(9),shop.item[8]-(result.details.mapDestroyed?1:0));
    assert.equal(p.state.shop.money,shop.money);
    assert.equal(result.details.randomDrawsUsed,4);
    verifyQuote();
  }
  await mine();
  const first=await p.saveAndRestart(0);
  verifyQuote();
  const priorPeriod=first.period.settledCount;
  for(let n=0;p.state.world.period.settledCount===priorPeriod;n++){
    assert.ok(n<37,'next source settlement not reached');
    await p.tick(Math.min(60,Math.max(1,Math.ceil(p.boundary()/60))));
  }
  assert.equal(p.state.world.period.settledCount,priorPeriod+1);
  assert.equal(p.state.shop.job,'material');
  verifyQuote();
  await mine();
  const second=await p.saveAndRestart(1);
  assert.ok(second.period.settledCount>first.period.settledCount);
  verifyQuote();
  // A rehashed but semantically false stored clock must not be accepted.
  // Preserve and restore the real latest slot after checking fallback.
  await p.rejectForgedLatest(first,record=>{
    const world=JSON.parse(record.world);
    world.shops[0].time++;
    record.world=JSON.stringify(world);
  },{restore:true});
  assert.deepEqual(p.state.world,second);
  verifyQuote();
});

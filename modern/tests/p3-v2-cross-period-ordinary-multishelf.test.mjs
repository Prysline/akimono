import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

// Cross-period storage must not regress already legal ordinary multi-shelf
// operations. The time/settlement gate is deliberately still single shelf.
test('P3 crossing-enabled v2 preserves real #63 ordinary two-shelf commerce and disk wire while refusing unreviewed multi-shelf time',async t=>{
  const p=await genuinePlayer(t,{crossPeriod:true});
  assert.equal(p.stock(63),1,'source open-shop starter tool');
  await p.market(10);
  const grown=await p.use(63,1);
  assert.equal(grown.details.showcaseCountAfter,2);
  assert.equal(p.stock(63),0);
  const edit=async(shelf,itemId,per=100)=>{
    const r=await p.post('/api/showcase',{expectedRevision:p.state.world.revision,shelf,itemId,per});
    assert.equal(r.code,'COMMITTED',JSON.stringify(r.details));
  };
  await edit(1,10);
  assert.deepEqual(p.state.shop.showcase,[0,10]);
  assert.deepEqual(p.state.shop.price,[0,5000]);
  const row=p.state.world.period.disk.live['play.cgi'].bytes.trimEnd().split('\n').at(-1).split(':');
  assert.equal(row[0],'0,10');assert.equal(row[1],'0,5000');
  const before=p.state.world,history=p.state.historyCommands;
  const rejected=await p.post('/api/advance-reviewed-time',{expectedRevision:before.revision,minutes:1});
  assert.equal(rejected.ok,false);
  assert.deepEqual(p.state.world,before);assert.equal(p.state.historyCommands,history);
  const first=await p.saveAndRestart(0);
  await edit(0,10);
  await edit(1,0);
  assert.deepEqual(p.state.shop.showcase,[10,0]);
  const time=p.state.shop.time;
  await p.discard(10,1);
  assert.equal(p.state.shop.time,time);
  assert.deepEqual(p.state.shop.showcase,[10,0]);
  const second=await p.saveAndRestart(1);
  assert.equal(second.shops[0].showcasecount,2);
  assert.deepEqual(second.shops[0].showcase,[10,0]);
  assert.deepEqual(second.shops[0].price,[5000,0]);
  assert.equal(second.nowSeconds,first.nowSeconds);
  assert.equal(second.period.settledCount,first.period.settledCount);
  assert.equal(second.period.disk.live['play.cgi'].bytes.trimEnd().split('\n').at(-1).split(':')[0],'10,0');
});

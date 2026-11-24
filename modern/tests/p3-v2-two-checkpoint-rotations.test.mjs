import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

// Pre-crossing baseline only. Repeated legal one-unit discards exercise
// authenticated history capacity without requiring a period settlement.
test('P3 v2 earned craft and more than 256 ordinary HTTP commands survive two checkpoint rotations',async t=>{
  const p=await genuinePlayer(t);
  await p.use(79,0);
  await p.use(79,3);
  await p.ore(6,5);
  await p.ore(7,3);
  await p.ore(5,310);
  await p.use(37,0);
  await p.market(20);
  const initialExp=p.exp(20);
  const craft=await p.use(20,0);
  assert.equal(craft.details.experienceGain,20);
  assert.equal(p.exp(20),initialExp+20);
  assert.equal(p.stock(18),1);
  assert.ok(p.stock(41)>0);
  const baseline=p.state.world, initialIron=p.stock(5), product=p.stock(41);
  assert.ok(initialIron>=260);
  let anchor=p.state.historyCheckpointRevision;
  const rotations=[];
  let first;
  for(let i=0;i<260;i++){
    await p.discard(5,1);
    const next=p.state.historyCheckpointRevision;
    assert.equal(p.state.world.revision,baseline.revision+i+1);
    assert.equal(p.state.world.nowSeconds,baseline.nowSeconds);
    assert.equal(p.stock(5),initialIron-i-1);
    assert.ok(p.state.historyCommands<=128);
    if(next!==anchor){
      assert.ok(Number.isSafeInteger(next));
      if(anchor!==null)assert.ok(next>anchor);
      rotations.push(next);
      anchor=next;
      if(rotations.length===1){
        first=await p.saveAndRestart(0);
        assert.equal(p.state.historyCheckpointRevision,anchor);
      }
    }
  }
  assert.ok(first,'first checkpoint was persisted and restarted');
  assert.ok(rotations.length>=2,'two new checkpoint rotations');
  assert.equal(p.exp(20),initialExp+20);
  assert.equal(p.stock(41),product);
  assert.equal(p.stock(18),1);
  assert.deepEqual(p.state.world.period,baseline.period);
  const second=await p.saveAndRestart(1);
  assert.equal(second.revision,baseline.revision+260);
  assert.equal(p.state.historyCheckpointRevision,anchor);
  assert.equal(p.stock(5),initialIron-260);
  assert.equal(p.stock(41),product);
  assert.equal(p.exp(20),initialExp+20);
  t.diagnostic('P3 nonsettling genuine craft + 260 legal discards; checkpoint revisions '+rotations.join(', ')+'; two exact v2 restart generations');
  // Negative case only: a checksum-correct forged latest product count
  // cannot replace the authentic history; the previous slot must recover.
  await p.rejectForgedLatest(first,record=>{
    const world=JSON.parse(record.world);
    world.shops[0].item[40]++;
    record.world=JSON.stringify(world);
  });
});

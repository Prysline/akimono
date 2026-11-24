import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

test('P3 v2 #37/2: source-earned training EXP 200 and eight real materials grant appraiser skill, durable restart',async t=>{
  const p=await genuinePlayer(t);
  await p.use(79,0);await p.use(79,3);
  await p.ore(5,23);await p.ore(6,8);await p.ore(7,6);
  for(const id of [1,2,3,4])await p.gather(id,3);
  await p.use(37,0);
  assert.equal(p.stock(18),1);assert.equal(p.exp(37),50);
  for(let n=0;n<3;n++){
    await p.market(37);await p.stones(33);
    if(n===0){
      assert.equal(p.quote(37,2).canUse,false);
      await p.deny(37,2);
    }
    // Discard is the original no-action-time ITEM detail action. It avoids
    // claiming a second copy of a one-copy skill or bypassing its limit.
    if(p.stock(19))await p.discard(19,1);
    await p.use(37,1);
    assert.equal(p.stock(19),1);assert.equal(p.exp(37),100+n*50);
  }
  const first=await p.saveAndRestart(0);
  assert.equal(first.shops[0].exp['37'],200);
  await p.market(37);await p.stones(3);
  for(const id of [5,6,7])await p.ore(id,3);
  for(const id of [1,2,3,4])await p.gather(id,3);
  await p.enoughTime(p.quote(37,2).timePerUseSeconds);
  const before=p.state.shop;
  const trained=await p.use(37,2);
  assert.equal(trained.details.experienceGain,50);
  assert.equal(p.exp(37),250);assert.equal(p.stock(24),1);
  assert.equal(p.stock(18),1);assert.equal(p.stock(19),1);
  for(let id=1;id<=8;id++)assert.equal(p.stock(id),before.item[id-1]-3);
  assert.equal(p.stock(37),0);
  const second=await p.saveAndRestart(1);
  assert.equal(second.shops[0].item[23],1);
  assert.equal(second.shops[0].exp['37'],250);
});

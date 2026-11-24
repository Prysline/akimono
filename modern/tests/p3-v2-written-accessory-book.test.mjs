import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

// The alternate book-writing path uses only the original five vouchers,
// real market tools/maps and mined ore. Never mint a #66 book at the anchor.
test('P3 v2 #10/3 writes accessory books with genuine #16/#17 NEED, then manufactures #66/0 after reload',async t=>{
  const p=await genuinePlayer(t);
  await p.use(79,1);
  for(const id of [15,16,17])assert.equal(p.stock(id),1);
  assert.equal(p.stock(79),0);
  await p.deny(10,3);
  while(!p.stock(66)){
    await p.market(10);await p.ore(5,20);await p.ore(6,5);await p.ore(7,5);
    await p.enoughTime(p.quote(10,3).timePerUseSeconds);
    const prior=p.state.shop,done=await p.use(10,3);
    assert.equal(done.details.experienceGain,20);
    assert.equal(p.stock(10),prior.item[9]-1);
    assert.equal(p.stock(16),1);assert.equal(p.stock(17),1);
    assert.equal(p.stock(5),prior.item[4]-20);
    assert.equal(p.stock(6),prior.item[5]-5);
    assert.equal(p.stock(7),prior.item[6]-5);
  }
  assert.ok(p.exp(10)>0);
  await p.deny(66,0);
  const first=await p.saveAndRestart(0);
  assert.ok(first.shops[0].item[65]>0);
  await p.market(37);await p.ore(5,40);await p.ore(6,5);await p.ore(7,3);
  await p.use(37,0);
  await p.market(37);await p.stones(30);await p.use(37,1);
  await p.enoughTime(p.quote(66,0).timePerUseSeconds);
  const before=p.state.shop;
  const made=await p.use(66,0);
  assert.equal(made.details.experienceGain,20);
  assert.equal(p.stock(66),before.item[65]);
  assert.equal(p.stock(18),1);assert.equal(p.stock(19),1);
  assert.equal(p.stock(5),before.item[4]-20);
  assert.ok(p.stock(67)>before.item[66]);
  const final=await p.saveAndRestart(1);
  assert.equal(final.shops[0].exp['66'],20);
  assert.equal(final.shops[0].exp['37'],100);
});

/** Controlled real local HTTP integration; not C player acceptance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
test('A35 source list and executable quote are independent, read-only, and survive v2',async t=>{
  const p=await genuinePlayer(t,{now:'896401',crossPeriod:true,fullCommerce:true});
  const entry=(id,n)=>p.state.sourceUseDisclosure.find(q=>q.itemId===id&&q.useId===n);
  assert.equal(p.state.sourceUseDisclosure.length,116);
  assert.equal(new Set(p.state.sourceUseDisclosure.map(q=>q.itemId+':'+q.useId)).size,116);
  for(const q of p.state.useOffers){
    const row=entry(q.itemId,q.useId);
    assert.ok(row);
    for(const key of ['sourceUseOk','sourceDispOk','sourceNameVisible','sourceDisplayName'])
      assert.equal(q[key],row[key]);
  }
  assert.equal(entry(10,0).sourceDisplayName,'？？？？？？？？');
  assert.equal(entry(10,0).sourceUseOk,false);
  assert.equal(entry(14,0).sourceUseOk,true,'original no explicit material gate');
  assert.equal(p.stock(14),0);
  assert.equal(p.quote(14,0).canUse,false,'modern execution still needs owned map');
  const before=structuredClone(p.state.world),disclosure=structuredClone(p.state.sourceUseDisclosure);
  for(let i=0;i<3;i++){
    const state=await p.request('/api/state');
    assert.deepEqual(state.world,before);
    assert.deepEqual(state.sourceUseDisclosure,disclosure);
  }
  await p.deny(14,0);await p.deny(10,0);
  assert.deepEqual(p.state.world,before);
  assert.equal(entry(79,0).sourceUseOk,true);
  await p.use(79,0);await p.use(79,0);
  assert.equal(p.stock(79),1);
  assert.equal(entry(79,0).sourceUseOk,false);
  assert.equal(entry(79,0).sourceDisplayName,'？？？？？？？？');
  assert.equal(p.quote(79,0).canUse,false);
  await p.deny(79,0);
  const saved=structuredClone(p.state.sourceUseDisclosure);
  await p.saveAndRestart(0);
  assert.deepEqual(p.state.sourceUseDisclosure,saved);
});

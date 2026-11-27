import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';

// No authenticated lifecycle route is installed by LC-D1 preflight.
test('LC-D1 lifecycle HTTP stays unavailable; rejected requests preserve actual v2 world and replay history',async t=>{
  const p=await genuinePlayer(t,{crossPeriod:true,marketCommerce:true});
  const before=structuredClone(p.state.world),history=p.state.historyCommands;
  for(const [route,confirmation] of [['/api/restart-shop','restart'],['/api/close-shop','closeshop']]){
    for(const extra of [{},{shopId:1,ownerName:'來源玩家'}]){
      const r=await p.post(route,{expectedRevision:before.revision,confirmation,...extra});
      assert.equal(r.status,404);assert.equal(r.ok,false);
    }
  }
  assert.deepEqual(await p.saveAndRestart(0),before);
  assert.equal(p.state.historyCommands,history);
});

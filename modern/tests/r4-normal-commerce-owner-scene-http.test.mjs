/** Controlled HTTP integration; not a formal player acceptance run. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from './support/p3-genuine-v2-player.mjs';
test('source owner scene is served by real state route without mutating the game',async t=>{
  const p=await genuinePlayer(t,{now:'896401',crossPeriod:true,fullCommerce:true});
  const before=structuredClone(p.state.world),scene=p.state.ownerScene;
  assert.ok(scene);
  assert.equal(scene.assets.gold.path,'map/c-sg.png');
  assert.equal(scene.assets.warehouse.path,'map/shops.png');
  assert.equal(scene.goldCount,Math.min(6,Math.max(0,Math.trunc(before.shops[0].money/5000000))));
  assert.deepEqual(scene.displayedItems,before.shops[0].showcase.filter(id=>id>0&&before.shops[0].item[id-1]>0));
  for(let i=0;i<2;i++){
    const state=await p.request('/api/state');
    assert.deepEqual(state.ownerScene,scene);assert.deepEqual(state.world,before);
  }
});

// Explicit failing reproduction, not part of the green default test suite.
// Run: cd modern && node --test scripts/r1-http-extra-fields-repro.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {genuinePlayer} from '../tests/support/p3-genuine-v2-player.mjs';
async function fresh(t){const p=await genuinePlayer(t,{now:null,crossPeriod:true});const r=await p.post('/api/reset',{confirm:'RESET_LOCAL_TEST_WORLD',expectedGeneration:p.state.save.generation,expectedRevision:p.state.world.revision,expectedWorldId:p.state.world.worldId});assert.equal(r.code,'RESET');return p;}
test('R1 defect reproduction: initialize must reject unauthorized client money field',async t=>{const p=await fresh(t);const r=await p.post('/api/initialize',{money:999999});assert.equal(r.ok,false,'initialize accepted unauthorized field');assert.equal(p.state.world,null);});
test('R1 defect reproduction: open-shop must reject unauthorized shopId/money fields',async t=>{const p=await fresh(t);const init=await p.post('/api/initialize');assert.equal(init.code,'COMMITTED');const before=structuredClone(p.state.world);const r=await p.post('/api/open-shop',{expectedRevision:before.revision,ownerName:'audit',shopName:'audit',shopId:99,money:999999});assert.equal(r.ok,false,'open-shop accepted unauthorized fields');assert.deepEqual(p.state.world,before);});

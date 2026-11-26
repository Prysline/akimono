import test from 'node:test';
import assert from 'node:assert/strict';
import {auditNormalCommerce} from '../scripts/audit-normal-commerce.mjs';

test('normal commerce audit enumerates original compiler, 79 ITEM, 116 USE, 25 EVENT without granting player authority',async()=>{
  const report=await auditNormalCommerce();
  assert.deepEqual(report.counts,{items:79,uses:116,events:25,functions:7});
  assert.deepEqual(report.items.map(x=>x.id),Array.from({length:79},(_,i)=>i+1));
  assert.equal(report.items.flatMap(x=>x.uses).length,116);
  assert.equal(new Set(report.events.map(x=>x.code)).size,25);
  assert.equal(report.globalCallbacks.length,7);
  assert.equal(report.summary.positivePop,65);
  // Original #64 has positive POP but explicitly forbids a showcase.
  assert.deepEqual(report.summary.positivePopNoShowcase,[64]);
  assert.equal(report.items[63].sourceNoShowcase,true);
  // Missing POP is NOT zero: frozen PRICE compiler supplies its default.
  assert.equal(report.items[76].compiledPricePopPointCost.popular,1440000);
  assert.equal(report.items[78].compiledPricePopPointCost.popular,72000);
  assert.equal(report.items[12].compiledPricePopPointCost.popular,0);
  assert.equal(report.items[61].uses[0].declaration.exp[0],'10%');
  assert.equal(report.items[69].declaration.funct[0],'_local_');
  assert.ok(report.items.every(x=>x.lawfulAcquisition==='requires route evidence'));
});

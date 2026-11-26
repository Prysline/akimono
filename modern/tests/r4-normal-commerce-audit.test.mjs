import test from 'node:test';
import assert from 'node:assert/strict';
import {auditNormalCommerce} from '../scripts/audit-normal-commerce.mjs';

test('normal commerce audit enumerates original compiler, 79 ITEM, 116 USE, 25 EVENT without granting player authority',async t=>{
  const report=await auditNormalCommerce();
  assert.deepEqual(report.counts,{items:79,uses:116,events:25,functions:7});
  assert.deepEqual(report.items.map(x=>x.id),Array.from({length:79},(_,i)=>i+1));
  assert.equal(report.items.flatMap(x=>x.uses).length,116);
  assert.equal(new Set(report.events.map(x=>x.code)).size,25);
  assert.equal(report.globalCallbacks.length,7);
  assert.equal(report.summary.explicitPositivePop,65);
  assert.equal(report.summary.positivePop,67);
  assert.deepEqual(report.summary.positivePopWithoutExplicitPop,[77,79]);
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
  assert.equal(report.summary.fullCommerceSaleRules,67);
  assert.equal(report.summary.registeredUses,112);
  assert.equal(report.summary.fullCommerceRegisteredUses,113);
  assert.equal(report.summary.fullCommerceListedUses,112);
  assert.deepEqual(report.summary.fullCommerceUnregisteredUses.map(x=>[x.itemId,x.useId]),[[65,0],[65,1],[65,2]]);
  assert.equal(report.items[61].uses[1].fullCommerceListedUse,false);
  assert.equal(report.items[61].uses[2].fullCommerceListedUse,true);
  assert.match(report.items[61].uses[2].fullCommerceScope,/no-guild/);
  assert.equal(report.items[62].fullCommerce.marketBuyRule,true);
  assert.equal(report.items[64].fullCommerce.saleRule.popularSeconds,0);
  assert.equal(report.items[63].fullCommerce.saleRule,null);
  assert.equal(report.items[61].fullCommerce.experienceShape,true);
  for(let id=71;id<=76;id++)assert.ok(report.items[id-1].fullCommerce.sourceRoutes.some(x=>x.itemId===39&&x.useId===id-59));
  assert.ok(report.items[76].fullCommerce.sourceRoutes.some(x=>x.itemId===39&&x.useId===18));
  assert.ok(report.items[78].fullCommerce.sourceRoutes.some(x=>x.kind==='source-open-shop'&&x.count===5));
  assert.ok(report.events.filter(x=>x.compiled).length===17);
  assert.deepEqual(report.summary.eventActivationCounts,{'natural-start':15,'external-zero-start':2,'source-use-manual':4,'disabled-no-reviewed-trigger':4});
  for(const code of ['kill-ken','kill-yoroi','kill-tate','kill-tue']){
    const e=report.events.find(x=>x.code===code);
    assert.equal(e.compiled,false);
    assert.equal(e.activation.kind,'source-use-manual');
    assert.equal(e.activation.itemId,65);assert.equal(e.activation.useId,2);
    assert.equal(e.activation.durationSeconds,28800);
    assert.equal(e.activation.generatedItemFile,true);
    assert.equal(e.activation.strictExpiry,true);
    assert.equal(e.activation.declaredEndMessageEmitted,false);
    assert.ok(e.activation.changedPoints.some(row=>row[2]===-400));
    assert.match(e.runtimeAndPlayerEvidence,/formal USE.*unverified/);
  }
  t.diagnostic('R4 full commerce audit '+JSON.stringify(report.summary));
});

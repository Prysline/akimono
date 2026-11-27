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
  assert.equal(report.summary.fullCommerceRegisteredUses,116);
  assert.equal(report.summary.fullCommerceListedUses,116);
  assert.deepEqual(report.summary.fullCommerceUnregisteredUses.map(x=>[x.itemId,x.useId]),[]);
  assert.equal(report.items[61].uses[1].fullCommerceListedUse,true);
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
    assert.match(e.runtimeAndPlayerEvidence,/formal local USE.*unverified/);
  }
  t.diagnostic('R4 full commerce audit '+JSON.stringify(report.summary));
});

import {parseAcceptanceTap,verifyAcceptanceRun,buildNormalCommerceAcceptance} from '../scripts/audit-normal-commerce-acceptance.mjs';
const head='a'.repeat(40),checkout='b'.repeat(40),base='ddd2f441ed5b36b8dcb94deaa193764eab7f2d21';
const steps=['Checkout source','Set up Node','Verify existing Standard Street DSL source audit','Verify pinned original Core source blobs','Verify four additional SHA-pinned original Core item-loader source blobs','Verify pinned untouched original Core admin initializer','Verify B-38 untouched original Core detail tax source blob','Run isolated original Perl Core tests'].map(name=>({name,conclusion:'success'}));
const meta={head,base,checkout,pr:25,runId:1,jobId:2,steps,conclusion:'success'};
// Explicit parser-only fixture. These are NOT GitHub run IDs or real Git objects.
const gitRead=(...args)=>args[0]==='show'?base+' '+head:args[0]==='ls-tree'?'modern/tests/original-perl/fixture.t':'c'.repeat(40);
const callback='R4 source-only FUNCBUY differential executes pinned Perl threshold, clipped payment, capacity and zero-log behavior';
const auditJson=JSON.stringify({ok:true,hashes:[{name:'custom/inc-item-data.cgi',actual:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',expected:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',verified:true},{name:'custom/inc-rebel-data.cgi',actual:'923634e58a05beca9ab004515fc7669d53a1ba3a',expected:'923634e58a05beca9ab004515fc7669d53a1ba3a',verified:true}],actual:{items:79,uses:116,events:25,functions:7},issues:[]});
const fakeLog=(rows=['ok 1 - '+callback],totals=['# tests 1','# pass 1','# fail 0','# cancelled 0','# skipped 0','# todo 0'])=>[
  'git log -1 --format=%H',checkout,...rows,'1..'+rows.length,...totals,
  '> node scripts/audit.mjs',auditJson,'> node scripts/demo-state.mjs','> node scripts/demo-original-nayuta-functurn.mjs',
  '##[group]Run prove -v *.t','fixture.t .... ','ok 1 - Perl only','1..1','ok','All tests successful.','Files=1, Tests=1, 1 wallclock secs','Result: PASS'
].join('\n');
test('acceptance parser requires complete Node and independent Perl TAP and refuses stale checkout or missing steps',()=>{
  const log=fakeLog();
  const verified=verifyAcceptanceRun({log,meta,head,gitRead});
  assert.equal(verified.independentRunGreen,true);
  assert.equal(verified.tap.rows.has('Perl only'),false);
  assert.equal(parseAcceptanceTap(log.replace('ok 1 - '+callback+'\n','')).complete,false);
  assert.equal(verifyAcceptanceRun({log:log.replace('ok 1 - Perl only\n',''),meta,head,gitRead}).independentRunGreen,false);
  assert.equal(verifyAcceptanceRun({log,meta:{...meta,steps:steps.slice(1)},head,gitRead}).independentRunGreen,false);
  assert.equal(verifyAcceptanceRun({log,meta:{...meta,steps:[...steps,steps[0]]},head,gitRead}).independentRunGreen,false);
  assert.throws(()=>verifyAcceptanceRun({log,meta,head:'f'.repeat(40),gitRead}),/exact current/);
  assert.throws(()=>verifyAcceptanceRun({log:log.replace(checkout,'f'.repeat(40)),meta,head,gitRead}),/checkout mismatch/);
  assert.throws(()=>verifyAcceptanceRun({log,meta,head,gitRead:(...args)=>args[0]==='show'?base+' '+checkout:'c'.repeat(40)}),/exact current head tree/);
  // Parser-only malformed prove transcripts: no row may be borrowed
  // from another file to satisfy the overall summary.
  assert.equal(parseAcceptanceTap(log.replace('ok 1 - Perl only','ok 2 - Perl only')).perlComplete,false);
  assert.equal(parseAcceptanceTap(log.replace('1..1\nok\nAll tests successful.','1..1\nAll tests successful.')).perlComplete,false);
  assert.equal(parseAcceptanceTap(log.replace('fixture.t .... ','fixture.t .... \nok 1 - duplicate\n1..1\nok\nfixture.t .... ')).perlComplete,false);
  assert.equal(verifyAcceptanceRun({log,meta,head,gitRead:(...args)=>args[0]==='ls-tree'?
    'modern/tests/original-perl/fixture.t\nmodern/tests/original-perl/missing.t':gitRead(...args)}).independentRunGreen,false);
  const dup=fakeLog(['ok 1 - '+callback,'ok 2 - '+callback],['# tests 2','# pass 2','# fail 0','# cancelled 0','# skipped 0','# todo 0']);
  assert.equal(parseAcceptanceTap(dup).rows.get(callback),'ambiguous');
  assert.equal(verifyAcceptanceRun({log:dup,meta,head,gitRead}).independentRunGreen,false);
  const skip=fakeLog(['ok 1 - '+callback+' # SKIP no evidence'],['# tests 1','# pass 0','# fail 0','# cancelled 0','# skipped 1','# todo 0']);
  assert.equal(parseAcceptanceTap(skip).rows.get(callback),'skipped');
  assert.equal(verifyAcceptanceRun({log:skip,meta,head,gitRead}).independentRunGreen,false);
});
test('acceptance ledger distinguishes source-only FUNCBUY from genuine acquisition and never promotes missing evidence',async()=>{
  const report=await auditNormalCommerce();
  const result=buildNormalCommerceAcceptance(report,verifyAcceptanceRun({log:fakeLog(),meta,head,gitRead}));
  const buy=result.functions.find(f=>f.kind==='FUNCBUY').evidence;
  assert.equal(buy.sourceDifferential.status,'passed');
  assert.equal(buy.sourceDifferential.scope,'source-only');
  assert.equal(buy.status,'not-proven');
  assert.equal(result.items[63].wholesaleAcquisition.status,'not-proven');
  assert.equal(result.phaseComplete,false);
});

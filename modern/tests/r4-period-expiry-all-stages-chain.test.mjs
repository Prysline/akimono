import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
import {compileReviewedGiftMapUse} from '../src/reviewed-gift-map-use.mjs';
import {
  reviewOriginalSoloPeriodPhaseChain,projectOriginalSoloPeriodPhaseChain,
} from '../src/original-period-solo-chain.mjs';
import {
  reviewR4PostPeriodTechLoss,projectR4PostPeriodTechLoss,
} from '../src/original-r4-post-period-tech-loss.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const paths={
  periodSource:'modern/tests/original-perl/period.cgi',
  configSource:'_config.cgi',
  itemDsl:'custom/inc-item-data.cgi',
  rebelDsl:'custom/inc-rebel-data.cgi',
  compilerSource:'modern/tests/original-perl/inc-makeitem.cgi',
  originalAddItemSource:'modern/tests/original-perl/use.cgi',
  detailSource:'modern/tests/original-perl/core-detail.cgi',
  readSource:'modern/tests/original-perl/inc-func.cgi',
  adminSource:'modern/tests/original-perl/core-inc-admin-func.cgi',
};
const sources=Object.fromEntries(await Promise.all(Object.entries(paths).map(
  async([k,p])=>[k,await readFile(path.join(root,p),'utf8')],
)));
const model=loadStandardStreetModel(sources.itemDsl,sources.rebelDsl);
const compiled=compileReviewedGiftMapUse({
  itemDsl:sources.itemDsl,rebelDsl:sources.rebelDsl,model,
});
const opts={
  ...sources,model,
  bootstrapMeta:'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',
  compiledLimits:compiled.limits.map(r=>r.limit),
};
const reviewedWithExpiry=reviewOriginalSoloPeriodPhaseChain({
  ...opts,includeReviewedDragon:true,includeReviewedDignity:true,
  includeReviewedGuild:true,includeReviewedPostTech:true,
  includeReviewedShopExpiry:true,
});
const oracle=()=>JSON.parse(execFileSync('perl',
  ['original-r4-period-expiry-all-stages-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));


test('R4 true full original period observes absent-owner CloseShop AFTER original prize, BEFORE dragon/shop ledger across TWO periods',()=>{
  assert.equal(reviewedWithExpiry.nonCommittable,true);
  assert.equal(reviewedWithExpiry.shopExpiry.committable,false);
  assert.equal(reviewedWithExpiry.shopExpiry.closeShopEffectKnown,false);
  const phases=reviewedWithExpiry.phases;
  assert.ok(phases.indexOf('original-absent-owner-CloseShop-call-only')>
    phases.indexOf('UpdateResetBefore-and-TopGetItem'));
  assert.ok(phases.indexOf('original-absent-owner-CloseShop-call-only')<
    phases.indexOf('dragon-shop-ledger-before-history'));
  const source=oracle();
  assert.equal(source.cases.length,2);
  for(const [i,row] of source.cases.entries()){
    const before=JSON.stringify(row.input);
    const got=projectOriginalSoloPeriodPhaseChain({
      reviewed:reviewedWithExpiry,...row.input,
    });
    assert.deepEqual(got.shop,row.output.shop,
      'round '+(i+1)+' exact full original shop; no fake CloseShop data deletion');
    assert.deepEqual(got.town,row.output.town,
      'round '+(i+1)+' true source town unaffected by recorded CloseShop call');
    assert.equal(got.dtPeople,row.output.dtPeople);
    assert.equal(got.pointsBefore,row.output.pointsBefore);
    assert.equal(got.pointsAfter,row.output.pointsAfter);
    assert.deepEqual(got.guildContext,row.output.guildContext);
    assert.deepEqual(got.guildMoneyEdits,row.output.guildMoneyEdits);
    assert.deepEqual(got.postTechLoss.lostItemIds,row.output.techLostItemIds);
    assert.deepEqual(got.postTechLoss.logs,row.output.techLogs);
    assert.equal(got.dragonPayoutFileConsumed,true);
    assert.equal(got.dignityEffect.dignityAfter,row.output.shop.dignity);
    assert.equal(got.shopExpiry.expiredOwner,row.output.expiredOwner,
      'original strict absent owner trigger');
    assert.deepEqual(got.shopExpiry.closeCalls,row.output.closeCalls,
      'original CloseShop external calls, never a claimed deletion');
    assert.deepEqual(got.shopExpiry.logs,row.output.closeLogs,
      'original formatted absence PushLog');
    assert.equal(got.shopExpiry.committable,false);
    assert.equal(got.worldStateWritten,false);
    assert.equal(got.nonCommittable,true);
    assert.equal(JSON.stringify(row.input),before);
  }
  const [first,second]=source.cases;
  assert.equal(first.input.nowSeconds,1000000);
  assert.equal(second.input.nowSeconds,1129600);
  assert.equal(first.input.shop.lastlogin,0);
  assert.equal(first.output.expiredOwner,false,
    'source first period is still at exact foundation age 0');
  assert.equal(second.output.expiredOwner,true,
    'source second period owner is absent >7 days and shop older than 12h');
  assert.deepEqual(first.output.closeCalls,[]);
  assert.deepEqual(second.output.closeCalls,[
    {shopId:1,reason:'経営者不在'},
  ]);
  assert.deepEqual(second.output.closeLogs,[
    [1,0,'同一商店が経営者不在のため閉店しました。'],
  ]);
  assert.equal(second.output.shop.id,1,
    'stub is call-recorder ONLY, so no fabricated deletion');
  assert.equal(second.output.shop.dragon,-500);
  assert.equal(second.output.shop.drmoney,0);
  assert.equal(second.output.guildContext.atk,921);
  assert.equal(second.output.shop.dignity,23);
  assert.deepEqual(second.output.techLostItemIds,[19]);
});

test('R4 two-period true CloseShop recorder is stable across independent original Perl executions',()=>{
  for(let repeat=0;repeat<2;repeat++)for(const row of oracle().cases){
    const got=projectOriginalSoloPeriodPhaseChain({
      reviewed:reviewedWithExpiry,...row.input,
    });
    assert.deepEqual(got.shop,row.output.shop);
    assert.deepEqual(got.town,row.output.town);
    assert.deepEqual(got.shopExpiry.closeCalls,row.output.closeCalls);
    assert.deepEqual(got.shopExpiry.logs,row.output.closeLogs);
    assert.deepEqual(got.postTechLoss.logs,row.output.techLogs);
  }
});

test('R4 existing B50 default never silently accepts CloseShop source time or claims a real closure',()=>{
  const input=oracle().cases[1].input;
  const untouched=JSON.stringify(input);
  const old=reviewOriginalSoloPeriodPhaseChain({
    ...opts,includeReviewedDragon:true,includeReviewedDignity:true,
    includeReviewedGuild:true,includeReviewedPostTech:true,
  });
  assert.equal(old.shopExpiry,null);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:old,...input,
  }),/unreviewed absent-owner time/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:reviewedWithExpiry,...input,nowSeconds:null,
  }),/actual original period NOW_TIME/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:reviewedWithExpiry,...input,nowSeconds:-1,
  }),/actual original period NOW_TIME/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:{...reviewedWithExpiry,shopExpiry:{
      ...reviewedWithExpiry.shopExpiry,committable:true,
    }},...input,
  }),/original absent-owner CloseShop source contract/);
  assert.throws(()=>reviewOriginalSoloPeriodPhaseChain({
    ...opts,includeReviewedShopExpiry:true,
    periodSource:sources.periodSource.replace(
      '$DT->{lastlogin}+$EXPIRE_TIME<$NOW_TIME',
      '$DT->{lastlogin}+$EXPIRE_TIME<=$NOW_TIME'),
  }),/original CloseShop source\/order drift/);
  assert.equal(JSON.stringify(input),untouched);
});

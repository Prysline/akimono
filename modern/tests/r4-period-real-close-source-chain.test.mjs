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
  writeSource:'modern/tests/original-perl/write.cgi',
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
const realCloseContract=reviewOriginalSoloPeriodPhaseChain({
  ...opts,includeReviewedDragon:true,includeReviewedDignity:true,
  includeReviewedGuild:true,includeReviewedPostTech:true,
  includeReviewedShopExpiry:true,includeReviewedActualCloseShop:true,
});
const oracle=()=>JSON.parse(execFileSync('perl',
  ['original-r4-period-real-close-chain-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));



test('R4 TWO whole frozen original pre-backup periods really execute write.cgi CloseShop, session unlink, history, guild, dignity and SortDT removal',()=>{
  assert.equal(realCloseContract.nonCommittable,true);
  assert.equal(realCloseContract.actualClose.committable,false);
  assert.equal(realCloseContract.actualClose.externalUserOrArchiveIOCommitted,false);
  assert.equal(realCloseContract.closedPrune.committable,false);
  const phases=realCloseContract.phases;
  assert.ok(phases.indexOf('actual-frozen-CloseShop-status-session-archive')>
    phases.indexOf('UpdateResetBefore-and-TopGetItem'));
  assert.ok(phases.indexOf('actual-frozen-CloseShop-status-session-archive')<
    phases.indexOf('dragon-shop-ledger-before-history'));
  assert.ok(phases.indexOf('SortDT-after-closed-shop-prune')>
    phases.indexOf('single-shop-ledger'));
  const p=oracle();
  assert.equal(p.cases.length,2);
  for(const [i,row] of p.cases.entries()){
    const input=JSON.stringify(row.input);
    const got=projectOriginalSoloPeriodPhaseChain({
      reviewed:realCloseContract,...row.input,
    });
    assert.deepEqual(got.shop,row.output.shop,
      'period '+(i+1)+' exact original actual active shop after SortDT');
    assert.deepEqual(got.town,row.output.town,'source original city after close');
    assert.equal(got.dtPeople,row.output.dtPeople);
    assert.equal(got.pointsBefore,row.output.pointsBefore);
    assert.equal(got.pointsAfter,row.output.pointsAfter);
    assert.deepEqual(got.guildContext,row.output.guildContext);
    assert.deepEqual(got.guildMoneyEdits,row.output.guildMoneyEdits);
    assert.deepEqual(got.shopExpiry.closeCalls,row.output.closeCalls);
    assert.deepEqual(got.shopExpiry.logs,row.output.closeLogs);
    assert.equal(got.dragonPayoutFileConsumed,true);
    assert.equal(got.dignityEffect.dignityAfter,
      (got.closedShop??got.shop).dignity);
    assert.deepEqual(got.postTechLoss?.lostItemIds??[],
      row.output.techLostItemIds);
    assert.deepEqual(got.postTechLoss?.logs??[],row.output.techLogs);
    if(row.output.expiredOwner){
      assert.deepEqual(got.closedShop,row.output.closedShop,
        'source closed reference mutates during rest of financial period');
      assert.deepEqual(got.activeShops,row.output.activeShops,
        'actual frozen SortDT dropped closed shop from active world');
      assert.equal(got.actualCloseEffect.archived,row.output.closeArchived,
        'actual CloseShop archives source 32 fields BEFORE zeroing');
      assert.deepEqual(got.actualCloseEffect.setUserDataCalls,
        row.output.closeSetUserDataCalls);
      assert.deepEqual(got.actualCloseEffect.writeErrorLogCalls,
        row.output.closeWriteErrorLogCalls);
      assert.deepEqual([...got.actualCloseEffect.deletedSessions].sort(),
        [...row.output.closeDeletedSessions].sort());
      assert.deepEqual([...got.actualCloseEffect.remainingSessions].sort(),
        [...row.output.closeRemainingSessions].sort());
    }else{
      assert.equal(got.actualCloseEffect,undefined,
        'first source period has no CloseShop side effects');
    }
    assert.equal(got.nonCommittable,true);
    assert.equal(got.worldStateWritten,false);
    assert.equal(JSON.stringify(row.input),input);
  }
  const [first,second]=p.cases;
  assert.equal(first.output.expiredOwner,false);
  assert.equal(first.output.shop.status,1);
  assert.equal(first.output.shop.exp[10],4695);
  assert.equal(second.output.expiredOwner,true);
  assert.equal(second.output.shop,null);
  assert.deepEqual(second.output.activeShops,[]);
  assert.equal(second.output.closedShop.status,0);
  assert.equal(second.output.closedShop.rank,0);
  assert.equal(second.output.closedShop.money,1425);
  assert.deepEqual([...second.output.closeDeletedSessions].sort(),
    ['1-one.cgi','1-two.cgi']);
  assert.equal(second.output.closeWriteErrorLogCalls[0].file,'delete');
  assert.equal(second.output.guildContext.atk,921);
  assert.equal(second.output.closedShop.dragon,1500);
  assert.equal(second.output.drawsUsed,4,
    'no source UpdateResetAfter tech RNG after frozen SortDT removed only shop');
  assert.equal(second.output.techLostItemIds.length,0);
});

test('R4 full real CloseShop two-period true Perl output remains reproducible with source order',()=>{
  for(let i=0;i<2;i++)for(const row of oracle().cases){
    const got=projectOriginalSoloPeriodPhaseChain({
      reviewed:realCloseContract,...row.input,
    });
    assert.deepEqual(got.shop,row.output.shop);
    assert.deepEqual(got.town,row.output.town);
    assert.deepEqual(got.closedShop??null,row.output.closedShop??null);
    assert.deepEqual(got.shopExpiry.closeCalls,row.output.closeCalls);
  }
});

test('R4 real closure source chain requires strict opt-in, bounded archive hash and actual session inventory',()=>{
  const row=oracle().cases[1].input;
  const initial=JSON.stringify(row);
  const without=reviewOriginalSoloPeriodPhaseChain({
    ...opts,includeReviewedDragon:true,includeReviewedDignity:true,
    includeReviewedGuild:true,includeReviewedPostTech:true,
    includeReviewedShopExpiry:true,
  });
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:without,...row,
  }),/unreviewed external CloseShop session inventory/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:realCloseContract,...row,sessionFileNames:null,
  }),/real CloseShop requires explicit source session file inventory/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:realCloseContract,...row,
    sessionFileNames:['../private.cgi'],
  }),/original CloseShop id, reason and session names/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:realCloseContract,...row,
    shop:{...row.shop,exp:{10:4695,14:100}},
  }),/exact original shop archive arrays and bounded hash serialization/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:realCloseContract,...row,postTechDraws:[0],
  }),/original UpdateResetAfter has no shops after CloseShop\/SortDT/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:{...realCloseContract,
      actualClose:{...realCloseContract.actualClose,committable:true}},
    ...row,
  }),/true frozen CloseShop and SortDT reviewer required/);
  assert.throws(()=>reviewOriginalSoloPeriodPhaseChain({
    ...opts,includeReviewedActualCloseShop:true,
  }),/real CloseShop requires the source period owner-expiry gate/);
  assert.equal(JSON.stringify(row),initial);
});

test('R4 independent full commerce source period closes an eight-shelf indebted shop only after prize, archives native maps, charges upkeep then prunes',()=>{
  const reviewed=reviewOriginalSoloPeriodPhaseChain({
    ...opts,includeReviewedDignity:true,includeReviewedSaleTax:true,
    includeReviewedMultiShelf:true,includeReviewedShopExpiry:true,
    includeReviewedActualCloseShop:true,includeReviewedFullCommerceClose:true,
  });
  const original=JSON.parse(execFileSync('perl',['original-r4-period-real-close-chain-probe.pl','--full-commerce'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));
  assert.equal(original.cases.length,2);
  let previous=null;
  for(const row of original.cases){
    const {payoutText,guildContext,postTechDraws,...input}=row.input;
    const snapshot=JSON.stringify(input);
    assert.equal(input.shop.showcasecount,8);
    assert.ok(input.shop.money<0);
    if(previous)assert.deepEqual(input.shop,previous.shop);
    const got=projectOriginalSoloPeriodPhaseChain({reviewed,...input});
    assert.deepEqual(got.shop,row.output.shop);
    assert.deepEqual(got.town,row.output.town);
    assert.equal(got.dtPeople,row.output.dtPeople);
    assert.equal(got.pointsBefore,row.output.pointsBefore);
    assert.equal(got.pointsAfter,row.output.pointsAfter);
    assert.equal(got.shopExpiry.expiredOwner,row.output.expiredOwner);
    assert.deepEqual(got.shopExpiry.logs,row.output.closeLogs);
    assert.equal(got.maintenance,Math.trunc(input.shop.costtoday)+128000);
    if(row.output.expiredOwner){
      assert.equal(got.shop,null);
      assert.deepEqual(got.activeShops,[]);
      assert.deepEqual(got.closedShop,row.output.closedShop);
      assert.equal(got.closedShop.money,-got.maintenance);
      assert.equal(got.actualCloseEffect.archived,row.output.closeArchived);
      assert.deepEqual(got.actualCloseEffect.writeErrorLogCalls,row.output.closeWriteErrorLogCalls);
      assert.deepEqual([...got.actualCloseEffect.deletedSessions].sort(),[...row.output.closeDeletedSessions].sort());
      assert.deepEqual([...got.actualCloseEffect.remainingSessions].sort(),[...row.output.closeRemainingSessions].sort());
      assert.throws(()=>projectOriginalSoloPeriodPhaseChain({reviewed,...input,archiveHashOrders:null}),/exact full commerce archive map order/);
    }else{
      assert.equal(got.actualCloseEffect,undefined);
      assert.equal(got.shop.status,1);
      previous=got;
    }
    assert.equal(got.nonCommittable,true);
    assert.equal(got.worldStateWritten,false);
    assert.equal(JSON.stringify(input),snapshot);
  }
  assert.equal(original.cases[0].output.expiredOwner,false);
  assert.equal(original.cases[1].output.expiredOwner,true);
  assert.throws(()=>reviewOriginalSoloPeriodPhaseChain({...opts,includeReviewedMultiShelf:true,
    includeReviewedShopExpiry:true,includeReviewedActualCloseShop:true}),/unreviewed multi-shelf external period dependencies/);
  assert.throws(()=>reviewOriginalSoloPeriodPhaseChain({...opts,includeReviewedMultiShelf:true,
    includeReviewedShopExpiry:true,includeReviewedActualCloseShop:true,includeReviewedFullCommerceClose:true,
    includeReviewedGuild:true}),/explicit independent full commerce CloseShop source review/);
});

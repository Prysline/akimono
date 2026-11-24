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
const fullTailContract=reviewOriginalSoloPeriodPhaseChain({
  ...opts,includeReviewedDragon:true,includeReviewedDignity:true,
  includeReviewedGuild:true,includeReviewedPostTech:true,
  includeReviewedShopExpiry:true,includeReviewedActualCloseShop:true,
  includeReviewedPeriodBackup:true,
});
const oracle=()=>JSON.parse(execFileSync('perl',
  ['original-r4-period-full-tail-close-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));




const normSessions=a=>[...a].sort((x,y)=>x.name.localeCompare(y.name,'en'));
test('R4 full SAME Perl process executes two frozen source periods including actual CloseShop, three disk generations, session unlink and MakeGuildFile call',()=>{
  assert.equal(fullTailContract.nonCommittable,true);
  assert.equal(fullTailContract.periodBackup.committable,false);
  assert.equal(fullTailContract.periodBackup.actualFileIOCommitted,false);
  assert.equal(fullTailContract.actualClose.externalUserOrArchiveIOCommitted,false);
  assert.ok(fullTailContract.phases.indexOf(
    'original-period-backup-session-source-tail')>
    fullTailContract.phases.indexOf('UpdateResetAfter-technology-loss'));
  const original=oracle();
  assert.equal(original.cases.length,2);
  for(const [i,row] of original.cases.entries()){
    const originalInput=JSON.stringify(row.input);
    assert.equal(row.input.periodBackupState.nowSeconds,row.input.nowSeconds);
    const got=projectOriginalSoloPeriodPhaseChain({
      reviewed:fullTailContract,...row.input,
    });
    assert.deepEqual(got.shop,row.output.shop,'period '+i+' full shop');
    assert.deepEqual(got.town,row.output.town,'period '+i+' original city');
    assert.equal(got.dtPeople,row.output.dtPeople);
    assert.deepEqual(got.guildContext,row.output.guildContext);
    assert.deepEqual(got.guildMoneyEdits,row.output.guildMoneyEdits);
    assert.deepEqual(got.shopExpiry.closeCalls,row.output.closeCalls);
    assert.deepEqual(got.shopExpiry.logs,row.output.closeLogs);
    assert.equal(got.dragonPayoutFileConsumed,true);
    assert.deepEqual(got.closedShop??null,row.output.closedShop??null);
    assert.deepEqual(got.postTechLoss?.lostItemIds??[],row.output.techLostItemIds);
    assert.deepEqual(got.periodBackup.backupGenerations,
      row.output.periodBackup.backupGenerations,
      'two real filesystem rotations with original UTF-8 log/guildbal/play');
    assert.deepEqual([...got.periodBackup.deletedSessions].sort(),
      [...row.output.periodBackup.deletedSessions].sort(),
      'source actual stat-mtime unlink after the original shop stages');
    assert.deepEqual(normSessions(got.periodBackup.remainingSessions),
      normSessions(row.output.periodBackup.remainingSessions));
    assert.equal(got.periodBackup.cutoffSeconds,
      row.output.periodBackup.cutoffSeconds);
    assert.equal(got.periodBackup.makeGuildFileCalls,
      row.output.periodBackup.makeGuildFileCalls);
    assert.equal(got.periodBackup.actualFileIOCommitted,false);
    assert.equal(got.periodBackup.actualGuildFileWritten,false);
    assert.equal(got.nonCommittable,true);
    assert.equal(got.worldStateWritten,false);
    assert.equal(JSON.stringify(row.input),originalInput);
  }
  const [first,second]=original.cases;
  assert.deepEqual(first.output.periodBackup.deletedSessions,['old.cgi']);
  assert.deepEqual(second.output.periodBackup.deletedSessions,['edge.cgi']);
  assert.equal(first.output.periodBackup.cutoffSeconds,395200);
  assert.equal(second.output.periodBackup.cutoffSeconds,524800);
  assert.equal(second.output.periodBackup.backupGenerations[1].play,
    first.output.periodBackup.backupGenerations[0].play,
    'second original period rotates first full original backup1 into 2');
  assert.equal(second.output.periodBackup.backupGenerations[2].play,
    first.output.periodBackup.backupGenerations[1].play,
    'second original period rotates first backup2 into 3');
  assert.equal(first.output.expiredOwner,false);
  assert.equal(second.output.expiredOwner,true);
  assert.equal(second.output.shop,null,
    'full source period closes shop on second round but still rotates disk');
  assert.deepEqual(second.output.closeCalls,[{shopId:1,reason:'経営者不在'}]);
});
test('R4 real joint complete period/backup source is deterministic across independent Perl tempfile processes',()=>{
  for(let k=0;k<2;k++)for(const row of oracle().cases){
    const got=projectOriginalSoloPeriodPhaseChain({
      reviewed:fullTailContract,...row.input,
    });
    assert.deepEqual(got.shop,row.output.shop);
    assert.deepEqual(got.town,row.output.town);
    assert.deepEqual(got.periodBackup.backupGenerations,
      row.output.periodBackup.backupGenerations);
    assert.deepEqual(normSessions(got.periodBackup.remainingSessions),
      normSessions(row.output.periodBackup.remainingSessions));
  }
});
test('R4 composed full backup tail rejects omitted review, forged source, mismatched NOW_TIME and incomplete files',()=>{
  const row=oracle().cases[0].input;
  const originalInput=JSON.stringify(row);
  const noBackup=reviewOriginalSoloPeriodPhaseChain({
    ...opts,includeReviewedDragon:true,includeReviewedDignity:true,
    includeReviewedGuild:true,includeReviewedPostTech:true,
    includeReviewedShopExpiry:true,includeReviewedActualCloseShop:true,
  });
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:noBackup,...row,
  }),/unreviewed backup or session files/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:fullTailContract,...row,periodBackupState:null,
  }),/full backup\/session disk snapshot/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:fullTailContract,...row,
    periodBackupState:{...row.periodBackupState,nowSeconds:1000001},
  }),/backup NOW_TIME must match period NOW_TIME/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:fullTailContract,...row,
    periodBackupState:{...row.periodBackupState,
      activeFiles:{play:'only one file'}},
  }),/exact five original backup files/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:{...fullTailContract,periodBackup:{
      ...fullTailContract.periodBackup,committable:true,
    }},...row,
  }),/original frozen period backup reviewer required/);
  assert.equal(JSON.stringify(row),originalInput);
});

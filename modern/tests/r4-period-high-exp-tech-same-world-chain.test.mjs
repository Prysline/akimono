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
const reviewed=reviewOriginalSoloPeriodPhaseChain({
  ...opts,includeReviewedDragon:true,includeReviewedDignity:true,
  includeReviewedGuild:true,includeReviewedPostTech:true,
});
const oracle=()=>JSON.parse(execFileSync('perl',
  ['original-r4-period-high-exp-tech-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));

test('R4 source high-EXP UpdateResetAfter technique loss runs after FULL two-period dragon/guild/dignity chain',()=>{
  assert.equal(reviewed.nonCommittable,true);
  assert.equal(reviewed.postTech.committable,false);
  assert.ok(reviewed.phases.includes('UpdateResetAfter-technology-loss'));
  const source=oracle();
  assert.equal(source.cases.length,2);
  for(const [i,row] of source.cases.entries()){
    const originalInput=JSON.stringify(row.input);
    const got=projectOriginalSoloPeriodPhaseChain({reviewed,...row.input});
    assert.deepEqual(got.shop,row.output.shop,'round '+(i+1)+' complete source Perl shop');
    assert.deepEqual(got.town,row.output.town,'round '+(i+1)+' complete source town');
    assert.equal(got.dtPeople,row.output.dtPeople);
    assert.equal(got.pointsBefore,row.output.pointsBefore);
    assert.equal(got.pointsAfter,row.output.pointsAfter);
    assert.equal(got.dragonPayoutFileConsumed,true);
    assert.deepEqual(got.guildContext,row.output.guildContext);
    assert.deepEqual(got.guildMoneyEdits,row.output.guildMoneyEdits);
    assert.deepEqual(got.postTechLoss.lostItemIds,row.output.techLostItemIds,
      'true Perl four-technology loss order');
    assert.deepEqual(got.postTechLoss.logs,row.output.techLogs,
      'original WriteLog output and order');
    assert.deepEqual(got.postTechLoss.randomDrawRanges,
      Array(row.input.postTechDraws.length).fill(14000));
    assert.equal(got.postTechLoss.drawsUsed,row.input.postTechDraws.length);
    assert.equal(row.output.drawsUsed,4+got.postTechLoss.drawsUsed,
      'original award,dignity,territory,technology shared RNG count');
    assert.equal(got.worldStateWritten,false);
    assert.equal(got.nonCommittable,true);
    assert.equal(JSON.stringify(row.input),originalInput,
      'reject mutation of source state snapshots');
  }
  const [a,b]=source.cases;
  assert.deepEqual(a.output.techLostItemIds,[18,24],
    'first round loses smith and discerning technique');
  assert.deepEqual(b.output.techLostItemIds,[19],
    'second round samples only the two remaining technologies');
  assert.equal(a.output.shop.exp[10],4695);
  assert.equal(b.output.shop.exp[10],4409);
  assert.equal(b.input.shop.item[17],0);
  assert.equal(b.input.shop.item[23],0);
  assert.equal(b.output.shop.item[18],0);
  assert.equal(b.output.shop.item[37],1);
});

test('R4 technique-loss source oracle reproduces under independent original Perl processes',()=>{
  for(let k=0;k<2;k++)for(const row of oracle().cases){
    const got=projectOriginalSoloPeriodPhaseChain({reviewed,...row.input});
    assert.deepEqual(got.shop,row.output.shop);
    assert.deepEqual(got.postTechLoss.logs,row.output.techLogs);
    assert.deepEqual(got.postTechLoss.lostItemIds,row.output.techLostItemIds);
  }
});

test('R4 four-tech source review enforces exact item order, threshold, bounded RNG and existing no-tech rejection',()=>{
  const row=oracle().cases[0].input,before=JSON.stringify(row);
  assert.throws(()=>reviewR4PostPeriodTechLoss({
    itemDsl:sources.itemDsl.replace('rand(14000)<$expsum','rand(15000)<$expsum'),
    periodSource:sources.periodSource,model,
  }),/original UpdateResetAfter source drift/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:reviewOriginalSoloPeriodPhaseChain({
      ...opts,includeReviewedDragon:true,includeReviewedDignity:true,
      includeReviewedGuild:true,
    }),...row,
  }),/external guild, dragon, high EXP|unreviewed post-period/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed,...row,postTechDraws:null,
  }),/source-reviewed technology item/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed,...row,postTechDraws:row.postTechDraws.slice(0,2),
  }),/missing original post-period technique RNG sample/);
  const second=oracle().cases[1].input;
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed,...second,postTechDraws:[...second.postTechDraws,0],
  }),/unused original technique RNG samples/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed,...row,postTechDraws:[...row.postTechDraws.slice(0,3),1000000],
  }),/invalid original technique RNG sample/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:{...reviewed,postTech:{...reviewed.postTech,committable:true}},
    ...row,
  }),/technical-loss contract/);
  assert.deepEqual(projectR4PostPeriodTechLoss({
    reviewed:reviewed.postTech,
    shop:{...row.shop,exp:{10:0,14:0}},
    randomDraws:[],
  }).lostItemIds,[],'no tech random draw below 4000 experience');
  assert.equal(JSON.stringify(row),before);
});

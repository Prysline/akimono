import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
import {compileReviewedGiftMapUse} from '../src/reviewed-gift-map-use.mjs';
import {createMemoryWorld,createMemoryWorldAdapter}
  from '../src/game-core-contract.mjs';
import {
  reviewOriginalSoloPeriodPhaseChain,projectOriginalSoloPeriodPhaseChain,
  B50_INTEGRATED_SOURCE,
} from '../src/original-period-solo-chain.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const names=[
  'periodSource','configSource','itemDsl','rebelDsl','compilerSource',
  'originalAddItemSource','detailSource','readSource','adminSource',
];
const paths=[
  'modern/tests/original-perl/period.cgi','_config.cgi',
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/use.cgi',
  'modern/tests/original-perl/core-detail.cgi',
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
];
const sources=Object.fromEntries(names.map((name,i)=>[name,paths[i]]));
for(const key of names)sources[key]=await read(sources[key]);
const model=loadStandardStreetModel(sources.itemDsl,sources.rebelDsl);
const compiled=compileReviewedGiftMapUse({
  itemDsl:sources.itemDsl,rebelDsl:sources.rebelDsl,model,
});
const contract=reviewOriginalSoloPeriodPhaseChain({
  ...sources,model,
  bootstrapMeta:'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',
  compiledLimits:compiled.limits.map(it=>it.limit),
});
const oracle=JSON.parse(execFileSync('perl',['original-b50-period-chain-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));

const dragonContract=reviewOriginalSoloPeriodPhaseChain({
  ...sources,model,
  bootstrapMeta:'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',
  compiledLimits:compiled.limits.map(it=>it.limit),
  includeReviewedDragon:true,
});
const dragonOracle=()=>JSON.parse(execFileSync('perl',
  ['original-r4-period-dragon-chain-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));

test('R4 same original shop and city run true DragonBalance file before award and history for TWO periods',()=>{
  assert.equal(dragonContract.nonCommittable,true);
  assert.equal(dragonContract.phases.length,9);
  assert.equal(dragonContract.dragon.committable,false);
  const oracle=dragonOracle();
  assert.equal(oracle.cases.length,2);
  for(const [i,entry] of oracle.cases.entries()){
    const before=JSON.stringify(entry.input);
    const got=projectOriginalSoloPeriodPhaseChain({
      reviewed:dragonContract,...entry.input,
    });
    assert.deepEqual(got.shop,entry.output.shop,
      'period '+(i+1)+' actual source shop after dragon/prize/history');
    assert.deepEqual(got.town,entry.output.town,
      'period '+(i+1)+' actual city');
    assert.equal(got.dtPeople,entry.output.dtPeople);
    assert.equal(got.pointsBefore,entry.output.pointsBefore);
    assert.equal(got.pointsAfter,entry.output.pointsAfter);
    assert.equal(got.dragonPayoutFileConsumed,true);
    assert.equal(got.dragonSource,dragonContract.dragon.source);
    assert.equal(got.nonCommittable,true);
    assert.equal(got.worldStateWritten,false);
    assert.equal(before,JSON.stringify(entry.input),'source input never mutates');
    assert.ok(got.dragonLogs.length===1,
      'source cash log emitted from the original shop stage');
  }
  assert.equal(oracle.cases[0].output.shop.dragon,500);
  assert.equal(oracle.cases[1].input.shop.dragon,500,
    'the second source period reuses prior unpaid dragon accumulator');
  assert.equal(oracle.cases[1].output.shop.dragon,-500);
  assert.equal(oracle.cases[1].output.shop.drmoney,0,
    'net two-period dragon income zero, not independently reset each period');
  assert.equal(oracle.cases[1].output.shop.payyesterday,500,
    'second negative source dragon is recorded in original period payment history');
});
test('R4 dragon same-world historical source results survive a new original Perl process',()=>{
  for(let i=0;i<2;i++)for(const row of dragonOracle().cases){
    const got=projectOriginalSoloPeriodPhaseChain({
      reviewed:dragonContract,...row.input,
    });
    assert.deepEqual(got.shop,row.output.shop);
    assert.deepEqual(got.town,row.output.town);
  }
});
test('R4 dragon period extension is opt-in; legacy B50 rejects payout, receipt forgery and world CAS',()=>{
  const input=dragonOracle().cases[0].input;
  const before=JSON.stringify(input);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:contract,...input,
  }),/dragon payout file/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:contract,...input,payoutText:null,
    shop:{...input.shop,dragon:500},
  }),/external guild, dragon/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:{...dragonContract,dragon:{...dragonContract.dragon,committable:true}},
    ...input,
  }),/DragonBalance source contract/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:dragonContract,...input,payoutText:'1\tNaN\n',
  }),/R4 original DragonBalance/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:dragonContract,...input,
    shop:{...input.shop,dragon:Number.MAX_SAFE_INTEGER},
  }),/DragonBalance|overflow/);
  assert.equal(JSON.stringify(input),before);
});

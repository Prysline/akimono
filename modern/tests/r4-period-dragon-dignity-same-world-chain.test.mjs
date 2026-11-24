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

const dignityDragonContract=reviewOriginalSoloPeriodPhaseChain({
  ...sources,model,
  bootstrapMeta:'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',
  compiledLimits:compiled.limits.map(it=>it.limit),
  includeReviewedDragon:true,includeReviewedDignity:true,
});
const sourceOracle=()=>JSON.parse(execFileSync('perl',
  ['original-r4-period-dragon-dignity-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));


test('R4 two true original pre-backup periods interleave DragonBalance file, dignity chance, award and SortDT',()=>{
  assert.equal(dignityDragonContract.nonCommittable,true);
  assert.equal(dignityDragonContract.phases.length,10);
  assert.equal(dignityDragonContract.dragon.committable,false);
  assert.equal(dignityDragonContract.dignity.committable,false);
  const oracle=sourceOracle();
  assert.equal(oracle.cases.length,2);
  for(const [i,entry] of oracle.cases.entries()){
    const before=JSON.stringify(entry.input);
    const got=projectOriginalSoloPeriodPhaseChain({
      reviewed:dignityDragonContract,...entry.input,
    });
    assert.deepEqual(got.shop,entry.output.shop,
      'period '+(i+1)+' complete source shop after dragon and dignity');
    assert.deepEqual(got.town,entry.output.town,
      'period '+(i+1)+' source city, population, tax');
    assert.equal(got.dtPeople,entry.output.dtPeople);
    assert.equal(got.pointsBefore,entry.output.pointsBefore);
    assert.equal(got.pointsAfter,entry.output.pointsAfter);
    assert.equal(got.dignityEffect.drawsUsed,1);
    assert.deepEqual(got.dignityEffect.randomDrawRanges,[100]);
    assert.equal(got.dignityEffect.dignityAfter,entry.output.shop.dignity);
    assert.equal(got.dragonPayoutFileConsumed,true);
    assert.equal(got.nonCommittable,true);
    assert.equal(got.worldStateWritten,false);
    assert.equal(JSON.stringify(entry.input),before,'original state untouched');
  }
  const first=oracle.cases[0],second=oracle.cases[1];
  assert.equal(first.input.shop.dignity,26);
  assert.equal(first.output.shop.dignity,23,
    'source first period rand(100)=0 drops int(26/12)+1 =3');
  assert.equal(second.input.shop.dignity,23,
    'same-world second period retains previous source dignity');
  assert.equal(second.output.shop.dignity,23,
    'source second period rand(100)=99.9999 is not a dignity hit');
  assert.equal(second.output.shop.dragon,-500);
  assert.equal(second.output.shop.drmoney,0);
});
test('R4 dragon+dignity period source results match more than one actual Perl process',()=>{
  for(let k=0;k<2;k++)for(const row of sourceOracle().cases){
    const got=projectOriginalSoloPeriodPhaseChain({
      reviewed:dignityDragonContract,...row.input,
    });
    assert.deepEqual(got.shop,row.output.shop);
    assert.deepEqual(got.town,row.output.town);
    assert.equal(got.dignityEffect.dignityAfter,row.output.shop.dignity);
  }
});
test('R4 original dignity source rejects source drift, invalid RNG, missing review and stays noncommittable',()=>{
  const input=sourceOracle().cases[0].input;
  const before=JSON.stringify(input);
  assert.throws(()=>reviewOriginalSoloPeriodPhaseChain({
    ...sources,model,
    bootstrapMeta:'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',
    compiledLimits:compiled.limits.map(it=>it.limit),
    includeReviewedDignity:true,
    periodSource:sources.periodSource.replace('rand(100) < 25','rand(100) < 50'),
  }),/source drift/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:contract,...input,
  }),/external guild, dragon|dignity random draws/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:dignityDragonContract,...input,dignityDrawMillionths:null,
  }),/exact one source rand/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:dignityDragonContract,...input,dignityDrawMillionths:1000000,
  }),/exact one source rand/);
  assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:dignityDragonContract,...input,
    shop:{...input.shop,dignity:-1},
  }),/dignity/);
  assert.equal(JSON.stringify(input),before);
});

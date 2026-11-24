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
test('B-50 integrated original period stage order source-review locks two rankings + both callbacks',()=>{
  assert.equal(contract.source,B50_INTEGRATED_SOURCE);
  assert.equal(contract.nonCommittable,true);
  assert.deepEqual(contract.compiledLimits,oracle.itemLimits);
  assert.equal(contract.phases.length,7);
  assert.throws(()=>reviewOriginalSoloPeriodPhaseChain({
    ...sources,model,
    bootstrapMeta:'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',
    compiledLimits:compiled.limits.map(it=>it.limit),
    periodSource:sources.periodSource.replace('UpdateResetAfter() if defined(&UpdateResetAfter);',''),
  }),/source drift|phase order/);
});
test('B-50 same ONE shop/city through TWO complete source-checked in-place period prefixes',()=>{
  assert.equal(oracle.cases.length,2);
  for(const [i,entry] of oracle.cases.entries()){
    const original=structuredClone(entry.input);
    const result=projectOriginalSoloPeriodPhaseChain({reviewed:contract,...original});
    assert.equal(result.source,B50_INTEGRATED_SOURCE);
    assert.deepEqual(result.shop,entry.output.shop,
      'period '+(i+1)+' entire original shop');
    assert.deepEqual(result.town,entry.output.town,
      'period '+(i+1)+' entire original city');
    assert.equal(result.dtPeople,entry.output.dtPeople);
    assert.equal(result.pointsBefore,entry.output.pointsBefore);
    assert.equal(result.pointsAfter,entry.output.pointsAfter);
    assert.equal(result.nonCommittable,true,'source phase candidate not a player period commit');
    assert.equal(result.worldStateWritten,false);
    assert.deepEqual(original,entry.input,'never mutate source inputs');
  }
  assert.equal(oracle.cases[1].input.shop.rankingcount,
    oracle.cases[0].output.shop.rankingcount);
  assert.equal(oracle.cases[1].input.town.develop,
    oracle.cases[0].output.town.develop);
});
test('B-50 prohibited phase chain can NEVER use live WorldState CAS or stage a fake period',()=>{
  const {shop,town,dtPeople,awardDrawMillionths,territoryDrawMillionths}
    =oracle.cases[0].input;
  const repo=createMemoryWorldAdapter(createMemoryWorld({
    worldId:'period-not-committed',
    streetId:'standard-street',nowSeconds:1026000,
  }));
  const before=JSON.stringify(repo.read());
  const projected=projectOriginalSoloPeriodPhaseChain({
    reviewed:contract,shop,town,dtPeople,
    awardDrawMillionths,territoryDrawMillionths,
  });
  assert.equal(projected.nonCommittable,true);
  assert.equal(JSON.stringify(repo.read()),before);
  for(const patches of [
    {shop:{...shop,guild:'live-guild'}},
    {shop:{...shop,dragon:100}},
    {shop:{...shop,exp:{10:5000}}},
    {shop:{...shop,item:shop.item.slice(0,78)}},
    {territoryDrawMillionths:[0]},
    {awardDrawMillionths:1000000},
  ])assert.throws(()=>projectOriginalSoloPeriodPhaseChain({
    reviewed:contract,shop,town,dtPeople,
    awardDrawMillionths,territoryDrawMillionths,
    ...patches,
  }),/B-4[4-9]|B-50/);
});

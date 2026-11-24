import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
import {reviewR4EventItemParams} from '../src/original-r4-event-item-param.mjs';
import {reviewOriginalR4DeclarativeEventCycle}
  from '../src/original-r4-declarative-event-cycle.mjs';
import {reviewOriginalR4MultiEventFixture,projectOriginalR4MultiEventFixture}
  from '../src/original-r4-multi-event-order-fixture.mjs';
import {LOTO_RANGE} from '../src/original-b58-loto-startfunc.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const names=[
  'itemDsl','rebelDsl','originalAdminInitSource','originalDataReadSource',
  'originalDataWriteSource','originalTurnSource','originalWholeSource',
  'originalConfigSource','originalCompilerSource',
  'originalBuySource','originalBuyItemSource','originalBuyCalcSource',
  'originalMarketSource','originalItemSource','originalDetailSource',
  'originalPeriodSource',
];
const paths=[
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi',
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/whole.cgi','_config.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/buy-s.cgi',
  'modern/tests/original-perl/item.cgi',
  'modern/tests/original-perl/calc.cgi',
  'modern/tests/original-perl/market.cgi',
  'modern/tests/original-perl/item.cgi',
  'modern/tests/original-perl/core-detail.cgi',
  'modern/tests/original-perl/period.cgi',
];
const sources=await Promise.all(paths.map(read));
const fixed=Object.fromEntries(names.map((key,i)=>[key,sources[i]]));
const street=createStandardStreetModule(fixed);
const params=reviewR4EventItemParams({
  catalog:street.reviewedEventCatalog,
  compilerSource:fixed.originalCompilerSource,
  model:loadStandardStreetModel(fixed.itemDsl,fixed.rebelDsl),
});
const seven=reviewOriginalR4DeclarativeEventCycle({
  compiledCatalog:street.reviewedEventCatalog,
  reviewedParams:params,itemDsl:fixed.itemDsl,
  turnSource:fixed.originalTurnSource,
  readSource:fixed.originalDataReadSource,
});
const review=overrides=>reviewOriginalR4MultiEventFixture({
  compiledCatalog:street.reviewedEventCatalog,
  reviewedSeven:seven,turnSource:fixed.originalTurnSource,
  readSource:fixed.originalDataReadSource,
  reviewedSupportCallbacks:street.reviewedSupportEventCallbacks,
  reviewedInstantCallbacks:street.reviewedInstantEventCallbacks,
  reviewedLotoCallbacks:street.reviewedLoto,...overrides,
});
const reviewed=review();
const original=()=>JSON.parse(execFileSync('perl',
  ['original-r4-mixed-support-gate-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));

test('R4 loto interleaves with 17 real Perl EVENT gates, support, theft, robot, seven overlays and one RNG',()=>{
  const oracle=original();
  assert.equal(oracle.compiledCount,17);
  assert.equal(oracle.lotoCases.length,4);
  for(const [i,row] of oracle.lotoCases.entries()){
    const before=JSON.stringify(row.input);
    const got=projectOriginalR4MultiEventFixture({reviewed,...row.input});
    assert.deepEqual(got.dataReadItems,row.output.dataReadItems,row.name+' DataRead');
    assert.deepEqual(got.activeUntilSeconds,row.output.activeUntilSeconds,row.name+' lifecycle');
    assert.deepEqual(got.shop,row.output.shop,row.name+' full shop');
    assert.deepEqual(got.logs,row.output.logs,row.name+' WriteLog/PushLog order');
    assert.deepEqual(got.randomDrawRanges,row.output.randomDrawRanges,
      row.name+' original rand(range) order');
    assert.equal(got.drawsUsed,row.output.drawsUsed,row.name+' RNG count');
    assert.deepEqual(got.lotoCallbacks,['loto'],row.name);
    assert.equal(got.shop.item[10],0,row.name+' consumes every ticket');
    assert.equal(got.committable,false);
    assert.equal(JSON.stringify(row.input),before,'pure projection');
    const lotoRanges=got.randomDrawRanges.filter(range=>range===LOTO_RANGE);
    assert.equal(lotoRanges.length,row.input.shop.item[10],
      row.name+' one rand(6096454) per ticket');
    assert.equal(got.logs.filter(log=>log[2]==='抽獎卷的開獎開始了').length,1,
      'zero-ticket callback still announces opening');
    if(i===0){
      assert.equal(got.shop.money,999999999,'top prize caps money');
      assert.equal(Object.keys(got.activeUntilSeconds).length,7);
      assert.deepEqual(got.supportCallbacks.slice().sort(),['getmoney','getpop']);
      assert.deepEqual(got.instantCallbacks.slice().sort(),['goutou','manbiki']);
    }
    if(i===1)assert.equal(lotoRanges.length,0);
    if(i===2)assert.equal(got.shop.money,210000,'source ordinary prizes');
    if(i===3)assert.equal(lotoRanges.length,50,'legal 50-ticket max');
  }
});
test('R4 loto uses the current Perl process hash order, never fixed JS order',()=>{
  for(let attempt=0;attempt<2;attempt++){
    const oracle=original();
    assert.deepEqual([...oracle.runtimeHashOrder].sort(),reviewed.eventCodes.slice().sort());
    for(const row of oracle.lotoCases){
      assert.deepEqual(row.input.eventHashOrderFixture,oracle.runtimeHashOrder);
      const result=projectOriginalR4MultiEventFixture({reviewed,...row.input});
      assert.deepEqual(result.logs,row.output.logs);
      assert.deepEqual(result.shop,row.output.shop);
      assert.deepEqual(result.randomDrawRanges,row.output.randomDrawRanges);
    }
  }
});
test('R4 loto fail-closed for absent review, tickets, draw mismatch and hash drift',()=>{
  const row=original().lotoCases[2];
  const before=JSON.stringify(row.input);
  assert.throws(()=>review({reviewedLotoCallbacks:{...street.reviewedLoto,maxTickets:51}}),
    /source-reviewed loto/);
  const noLoto=review({reviewedLotoCallbacks:null});
  assert.throws(()=>projectOriginalR4MultiEventFixture({reviewed:noLoto,...row.input}),
    /unsupported original source EVENT started: loto/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...row.input,randomDraws:row.input.randomDraws.slice(0,-1),
  }),/exhausted/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...row.input,randomDraws:[...row.input.randomDraws,999999],
  }),/unused/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...row.input,shop:{...row.input.shop,
      item:row.input.shop.item.map((v,i)=>i===10?51:v)},
  }),/ticket count/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...row.input,eventHashOrderFixture:row.input.eventHashOrderFixture.slice(1),
  }),/permutations/);
  assert.equal(JSON.stringify(row.input),before,'no mutation on reject');
});

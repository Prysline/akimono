import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewOriginalCompiledEventCatalog}
  from '../src/original-event-compiled-catalog.mjs';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
import {reviewR4EventItemParams} from '../src/original-r4-event-item-param.mjs';
import {reviewOriginalR4DeclarativeEventCycle}
  from '../src/original-r4-declarative-event-cycle.mjs';
import {reviewOriginalSupportEventCallbacks}
  from '../src/original-b57-support-event-callbacks.mjs';
import {reviewOriginalR4MultiEventFixture,projectOriginalR4MultiEventFixture}
  from '../src/original-r4-multi-event-order-fixture.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const [itemDsl,rebelDsl,turnSource,compilerSource,readSource]=
  await Promise.all([
    'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
    'modern/tests/original-perl/inc-turn.cgi',
    'modern/tests/original-perl/inc-makeitem.cgi',
    'modern/tests/original-perl/inc-func.cgi',
  ].map(read));
const catalog=reviewOriginalCompiledEventCatalog({
  itemDsl,rebelDsl,compilerSource,turnSource});
const params=reviewR4EventItemParams({
  catalog,compilerSource,model:loadStandardStreetModel(itemDsl,rebelDsl)});
const seven=reviewOriginalR4DeclarativeEventCycle({
  compiledCatalog:catalog,reviewedParams:params,itemDsl,turnSource,readSource});
const support=reviewOriginalSupportEventCallbacks({
  itemDsl,turnSource,compilerSource,compiledCatalog:catalog});
const reviewed=reviewOriginalR4MultiEventFixture({
  compiledCatalog:catalog,reviewedSeven:seven,turnSource,readSource,
  reviewedSupportCallbacks:support});
const original=()=>JSON.parse(execFileSync('perl',
  ['original-r4-mixed-support-gate-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));
test('R4 true Perl getmoney/getpop STARTFUNC and seven simultaneous declarative EVENTs share 17-key RNG',()=>{
  const oracle=original();
  assert.equal(oracle.compiledCount,17);
  assert.equal(oracle.cases.length,4);
  let prior=null;
  for(const [i,row] of oracle.cases.entries()){
    const actual=projectOriginalR4MultiEventFixture({reviewed,...row.input});
    const expected=row.output;
    assert.deepEqual(actual.dataReadItems,expected.dataReadItems,row.name+' ITEM overlay');
    assert.deepEqual(actual.activeUntilSeconds,expected.activeUntilSeconds,row.name+' lasting state');
    assert.deepEqual(actual.shop,expected.shop,row.name+' original shop state');
    assert.deepEqual(actual.logs,expected.logs,row.name+' source callback logs');
    assert.deepEqual(actual.randomDrawRanges,expected.randomDrawRanges,
      row.name+' gate/callback/duration exact rand ranges');
    assert.equal(actual.drawsUsed,expected.drawsUsed,row.name+' rand count');
    assert.equal(actual.committable,false);
    if(i===0){
      assert.equal(actual.shop.money,200000);
      assert.equal(actual.shop.rank,6000);
      assert.equal(Object.keys(actual.activeUntilSeconds).length,7);
      assert.deepEqual(actual.supportCallbacks.slice().sort(),
        ['getmoney','getpop']);
    }
    if(i===1){
      assert.equal(actual.shop.money,200000);
      assert.equal(actual.shop.rank,6000);
    }
    if(i===2){
      assert.equal(actual.shop.money,999999999);
      assert.equal(actual.shop.rank,10000);
    }
    if(i>0)assert.deepEqual(row.input.activeUntilSeconds,prior,
      row.name+' source previous EVENT hash state');
    prior=actual.activeUntilSeconds;
  }
});
test('R4 each Perl process supplies independent actual EVENT hash traversal with support callbacks',()=>{
  for(let i=0;i<3;i++){
    const oracle=original();
    assert.deepEqual(oracle.runtimeHashOrder.slice().sort(),
      reviewed.eventCodes.slice().sort());
    for(const row of oracle.cases){
      assert.deepEqual(row.input.eventHashOrderFixture,oracle.runtimeHashOrder);
      const actual=projectOriginalR4MultiEventFixture({reviewed,...row.input});
      assert.deepEqual(actual.logs,row.output.logs);
      assert.deepEqual(actual.shop,row.output.shop);
    }
  }
});
test('R4 mixed original source rejects missing callbacks/shapes/RNG and leaves all inputs untouched',()=>{
  const row=original().cases[0],input=row.input;
  const prior=JSON.stringify(input);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...input,shop:null}),/source shop/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...input,randomDraws:[]}),/exhausted/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...input,eventHashOrderFixture:input.eventHashOrderFixture.slice(1),
  }),/permutations/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...input,activeUntilSeconds:{rebel:123},
  }),/unreviewed active/);
  assert.throws(()=>reviewOriginalR4MultiEventFixture({
    compiledCatalog:catalog,reviewedSeven:seven,turnSource,readSource,
    reviewedSupportCallbacks:{...support,hitThreshold:301},
  }),/support STARTFUNC/);
  assert.equal(JSON.stringify(input),prior);
});

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
import {reviewOriginalInstantEventCallbacks}
  from '../src/original-instant-event-callbacks.mjs';
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
const instant=reviewOriginalInstantEventCallbacks({
  itemDsl,turnSource,compilerSource,compiledCatalog:catalog});
const reviewed=reviewOriginalR4MultiEventFixture({
  compiledCatalog:catalog,reviewedSeven:seven,turnSource,readSource,
  reviewedSupportCallbacks:support,reviewedInstantCallbacks:instant});
const original=()=>JSON.parse(execFileSync('perl',
  ['original-r4-mixed-support-gate-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));
test('R4 real Perl 17-key RNG source mixed seven durable, support and theft/robbery callback matches Node',()=>{
  const oracle=original();
  assert.equal(oracle.compiledCount,17);
  assert.equal(oracle.theftCases.length,4);
  let prior=null;
  for(const [i,row] of oracle.theftCases.entries()){
    const actual=projectOriginalR4MultiEventFixture({reviewed,...row.input});
    assert.deepEqual(actual.dataReadItems,row.output.dataReadItems,row.name+' ITEM DataRead');
    assert.deepEqual(actual.activeUntilSeconds,row.output.activeUntilSeconds,row.name+' durable state');
    assert.deepEqual(actual.shop,row.output.shop,row.name+' actual one shop money/rank/stock/robot');
    assert.deepEqual(actual.logs,row.output.logs,row.name+' actual original callback and EVENT logs');
    assert.deepEqual(actual.randomDrawRanges,row.output.randomDrawRanges,
      row.name+' original rand(100000)/rand(1000)/rand(duration) order');
    assert.equal(actual.drawsUsed,row.output.drawsUsed,row.name+' exact samples');
    assert.equal(actual.committable,false);
    if(i===0){
      assert.equal(Object.keys(actual.activeUntilSeconds).length,7);
      assert.equal(actual.shop.item[9]<12,true);
      assert.equal(actual.shop.money,200000);
      assert.deepEqual(actual.instantCallbacks.slice().sort(),['goutou','manbiki']);
      assert.deepEqual(actual.supportCallbacks.slice().sort(),['getmoney','getpop']);
    }
    if(i===1||i===2){
      assert.equal(actual.shop.item[63],0,'robot consumed according to real callback order');
      assert.deepEqual(actual.instantCallbacks.slice().sort(),['goutou','manbiki']);
    }
    if(i===3)assert.equal(actual.instantCallbacks.length,0);
    if(i>0)assert.deepEqual(row.input.activeUntilSeconds,prior,
      'next step uses prior genuine source EVENT state');
    prior=actual.activeUntilSeconds;
  }
});
test('R4 independent Perl processes supply independent original hash orders to mixed callbacks',()=>{
  for(let i=0;i<3;i++){
    const oracle=original();
    assert.deepEqual(oracle.runtimeHashOrder.slice().sort(),
      reviewed.eventCodes.slice().sort());
    for(const row of oracle.theftCases){
      assert.deepEqual(row.input.eventHashOrderFixture,oracle.runtimeHashOrder);
      const actual=projectOriginalR4MultiEventFixture({reviewed,...row.input});
      assert.deepEqual(actual.logs,row.output.logs);
      assert.deepEqual(actual.shop,row.output.shop);
      assert.deepEqual(actual.randomDrawRanges,row.output.randomDrawRanges);
    }
  }
});
test('R4 reviewed theft integration rejects missing reviewers, shop, RNG or wrong hash order atomically',()=>{
  const input=original().theftCases[0].input;
  const snapshot=JSON.stringify(input);
  assert.throws(()=>reviewOriginalR4MultiEventFixture({
    compiledCatalog:catalog,reviewedSeven:seven,turnSource,readSource,
    reviewedSupportCallbacks:support,
    reviewedInstantCallbacks:{...instant,robotItem:65},
  }),/instant STARTFUNC/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...input,shop:null,
  }),/source shop/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...input,randomDraws:[],
  }),/exhausted/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...input,eventHashOrderFixture:input.eventHashOrderFixture.slice(1),
  }),/permutations/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...input,shop:{...input.shop,item:new Array(79).fill(1)},
  }),/reviewed single-shop/);
  assert.equal(JSON.stringify(input),snapshot);
});

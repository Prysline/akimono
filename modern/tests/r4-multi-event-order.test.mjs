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
import {reviewOriginalR4MultiEventFixture,
  projectOriginalR4MultiEventFixture,R4_MULTI_EVENT_FIXTURE_SOURCE}
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
const reviewed=reviewOriginalR4MultiEventFixture({
  compiledCatalog:catalog,reviewedSeven:seven,turnSource,readSource});
function originalRun(){
  return JSON.parse(execFileSync('perl',
    ['original-r4-multi-event-order-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8'}));
}
test('R4 17-key original generated Perl hash multi-EVENT source lifecycle and ITEM overlay match',()=>{
  assert.equal(reviewed.source,R4_MULTI_EVENT_FIXTURE_SOURCE);
  assert.equal(reviewed.committable,false);
  // New Perl process per oracle: never assume the key order matches another.
  const oracle=originalRun();
  assert.equal(oracle.compiledCount,17);
  assert.equal(oracle.cases.length,4);
  assert.deepEqual([...oracle.runtimeHashOrder].sort(),
    reviewed.eventCodes.slice().sort());
  let previous=null;
  for(const [i,row] of oracle.cases.entries()){
    const {input,output}=row;
    const result=projectOriginalR4MultiEventFixture({reviewed,...input});
    assert.deepEqual(result.dataReadItems,output.dataReadItems,row.name+' ITEM fields');
    assert.deepEqual(result.activeUntilSeconds,output.activeUntilSeconds,
      row.name+' active EVENT lifetimes');
    assert.deepEqual(result.logs,output.logs,row.name+' actual original log order');
    assert.deepEqual(result.randomDrawRanges,output.randomDrawRanges,
      row.name+' original rand call range/order');
    assert.equal(result.drawsUsed,output.drawsUsed,row.name+' RNG count');
    assert.equal(result.committable,false);
    if(i===0)assert.equal(Object.keys(result.activeUntilSeconds).length,7);
    if(i===1)assert.equal(input.activeHashOrderFixture.length,7);
    if(i>0)assert.deepEqual(input.activeUntilSeconds,previous,
      row.name+' actual preceding source state');
    previous=result.activeUntilSeconds;
  }
});
test('R4 full original hash randomization must be per actual process, not fixed declaration order',()=>{
  for(let trial=0;trial<3;trial++){
    const result=originalRun();
    const expected=reviewed.eventCodes.slice().sort();
    assert.deepEqual([...result.runtimeHashOrder].sort(),expected);
    for(const row of result.cases){
      assert.deepEqual(row.input.eventHashOrderFixture,result.runtimeHashOrder);
      const current=projectOriginalR4MultiEventFixture({
        reviewed,...row.input});
      assert.deepEqual(current.randomDrawRanges,row.output.randomDrawRanges);
      assert.deepEqual(current.logs,row.output.logs);
    }
  }
});
test('R4 multi EVENT rejects unknown keys, malformed source ordering, callbacks, missing draws atomically',()=>{
  const oracle=originalRun(),first=oracle.cases[0].input;
  const snapshot=JSON.stringify(first);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...first,eventHashOrderFixture:first.eventHashOrderFixture.slice(1),
  }),/permutations/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...first,activeUntilSeconds:{rebel:12345},
  }),/unreviewed active/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...first,randomDraws:first.randomDraws.slice(1),
  }),/exhausted/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...first,randomDraws:[...first.randomDraws,999999],
  }),/unused/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...first,spanSeconds:129600,
  }),/span/);
  assert.throws(()=>reviewOriginalR4MultiEventFixture({
    compiledCatalog:catalog,reviewedSeven:seven,
    turnSource:turnSource.replace('next if $group{$E->{group}};',''),
    readSource,
  }),/drift/);
  assert.equal(JSON.stringify(first),snapshot);
});

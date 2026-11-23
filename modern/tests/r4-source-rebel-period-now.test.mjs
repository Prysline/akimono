import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewOriginalCompiledEventCatalog}
  from '../src/original-event-compiled-catalog.mjs';
import {reviewR4RebelNow} from '../src/original-r4-rebel-now.mjs';
import {reviewR4RebelPeriodTrigger}
  from '../src/original-r4-rebel-period-trigger.mjs';
import {reviewR4RebelPeriodToNow,projectR4RebelPeriodToNow,
  R4_REBEL_PERIOD_NOW_SOURCE}
  from '../src/original-r4-rebel-period-to-now.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const paths=[
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/period.cgi',
];
const [itemDsl,rebelDsl,compilerSource,turnSource,periodSource]=
  await Promise.all(paths.map(p=>readFile(path.join(root,p),'utf8')));
const catalog=reviewOriginalCompiledEventCatalog({
  itemDsl,rebelDsl,compilerSource,turnSource,
});
const reviewedNow=reviewR4RebelNow({
  rebelDsl,turnSource,periodSource,compiledCatalog:catalog,
});
const reviewedPeriod=reviewR4RebelPeriodTrigger({
  periodSource,reviewedRebelNow:reviewedNow,
});
const review=(over={})=>reviewR4RebelPeriodToNow({
  turnSource,reviewedNow,reviewedPeriod,...over,
});
const reviewed=review();
const oracle=()=>JSON.parse(execFileSync('perl',
  ['original-r4-rebel-period-now-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),
    encoding:'utf8',
  }));
test('R4 real Perl period RebelRobin and EVENT NOW use one city, army and RNG sequence',()=>{
  assert.equal(reviewed.source,R4_REBEL_PERIOD_NOW_SOURCE);
  const original=oracle();
  assert.equal(original.cases.length,8);
  for(const row of original.cases){
    const before=JSON.stringify(row.input);
    const got=projectR4RebelPeriodToNow({reviewed,...row.input});
    for(const key of [
      'town','shops','riotIds','armyById','activeUntilSeconds',
      'eventState','eventPersisted','logs','randomDrawRanges',
      'drawsUsed','taxRate','readArmyCalls','writeArmyCalls',
    ])assert.deepEqual(got[key],row.output[key],row.name+' '+key);
    assert.equal(got.committable,false);
    assert.equal(before,JSON.stringify(row.input),'no mutation');
  }
});
test('R4 combined rebel original source uses period->END/START->NOW across Perl hash process seeds',()=>{
  for(let i=0;i<2;i++)for(const row of oracle().cases){
    const got=projectR4RebelPeriodToNow({reviewed,...row.input});
    assert.deepEqual(got.randomDrawRanges,row.output.randomDrawRanges);
    assert.deepEqual(got.eventState,row.output.eventState);
    assert.deepEqual(got.town,row.output.town);
    assert.deepEqual(got.logs,row.output.logs);
  }
});
test('R4 combined source rejects timing, absent reviewed inputs, missing stage RNG atomically',()=>{
  const row=oracle().cases[3].input;
  const before=JSON.stringify(row);
  assert.throws(()=>review({reviewedPeriod:null}),/source-reviewed period/);
  assert.throws(()=>review({turnSource:turnSource.replace(
    'CheckWholeStore();','CheckWholeStoreOther();',
  )}),/source stage drift/);
  assert.throws(()=>projectR4RebelPeriodToNow({
    reviewed,...row,nowSeconds:1001000,
  }),/unreviewed original source slice/);
  assert.throws(()=>projectR4RebelPeriodToNow({
    reviewed,...row,randomDraws:row.randomDraws.slice(0,-1),
  }),/exact NOWFUNC RNG/);
  assert.throws(()=>projectR4RebelPeriodToNow({
    reviewed,...row,periodDrawCount:2,
  }),/unused original period RNG|RNG exhausted|exact NOWFUNC/);
  assert.throws(()=>projectR4RebelPeriodToNow({
    reviewed,...row,randomDraws:[...row.randomDraws,999999],
  }),/exact NOWFUNC RNG/);
  assert.equal(JSON.stringify(row),before);
});

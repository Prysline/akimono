import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {reviewOriginalCompiledEventCatalog}
  from '../src/original-event-compiled-catalog.mjs';
import {reviewR4RebelNow} from '../src/original-r4-rebel-now.mjs';
import {reviewR4RebelPeriodTrigger,projectR4RebelPeriodTrigger,
  R4_REBEL_PERIOD_SOURCE}
  from '../src/original-r4-rebel-period-trigger.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const paths=[
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/period.cgi',
];
const raw=await Promise.all(paths.map(p=>readFile(path.join(root,p),'utf8')));
const [itemDsl,rebelDsl,compilerSource,turnSource,periodSource]=raw;
const catalog=reviewOriginalCompiledEventCatalog({
  itemDsl,rebelDsl,compilerSource,turnSource,
});
const now=reviewR4RebelNow({
  compiledCatalog:catalog,rebelDsl,turnSource,periodSource,
});
const review=(changes={})=>reviewR4RebelPeriodTrigger({
  periodSource,reviewedRebelNow:now,...changes,
});
const reviewed=review();
const oracle=()=>JSON.parse(execFileSync('perl',
  ['original-r4-rebel-period-trigger-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));

test('R4 true frozen RebelRobin original period script matches projected city/event/RNG source',()=>{
  assert.equal(reviewed.source,R4_REBEL_PERIOD_SOURCE);
  const perl=oracle();
  assert.equal(perl.cases.length,7);
  for(const entry of perl.cases){
    const before=JSON.stringify(entry.input);
    const got=projectR4RebelPeriodTrigger({reviewed,...entry.input});
    assert.deepEqual(got.town,entry.output.town,entry.name+' town');
    assert.deepEqual(got.eventState,entry.output.eventState,
      entry.name+' event state');
    assert.equal(got.activeUntilSeconds,entry.output.activeUntilSeconds,
      entry.name+' extended expiry');
    assert.deepEqual(got.logs,entry.output.logs,entry.name+' original messages');
    assert.deepEqual(got.randomDrawRanges,entry.output.randomDrawRanges,
      entry.name+' original RNG range and ordering');
    assert.equal(got.drawsUsed,entry.output.drawsUsed);
    assert.equal(got.committable,false);
    assert.equal(JSON.stringify(entry.input),before,'source input immutable');
  }
  assert.equal(perl.cases[4].output.eventState.rebel,1259200);
  assert.ok(!Object.hasOwn(perl.cases[5].output.eventState,'rebel'));
  assert.equal(perl.cases[6].output.eventState.rebel,1259200,
    'original period extension checks truthiness, not expiry');
});

test('R4 period rebel threshold and hash-independent one-event source verified across Perl runs',()=>{
  for(let i=0;i<2;i++){
    const cases=oracle().cases;
    for(const row of cases){
      const got=projectR4RebelPeriodTrigger({reviewed,...row.input});
      assert.deepEqual(got.eventState,row.output.eventState);
      assert.deepEqual(got.logs,row.output.logs);
      assert.deepEqual(got.randomDrawRanges,row.output.randomDrawRanges);
    }
  }
});

test('R4 period trigger drift, missing leader, RNG over/under-provision fail closed',()=>{
  const input=oracle().cases[4].input;
  const before=JSON.stringify(input);
  assert.throws(()=>review({
    periodSource:periodSource.replace('rand(5000000)','rand(1234)'),
  }),/frozen RebelRobin source changed/);
  assert.throws(()=>review({reviewedRebelNow:{...now,committable:true}}),
    /complete original rebel NOW/);
  assert.throws(()=>projectR4RebelPeriodTrigger({reviewed,...input,
    randomDraws:[0,0]}),/RNG exhausted/);
  assert.throws(()=>projectR4RebelPeriodTrigger({reviewed,...input,
    randomDraws:[0,0,299999,123]}),/unreviewed period CITY/);
  assert.throws(()=>projectR4RebelPeriodTrigger({reviewed,...input,
    leaderShopExists:true,town:{...input.town,leader:0}}),/unreviewed period CITY/);
  assert.throws(()=>projectR4RebelPeriodTrigger({reviewed,...input,
    activeUntilSeconds:0}),/unreviewed period CITY/);
  assert.equal(JSON.stringify(input),before);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {reviewR4RebelNow,projectR4RebelNow,R4_REBEL_NOW_SOURCE}
  from '../src/original-r4-rebel-now.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
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
const contents=await Promise.all(paths.map(x=>readFile(path.join(root,x),'utf8')));
const fixed=Object.fromEntries(names.map((k,i)=>[k,contents[i]]));
const street=createStandardStreetModule(fixed);
const review=(changes={})=>reviewR4RebelNow({
  rebelDsl:fixed.rebelDsl,turnSource:fixed.originalTurnSource,
  periodSource:fixed.originalPeriodSource,
  compiledCatalog:street.reviewedEventCatalog,...changes,
});
const reviewed=review();
const original=()=>JSON.parse(execFileSync('perl',
  ['original-r4-rebel-now-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));
test('actual frozen rebel NOWFUNC matches ten original Perl city/riot/army branches',()=>{
  assert.equal(reviewed.source,R4_REBEL_NOW_SOURCE);
  const oracle=original();
  assert.equal(oracle.cases.length,10);
  for(const row of oracle.cases){
    const before=JSON.stringify(row.input);
    const got=projectR4RebelNow({reviewed,...row.input});
    for(const key of [
      'activeUntilSeconds','eventPersisted','town','shops','riotIds',
      'armyById','taxRate','logs','readArmyCalls','writeArmyCalls',
      'randomDrawRanges','drawsUsed','returnCode',
    ])assert.deepEqual(got[key],row.output[key],row.name+' source '+key);
    assert.equal(got.committable,false);
    if(row.name.includes('sole-current-leader')){
      assert.equal(got.town.leader,0);assert.equal(got.town.robina,10000);
      assert.equal(got.eventPersisted,false);assert.equal(got.shops[0].money,1210);
    }
    if(row.name.includes('boundary'))assert.equal(
      got.town.robinb,row.output.town.robinb,
      'original rand(100)>75 must compare raw float, not rounded integer');
    assert.equal(JSON.stringify(row.input),before,'input never changes');
  }
});
test('original rebel callback results independent of Perl source process hash seed',()=>{
  for(let i=0;i<2;i++){
    const oracle=original();
    for(const row of oracle.cases){
      const got=projectR4RebelNow({reviewed,...row.input});
      assert.deepEqual(got.town,row.output.town);
      assert.deepEqual(got.logs,row.output.logs);
      assert.deepEqual(got.randomDrawRanges,row.output.randomDrawRanges);
    }
  }
});
test('rebel source drift and insufficient external state or RNG abort atomically',()=>{
  const valid=original().cases[1].input;
  const before=JSON.stringify(valid);
  assert.throws(()=>review({rebelDsl:fixed.rebelDsl.replace(
    'main::ReadArmy();','main::ReadArmyOther();',
  )}),/frozen rebel NOWFUNC body drift/);
  assert.throws(()=>projectR4RebelNow({reviewed,...valid,
    activeUntilSeconds:0}),/unreviewed army/);
  assert.throws(()=>projectR4RebelNow({reviewed,...valid,
    randomDraws:[900000]}),/RNG exhausted/);
  assert.throws(()=>projectR4RebelNow({reviewed,...valid,
    randomDraws:[900000,500000,500000]}),/unreviewed army/);
  assert.throws(()=>projectR4RebelNow({reviewed,...valid,
    riotIds:[8]}),/invalid RIOT/);
  assert.equal(JSON.stringify(valid),before);
});

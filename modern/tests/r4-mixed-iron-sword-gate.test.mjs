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

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=p=>readFile(path.join(root,p),'utf8');
const keys=[
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
const contents=await Promise.all(paths.map(read));
const src=Object.fromEntries(keys.map((k,i)=>[k,contents[i]]));
const street=createStandardStreetModule(src);
const params=reviewR4EventItemParams({
  catalog:street.reviewedEventCatalog,compilerSource:src.originalCompilerSource,
  model:loadStandardStreetModel(src.itemDsl,src.rebelDsl),
});
const seven=reviewOriginalR4DeclarativeEventCycle({
  compiledCatalog:street.reviewedEventCatalog,reviewedParams:params,
  itemDsl:src.itemDsl,turnSource:src.originalTurnSource,
  readSource:src.originalDataReadSource,
});
const review=override=>reviewOriginalR4MultiEventFixture({
  compiledCatalog:street.reviewedEventCatalog,reviewedSeven:seven,
  turnSource:src.originalTurnSource,readSource:src.originalDataReadSource,
  reviewedSupportCallbacks:street.reviewedSupportEventCallbacks,
  reviewedInstantCallbacks:street.reviewedInstantEventCallbacks,
  reviewedLotoCallbacks:street.reviewedLoto,
  reviewedHappyEvent:street.reviewedB60Happy,
  reviewedIronEvent:street.reviewedB59Iron,
  reviewedSwordEvent:street.reviewedB61Sword,...override,
});
const reviewed=review();
const original=()=>JSON.parse(execFileSync('perl',
  ['original-r4-mixed-support-gate-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));

test('R4 same-source 17-key iron and sword overlays interleave with other 10 durable EVENT and callbacks',()=>{
  const oracle=original();
  assert.equal(oracle.compiledCount,17);
  assert.equal(oracle.durableCases.length,4);
  for(const [i,row] of oracle.durableCases.entries()){
    const source=JSON.stringify(row.input);
    const got=projectOriginalR4MultiEventFixture({reviewed,...row.input});
    assert.deepEqual(got.dataReadItems,row.output.dataReadItems,row.name+' ITEM overlays');
    assert.deepEqual(got.activeUntilSeconds,row.output.activeUntilSeconds,
      row.name+' EVENT END/START expiration');
    assert.deepEqual(got.logs,row.output.logs,row.name+' original START and END logs');
    assert.deepEqual(got.shop,row.output.shop,row.name+' shop/stock/rank');
    assert.deepEqual(got.randomDrawRanges,row.output.randomDrawRanges,
      row.name+' same Perl rand(range) ordering');
    assert.equal(got.drawsUsed,row.output.drawsUsed);
    assert.equal(got.committable,false);
    assert.equal(JSON.stringify(row.input),source,'input never mutates');
    if(i===0){
      assert.equal(Object.keys(got.activeUntilSeconds).length,10);
      assert.equal(got.dataReadItems[4].plus,row.input.items[4].plus,
        'new event ITEM PARAM does not affect own START slice');
      assert.deepEqual(got.supportCallbacks.slice().sort(),['getmoney','getpop']);
      assert.deepEqual(got.instantCallbacks.slice().sort(),['goutou','manbiki']);
      assert.deepEqual(got.lotoCallbacks,['loto']);
      assert.deepEqual(got.happyNowCallbacks,['happy']);
    }
    if(i===1){
      assert.equal(got.dataReadItems[4].plus,720);
      assert.equal(got.dataReadItems[39].popular,Math.trunc(row.input.items[39].popular/2));
      assert.equal(got.dataReadItems[43].popular,Math.trunc(row.input.items[43].popular/2));
    }
    if(i===2){
      for(const code of ['plusup-tetu','ken-sale','happy'])
        assert.ok(!Object.hasOwn(got.activeUntilSeconds,code));
    }
    if(i===3){
      assert.ok(Object.hasOwn(got.activeUntilSeconds,'plusup-tetu'));
      assert.ok(Object.hasOwn(got.activeUntilSeconds,'ken-sale'));
    }
  }
});
test('R4 iron/sword true Perl hash order changes between source processes without hardcoding',()=>{
  for(let k=0;k<2;k++){
    const oracle=original();
    for(const row of oracle.durableCases){
      assert.deepEqual(row.input.eventHashOrderFixture,oracle.runtimeHashOrder);
      const got=projectOriginalR4MultiEventFixture({reviewed,...row.input});
      assert.deepEqual(got.randomDrawRanges,row.output.randomDrawRanges);
      assert.deepEqual(got.shop,row.output.shop);
    }
  }
});
test('R4 iron/sword rejects unsupported active types, review drift, missing RNG, no mutation',()=>{
  const input=original().durableCases[1].input;
  const before=JSON.stringify(input);
  assert.throws(()=>review({reviewedIronEvent:{...street.reviewedB59Iron,
    plusTimeSeconds:1}}),/source-reviewed iron\/sword/);
  assert.throws(()=>review({reviewedSwordEvent:{...street.reviewedB61Sword,
    startProba:999}}),/source-reviewed iron\/sword/);
  const noIron=review({reviewedIronEvent:null});
  assert.throws(()=>projectOriginalR4MultiEventFixture({reviewed:noIron,...input}),
    /unreviewed active EVENT/);
  const noSword=review({reviewedSwordEvent:null});
  assert.throws(()=>projectOriginalR4MultiEventFixture({reviewed:noSword,...input}),
    /unreviewed active EVENT/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({reviewed,...input,
    randomDraws:input.randomDraws.slice(0,-1)}),/exhausted/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({reviewed,...input,
    activeUntilSeconds:{...input.activeUntilSeconds,rebel:1234}}),/unreviewed active/);
  assert.equal(JSON.stringify(input),before);
});

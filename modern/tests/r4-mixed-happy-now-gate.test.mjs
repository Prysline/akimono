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
  reviewedHappyEvent:street.reviewedB60Happy,...override,
});
const reviewed=review();
const original=()=>JSON.parse(execFileSync('perl',
  ['original-r4-mixed-support-gate-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));
test('R4 happy original 17-key END, START and NOWFUNC interleaving matches Perl',()=>{
  const oracle=original();
  assert.equal(oracle.compiledCount,17);
  assert.equal(oracle.happyCases.length,4);
  for(const [i,row] of oracle.happyCases.entries()){
    const inputBefore=JSON.stringify(row.input);
    const got=projectOriginalR4MultiEventFixture({reviewed,...row.input});
    assert.deepEqual(got.dataReadItems,row.output.dataReadItems,row.name+' item overlay');
    assert.deepEqual(got.activeUntilSeconds,row.output.activeUntilSeconds,
      row.name+' duration and expiry');
    assert.deepEqual(got.shop,row.output.shop,row.name+' money/rank/stock');
    assert.deepEqual(got.logs,row.output.logs,row.name+' log order');
    assert.deepEqual(got.randomDrawRanges,row.output.randomDrawRanges,
      row.name+' range and exact order');
    assert.equal(got.drawsUsed,row.output.drawsUsed,row.name+' draw count');
    assert.equal(got.committable,false);
    assert.equal(JSON.stringify(row.input),inputBefore,'pure input');
    assert.equal(got.happyNowCallbacks.length,i===2?0:1,
      'one NOW per active or freshly started happy');
    if(i===0){
      assert.equal(Object.keys(got.activeUntilSeconds).length,8);
      assert.deepEqual(got.supportCallbacks.slice().sort(),['getmoney','getpop']);
      assert.deepEqual(got.instantCallbacks.slice().sort(),['goutou','manbiki']);
      assert.deepEqual(got.lotoCallbacks,['loto']);
      assert.equal(got.shop.item[10],0);
      // Other source callbacks (especially theft/robbery) can lower the
      // final rank even though happy NOWFUNC applies a positive roll.
      assert.ok(Number.isSafeInteger(got.shop.rank));
      assert.ok(got.shop.rank>=0&&got.shop.rank<=10000);
      assert.ok(got.randomDrawRanges.includes(100),
        'the actual happy NOWFUNC consumed its one rand(100)');
    }
    if(i===1)assert.deepEqual(row.input.activeUntilSeconds,
      oracle.happyCases[0].output.activeUntilSeconds);
    if(i===2)assert.ok(!Object.hasOwn(got.activeUntilSeconds,'happy'));
    if(i===3)assert.ok(Object.hasOwn(got.activeUntilSeconds,'happy'));
  }
});
test('R4 happy source hash orders are sampled fresh from each Perl process',()=>{
  for(let i=0;i<2;i++){
    const oracle=original();
    assert.deepEqual([...oracle.runtimeHashOrder].sort(),
      reviewed.eventCodes.slice().sort());
    for(const row of oracle.happyCases){
      assert.deepEqual(row.input.eventHashOrderFixture,oracle.runtimeHashOrder);
      const got=projectOriginalR4MultiEventFixture({reviewed,...row.input});
      assert.deepEqual(got.shop,row.output.shop);
      assert.deepEqual(got.logs,row.output.logs);
      assert.deepEqual(got.randomDrawRanges,row.output.randomDrawRanges);
    }
  }
});
test('R4 happy rejects missing source review, NOW order, bad time, missing draws atomically',()=>{
  const source=original().happyCases[1].input;
  const before=JSON.stringify(source);
  assert.throws(()=>review({reviewedHappyEvent:{...street.reviewedB60Happy,rankCap:9000}}),
    /source-reviewed happy/);
  const noHappy=review({reviewedHappyEvent:null});
  assert.throws(()=>projectOriginalR4MultiEventFixture({reviewed:noHappy,...source}),
    /unreviewed active EVENT/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...source,nowHashOrderFixture:[],
  }),/post-START active EVENT hash order/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...source,randomDraws:source.randomDraws.slice(0,-1),
  }),/exhausted/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...source,randomDraws:[...source.randomDraws,999999],
  }),/unused/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...source,spanSeconds:0,
  }),/unsupported source span/);
  assert.equal(JSON.stringify(source),before);
});

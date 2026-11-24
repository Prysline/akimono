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
import {reviewR4GuildbattleEnd}
  from '../src/original-r4-guildbattle-end.mjs';
import {reviewR4RebelNow}
  from '../src/original-r4-rebel-now.mjs';

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
const guild=reviewR4GuildbattleEnd({
  compiledCatalog:street.reviewedEventCatalog,
  turnSource:src.originalTurnSource,rebelDsl:src.rebelDsl,
});
const rebel=reviewR4RebelNow({
  compiledCatalog:street.reviewedEventCatalog,
  turnSource:src.originalTurnSource,periodSource:src.originalPeriodSource,
  rebelDsl:src.rebelDsl,
});
const review=override=>reviewOriginalR4MultiEventFixture({
  compiledCatalog:street.reviewedEventCatalog,reviewedSeven:seven,
  turnSource:src.originalTurnSource,readSource:src.originalDataReadSource,
  reviewedSupportCallbacks:street.reviewedSupportEventCallbacks,
  reviewedInstantCallbacks:street.reviewedInstantEventCallbacks,
  reviewedLotoCallbacks:street.reviewedLoto,
  reviewedHappyEvent:street.reviewedB60Happy,
  reviewedIronEvent:street.reviewedB59Iron,
  reviewedSwordEvent:street.reviewedB61Sword,
  reviewedGuildbattleEvent:guild,
  reviewedRebelEvent:rebel,...override,
});
const reviewed=review();
const original=()=>JSON.parse(execFileSync('perl',
  ['original-r4-mixed-support-gate-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));


test('R4 full original Perl 17-key rebel NOW interleaves with ten durables, happy and guildbattle',()=>{
  const oracle=original();
  assert.equal(oracle.compiledCount,17);
  assert.equal(oracle.rebelCases.length,5);
  for(const [i,row] of oracle.rebelCases.entries()){
    const before=JSON.stringify(row.input);
    const got=projectOriginalR4MultiEventFixture({reviewed,...row.input});
    for(const field of [
      'dataReadItems','activeUntilSeconds','shop','rebelContext',
      'rebelNowCallbacks','logs','randomDrawRanges',
    ])assert.deepEqual(got[field],row.output[field],row.name+' '+field);
    if(row.output.guildContext){
      assert.deepEqual(got.guildContext,row.output.guildContext,row.name+' guild');
      assert.deepEqual(got.guildEndCallbacks,row.output.guildEndCallbacks);
    }
    assert.equal(got.drawsUsed,row.output.drawsUsed,row.name+' total RNG');
    assert.equal(got.committable,false);
    assert.equal(JSON.stringify(row.input),before,'no input mutation');
    if(i===0){
      assert.equal(got.rebelNowCallbacks[0],'rebel');
      assert.equal(Object.keys(got.activeUntilSeconds).length,11);
      assert.deepEqual(got.rebelContext.riotIds,[]);
      assert.ok(got.rebelContext.town.robinb<row.input.rebelContext.town.robinb);
      assert.deepEqual(got.happyNowCallbacks,['happy']);
    }
    if(i===1){
      assert.ok(row.input.nowHashOrderFixture.includes('rebel'),
        'capture true Perl pre-NOW traversal, not post-callback hash keys');
      assert.ok(!Object.hasOwn(got.activeUntilSeconds,'rebel'),
        'source rebel NOW can delete its active EVENT');
      assert.deepEqual(got.rebelNowCallbacks,['rebel']);
      assert.equal(got.rebelContext.town.robinb,0);
    }
    if(i===2){
      assert.equal(got.shop.army,3000,'RIOT callback writes shop army snapshot');
      assert.equal(got.rebelContext.armyById[1],1800,
        'original riot military strength decreased one hour');
    }
    if(i===3){
      assert.equal(got.guildContext.dominion,'beta');
      assert.deepEqual(got.guildEndCallbacks,['guildbattle']);
      assert.deepEqual(got.rebelNowCallbacks,['rebel']);
      assert.ok(Object.hasOwn(got.activeUntilSeconds,'rebel'));
    }
    if(i===4){
      assert.deepEqual(got.rebelNowCallbacks,[]);
      assert.ok(!Object.hasOwn(got.activeUntilSeconds,'rebel'));
    }
  }
});
test('R4 original Perl process hash order and range-logged RNG drive rebel NOW and happy interleavings',()=>{
  for(let k=0;k<2;k++){
    const oracle=original();
    for(const row of oracle.rebelCases){
      const got=projectOriginalR4MultiEventFixture({reviewed,...row.input});
      assert.deepEqual(got.randomDrawRanges,row.output.randomDrawRanges);
      assert.deepEqual(got.rebelContext,row.output.rebelContext);
      assert.deepEqual(got.shop,row.output.shop);
      assert.deepEqual(got.logs,row.output.logs);
    }
  }
});
test('R4 mixed rebel requires reviewed external state, exact NOW rand count and immutable input',()=>{
  const row=original().rebelCases[0].input;
  const before=JSON.stringify(row);
  const noRebel=review({reviewedRebelEvent:null});
  assert.throws(()=>projectOriginalR4MultiEventFixture({reviewed:noRebel,...row}),
    /unreviewed active EVENT/);
  assert.throws(()=>review({reviewedRebelEvent:{...rebel,group:'changed'}}),
    /source-reviewed rebel NOW/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...row,rebelContext:null,
  }),/explicit rebel army\/city/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...row,shop:{...row.shop,army:undefined},
  }),/rebel NOW requires original named shop/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...row,rebelNowDrawCount:0,
  }),/RNG exhausted/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...row,randomDraws:row.randomDraws.slice(0,-1),
  }),/original RNG exhausted|source rebel RNG exhausted/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...row,nowHashOrderFixture:[],
  }),/pre-NOW EVENT hash traversal/);
  assert.equal(JSON.stringify(row),before);
});

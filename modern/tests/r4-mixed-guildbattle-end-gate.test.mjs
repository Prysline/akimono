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
const review=override=>reviewOriginalR4MultiEventFixture({
  compiledCatalog:street.reviewedEventCatalog,reviewedSeven:seven,
  turnSource:src.originalTurnSource,readSource:src.originalDataReadSource,
  reviewedSupportCallbacks:street.reviewedSupportEventCallbacks,
  reviewedInstantCallbacks:street.reviewedInstantEventCallbacks,
  reviewedLotoCallbacks:street.reviewedLoto,
  reviewedHappyEvent:street.reviewedB60Happy,
  reviewedIronEvent:street.reviewedB59Iron,
  reviewedSwordEvent:street.reviewedB61Sword,
  reviewedGuildbattleEvent:guild,...override,
});
const reviewed=review();
const original=()=>JSON.parse(execFileSync('perl',
  ['original-r4-mixed-support-gate-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));

test('R4 frozen Perl 17-key guildbattle END interleaves with ten durable and happy NOW',()=>{
  const oracle=original();
  assert.equal(oracle.compiledCount,17);
  assert.equal(oracle.guildCases.length,4);
  for(const [i,row] of oracle.guildCases.entries()){
    const before=JSON.stringify(row.input);
    const got=projectOriginalR4MultiEventFixture({reviewed,...row.input});
    assert.deepEqual(got.dataReadItems,row.output.dataReadItems,row.name+' DataRead');
    assert.deepEqual(got.activeUntilSeconds,row.output.activeUntilSeconds,
      row.name+' source hash END and START');
    assert.deepEqual(got.guildContext,row.output.guildContext,
      row.name+' original ReadGuildData/SetTownData');
    assert.deepEqual(got.guildEndCallbacks,row.output.guildEndCallbacks,
      row.name+' true callback invocation');
    assert.deepEqual(got.shop,row.output.shop,row.name+' shop');
    assert.deepEqual(got.logs,row.output.logs,row.name+' source ordered log');
    assert.deepEqual(got.randomDrawRanges,row.output.randomDrawRanges,
      row.name+' original single shared RNG');
    assert.equal(got.drawsUsed,row.output.drawsUsed,row.name+' RNG count');
    assert.equal(got.committable,false);
    assert.equal(JSON.stringify(row.input),before,'source input is pure');
    if(i===0){
      assert.equal(got.guildContext.dominion,'beta');
      assert.deepEqual(got.guildEndCallbacks,['guildbattle']);
      assert.equal(Object.keys(got.activeUntilSeconds).length,10,
        'ten other durable active events remain after guildbattle END');
      assert.deepEqual(got.happyNowCallbacks,['happy']);
      assert.equal(got.guildContext.guilds.find(x=>x.id==='beta').guild,'beta');
      assert.ok(got.logs.some(([level,id,msg])=>
        level===2&&id===0&&msg.includes('赤月會')));
    }
    if(i===1){
      assert.equal(got.guildContext.dominion,'alpha');
      assert.deepEqual(got.guildEndCallbacks,[]);
      assert.ok(Object.hasOwn(got.activeUntilSeconds,'guildbattle'),
        'source END uses strict less-than on equality boundary');
    }
    if(i===2)assert.equal(got.guildContext.dominion,'beta');
    if(i===3){
      assert.deepEqual(got.guildEndCallbacks,[]);
      assert.equal(got.guildContext.dominion,'alpha');
      assert.ok(!Object.hasOwn(got.activeUntilSeconds,'guildbattle'),
        'zero START never persists guildbattle');
    }
  }
});
test('R4 genuine mixed guildbattle callback accepts source Perl process hash order only',()=>{
  for(let k=0;k<2;k++){
    const oracle=original();
    for(const row of oracle.guildCases){
      assert.deepEqual([...row.input.eventHashOrderFixture].sort(),
        reviewed.eventCodes.slice().sort());
      const got=projectOriginalR4MultiEventFixture({reviewed,...row.input});
      assert.deepEqual(got.randomDrawRanges,row.output.randomDrawRanges);
      assert.deepEqual(got.guildContext,row.output.guildContext);
      assert.deepEqual(got.logs,row.output.logs);
    }
  }
});
test('R4 mixed guildbattle missing reviewer/state, ambiguous money winner and RNG abort',()=>{
  const row=original().guildCases[0].input;
  const before=JSON.stringify(row);
  const noGuild=review({reviewedGuildbattleEvent:null});
  assert.throws(()=>projectOriginalR4MultiEventFixture({reviewed:noGuild,...row}),
    /unreviewed active EVENT/);
  assert.throws(()=>review({reviewedGuildbattleEvent:{...guild,startProba:1}}),
    /source-reviewed guildbattle/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...row,guildContext:null,
  }),/explicit source guild snapshot/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...row,guildContext:{
      ...row.guildContext,
      guilds:row.guildContext.guilds.map(g=>({...g,money:1000000})),
    },
  }),/sort money tie/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...row,randomDraws:row.randomDraws.slice(0,-1),
  }),/original RNG exhausted/);
  assert.throws(()=>projectOriginalR4MultiEventFixture({
    reviewed,...row,activeUntilSeconds:{...row.activeUntilSeconds,rebel:123456},
  }),/unreviewed active EVENT/);
  assert.equal(JSON.stringify(row),before);
});

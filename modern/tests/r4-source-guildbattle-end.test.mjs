import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {reviewR4GuildbattleEnd,projectR4GuildbattleEnd,
  R4_GUILDBATTLE_END_SOURCE}
  from '../src/original-r4-guildbattle-end.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sources=[
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
const names=[
  'itemDsl','rebelDsl','originalAdminInitSource','originalDataReadSource',
  'originalDataWriteSource','originalTurnSource','originalWholeSource',
  'originalConfigSource','originalCompilerSource',
  'originalBuySource','originalBuyItemSource','originalBuyCalcSource',
  'originalMarketSource','originalItemSource','originalDetailSource',
  'originalPeriodSource',
];
const files=await Promise.all(sources.map(p=>readFile(path.join(root,p),'utf8')));
const fixed=Object.fromEntries(names.map((name,i)=>[name,files[i]]));
const street=createStandardStreetModule(fixed);
const review=(over={})=>reviewR4GuildbattleEnd({
  rebelDsl:fixed.rebelDsl,turnSource:fixed.originalTurnSource,
  compiledCatalog:street.reviewedEventCatalog,...over,
});
const reviewed=review();
const original=()=>JSON.parse(execFileSync('perl',
  ['original-r4-guildbattle-end-probe.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));
test('source original guildbattle ENDFUNC actually runs frozen Perl END/START and matches JS',()=>{
  assert.equal(reviewed.source,R4_GUILDBATTLE_END_SOURCE);
  const oracle=original();
  assert.equal(oracle.cases.length,5);
  for(const c of oracle.cases){
    const before=JSON.stringify(c.input);
    const result=projectR4GuildbattleEnd({reviewed,...c.input});
    const output=c.output;
    assert.equal(result.activeUntilSeconds,output.activeUntilSeconds,c.name);
    assert.equal(result.eventPersisted,output.eventPersisted,c.name);
    assert.equal(result.expired,output.expired,c.name);
    assert.equal(result.dominion,output.dominion,c.name);
    assert.deepEqual(result.guildRecords.slice().sort((a,b)=>a.id.localeCompare(b.id)),
      output.guildRecords,c.name+' original sorted guild records');
    assert.deepEqual(result.logs,output.logs,c.name);
    assert.equal(result.readGuildCalls,output.readGuildCalls,c.name);
    assert.equal(result.readGuildDataCalls,output.readGuildDataCalls,c.name);
    assert.equal(result.setTownCalls,output.setTownCalls,c.name);
    assert.deepEqual(result.randomDrawRanges,output.randomDrawRanges,c.name);
    assert.equal(result.drawsUsed,output.drawsUsed,c.name);
    assert.equal(result.zeroStartTransient,output.groupOccupied,c.name);
    assert.equal(result.committable,false);
    assert.equal(before,JSON.stringify(c.input),'projection pure');
  }
});
test('source guildbattle survives independent Perl hash processes when money maximum is unique',()=>{
  for(let i=0;i<2;i++){
    for(const c of original().cases){
      const got=projectR4GuildbattleEnd({reviewed,...c.input});
      assert.deepEqual(got.logs,c.output.logs);
      assert.deepEqual(got.randomDrawRanges,c.output.randomDrawRanges);
    }
  }
});
test('guildbattle source audit and invalid guild state reject without changing input',()=>{
  const valid=original().cases[0].input;
  const before=JSON.stringify(valid);
  assert.throws(()=>review({rebelDsl:fixed.rebelDsl.replace(
    'main::ReadGuildData();','main::ReadGuildMissing();',
  )}),/body drift/);
  assert.throws(()=>projectR4GuildbattleEnd({reviewed,...valid,
    guilds:[{id:'a',name:'A',money:3},{id:'b',name:'B',money:3}],
  }),/hash\/sort money tie/);
  assert.throws(()=>projectR4GuildbattleEnd({reviewed,...valid,
    guilds:[]}),/source time/);
  assert.throws(()=>projectR4GuildbattleEnd({reviewed,...valid,
    randomDraws:[]}),/sample count/);
  assert.throws(()=>projectR4GuildbattleEnd({reviewed,...valid,
    activeUntilSeconds:-1}),/source time/);
  assert.equal(JSON.stringify(valid),before);
});

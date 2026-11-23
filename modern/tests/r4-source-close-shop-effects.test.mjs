import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  R4_CLOSE_SHOP_EFFECT_SOURCE,reviewR4CloseShopEffects,
  projectR4CloseShopEffects,
} from '../src/original-r4-close-shop-effects.mjs';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const [writeSource,readSource,configSource]=await Promise.all([
  readFile(join(root,'modern/tests/original-perl/write.cgi'),'utf8'),
  readFile(join(root,'modern/tests/original-perl/inc-func.cgi'),'utf8'),
  readFile(join(root,'_config.cgi'),'utf8'),
]);
const reviewed=reviewR4CloseShopEffects({
  writeSource,readSource,configSource,
});
const oracle=()=>JSON.parse(execFileSync('perl',
  ['original-r4-close-shop-effects-probe.pl'],{
    cwd:join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));

test('R4 FULL original write.cgi::CloseShop mutates real shop and unlinks real session filenames exactly, with archive preserved BEFORE zeroing money/rank',()=>{
  assert.equal(reviewed.source,R4_CLOSE_SHOP_EFFECT_SOURCE);
  assert.equal(reviewed.archiveFields.length,32);
  assert.equal(reviewed.actualCloseShopSource,true);
  assert.equal(reviewed.externalUserOrArchiveIOCommitted,false);
  assert.equal(reviewed.committable,false);
  const p=oracle();
  assert.equal(p.cases.length,3);
  for(const row of p.cases){
    const before=JSON.stringify(row.input);
    const got=projectR4CloseShopEffects({reviewed,...row.input});
    assert.equal(got.closed,row.output.closed,row.name);
    assert.deepEqual(got.shop,row.output.shop,row.name+' source real status/money/rank');
    assert.equal(got.archived,row.output.archived,
      row.name+' source exact Perl archive text for source 32 fields');
    assert.deepEqual(got.setUserDataCalls,row.output.setUserDataCalls);
    assert.deepEqual(got.writeErrorLogCalls,row.output.writeErrorLogCalls);
    assert.deepEqual(got.deletedSessions,row.output.deletedSessions,
      row.name+' source actual Perl unlink filenames');
    assert.deepEqual([...got.remainingSessions].sort(),
      [...row.output.remainingSessions].sort());
    assert.equal(got.committable,false);
    assert.equal(JSON.stringify(row.input),before,'never mutate input');
  }
  const first=p.cases[0];
  assert.equal(first.input.shop.status,1);
  assert.equal(first.input.shop.money,123456);
  assert.equal(first.input.shop.rank,88);
  assert.equal(first.output.shop.status,0);
  assert.equal(first.output.shop.money,0);
  assert.equal(first.output.shop.rank,0);
  assert.deepEqual(first.output.deletedSessions,['1-alpha.cgi','1-beta.cgi']);
  assert.ok(first.output.archived.includes('123456'),
    'original archived shop must precede zeroing');
  assert.ok(first.output.archived.includes('來源原版關店店舖'));
  assert.deepEqual(first.output.setUserDataCalls,[{shopId:1}]);
  assert.equal(first.output.writeErrorLogCalls[0].file,'delete');
  assert.equal(first.output.writeErrorLogCalls[0].content,first.output.archived);
  assert.equal(p.cases[1].output.closed,false,
    'source missing ID leaves even matching session files untouched');
  assert.equal(p.cases[2].output.closed,true,
    'source CloseShop has no second status guard');
});

test('R4 original full CloseShop archive/session effects stable in independent Perl processes',()=>{
  for(let repeat=0;repeat<2;repeat++)for(const row of oracle().cases){
    const got=projectR4CloseShopEffects({reviewed,...row.input});
    assert.deepEqual(got.shop,row.output.shop);
    assert.equal(got.archived,row.output.archived);
    assert.deepEqual(got.deletedSessions,row.output.deletedSessions);
  }
});

test('R4 CloseShop source drift, ambiguous hash archive, filesystem traversal and false durability fail closed',()=>{
  const row=oracle().cases[0].input;
  const original=JSON.stringify(row);
  assert.throws(()=>reviewR4CloseShopEffects({
    writeSource:writeSource.replace('$DT->{money}=0;','$DT->{money}=1;'),
    readSource,configSource,
  }),/original CloseShop ordered source drift/);
  assert.throws(()=>reviewR4CloseShopEffects({
    writeSource,readSource:readSource.replace('job icon','icon job'),
    configSource,
  }),/source ordered shop archive index drift/);
  assert.throws(()=>reviewR4CloseShopEffects({
    writeSource,readSource,
    configSource:configSource.replace("$LOG_DELETESHOP_FILE\t\t='delete';",
      "$LOG_DELETESHOP_FILE\t\t='other';"),
  }),/original delete archive or session directory config drift/);
  assert.throws(()=>projectR4CloseShopEffects({
    reviewed,...row,shop:{...row.shop,itemtoday:{10:2,11:3}},
  }),/exact original shop archive arrays and bounded hash serialization/);
  assert.throws(()=>projectR4CloseShopEffects({
    reviewed,...row,sessionFileNames:['../other.cgi'],
  }),/original CloseShop id, reason and session names/);
  assert.throws(()=>projectR4CloseShopEffects({
    reviewed,...row,reason:'bad\ninjected',
  }),/original CloseShop id, reason and session names/);
  assert.throws(()=>projectR4CloseShopEffects({
    reviewed:{...reviewed,committable:true},...row,
  }),/source-reviewed original write.cgi CloseShop required/);
  assert.throws(()=>projectR4CloseShopEffects({
    reviewed:{...reviewed,externalUserOrArchiveIOCommitted:true},...row,
  }),/source-reviewed original write.cgi CloseShop required/);
  assert.equal(JSON.stringify(row),original);
});

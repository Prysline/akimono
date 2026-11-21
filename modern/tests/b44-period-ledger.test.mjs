import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
import {
  reviewOriginalPeriodShopLedger,projectOriginalPeriodShopLedger,
  B44_LEDGER_SOURCE,
} from '../src/original-period-shop-ledger.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=rel=>readFile(path.join(root,rel),'utf8');
const [periodSource,configSource,itemDsl,rebelDsl,compilerSource]=
  await Promise.all([
    'modern/tests/original-perl/period.cgi','_config.cgi',
    'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
    'modern/tests/original-perl/inc-makeitem.cgi',
  ].map(read));
const model=loadStandardStreetModel(itemDsl,rebelDsl);
const reviewed=reviewOriginalPeriodShopLedger({
  periodSource,configSource,itemDsl,model,compilerSource,
});
const oracle=JSON.parse(execFileSync('perl',['original-b44-period-ledger-probe.pl'],{
  cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
}));
test('B-44 source-review locks frozen Core ledger and standard-street profit/exp/shelf rules',()=>{
  assert.equal(reviewed.source,B44_LEDGER_SOURCE);
  assert.equal(reviewed.profitDayCount,3);
  assert.equal(reviewed.expDownRate,60);
  assert.equal(reviewed.expDownPoint,5);
  assert.equal(reviewed.showcaseDailyCost,0);
  for(const fragment of [
    '$DT->{money}-=$cost;', '$DT->{itemyesterday}=$DT->{itemtoday};',
    '$DT->{profitstock}=int((', '$DT->{exp}{$key}-=$EXP_DOWN_POINT;',
  ])assert.ok(periodSource.includes(fragment));
  assert.throws(()=>reviewOriginalPeriodShopLedger({
    periodSource:periodSource.replace('$DT->{money}-=$cost;',''),
    configSource,itemDsl,model,compilerSource,
  }),/source drift/);
  assert.throws(()=>reviewOriginalPeriodShopLedger({
    periodSource,
    configSource:configSource.replace(/(\$PROFIT_DAY_COUNT\s*=)3/, '$1'+'4'),
    itemDsl,model,compilerSource,
  }),/drift/);
  assert.equal(oracle.cases.length,3);
});
test('B-44 Node pure settlement ledger matches live original Perl source for profit, maintenance, stock, EXP and loss',()=>{
  for(const fixture of oracle.cases){
    const before=structuredClone(fixture.input);
    const projected=projectOriginalPeriodShopLedger({
      shop:before,reviewed,limits:oracle.limits,
    });
    assert.equal(projected.source,B44_LEDGER_SOURCE);
    for(const key of Object.keys(fixture.output)){
      assert.deepEqual(projected.shop[key],fixture.output[key],
        fixture.name+' period source field '+key);
    }
    assert.deepEqual(before,fixture.input,'projection never mutates original input');
    assert.equal(projected.chargedMaintenance,fixture.output.costyesterday);
    assert.notEqual(projected.shop.item,before.item);
    assert.notEqual(projected.shop.itemtoday,before.itemtoday);
  }
});
test('B-44 fail closed against unseen guild/dragon, invalid limits or malformed EXP before ledger mutation',()=>{
  const input=oracle.cases[0].input;
  for(const overrides of [
    {guild:'active'},{dragon:200},{dignity:100},
    {itemtoday:{'10':-1}},{exp:{'10':1001}},{showcasecount:2},
    {costtoday:Infinity},
  ]){
    assert.throws(()=>projectOriginalPeriodShopLedger({
      shop:{...input,...overrides},reviewed,limits:oracle.limits,
    }),/B-44/);
  }
  assert.throws(()=>projectOriginalPeriodShopLedger({
    shop:input,reviewed,limits:oracle.limits.slice(1),
  }),/B-44/);
});

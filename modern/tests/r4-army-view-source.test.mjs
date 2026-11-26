import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reviewR4ArmyView,describeR4ArmyView} from '../src/original-r4-army-view.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sources={viewSource:read('./original-perl/pinned-army-view.cgi'),
  calcSource:read('./original-perl/calc.cgi'),configSource:read('../../_config.cgi')};
const reviewed=reviewR4ArmyView(sources);
const probe=fileURLToPath(new URL('./original-perl/original-r4-army-view-probe.pl',import.meta.url));
const nowSeconds=1000000;
const cases=[
  ['zero dignity',0,90000,2400,0,false,false],
  ['one coin below price',1,999,2400,0,false,false],
  ['one second before hire',1,1000,2399,0,false,false],
  ['exact hire UI time',1,1000,2400,0,false,false],
  ['rebellion cost insufficient',1,1499,2400,0,true,false],
  ['rebellion exact funds',1,1500,2400,0,true,false],
  ['fire time insufficient',2,0,599,1000,false,false],
  ['fire exact time',2,0,600,1000,false,false],
  ['dignity decayed below current army',1,9000000,2400,2000,false,false],
  ['duplicate dropdown values',5,5000000,2400,0,false,false],
  ['fire duplicate dropdown values',5,5000000,2400,5000,false,false],
  ['funds clip before capacity',8,2400000,2400,1000,false,false],
  ['riot flag and 72h cap',8,2400000,300000,1000,true,true],
  ['existing time debt',8,2400000,-1,1000,false,false],
];
function fixture(row){
  const [name,dignity,money,available,army,rebel,riot]=row,time=nowSeconds-available;
  const world={schema:'akimono.memory-world.v2',revision:5,nowSeconds,events:null,
    shops:[{id:1,status:1,dignity,money,time}],
    period:{eventState:rebel?{rebel:nowSeconds+86400}:{}}};
  const armyBytes=(army?'1,'+army:'')+'\n'+(riot?'1':'')+'\n';
  return {name,world,armyBytes,oracleInput:{nowSeconds,dignity,money,time,army,rebel,riot}};
}
for(const row of cases)test('army facility original view: '+row[0],()=>{
  const {world,armyBytes,oracleInput}=fixture(row);
  const before=structuredClone(world);
  const expected=JSON.parse(execFileSync('perl',[probe,JSON.stringify(oracleInput)],{encoding:'utf8'}));
  const actual=describeR4ArmyView({reviewed,world,armyBytes});
  assert.deepEqual(Object.fromEntries(Object.keys(expected).map(key=>[key,actual[key]])),expected);
  assert.equal(actual.maximum,oracleInput.dignity*1000);
  assert.equal(actual.unitPrice,oracleInput.rebel?1500:1000);
  assert.equal(actual.count,oracleInput.army);
  assert.equal(actual.riot,oracleInput.riot);
  assert.equal(actual.committable,false);
  assert.deepEqual(world,before);
});
test('army view scope: no authority or unreviewed source/bytes',()=>{
  const {world,armyBytes}=fixture(cases[3]);
  for(const key of Object.keys(sources))assert.throws(()=>reviewR4ArmyView({...sources,[key]:sources[key]+' '}),/source drift/);
  assert.throws(()=>describeR4ArmyView({reviewed:{...reviewed},world,armyBytes}),/source review/);
  assert.throws(()=>describeR4ArmyView({reviewed,world,armyBytes:undefined}),/army bytes/);
  assert.throws(()=>describeR4ArmyView({reviewed,world:{...world,period:{eventState:null}},armyBytes}),/event context/);
  const withEvent={...world,period:{eventState:{'ken-sale':nowSeconds+60}}};
  assert.deepEqual(describeR4ArmyView({reviewed,world:withEvent,armyBytes}),describeR4ArmyView({reviewed,world,armyBytes}));
  const decayed=fixture(cases[8]);
  const quote=describeR4ArmyView({reviewed,world:decayed.world,armyBytes:decayed.armyBytes});
  assert.equal(quote.hireReason,'dignity-capacity');assert.equal(quote.fireMaximum,2000);
  assert.equal(quote.canFire,true);assert.equal(quote.canHire,false);
});

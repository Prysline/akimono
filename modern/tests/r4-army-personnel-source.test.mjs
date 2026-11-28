import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reviewR4ArmyPersonnel,projectR4ArmyPersonnel} from '../src/original-r4-army-personnel.mjs';
import {PERIOD_WORLD_SCHEMA,applyGameCommand,encodeMemorySnapshot} from '../src/game-core-contract.mjs';
import {isReviewedOrdinaryCommand} from '../src/reviewed-ordinary-command-policy.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sources={armyCommand:read('./original-perl/pinned-army-s.cgi'),army:read('./original-perl/pinned-army.cgi'),
  calc:read('./original-perl/calc.cgi'),config:read('../../_config.cgi')};
const reviewed=reviewR4ArmyPersonnel(sources);
const {cases}=JSON.parse(execFileSync('perl',[fileURLToPath(new URL('./original-perl/original-r4-army-personnel-probe.pl',import.meta.url))],{encoding:'utf8'}));
assert.equal(cases.length,17);
const fixture=row=>{
 const world={schema:PERIOD_WORLD_SCHEMA,worldId:'fixture',streetId:'standard',revision:5,
   nowSeconds:row.nowSeconds,shops:[row.before],market:null,events:null,period:{eventState:row.eventState}};
 const command={kind:row.mode==='plus'?'hire-army':'fire-army',expectedRevision:5,shopId:1,requestedCount:row.count};
 return {reviewed,world,armyBytes:row.armyBytes,command};
};
for(const row of cases)test('army personnel original source: '+row.name,()=>{
 const input=fixture(row),before=encodeMemorySnapshot(input.world);
 if(row.ok){
   const result=projectR4ArmyPersonnel(input);
   assert.deepEqual(result.shops,[row.after]);
   assert.equal(result.armyBytes,row.staged);
   assert.equal(result.receipt.cost,row.before.money-row.after.money);
   assert.equal(result.receipt.timeSeconds,row.mode==='plus'?2400:600);
   assert.equal(result.committable,false);
 }else{
   assert.equal(row.staged,null);
   assert.throws(()=>projectR4ArmyPersonnel(input),/R4 army personnel/);
 }
 assert.equal(encodeMemorySnapshot(input.world),before);
});
test('source pins, exact revision, explicit army and event evidence are required',()=>{
 const x=fixture(cases[0]);
 for(const key of Object.keys(sources))assert.throws(()=>reviewR4ArmyPersonnel({...sources,[key]:sources[key]+' '}),/source drift/);
 assert.throws(()=>projectR4ArmyPersonnel({...x,reviewed:{...reviewed}}),/source review/);
 assert.throws(()=>projectR4ArmyPersonnel({...x,command:{...x.command,expectedRevision:4}}),/revision/);
 assert.throws(()=>projectR4ArmyPersonnel({...x,command:{...x.command,cost:0}}),/exact command/);
 assert.throws(()=>projectR4ArmyPersonnel({...x,armyBytes:undefined}),/army bytes/);
 assert.throws(()=>projectR4ArmyPersonnel({...x,world:{...x.world,period:{eventState:null}}}),/event context/);
 assert.throws(()=>projectR4ArmyPersonnel({...x,world:{...x.world,period:{eventState:{guildbattle:1}}}}),/event context/);
});
test('candidate cannot enter GameCore CAS or ordinary v2 history even if exposed by a fixture street',()=>{
 const x=fixture(cases[0]);
 const fakeStreet={id:x.world.streetId,capabilities:[x.command.kind],apply:()=>projectR4ArmyPersonnel(x)};
 const result=applyGameCommand({world:x.world,command:x.command,streetModule:fakeStreet});
 assert.equal(result.ok,false);assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');
 assert.match(result.details.reason,/noncommittable/);
 assert.deepEqual(result.world,x.world);
 assert.equal(isReviewedOrdinaryCommand(x.command,fakeStreet),false);
});

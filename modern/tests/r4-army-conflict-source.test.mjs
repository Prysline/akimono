import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reviewR4ArmyConflict,describeR4ArmyConflict,projectR4ArmyConflictCommand} from '../src/original-r4-army-conflict.mjs';
import {parseArmyFile} from '../src/original-r4-army-files.mjs';
import {isReviewedOrdinaryCommand} from '../src/reviewed-ordinary-command-policy.mjs';
import {applyGameCommand} from '../src/game-core-contract.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sources={armyCommand:read('./original-perl/pinned-army-s.cgi'),army:read('./original-perl/pinned-army.cgi'),
 calc:read('./original-perl/calc.cgi'),config:read('../../_config.cgi'),view:read('./original-perl/pinned-army-view.cgi')};
const reviewed=reviewR4ArmyConflict(sources);
const {cases}=JSON.parse(execFileSync('perl',[fileURLToPath(new URL('./original-perl/original-r4-army-conflict-probe.pl',import.meta.url))],{encoding:'utf8'}));
assert.equal(cases.length,24);
const kinds={rebelon:'start-rebellion',rside:'join-rebellion',lside:'dispatch-guard'};
const flags={rebelon:'canStart',rside:'canJoin',lside:'canDispatch'};
function input(row){return {reviewed,world:row.world,armyBytes:row.armyBytes,command:{kind:kinds[row.mode],expectedRevision:5,shopId:1,
 ...(row.mode==='lside'?{}:{confirmation:row.confirmation})}}}
for(const row of cases)test('army conflict source and facility: '+row.name,()=>{
 const x=input(row),before=structuredClone(x.world),q=describeR4ArmyConflict({...x,shopId:1});
 for(const k of Object.values(flags))assert.equal(q[k],row.quote[k],k);
 if(row.ok){
   const result=projectR4ArmyConflictCommand(x);
   assert.deepEqual(result.shops,row.shops);assert.deepEqual(result.town,row.town);
   assert.deepEqual(result.eventState,row.eventState);assert.deepEqual(result.receipt.logs,row.logs);
   // Perl hash order is not stable; compare source semantics, not order.
   assert.deepEqual(parseArmyFile(result.armyBytes,[1,2]),parseArmyFile(row.staged,[1,2]));
   assert.equal(result.committable,false);assert.equal(result.receipt.committable,false);
 }else{
   assert.equal(row.staged,null);assert.throws(()=>projectR4ArmyConflictCommand(x),/R4 army conflict/);
 }
 if(row.ok&&row.quote[flags[row.mode]])assert.deepEqual(projectR4ArmyConflictCommand({...x,requireFacility:true}),projectR4ArmyConflictCommand(x));
 else assert.throws(()=>projectR4ArmyConflictCommand({...x,requireFacility:true}),/R4 army conflict/);
 assert.deepEqual(x.world,before);
 assert.equal(isReviewedOrdinaryCommand(x.command,{reviewedArmy:true}),false);
});
test('conflict source review, exact command and unreviewed event context fail closed',()=>{
 const x=input(cases[0]);
 for(const k of Object.keys(sources))assert.throws(()=>reviewR4ArmyConflict({...sources,[k]:sources[k]+' '}),/source drift/);
 assert.throws(()=>projectR4ArmyConflictCommand({...x,reviewed:{...reviewed}}),/source review/);
 assert.throws(()=>projectR4ArmyConflictCommand({...x,command:{...x.command,armyBytes:'1,99999\n\n'}}),/exact command/);
 assert.throws(()=>projectR4ArmyConflictCommand({...x,command:{...x.command,expectedRevision:4}}),/revision/);
 assert.throws(()=>projectR4ArmyConflictCommand({...x,armyBytes:undefined}),/army bytes/);
 assert.throws(()=>projectR4ArmyConflictCommand({...x,world:{...x.world,period:{...x.world.period,eventState:{guildbattle:1}}}}),/rebel-only/);
 // The GameCore boundary does not accept a noncommittable candidate.
 const one={...x.world,streetId:'standard',worldId:'fixture',market:null,shops:[x.world.shops[0]],period:{eventState:x.world.period.eventState}};
 const result=applyGameCommand({world:one,command:x.command,streetModule:{id:'standard',capabilities:[x.command.kind],apply:()=>projectR4ArmyConflictCommand(x)}});
 assert.equal(result.ok,false);assert.match(result.details.reason,/noncommittable/);
 assert.deepEqual(result.world,one);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {reviewLordInside,projectLordInside} from './support/r4-lord-inside-candidate.mjs';
const src=readFileSync(new URL('./original-perl/pinned-lord-s.cgi',import.meta.url),'utf8');
const reviewed=reviewLordInside(src);
const probe=fileURLToPath(new URL('./original-perl/original-r4-lord-inside-probe.pl',import.meta.url));
const baseline={revision:5,taxRate:20,town:{leader:1,money:2000000,in:0,out:0,develop:5001,devem:5000000,safety:6000,safem:5000000,army:1000,robina:100,robinb:0},
 actor:{id:1,name:'Owner',money:1000000,time:956800},eventState:{}};
const command={kind:'lord-inside',expectedRevision:5,actorId:1,taxrate:'20',devem:'0',safem:'0'};
const cases=[
 ['raise tax',{taxrate:'40',devem:'10000000',safem:'0'},true],
 ['lower tax',{taxrate:'0',devem:'0',safem:'10000000'},true],
 ['same tax changes budgets',{devem:'123',safem:'456'},true],
 ['leading zeros',{taxrate:'0005',devem:'00000',safem:'0012'},true],
 ['active rebellion: raw inside does not prohibit it',{taxrate:'21'},true,{eventState:{rebel:1259200}}],
 ['treasury is not debited now',{devem:'10000000',safem:'10000000'},true,{town:{...baseline.town,money:1}}],
 ['tax above cap',{taxrate:'41'},false],
 ['development above cap',{devem:'10000001'},false],
 ['security above cap',{safem:'10000001'},false],
 ['negative',{taxrate:'-1'},false],
 ['fraction',{taxrate:'2.5'},false],
 ['non ASCII',{taxrate:'２０'},false],
 ['space',{devem:' 10'},false],
 ['newline',{safem:'10\n'},false],
];
function oracle(fixture,cmd){
 return JSON.parse(execFileSync('perl',[probe],{input:JSON.stringify({fixture,command:cmd}),encoding:'utf8'}));
}
for(const [name,overrides,ok,context] of cases)test('R4 lord inside source: '+name,()=>{
 const fixture=structuredClone({...baseline,...context}),cmd={...command,...overrides},before=structuredClone(fixture);
 const original=oracle(fixture,cmd);
 assert.equal(original.ok,Number(ok));
 if(ok){
   const result=projectLordInside({reviewed,fixture,command:cmd});
   assert.deepEqual(result.fixture,original.fixture);
   assert.deepEqual(result.receipt.logs,original.logs);
   assert.equal(result.committable,false);assert.equal(result.receipt.committable,false);
   assert.deepEqual(original.trace,['lock','read-adapter','auth-adapter',...(original.logs.length?['log']:[]),'renew','stage-adapter','commit-adapter','unlock','render']);
   assert.equal(result.fixture.town.money,before.town.money);
   assert.deepEqual(result.fixture.actor,before.actor);
 }else{
   assert.throws(()=>projectLordInside({reviewed,fixture,command:cmd}),/R4 lord inside/);
   assert.deepEqual(original.fixture,before);assert.deepEqual(original.logs,[]);
   assert.ok(!original.trace.includes('commit-adapter'));
 }
 assert.deepEqual(fixture,before);
});
test('R4 lord inside: raw handler is not authorization; candidate rejects nonlord and empty form',()=>{
 const fixture={...baseline,town:{...baseline.town,leader:2}};
 assert.equal(oracle(fixture,command).ok,1);
 assert.throws(()=>projectLordInside({reviewed,fixture,command}),/current lord/);
 const empty={...command,taxrate:''};
 assert.equal(oracle(baseline,empty).fixture.taxRate,0);
 assert.throws(()=>projectLordInside({reviewed,fixture:baseline,command:empty}),/invalid taxrate/);
});
test('R4 lord inside: exact revision, form and reviewed source remain fail closed',()=>{
 assert.throws(()=>reviewLordInside(src+' '),/source drift/);
 const input={reviewed,fixture:baseline,command};
 assert.throws(()=>projectLordInside({...input,reviewed:{...reviewed}}),/source review/);
 for(const cmd of [{...command,expectedRevision:4},{...command,actorId:2},{...command,taxrate:20},{...command,extra:1}])
   assert.throws(()=>projectLordInside({...input,command:cmd}),/R4 lord inside/);
 assert.throws(()=>projectLordInside({...input,fixture:{...baseline,eventState:{guildbattle:1}}}),/source fixture/);
});

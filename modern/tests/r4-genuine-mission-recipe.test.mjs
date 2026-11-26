/** Test-client algorithm regression, not a player acquisition oracle.
 * Actual HTTP player acquisition is covered independently by the long
 * acceptance and P3 #66 source progression tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareGenuineMissionRecipe} from './support/r4-genuine-mission-recipe.mjs';

function simulatedClient({exp=260,decay=true,unrepairable=false}={}){
  let experience=exp,remaining=0,period=3,held=true,materials=20,waits=0,training=0;
  const p={state:{world:{period:{get settledCount(){return period}}}},
    stock:id=>id===66?Number(held):materials,exp:()=>experience,remaining:()=>remaining,
    quote:()=>({timePerUseSeconds:10800,proficiency:experience,requiredProficiency:250,
      canUse:!unrepairable&&held&&materials>=20&&experience>=250&&remaining>=10800,
      maxUseCount:!unrepairable&&held&&materials>=20&&experience>=250&&remaining>=10800?1:0,
      reason:unrepairable?'unreviewed EVENT':experience<250?'EXP不足':'時間不足'}),
    async enoughTime(n){
      waits++;
      if(decay){decay=false;period++;experience-=Math.trunc(experience*60/1000)+5;}
      remaining=n;
    }};
  return {p,get waits(){return waits},get training(){return training},
    acquireBook:async()=>{held=true},acquireMaterial:async()=>{materials=20},
    train:async()=>{training++;experience+=20;remaining=0;},loseBook:()=>{held=false}};
}
test('R4 mission client rechecks after settlement decay and trains actual lower-tier route before USE',async()=>{
  const c=simulatedClient(),retries=[];
  const q=await prepareGenuineMissionRecipe({p:c.p,book:66,useId:1,materials:[[6,20]],
    acquireBook:c.acquireBook,acquireMaterial:c.acquireMaterial,train:c.train,onRetry:x=>retries.push(x)});
  assert.equal(c.training,1);assert.equal(c.waits,2);
  assert.deepEqual(retries.map(r=>[r.beforeExp,r.exp,r.required,r.period]),[[260,240,250,4]]);
  assert.equal(q.proficiency,260);assert.equal(q.canUse,true);
});
test('R4 mission client reacquires a consumed recipe book, never bypasses an unrelated source gate',async()=>{
  const c=simulatedClient({decay:false});c.loseBook();
  const q=await prepareGenuineMissionRecipe({p:c.p,book:66,useId:1,materials:[[6,20]],acquireBook:c.acquireBook,acquireMaterial:c.acquireMaterial,train:c.train});
  assert.equal(q.canUse,true);assert.equal(c.training,0);
  const blocked=simulatedClient({decay:false,unrepairable:true});
  await assert.rejects(()=>prepareGenuineMissionRecipe({p:blocked.p,book:66,useId:1,materials:[[6,20]],acquireBook:blocked.acquireBook,acquireMaterial:blocked.acquireMaterial,train:blocked.train}),/source recipe gate cannot be repaired/);
  assert.equal(blocked.training,0);
});

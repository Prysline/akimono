import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPeriodMemoryWorld,applyGameCommand} from '../src/game-core-contract.mjs';
import {createLifecycleSourcePlanner} from '../src/reviewed-shop-lifecycle-command.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sourceTexts={membership:read('./original-perl/pinned-membership-user.cgi'),form:read('./original-perl/pinned-other.cgi'),compiler:read('./original-perl/inc-makeitem.cgi'),dsl:read('../../custom/inc-item-data.cgi'),core:read('./original-perl/inc-func.cgi'),writer:read('./original-perl/write.cgi'),subdata:read('./original-perl/pinned-user.cgi')};
const binding={worldId:'w',streetId:'s',shopId:1,ownerName:'owner',revision:7};
const input={kind:'restart-shop',body:{expectedRevision:7,confirmation:'restart'},request:{opaque:true}};
const makeWorld=()=>({...createPeriodMemoryWorld({worldId:'w',streetId:'s',nowSeconds:100000,period:{}}),revision:7,shops:[{id:1,status:1,name:'owner',shopname:'Shop',foundation:89199,remoteaddr:'192.0.2.1',pass:'SYNTHETIC_PASSWORD'},{id:2,status:1,name:'peer',pass:'PEER_PASSWORD'}]});
function fixture(){let world=makeWorld();let reads=0;const options={readWorld:()=>world,resolveAuthenticatedActor:()=>binding,sourceTexts,readSubdataNames:actor=>{reads++;assert.deepEqual(actor,{worldId:'w',street:'s',shopId:1,ownerName:'owner'});return ['1-a.cgi','1-.cgi','2-a.cgi','10-a.cgi'];}};return {options,get world(){return world},set world(value){world=value},get reads(){return reads}};}
test('LC-D1 authentic B restart plan from D world, immutable, no credentials or publication',async()=>{
 const f=fixture(),before=structuredClone(f.world),plan=await createLifecycleSourcePlanner(f.options)(input);
 assert.equal(plan.effect.shopTransition.compiledFuncNew.time,56800);
 assert.equal(plan.effect.shopTransition.compiledFuncNew.item[62],1);
 assert.equal(plan.effect.shopTransition.compiledFuncNew.item[78],5);
 assert.deepEqual(plan.effect.subdataDeletionSelection,['1-a.cgi']);
 assert.deepEqual(plan.effect.actor,{worldId:'w',street:'s',shopId:1});
 assert.equal(plan.committable,false);assert.equal(plan.effect.committable,false);
 assert.ok(Object.isFrozen(plan.effect.shopTransition.compiledFuncNew.item));
 assert.ok(!JSON.stringify(plan).includes('SYNTHETIC_PASSWORD')&&!JSON.stringify(plan).includes('PEER_PASSWORD'));
 assert.equal(f.reads,1);assert.deepEqual(f.world,before);
 const result=applyGameCommand({world:f.world,command:{kind:'restart-shop',expectedRevision:7},streetModule:{id:'s',capabilities:['restart-shop'],apply:()=>({shops:f.world.shops,receipt:plan.effect,committable:plan.committable})}});
 assert.equal(result.code,'SOURCE_BOUNDARY_REJECTED');assert.deepEqual(result.world,before);
});
test('LC-D1 close plan delegates archive and preserves separate session/subdata scope',async()=>{
 const f=fixture(),before=structuredClone(f.world),plan=await createLifecycleSourcePlanner(f.options)({...input,kind:'close-shop',body:{expectedRevision:7,confirmation:'closeshop'}});
 assert.deepEqual(plan.effect.shopTransition.closeShopCall,{id:1,reason:'自主閉店'});
 assert.equal(plan.effect.sessionIntent.clearCookie,true);assert.equal(plan.effect.sessionIntent.deleteSessionFile,false);
 assert.deepEqual(plan.effect.blockIpEffect,{value:'192.0.2.1'});
 assert.deepEqual(plan.effect.externalEffects.directCommonFileWrites,[]);
 assert.deepEqual(f.world,before);
});
test('LC-D1 source plan refuses injected fields, untrusted source, normal age boundary and changed world',async()=>{
 const f=fixture();const plan=createLifecycleSourcePlanner(f.options);
 await assert.rejects(plan({...input,body:{...input.body,subdataNames:['1-fake.cgi']}}),/exact request/);assert.equal(f.reads,0);
 assert.throws(()=>createLifecycleSourcePlanner({...f.options,sourceTexts:{...sourceTexts,membership:sourceTexts.membership+'\\n'}}),/source drift/);
 f.world={...f.world,nowSeconds:99999};await assert.rejects(plan(input),/normal restart/);
 f.world=makeWorld();const changing=createLifecycleSourcePlanner({...f.options,readSubdataNames:()=>{f.world={...f.world,nowSeconds:100001};return [];}});
 await assert.rejects(changing(input),/world changed during source planning/);
 await assert.rejects(createLifecycleSourcePlanner({...f.options,readSubdataNames:()=>['../1-a.cgi']})(input),/authoritative snapshot/);
});

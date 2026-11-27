import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
import {createPeriodMemoryWorld} from '../src/game-core-contract.mjs';
import {createStableOwnerSessions} from '../src/r4-stable-owner-sessions.mjs';
import {createOwnerCredentialRecord,verifyOwnerCredential,createCredentialOwnerAuthenticator} from '../src/r4-owner-credential-record.mjs';
import {createLifecycleCommandPreflight} from '../src/reviewed-shop-lifecycle-command.mjs';
const read=p=>normalizeLocalSourceText(readFileSync(new URL(p,import.meta.url),'utf8'));
const source={configSource:read('../../_config.cgi'),readSource:read('./original-perl/inc-func.cgi'),loginSource:read('./original-perl/pinned-login.cgi')};
function fixture(){
 let world={...createPeriodMemoryWorld({worldId:'w',streetId:'s',nowSeconds:100000,period:{}}),revision:7,shops:[{id:1,name:'owner',status:1}]},now=50000;
 const binding=()=>({worldId:world.worldId,streetId:world.streetId,shopId:1,ownerName:'owner',revision:world.revision});
 const deps={...source,readWorld:()=>world,authenticateOwner:({request})=>request.verified===true?binding():null,readSessionToken:request=>request.cookie,clock:()=>now};
 const authority=createStableOwnerSessions(deps);
 return {deps,authority,get world(){return world},set world(w){world=w},get now(){return now},set now(n){now=n}};
}
test('LC-D1 session issue/replacement, exact original timeout equality and stable current revision',async()=>{
 const f=fixture(),a=f.authority;
 await assert.rejects(a.issue({verified:false}),/login denied/);
 const first=await a.issue({verified:true}),second=await a.issue({verified:true});
 assert.match(first.token,/^[a-f0-9]{64}$/);assert.notEqual(first.token,second.token);
 const resolve=token=>a.resolveAuthenticatedActor({request:{cookie:token},world:f.world});
 assert.throws(()=>resolve(first.token),/session denied/);
 f.now+=3600;assert.equal(resolve(second.token).revision,7);
 f.world={...f.world,revision:8};f.now+=3600;
 const binding=resolve(second.token);assert.deepEqual(binding,{worldId:'w',streetId:'s',shopId:1,ownerName:'owner',revision:8});
 assert.ok(!JSON.stringify(binding).includes(second.token));
 f.now+=3601;assert.throws(()=>resolve(second.token),/session denied/);
});
test('LC-D1 stable ID prevents original same-name old session alias and plugs into actual preflight',async()=>{
 const f=fixture(),a=f.authority,{token}=await a.issue({verified:true});
 const prepare=createLifecycleCommandPreflight({readWorld:f.deps.readWorld,resolveAuthenticatedActor:a.resolveAuthenticatedActor});
 const request={cookie:token},body={expectedRevision:7,confirmation:'restart'};
 const plan=await prepare({kind:'restart-shop',request,body});assert.equal(plan.actorRef.shopId,1);
 f.world={...f.world,revision:8,shops:[{...f.world.shops[0],foundation:100000}]};
 a.reconcileCommittedWorld();
 assert.equal((await prepare({kind:'restart-shop',request,body:{...body,expectedRevision:8}})).actorRef.shopId,1);
 f.world={...f.world,revision:9,shops:[]};a.reconcileCommittedWorld();
 f.world={...f.world,revision:10,shops:[{id:2,name:'owner',status:1}]};
 await assert.rejects(prepare({kind:'restart-shop',request,body:{...body,expectedRevision:10}}),/authenticated owner/);
 assert.equal(a.revoke(request),false);
});
test('LC-D1 authentication race, credential-bearing binding and source drift reject without issuing',async()=>{
 const f=fixture();
 const race=createStableOwnerSessions({...f.deps,authenticateOwner:()=>{f.world={...f.world,revision:8};return {worldId:'w',streetId:'s',shopId:1,ownerName:'owner',revision:7};}});
 await assert.rejects(race.issue({}),/login denied/);
 const extra=createStableOwnerSessions({...f.deps,authenticateOwner:()=>({worldId:'w',streetId:'s',shopId:1,ownerName:'owner',revision:8,password:'secret'})});
 await assert.rejects(extra.issue({}),/login denied/);
 assert.throws(()=>createStableOwnerSessions({...f.deps,loginSource:source.loginSource+'\n'}),/source drift/);
});

test('LC-D1 actual private credential verifier binds stable identity and plugs into existing session service',async()=>{
 const f=fixture(),newSource=read('./original-perl/new.cgi');
 const binding={worldId:'w',streetId:'s',shopId:1,ownerName:'owner'};
 let record=await createOwnerCredentialRecord({newSource,binding,password:'old_pw'});
 assert.ok(Object.isFrozen(record)&&Object.isFrozen(record.binding));
 assert.ok(!JSON.stringify(record).includes('old_pw'));
 assert.equal(await verifyOwnerCredential({record,binding,password:'wrong_pw'}),false);
 assert.equal(await verifyOwnerCredential({record,binding:{...binding,streetId:'other'},password:'old_pw'}),false);
 assert.equal(await verifyOwnerCredential({record:{...record,hash:'x'},binding,password:'old_pw'}),false);
 assert.equal(await verifyOwnerCredential({record:{...record,binding:{...binding,shopId:2}},binding:{...binding,shopId:2},password:'old_pw'}),false);
 await assert.rejects(createOwnerCredentialRecord({newSource,binding,password:'owner'}),/invalid registration/);
 await assert.rejects(createOwnerCredentialRecord({newSource,binding,password:'x:y'}),/invalid registration/);
 await assert.rejects(createOwnerCredentialRecord({newSource:newSource+' ',binding,password:'old_pw'}),/invalid registration/);
 const authenticateOwner=createCredentialOwnerAuthenticator({
   readCredentials:req=>({ownerName:req.name,password:req.password}),
   // Controlled committed-record reader; not a persistent account authority.
   readCredentialRecord:()=>record,
 });
 const a=createStableOwnerSessions({...f.deps,authenticateOwner});
 await assert.rejects(a.issue({name:'owner',password:'wrong_pw'}),/login denied/);
 const old=await a.issue({name:'owner',password:'old_pw'});
 const request={cookie:old.token};
 assert.equal(a.resolveAuthenticatedActor({request,world:f.world}).shopId,1);
 f.world={...f.world,revision:8,shops:[{id:2,name:'owner',status:1}]};
 a.reconcileCommittedWorld();
 await assert.rejects(a.issue({name:'owner',password:'old_pw'}),/login denied/);
 assert.throws(()=>a.resolveAuthenticatedActor({request,world:f.world}),/session denied/);
 record=await createOwnerCredentialRecord({newSource,binding:{...binding,shopId:2},password:'new_pw'});
 await assert.rejects(a.issue({name:'owner',password:'old_pw'}),/login denied/);
 const next=await a.issue({name:'owner',password:'new_pw'});
 assert.equal(a.resolveAuthenticatedActor({request:{cookie:next.token},world:f.world}).shopId,2);
 assert.notEqual(old.token,next.token);
});

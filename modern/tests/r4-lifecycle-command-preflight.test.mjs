import test from 'node:test';
import assert from 'node:assert/strict';
import {createPeriodMemoryWorld,applyGameCommand} from '../src/game-core-contract.mjs';
import {createLifecycleCommandPreflight} from '../src/reviewed-shop-lifecycle-command.mjs';
const makeWorld=()=>({...createPeriodMemoryWorld({worldId:'w',streetId:'s',nowSeconds:12345,period:{}}),
  revision:7,shops:[{id:1,name:'owner',status:1},{id:2,name:'other',status:1}]});
const binding={worldId:'w',streetId:'s',shopId:1,ownerName:'owner',revision:7};
const body={expectedRevision:7,confirmation:'restart'};
const input={kind:'restart-shop',body,request:{opaque:true}};
function setup(actor=binding){
  const world=makeWorld();let calls=0;
  const prepare=createLifecycleCommandPreflight({readWorld:()=>world,
    resolveAuthenticatedActor:({request,world:seen})=>{
      calls++;assert.equal(request,input.request);assert.ok(Object.isFrozen(seen));return actor;
    }});
  return {world,prepare,get calls(){return calls;}};
}
test('LC-D1 exact request resolves only server owner and maps streetId to source street, without mutation',async()=>{
  const s=setup(),before=structuredClone(s.world);
  const p=await s.prepare(input);
  assert.deepEqual(p,{committable:false,worldStateWritten:false,expectedRevision:7,now:12345,
    actorRef:{worldId:'w',street:'s',shopId:1,ownerName:'owner'},
    command:{kind:'restart-shop',confirmation:'restart'}});
  assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.actorRef)&&Object.isFrozen(p.command));
  assert.deepEqual(s.world,before);
  const close=await s.prepare({...input,kind:'close-shop',body:{expectedRevision:7,confirmation:'closeshop'}});
  assert.equal(close.command.kind,'close-shop');assert.equal(close.committable,false);
  assert.equal(s.calls,2);assert.deepEqual(s.world,before);
});
test('LC-D1 rejects malformed, injected and stale request before resolving actor',async()=>{
  const s=setup();const accessor={expectedRevision:7,get confirmation(){throw Error('must not read getter');}};
  for(const invalid of [null,[],{},Object.create(body),accessor,
    {...body,[Symbol('hidden')]:1},{...body,actor:binding},{...body,shopId:2},
    {...body,money:100000},{...body,now:1},{...body,kind:'close-shop'},
    JSON.parse('{"expectedRevision":7,"confirmation":"restart","__proto__":{}}'),
    {...body,expectedRevision:'7'},{...body,expectedRevision:6},
    {...body,confirmation:'closeshop'}]){
    await assert.rejects(s.prepare({...input,body:invalid}),/LC-D1 preflight/);
  }
  await assert.rejects(s.prepare({...input,kind:'reset'}),/unsupported/);
  assert.equal(s.calls,0);
});
test('LC-D1 missing, wrong, stale, or credential-bearing server bindings fail closed',async()=>{
  assert.throws(()=>createLifecycleCommandPreflight({readWorld:makeWorld}),/trusted/);
  for(const actor of [null,{}, {...binding,worldId:'other'}, {...binding,streetId:'other'},
    {...binding,shopId:2},{...binding,shopId:99},{...binding,ownerName:'other'},
    {...binding,revision:6},{...binding,password:'secret'},{...binding,session:'secret'}]){
    await assert.rejects(setup(actor).prepare(input),/owner/);
  }
  const s=setup();s.world.shops[0].status=0;
  await assert.rejects(s.prepare(input),/active owner/);
  const denied=createLifecycleCommandPreflight({readWorld:makeWorld,
    resolveAuthenticatedActor:()=>{throw Error('secret');}});
  await assert.rejects(denied(input),{message:'LC-D1 preflight: authenticated owner required'});
});
test('LC-D1 re-reads world after async auth, rejects concurrent mutation, never grants GameCore capability',async()=>{
  let world=makeWorld();
  const prepare=createLifecycleCommandPreflight({readWorld:()=>world,
    resolveAuthenticatedActor:async()=>{world={...world,revision:8};return binding;}});
  await assert.rejects(prepare(input),/world changed/);
  const result=applyGameCommand({world,command:{kind:'restart-shop',expectedRevision:8},
    streetModule:{id:'s',capabilities:[],apply(){throw Error('must not run');}}});
  assert.equal(result.code,'UNSUPPORTED_ACTION');
  assert.deepEqual(result.world,world);
});

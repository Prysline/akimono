import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  MEMORY_WORLD_SCHEMA,createMemoryWorld,validateMemoryWorld,
  encodeMemorySnapshot,decodeMemorySnapshot,
  applyGameCommand,createMemoryWorldAdapter,executeMemoryCommand,
} from '../src/game-core-contract.mjs';
import {createStandardStreetModule,STANDARD_STREET_ID}
  from '../src/standard-street-module.mjs';
import {
  loadStandardStreetModel,createStandardStreetShop,editShowcase,
} from '../src/standard-street-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [itemDsl,rebelDsl,originalNew,originalShowcase]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/new.cgi',
  'modern/tests/original-perl/sc-s.cgi',
].map(p=>readFile(path.join(root,p),'utf8')));
const model=loadStandardStreetModel(itemDsl,rebelDsl);
const street=createStandardStreetModule({itemDsl,rebelDsl});
const world=()=>createMemoryWorld({
  worldId:'b31-fixture-world',streetId:STANDARD_STREET_ID,nowSeconds:1000000,
});
const open=(revision=0)=>({
  kind:'open-shop',expectedRevision:revision,
  shopId:1,ownerName:'測試店主',shopName:'標準街記憶體測試商店',
});
const shelf=(revision=1,extras={})=>({
  kind:'edit-showcase',expectedRevision:revision,
  shopId:1,shelf:0,itemId:79,per:100,...extras,
});
const apply=(state,command)=>applyGameCommand({
  world:state,command,streetModule:street,
});
const create=()=>{
  const a=apply(world(),open());
  assert.ok(a.ok,a.details?.reason);
  return a.world;
};

test('B-31 fixed original Core source evidence for new shop/showcase is pinned',()=>{
  assert.match(originalNew,/sub |money|showcase/);
  assert.match(originalShowcase,/showcase|price/);
  assert.ok(itemDsl.includes('@@FUNCNEW'));
});
test('B-31 StreetModule lists only source-reviewed supported commands',()=>{
  assert.equal(street.id,'standard-street');
  assert.deepEqual(street.capabilities,['open-shop','edit-showcase','discard-item','use-item']);
  assert.equal(street.metadata.itemCount,79);
  assert.equal(street.metadata.modelSourceMode,'reviewed-declarative-subset');
  assert.equal(street.metadata.opaqueCallbacks,true);
  assert.ok(street.metadata.unsupported.includes('market sales'));
});

test('B-31 StreetModule exposes source-raw typed item/action/event catalogs',()=>{
  assert.equal(street.catalog.items.length,79);
  assert.equal(street.catalog.uses.length,116);
  assert.equal(street.catalog.events.length,25);
  assert.deepEqual(new Set(street.catalog.items.map(x=>x.id)),
    new Set(Array.from({length:79},(_,i)=>i+1)));
});
test('B-31 catalog item data retains original ID/name/code, raw limits and source',()=>{
  const item=street.catalog.items.find(x=>x.id===79);
  const original=model.items.find(x=>x.id===79);
  assert.equal(item.name,original.name);
  assert.equal(item.code,original.code);
  assert.equal(item.priceRaw,original.priceRaw);
  assert.equal(item.limitRaw,original.limitRaw);
  assert.equal(item.source,original.source);
  assert.equal(item.line,original.line);
  assert.equal(item.runtimeSupported,false);
});
test('B-31 raw USE records retain their DSL origin without executable callbacks',()=>{
  const use=street.catalog.uses[0];
  assert.equal(use.kind,'USE');
  assert.ok(use.sourceFile.startsWith('custom/'));
  assert.ok(Number.isSafeInteger(use.sourceLine));
  assert.equal(use.runtimeSupported,false);
  assert.equal(use.sourceMode,'raw-nonexecuting-dsl');
  assert.ok(Object.keys(use.sourceFields).length>0);
});
test('B-31 raw EVENT records are metadata, never executed by GameCore',()=>{
  assert.equal(street.catalog.events.every(x=>
    x.kind==='EVENT'&&x.runtimeSupported===false),true);
  assert.equal(street.capabilities.includes('event'),false);
  assert.equal(street.capabilities.includes('event-trigger'),false);
});
test('B-31 raw catalog deeply freezes nested DSL source metadata',()=>{
  assert.ok(Object.isFrozen(street.catalog));
  assert.ok(Object.isFrozen(street.catalog.uses));
  assert.ok(Object.isFrozen(street.catalog.uses[0].sourceFields));
  const row=Object.values(street.catalog.uses[0].sourceFields)
    .find(x=>x.length>0)?.[0];
  assert.ok(Object.isFrozen(row));
  assert.throws(()=>{row.raw='modified'},TypeError);
});
test('B-31 catalog does not promote raw DSL actions to runnable commands',()=>{
  const r=apply(world(),{
    kind:'raw-use',expectedRevision:0,sourceLine:street.catalog.uses[0].sourceLine,
  });
  assert.equal(r.code,'UNSUPPORTED_ACTION');
  assert.deepEqual(r.world,world());
});

test('B-31 world factory leaves market and events UNMODELED, not invented',()=>{
  const w=world();
  assert.equal(w.schema,MEMORY_WORLD_SCHEMA);
  assert.equal(w.revision,0);
  assert.equal(w.worldId,'b31-fixture-world');
  assert.equal(w.nowSeconds,1000000);
  assert.deepEqual(w.shops,[]);
  assert.equal(w.market,null);
  assert.equal(w.events,null);
});
test('B-31 worlds and nested initial shops are deeply immutable',()=>{
  const w=create();
  assert.ok(Object.isFrozen(w));
  assert.ok(Object.isFrozen(w.shops));
  assert.ok(Object.isFrozen(w.shops[0].item));
  assert.ok(Object.isFrozen(w.shops[0].showcase));
  assert.throws(()=>{w.shops[0].money=0},TypeError);
  assert.throws(()=>{w.shops.push(5)},TypeError);
});
test('B-31 new shop uses exact reviewed declarative model not invented grants',()=>{
  const w=create();
  const source=createStandardStreetShop(model,{
    now:1000000,id:1,name:'測試店主',shopname:'標準街記憶體測試商店',
  });
  assert.deepEqual(w.shops,[source]);
  assert.equal(w.shops[0].money,100000);
  assert.equal(1000000-w.shops[0].time,43200);
  for(const grant of model.grants)
    assert.equal(w.shops[0].item[grant.id-1],grant.count);
});
test('B-31 shop creation does not invent the wholesale market or events',()=>{
  const r=apply(world(),open());
  assert.equal(r.ok,true);
  assert.equal(r.world.market,null);
  assert.equal(r.world.events,null);
  assert.equal(r.world.revision,1);
  assert.equal(r.code,'APPLIED');
  assert.equal(r.details.action,'open-shop');
});
test('B-31 same original world remains unchanged after successful projection',()=>{
  const original=world();
  const before=encodeMemorySnapshot(original);
  const r=apply(original,open());
  assert.equal(encodeMemorySnapshot(original),before);
  assert.notEqual(r.world,original);
  assert.equal(original.revision,0);
});
test('B-31 editShowcase delegates to original reviewed Standard Street model',()=>{
  const w=create();
  const r=apply(w,shelf());
  assert.ok(r.ok,r.details?.reason);
  const expected=editShowcase(model,w.shops[0],{
    now:1000000,shelf:0,itemId:79,per:100,
  });
  assert.deepEqual(r.world.shops[0],expected);
  assert.equal(r.world.revision,2);
  assert.equal(r.details.unitPrice,expected.price[0]);
  assert.equal(r.details.displayedItemId,expected.showcase[0]);
});
test('B-31 showcase edit cannot silently mutate money, inventory or other shops',()=>{
  const w=create();
  const r=apply(w,shelf());
  assert.equal(r.world.shops[0].money,w.shops[0].money);
  assert.deepEqual(r.world.shops[0].item,w.shops[0].item);
  assert.equal(r.world.market,null);
  assert.equal(r.world.events,null);
  assert.equal(r.world.nowSeconds,1000000);
});
test('B-31 showcase clearing uses original allowed itemId zero action',()=>{
  const opened=create();
  const shown=apply(opened,shelf());
  const cleared=apply(shown.world,shelf(2,{itemId:0}));
  assert.equal(cleared.ok,true);
  assert.equal(cleared.world.shops[0].showcase[0],0);
  assert.equal(cleared.world.shops[0].price[0],0);
  assert.equal(cleared.world.revision,3);
});
test('B-31 unknown item use is denied instead of faking generic gameplay',()=>{
  const w=create();
  const x=apply(w,{kind:'use-item',expectedRevision:1,shopId:1});
  assert.equal(x.ok,false);
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
  assert.deepEqual(x.world,w);
});
test('B-31 unverified market sale is denied, not a placeholder cash change',()=>{
  const w=create();
  const x=apply(w,{kind:'sell',expectedRevision:1,shopId:1,amount:100});
  assert.equal(x.ok,false);
  assert.equal(x.code,'UNSUPPORTED_ACTION');
  assert.equal(x.world.shops[0].money,100000);
});
test('B-31 unverified periodic settlement and random event are denied',()=>{
  const w=create();
  for(const kind of ['period-settlement','event','buy','transfer','save']){
    const r=apply(w,{kind,expectedRevision:1});
    assert.equal(r.code,'UNSUPPORTED_ACTION',kind);
    assert.deepEqual(r.world,w);
  }
});
test('B-31 duplicate shop id is rejected with unchanged state',()=>{
  const w=create();
  const x=apply(w,open(1));
  assert.equal(x.ok,false);
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
  assert.deepEqual(x.world,w);
});
test('B-31 missing shop is rejected without game fallback',()=>{
  const w=create();
  const x=apply(w,{...shelf(),shopId:5});
  assert.equal(x.ok,false);
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
  assert.deepEqual(x.world,w);
});
test('B-31 off-range shelf is rejected with no money/time change',()=>{
  const w=create();
  const x=apply(w,shelf(1,{shelf:200}));
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
  assert.deepEqual(x.world,w);
});
test('B-31 unknown DSL item is rejected without inventing a price',()=>{
  const w=create();
  const x=apply(w,shelf(1,{itemId:999}));
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
  assert.deepEqual(x.world,w);
});
test('B-31 street command field whitelist rejects unknown behavior switches',()=>{
  const w=create();
  const x=apply(w,{...shelf(),skipMoney:true});
  assert.equal(x.code,'SOURCE_BOUNDARY_REJECTED');
  assert.deepEqual(x.world,w);
});
test('B-31 revision conflicts reject stale commands with no mutation',()=>{
  const w=create();
  const x=apply(w,shelf(0));
  assert.equal(x.code,'REVISION_CONFLICT');
  assert.equal(x.ok,false);
  assert.deepEqual(x.world,w);
});
test('B-31 wrong street cannot silently reuse Standard Street DSL rules',()=>{
  const w=createMemoryWorld({
    worldId:'another-world',streetId:'noodle-street',nowSeconds:1000000,
  });
  const x=apply(w,open());
  assert.equal(x.code,'STREET_MISMATCH');
  assert.deepEqual(x.world,w);
});
test('B-31 memory adapter first commit stores exact verified new shop',()=>{
  const repo=createMemoryWorldAdapter(world());
  const r=executeMemoryCommand({repository:repo,streetModule:street,command:open()});
  assert.equal(r.code,'COMMITTED');
  assert.equal(repo.read().revision,1);
  assert.deepEqual(repo.read().shops,r.world.shops);
});
test('B-31 memory adapter supports a source-backed two-command sequence',()=>{
  const repo=createMemoryWorldAdapter(world());
  const first=executeMemoryCommand({repository:repo,streetModule:street,command:open()});
  assert.equal(first.code,'COMMITTED');
  const second=executeMemoryCommand({repository:repo,streetModule:street,command:shelf()});
  assert.equal(second.code,'COMMITTED');
  assert.equal(second.world.revision,2);
  assert.equal(repo.read().shops[0].showcase[0],79);
});
test('B-31 memory adapter compares revisions and rejects stale commands',()=>{
  const repo=createMemoryWorldAdapter(world());
  executeMemoryCommand({repository:repo,streetModule:street,command:open()});
  const pre=encodeMemorySnapshot(repo.read());
  const rejected=executeMemoryCommand({
    repository:repo,streetModule:street,command:open(0),
  });
  assert.equal(rejected.code,'REVISION_CONFLICT');
  assert.equal(encodeMemorySnapshot(repo.read()),pre);
});
test('B-31 memory adapter detects two derived proposals from same revision',()=>{
  const start=world(),repo=createMemoryWorldAdapter(start);
  const a=apply(start,open());
  const b=apply(start,{...open(),shopId:2});
  assert.equal(a.ok,true);
  assert.equal(b.ok,true);
  assert.equal(repo.compareAndSwap({
    expectedRevision:0,nextWorld:a.world,
  }).code,'COMMITTED');
  assert.equal(repo.compareAndSwap({
    expectedRevision:0,nextWorld:b.world,
  }).code,'REVISION_CONFLICT');
  assert.equal(repo.read().shops[0].id,1);
});
test('B-31 memory adapter refuses wrong revision jump even with known ID',()=>{
  const repo=createMemoryWorldAdapter(world());
  const changed={...world(),revision:3};
  const r=repo.compareAndSwap({expectedRevision:0,nextWorld:changed});
  assert.equal(r.code,'INVALID_TRANSITION');
  assert.equal(repo.read().revision,0);
});
test('B-31 memory adapter refuses clock/world/street rewriting on commit',()=>{
  const repo=createMemoryWorldAdapter(world());
  const planned=apply(world(),open()).world;
  for(const invalid of [
    {...planned,worldId:'other'},
    {...planned,streetId:'noodle-street'},
    {...planned,nowSeconds:999999},
  ]){
    const r=repo.compareAndSwap({expectedRevision:0,nextWorld:invalid});
    assert.equal(r.code,'INVALID_TRANSITION');
  }
  assert.equal(repo.read().revision,0);
});
test('B-31 memory snapshots round-trip without doing any disk I/O',()=>{
  const start=world();
  const a=apply(start,open()).world;
  const b=apply(a,shelf()).world;
  const text=encodeMemorySnapshot(b);
  const round=decodeMemorySnapshot(text);
  assert.deepEqual(round,b);
  assert.ok(Object.isFrozen(round.shops[0].item));
  assert.equal(encodeMemorySnapshot(round),text);
});
test('B-31 unknown future snapshot schema is rejected, not silently migrated',()=>{
  const src={...world(),schema:'akimono.memory-world.v999'};
  assert.throws(()=>validateMemoryWorld(src),/schema mismatch/);
  assert.throws(()=>decodeMemorySnapshot(JSON.stringify(src)),/schema mismatch/);
});
test('B-31 snapshots cannot contain undefined, functions, NaN or unsafe numbers',()=>{
  const base=world();
  for(const x of [
    {...base,nowSeconds:NaN},
    {...base,revision:Number.MAX_SAFE_INTEGER+1},
    {...base,market:undefined},
    {...base,market:{run:()=>{}}},
    {...base,shops:[{id:1,item:[Infinity]}]},
  ])assert.throws(()=>validateMemoryWorld(x),/contract:/);
});
test('B-31 corrupted snapshots with extra fields/duplicates are rejected',()=>{
  assert.throws(()=>validateMemoryWorld({...world(),secret:'x'}),/unexpected world fields/);
  assert.throws(()=>validateMemoryWorld({...world(),shops:[{id:1},{id:1}]}),/duplicate shop/);
  assert.throws(()=>validateMemoryWorld({...world(),shops:'bad'}),/shops/);
  assert.throws(()=>decodeMemorySnapshot('broken'),/invalid serialized snapshot/);
});
test('B-31 rejected invalid commands do not commit anything',()=>{
  const repo=createMemoryWorldAdapter(world());
  for(const cmd of [
    {...open(),expectedRevision:-1},
    {...open(),extra:()=>{}},
    {...open(),expectedRevision:0.5},
  ]){
    assert.throws(()=>executeMemoryCommand({
      repository:repo,streetModule:street,command:cmd,
    }),/contract:/);
    assert.equal(repo.read().revision,0);
  }
});
test('B-31 street module sees immutable world and cannot partially mutate it',()=>{
  const repo=createMemoryWorldAdapter(world());
  const evil={id:'standard-street',capabilities:['open-shop'],
    apply({world:w}){w.shops.push({id:1});return {shops:w.shops,receipt:{}};}};
  const r=executeMemoryCommand({repository:repo,streetModule:evil,command:open()});
  assert.equal(r.code,'SOURCE_BOUNDARY_REJECTED');
  assert.equal(repo.read().revision,0);
  assert.deepEqual(repo.read().shops,[]);
});
test('B-31 GameCore is street-neutral: another module uses same API contract',()=>{
  const generic=createMemoryWorld({
    worldId:'test-only',streetId:'fixture-street',nowSeconds:8,
  });
  const fixtureStreet=Object.freeze({
    id:'fixture-street',capabilities:Object.freeze(['reviewed-fixture']),
    apply({world:w}){return {
      shops:[...w.shops,{id:1,fixture:true}],
      receipt:{action:'reviewed-fixture',status:'not real game behavior'},
    };},
  });
  const a=applyGameCommand({
    world:generic,streetModule:fixtureStreet,
    command:{kind:'reviewed-fixture',expectedRevision:0},
  });
  assert.equal(a.code,'APPLIED');
  assert.equal(a.world.streetId,'fixture-street');
  assert.deepEqual(a.world.shops,[{id:1,fixture:true}]);
});
test('B-31 source Module metadata never claims callbacks or events implemented',()=>{
  assert.ok(!street.capabilities.includes('lostbook'));
  assert.ok(street.capabilities.includes('use-item'));
  assert.ok(!street.capabilities.includes('event'));
  assert.ok(!street.capabilities.includes('period-settlement'));
  assert.ok(Object.isFrozen(street.capabilities));
});
test('B-31 deterministic replay with same source and commands yields exact bytes',()=>{
  function scenario(){
    const repo=createMemoryWorldAdapter(world());
    executeMemoryCommand({repository:repo,streetModule:street,command:open()});
    executeMemoryCommand({repository:repo,streetModule:street,command:shelf()});
    return encodeMemorySnapshot(repo.read());
  }
  assert.equal(scenario(),scenario());
});

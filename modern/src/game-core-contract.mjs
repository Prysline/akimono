import {MARKET_BUY_COMMAND,projectSharedMarketBuy} from './market-buy-core.mjs';
import {USE_ITEM_COMMAND,projectSharedUseItem} from './shared-use-item-core.mjs';

/**
 * GameCore/StreetModule/WorldState contract (B-31 foundation; R2-A market buy).
 * No authentication, full CGI, database, or cross-process persistence here.
 * Memory WorldState: {schema,worldId,streetId,revision,nowSeconds,shops,market,events}
 * StreetModule: {id,capabilities,apply({world,command}),marketBuy?}.
 * The shared 'market-buy' engine performs reviewed commercial math in GameCore;
 * StreetModule supplies source-backed items, pricing, callbacks and market codec.
 * Source market purchases have exactly one supported command: market-buy.
 * Source-reviewed USE executes only through shared use-item in GameCore;
 * sale and event slices still use StreetModule.apply.
 * No product-ID-shaped market-buy commands or independent buy projections.
 * GameCore knows no Standard Street ITEM IDs or DSL; R2-A/B/C have
 * separate exit evidence, while R2-D/E are still outside this shared core.
 * Actual disk-backed local save is a separate B-43 adapter.
 */
export const MEMORY_WORLD_SCHEMA='akimono.memory-world.v1';
export const PERIOD_WORLD_SCHEMA='akimono.memory-world.v2';
function reject(msg){throw new RangeError('B-31 contract: '+msg);}
function integer(v,name,min=0){
  if(!Number.isSafeInteger(v)||v<min)reject(name);
  return v;
}
function plain(x){
  return x!==null&&typeof x==='object'&&!Array.isArray(x)&&
    (Object.getPrototypeOf(x)===Object.prototype||
      Object.getPrototypeOf(x)===null);
}
function copyJson(value,label='JSON fixture'){
  const seen=new Set();
  function walk(x,depth,path=''){
    if(depth>32)reject(label+' depth');
    if(x===null||typeof x==='string'||typeof x==='boolean')return x;
    if(typeof x==='number'){
      if(!Number.isFinite(x)||(!Number.isSafeInteger(x)&&
        !(label==='WorldState'&&/^shops\[\d+\]\.costtoday$/.test(path))))
        reject(label+' non-safe JSON number');
      return x;
    }
    if(typeof x!=='object')reject(label+' non-JSON value');
    if(seen.has(x))reject(label+' cyclic reference');
    seen.add(x);
    let out;
    if(Array.isArray(x)){
      if(x.length>10000)reject(label+' oversize array');
      out=x.map((row,i)=>walk(row,depth+1,path+'['+i+']'));
    }else if(plain(x)){
      const keys=Object.keys(x);
      if(keys.length>1000)reject(label+' oversize record');
      out={};
      for(const key of keys){
        if(key==='__proto__'||key==='constructor'||key==='prototype')
          reject(label+' unsafe key');
        out[key]=walk(x[key],depth+1,path?path+'.'+key:key);
      }
    }else reject(label+' non-plain object');
    seen.delete(x);
    return out;
  }
  return walk(value,0);
}
function freeze(v){
  if(v&&typeof v==='object'&&!Object.isFrozen(v)){
    for(const x of Object.values(v))freeze(x);
    Object.freeze(v);
  }
  return v;
}
function snapshot(world){
  const w=copyJson(world,'WorldState');
  if(!plain(w))reject('world record');
  const periodWorld=w.schema===PERIOD_WORLD_SCHEMA;
  if(!periodWorld&&w.schema!==MEMORY_WORLD_SCHEMA)
    reject('schema mismatch');
  const required=['schema','worldId','streetId','revision',
    'nowSeconds','shops','market','events',
    ...(periodWorld?['period']:[])];
  if(Object.keys(w).length!==required.length||
     required.some(k=>!Object.hasOwn(w,k)))
    reject('unexpected world fields');
  if(typeof w.worldId!=='string'||!w.worldId||w.worldId.length>100)
    reject('worldId');
  if(typeof w.streetId!=='string'||!w.streetId||w.streetId.length>100)
    reject('streetId');
  integer(w.revision,'revision');
  integer(w.nowSeconds,'nowSeconds');
  if(!Array.isArray(w.shops)||w.shops.length>100)reject('shops');
  const ids=new Set();
  for(const shop of w.shops){
    if(!plain(shop))reject('shop record');
    const id=integer(shop.id,'shop id',1);
    if(ids.has(id))reject('duplicate shop id');
    ids.add(id);
  }
  if(w.market!==null&&!plain(w.market))reject('market');
  if(w.events!==null&&!plain(w.events))reject('events');
  // GameCore only owns the opaque JSON period envelope. The trusted
  // StreetModule/local store MUST validate source-specific city semantics.
  if(periodWorld&&!plain(w.period))reject('period record');
  return freeze(w);
}
export function createMemoryWorld({worldId,streetId,nowSeconds}){
  return snapshot({
    schema:MEMORY_WORLD_SCHEMA,worldId,streetId,revision:0,
    nowSeconds,shops:[],market:null,events:null,
  });
}
/** Opt-in source-reviewed period envelope; existing v1 games remain intact. */
export function createPeriodMemoryWorld({worldId,streetId,nowSeconds,period}){
  return snapshot({
    schema:PERIOD_WORLD_SCHEMA,worldId,streetId,
    revision:0,nowSeconds,shops:[],market:null,events:null,period,
  });
}
export function validateMemoryWorld(world){return snapshot(world);}
export function encodeMemorySnapshot(world){return JSON.stringify(snapshot(world));}
export function decodeMemorySnapshot(text){
  if(typeof text!=='string'||text.length>2_000_000)reject('serialized snapshot');
  let parsed;
  try{parsed=JSON.parse(text);}catch{reject('invalid serialized snapshot');}
  return snapshot(parsed);
}
function answer(ok,code,world,details=null){return freeze({ok,code,world,details});}
/**
 * On all rejected street actions, the original state stays untouched.
 * No implicit fallback is allowed for unsupported callbacks or events.
 * This is NOT a security boundary: street code itself is trusted.
 */
export function applyGameCommand({world,command,streetModule}){
  const original=snapshot(world);
  if(!plain(command))reject('command object');
  const cmd=freeze(copyJson(command,'command'));
  if(typeof cmd.kind!=='string'||!cmd.kind||cmd.kind.length>100)
    reject('command kind');
  integer(cmd.expectedRevision,'expectedRevision');
  if(!streetModule||typeof streetModule.id!=='string'||
     !Array.isArray(streetModule.capabilities)||
     typeof streetModule.apply!=='function')reject('StreetModule interface');
  if(streetModule.id!==original.streetId)
    return answer(false,'STREET_MISMATCH',original);
  if(cmd.expectedRevision!==original.revision)
    return answer(false,'REVISION_CONFLICT',original);
  if(!streetModule.capabilities.includes(cmd.kind))
    return answer(false,'UNSUPPORTED_ACTION',original);
  let applied;
  try{
    // Common commerce rules execute in GameCore, not StreetModule.apply.
    // StreetModule only supplies source-reviewed item rules and wire hooks.
    applied=cmd.kind===MARKET_BUY_COMMAND?
      projectSharedMarketBuy({world:original,command:cmd,
        marketBuy:streetModule.marketBuy}):
      cmd.kind===USE_ITEM_COMMAND?
        projectSharedUseItem({world:original,command:cmd,
          useItem:streetModule.useItem}):
        streetModule.apply({world:original,command:cmd});
  }catch(error){
    return answer(false,'SOURCE_BOUNDARY_REJECTED',original,{
      reason:error instanceof Error?error.message:'rejected by street',
    });
  }
  if(!plain(applied)||!Array.isArray(applied.shops)||
     !plain(applied.receipt))reject('street result shape');
  // R4 source-only projectors must not be accidentally repackaged as a
  // GameCore action. Explicitly noncommittable effects cannot increment
  // revision even when a trusted StreetModule returns a plausible shop.
  if(applied.nonCommittable===true||applied.committable===false||
     applied.receipt.nonCommittable===true||
     applied.receipt.committable===false)
    return answer(false,'SOURCE_BOUNDARY_REJECTED',original,{
      reason:'noncommittable source projection cannot enter GameCore CAS',
    });
  // Optional trusted street finalizer includes ordinary shared buy/USE in
  // the same persistence projection. The noncommittable guard above stays first.
  if(typeof streetModule.finalizeReviewedTransition==='function'){
    try{applied=streetModule.finalizeReviewedTransition({before:original,command:cmd,applied});}
    catch(error){return answer(false,'SOURCE_BOUNDARY_REJECTED',original,{reason:error.message});}
    if(!plain(applied)||!Array.isArray(applied.shops)||!plain(applied.receipt)||applied.nonCommittable===true||applied.committable===false||applied.receipt.nonCommittable===true||applied.receipt.committable===false)
      reject('invalid reviewed finalizer result');
  }
  if(original.schema===MEMORY_WORLD_SCHEMA&&Object.hasOwn(applied,'period'))
    reject('legacy world cannot silently acquire unvalidated period state');
  const after=snapshot({
    ...original,shops:applied.shops,
    market:applied.market===undefined?original.market:applied.market,
    events:applied.events===undefined?original.events:applied.events,
    ...(original.schema===PERIOD_WORLD_SCHEMA?{
      period:applied.period===undefined?original.period:applied.period,
    }:{}),
    nowSeconds:applied.nowSeconds===undefined?original.nowSeconds:applied.nowSeconds,
    revision:original.revision+1,
  });
  // A v2 time/period mutation is not yet a source-reviewed settlement.
  // GameCore owns the generic transactional boundary; the StreetModule
  // must independently review the source-specific period transition.
  // Missing reviewer, refused review or source drift all abort BEFORE
  // the memory adapter sees a proposed CAS revision.
  if(original.schema===PERIOD_WORLD_SCHEMA&&(
    original.nowSeconds!==after.nowSeconds||
    JSON.stringify(original.period)!==JSON.stringify(after.period)
  )){
    try{
      if(typeof streetModule.reviewPeriodTransition!=='function'||
         streetModule.reviewPeriodTransition({
           before:original,after,command:cmd,
         })!==true)
        reject('source-reviewed v2 period transition permission missing');
    }catch(error){
      return answer(false,'SOURCE_BOUNDARY_REJECTED',original,{
        reason:error instanceof Error?error.message:
          'period transition rejected by source reviewer',
      });
    }
  }
  return answer(true,'APPLIED',after,freeze(copyJson(applied.receipt,'receipt')));
}
/**
 * Memory CAS boundary. Real local/server persistence, locks, authorization,
 * crash recovery and concurrent processes are NOT implemented by this adapter.
 */
export function createMemoryWorldAdapter(initialWorld,{
  reviewPeriodTransition=null,
}={}){
  if(reviewPeriodTransition!==null&&
     typeof reviewPeriodTransition!=='function')
    reject('source period CAS reviewer must be a function');
  let current=snapshot(initialWorld);
  return Object.freeze({
    read(){return snapshot(current);},
    compareAndSwap({expectedRevision,nextWorld,advanceSeconds=0,command=null}){
      integer(expectedRevision,'adapter revision');
      integer(advanceSeconds,'source-authorized time advance');
      if(current.revision!==expectedRevision)
        return answer(false,'REVISION_CONFLICT',snapshot(current));
      const proposed=snapshot(nextWorld);
      if(proposed.worldId!==current.worldId||
         proposed.streetId!==current.streetId||
         proposed.schema!==current.schema||
         !Number.isSafeInteger(current.nowSeconds+advanceSeconds)||
         proposed.nowSeconds!==current.nowSeconds+advanceSeconds||
         proposed.revision!==current.revision+1)
        return answer(false,'INVALID_TRANSITION',snapshot(current));
      // The ordinary memory adapter remains source-neutral. The opt-in
      // source-guarded variant calls the SAME Standard Street reviewer
      // inside compareAndSwap, so direct callers cannot skip the v2 gate.
      // Do not use the command's potentially untrusted StreetModule here.
      if(current.schema===PERIOD_WORLD_SCHEMA&&
         reviewPeriodTransition!==null){
        try{
          if(reviewPeriodTransition({before:current,after:proposed,command})!==true)
            reject('source-reviewed v2 period CAS transition missing');
        }catch(error){
          return answer(false,'SOURCE_BOUNDARY_REJECTED',snapshot(current),{
            reason:error instanceof Error?error.message:
              'source CAS period transition rejected',
          });
        }
      }
      current=proposed;
      return answer(true,'COMMITTED',snapshot(current));
    },
  });
}
/**
 * R4 local Standard Street v2 repository: source approval is required both
 * for normal GameCore commands AND direct compareAndSwap callers.
 * The generic adapter above remains unchanged for old v1 and pure tests.
 * This adapter is local/in-memory, not a distributed transaction manager.
 */
export function createSourceReviewedMemoryWorldAdapter({
  initialWorld,streetModule,
}){
  const initial=snapshot(initialWorld);
  if(initial.schema!==PERIOD_WORLD_SCHEMA||
     streetModule?.id!==initial.streetId||
     typeof streetModule.reviewPeriodTransition!=='function')
    reject('source-reviewed v2 WorldState adapter and street required');
  // Also check the loaded initial period. B43 validates disk snapshots,
  // but direct callers of this exported factory must not begin with a
  // fabricated settled period/city and only discover it at a later CAS.
  if(initial.revision===Number.MAX_SAFE_INTEGER)
    reject('source-reviewed v2 initial revision exhausted');
  try{
    if(streetModule.reviewPeriodTransition({
      before:initial,
      after:{...initial,revision:initial.revision+1},initial:true,
    })!==true)
      reject('source-reviewed v2 initial world approval missing');
  }catch(error){
    reject('source-reviewed v2 initial world invalid: '+
      (error instanceof Error?error.message:'source reviewer rejected'));
  }
  return createMemoryWorldAdapter(initial,{
    reviewPeriodTransition:({before,after,command})=>
      streetModule.reviewPeriodTransition({before,after,command}),
  });
}
export function executeMemoryCommand({repository,streetModule,command}){
  if(!repository||typeof repository.read!=='function'||
     typeof repository.compareAndSwap!=='function')
    reject('WorldState adapter interface');
  const proposed=applyGameCommand({world:repository.read(),command,streetModule});
  if(!proposed.ok)return proposed;
  const committed=repository.compareAndSwap({
    expectedRevision:command.expectedRevision,nextWorld:proposed.world,command,
    advanceSeconds:['advance-source-time',
      'advance-source-time-reviewed-events','advance-reviewed-world-time'].includes(command.kind)?
      command.minutes*60:0,
  });
  if(!committed.ok)return committed;
  return answer(true,'COMMITTED',committed.world,proposed.details);
}

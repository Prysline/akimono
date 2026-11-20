/**
 * B-31: pure GameCore/StreetModule/WorldState contract for REVIEWED source
 * projections only. No actual authentication, database, CGI or storage.
 *
 * WorldState: {schema,worldId,streetId,revision,nowSeconds,shops,market,events}
 * Unknown market/events are NULL; never invent game state.
 * StreetModule: {id,capabilities,apply({world,command})}.
 * Command: {kind,expectedRevision,...street-specific arguments}.
 * GameCore never knows specific items, prices, DSL, or rules.
 */
export const MEMORY_WORLD_SCHEMA='akimono.memory-world.v1';
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
  function walk(x,depth){
    if(depth>32)reject(label+' depth');
    if(x===null||typeof x==='string'||typeof x==='boolean')return x;
    if(typeof x==='number'){
      if(!Number.isSafeInteger(x))reject(label+' non-safe JSON number');
      return x;
    }
    if(typeof x!=='object')reject(label+' non-JSON value');
    if(seen.has(x))reject(label+' cyclic reference');
    seen.add(x);
    let out;
    if(Array.isArray(x)){
      if(x.length>10000)reject(label+' oversize array');
      out=x.map(row=>walk(row,depth+1));
    }else if(plain(x)){
      const keys=Object.keys(x);
      if(keys.length>1000)reject(label+' oversize record');
      out={};
      for(const key of keys){
        if(key==='__proto__'||key==='constructor'||key==='prototype')
          reject(label+' unsafe key');
        out[key]=walk(x[key],depth+1);
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
  if(!plain(w)||Object.keys(w).length!==8||
    !['schema','worldId','streetId','revision','nowSeconds','shops','market','events']
      .every(k=>Object.hasOwn(w,k)))reject('unexpected world fields');
  if(w.schema!==MEMORY_WORLD_SCHEMA)reject('schema mismatch');
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
  return freeze(w);
}
export function createMemoryWorld({worldId,streetId,nowSeconds}){
  return snapshot({
    schema:MEMORY_WORLD_SCHEMA,worldId,streetId,revision:0,
    nowSeconds,shops:[],market:null,events:null,
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
  try{applied=streetModule.apply({world:original,command:cmd});}
  catch(error){
    return answer(false,'SOURCE_BOUNDARY_REJECTED',original,{
      reason:error instanceof Error?error.message:'rejected by street',
    });
  }
  if(!plain(applied)||!Array.isArray(applied.shops)||
     !plain(applied.receipt))reject('street result shape');
  const after=snapshot({
    ...original,shops:applied.shops,
    market:applied.market===undefined?original.market:applied.market,
    events:applied.events===undefined?original.events:applied.events,
    revision:original.revision+1,
  });
  return answer(true,'APPLIED',after,freeze(copyJson(applied.receipt,'receipt')));
}
/**
 * Memory CAS boundary. Real local/server persistence, locks, authorization,
 * crash recovery and concurrent processes are NOT implemented by this adapter.
 */
export function createMemoryWorldAdapter(initialWorld){
  let current=snapshot(initialWorld);
  return Object.freeze({
    read(){return snapshot(current);},
    compareAndSwap({expectedRevision,nextWorld}){
      integer(expectedRevision,'adapter revision');
      if(current.revision!==expectedRevision)
        return answer(false,'REVISION_CONFLICT',snapshot(current));
      const proposed=snapshot(nextWorld);
      if(proposed.worldId!==current.worldId||
         proposed.streetId!==current.streetId||
         proposed.nowSeconds!==current.nowSeconds||
         proposed.revision!==current.revision+1)
        return answer(false,'INVALID_TRANSITION',snapshot(current));
      current=proposed;
      return answer(true,'COMMITTED',snapshot(current));
    },
  });
}
export function executeMemoryCommand({repository,streetModule,command}){
  if(!repository||typeof repository.read!=='function'||
     typeof repository.compareAndSwap!=='function')
    reject('WorldState adapter interface');
  const proposed=applyGameCommand({world:repository.read(),command,streetModule});
  if(!proposed.ok)return proposed;
  const committed=repository.compareAndSwap({
    expectedRevision:command.expectedRevision,nextWorld:proposed.world,
  });
  if(!committed.ok)return committed;
  return answer(true,'COMMITTED',committed.world,proposed.details);
}

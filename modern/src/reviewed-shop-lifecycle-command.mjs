// LC-D1 preflight only: no session issuer, game mutation, CAS or publication.
import {validateMemoryWorld,encodeMemorySnapshot,PERIOD_WORLD_SCHEMA} from './game-core-contract.mjs';
import {reviewShopLifecycleSources,projectShopLifecycleSource} from './original-r4-shop-lifecycle-source.mjs';

const confirmations=Object.freeze({'restart-shop':'restart','close-shop':'closeshop'});
const refuse=reason=>{throw new RangeError('LC-D1 preflight: '+reason);};
function exactRecord(value,keys){
  if(value===null||typeof value!=='object'||Array.isArray(value)||
     ![Object.prototype,null].includes(Object.getPrototypeOf(value)))return false;
  const own=Reflect.ownKeys(value);
  return own.length===keys.length&&keys.every(key=>{
    const d=Object.getOwnPropertyDescriptor(value,key);
    return d&&Object.hasOwn(d,'value')&&d.enumerable;
  });
}
function validId(x){return typeof x==='string'&&x.length>0&&x.length<=100;}
function snapshot(readWorld){
  const world=validateMemoryWorld(readWorld());
  if(world.schema!==PERIOD_WORLD_SCHEMA)refuse('reviewed v2 world required');
  return world;
}
/**
 * Trusted server dependencies only. Resolver must authenticate the request
 * against the supplied immutable world and return a sanitized binding, not
 * request-body fields or credentials. No session implementation is provided.
 * A returned candidate is never an authorization token or executable command.
 * Future publication must reauthenticate/recheck the same owner and CAS.
 */
export function createLifecycleCommandPreflight(dependencies){
  return createLifecyclePreparation(dependencies);
}
function createLifecyclePreparation({readWorld,resolveAuthenticatedActor}={},plan){
  if(typeof readWorld!=='function'||typeof resolveAuthenticatedActor!=='function')
    refuse('trusted world reader and actor resolver required');
  return async function prepare({kind,body,request}){
    if(!Object.hasOwn(confirmations,kind)||typeof kind!=='string')
      refuse('unsupported lifecycle kind');
    if(!exactRecord(body,['expectedRevision','confirmation']))
      refuse('exact request fields required');
    const {expectedRevision,confirmation}=body;
    if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0||
       expectedRevision===Number.MAX_SAFE_INTEGER)
      refuse('invalid revision');
    if(confirmation!==confirmations[kind])refuse('confirmation mismatch');
    const before=snapshot(readWorld);
    if(before.revision!==expectedRevision)refuse('revision conflict');
    let actor;
    try{actor=await resolveAuthenticatedActor({request,world:before});}
    catch{refuse('authenticated owner required');}
    if(!exactRecord(actor,['worldId','streetId','shopId','ownerName','revision'])||
       !validId(actor.worldId)||!validId(actor.streetId)||
       typeof actor.ownerName!=='string'||actor.ownerName.length===0||
       !Number.isSafeInteger(actor.shopId)||actor.shopId<=0||
       actor.worldId!==before.worldId||actor.streetId!==before.streetId||
       actor.revision!==before.revision)
      refuse('authenticated owner binding required');
    const current=snapshot(readWorld);
    if(encodeMemorySnapshot(current)!==encodeMemorySnapshot(before))
      refuse('world changed during authorization');
    const shop=current.shops.find(row=>row.id===actor.shopId);
    if(!shop||shop.status!==1||shop.name!==actor.ownerName)
      refuse('current active owner required');
    const prepared=Object.freeze({
      committable:false,worldStateWritten:false,
      expectedRevision,now:current.nowSeconds,
      actorRef:Object.freeze({worldId:current.worldId,street:current.streetId,
        shopId:shop.id,ownerName:shop.name}),
      command:Object.freeze({kind,confirmation}),
    });
    if(!plan)return prepared;
    const candidate=plan({prepared,current,shop});
    if(encodeMemorySnapshot(snapshot(readWorld))!==encodeMemorySnapshot(current))
      refuse('world changed during source planning');
    return candidate;
  };
}

// LC-D1 source planning uses only the same current authenticated world.
// Internal planning evidence, never a public response or CAS authorization.
// readSubdataNames is a trusted synchronous scoped inventory reader; no body
// fields, paths, source snapshot, credentials or mutation callbacks are accepted.
function deepFreeze(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    for(const v of Object.values(value))deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}
export function createLifecycleSourcePlanner({readWorld,resolveAuthenticatedActor,sourceTexts,readSubdataNames}={}){
  if(typeof readSubdataNames!=='function')refuse('trusted subdata reader required');
  const review=reviewShopLifecycleSources(sourceTexts);
  return createLifecyclePreparation({readWorld,resolveAuthenticatedActor},({prepared,current,shop})=>{
    const {actorRef,command,expectedRevision,now}=prepared;
    const target={id:shop.id,status:shop.status,name:shop.name,
      shopname:shop.shopname,foundation:shop.foundation};
    if(command.kind==='close-shop')target.remoteaddr=shop.remoteaddr;
    // Other shops are represented only by IDs, sufficient for source identity
    // uniqueness; no passwords, session tokens or unrelated shop data cross.
    const sourceSnapshot={worldId:current.worldId,street:current.streetId,
      revision:current.revision,shops:current.shops.map(row=>row.id===shop.id?target:{id:row.id})};
    const names=readSubdataNames(actorRef);
    const effect=projectShopLifecycleSource({review,snapshot:sourceSnapshot,
      actorRef,command,expectedRevision,now,subdataNames:names});
    return deepFreeze({prepared,effect,committable:false,worldStateWritten:false});
  });
}

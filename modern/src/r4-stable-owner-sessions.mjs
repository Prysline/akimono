/** LC-D1 server-private sessions. Does not create account records or a save
 * authority. Issuance requires the owning server's verified login result;
 * never pass client-selected identity or a permissive verifier.
 * Registration must guarantee monotonic shop IDs in the same world/street.
 */
import {createHash,randomBytes} from 'node:crypto';
import {validateMemoryWorld,encodeMemorySnapshot,PERIOD_WORLD_SCHEMA} from './game-core-contract.mjs';
const fail=m=>{throw new RangeError('R4 owner session: '+m)};
const blob=s=>typeof s==='string'?createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex'):null;
const digest=s=>createHash('sha256').update(s).digest('hex');
const keys=['worldId','streetId','shopId','ownerName','revision'];
const exactBinding=x=>x&&Object.getPrototypeOf(x)===Object.prototype&&
  Reflect.ownKeys(x).length===keys.length&&keys.every(k=>{
    const p=Object.getOwnPropertyDescriptor(x,k);return p&&Object.hasOwn(p,'value')&&p.enumerable;
  });
const stable=b=>JSON.stringify([b.worldId,b.streetId,b.shopId,b.ownerName]);
const tokenPattern=/^[a-f0-9]{64}$/;
export function createStableOwnerSessions({configSource,readSource,loginSource,readWorld,authenticateOwner,readSessionToken,clock=()=>Math.floor(Date.now()/1000)}={}){
  if(blob(configSource)!=='87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0'||
    blob(readSource)!=='e7a8add7b0291901e71fe797783b664dff1568a0'||
    blob(loginSource)!=='1e5963c52a4ca82d75922b5a1ca3b3db14fef436'||
    !/\$SESSION_TIMEOUT_TIME\s*=\s*3600;/.test(configSource))fail('session source drift');
  if([readWorld,authenticateOwner,readSessionToken,clock].some(fn=>typeof fn!=='function'))fail('trusted server dependencies required');
  const timeout=3600,byHash=new Map(),byOwner=new Map();
  function now(){const n=clock();if(!Number.isSafeInteger(n)||n<1)fail('server clock');return n;}
  function snapshot(){
    const w=validateMemoryWorld(readWorld());if(w.schema!==PERIOD_WORLD_SCHEMA)fail('v2 world required');return w;
  }
  function active(world,b){
    return b.worldId===world.worldId&&b.streetId===world.streetId&&
      world.shops.some(s=>s.id===b.shopId&&s.name===b.ownerName&&s.status===1);
  }
  function remove(hash){
    const old=byHash.get(hash);if(!old)return;
    byHash.delete(hash);if(byOwner.get(old.key)===hash)byOwner.delete(old.key);
  }
  function sweep(world,t){
    for(const [hash,session] of byHash)
      if(!active(world,session.binding)||session.lastSeen<t-timeout)remove(hash);
  }
  async function issue(request){
    const before=snapshot();let b;
    try{b=await authenticateOwner({request,world:before});}catch{fail('login denied');}
    const current=snapshot();
    if(!exactBinding(b)||b.revision!==current.revision||!active(current,b)||
      encodeMemorySnapshot(current)!==encodeMemorySnapshot(before))fail('login denied');
    const t=now();sweep(current,t);
    const binding=Object.freeze(Object.fromEntries(keys.slice(0,-1).map(k=>[k,b[k]])));
    const key=stable(binding);
    // The original replaces the owner's session file on fresh login.
    remove(byOwner.get(key));
    const token=randomBytes(32).toString('hex'),hash=digest(token);
    byHash.set(hash,{key,binding,lastSeen:t});byOwner.set(key,hash);
    // Token is returned only to the trusted login handler for a private cookie.
    return Object.freeze({token});
  }
  function resolveAuthenticatedActor({request,world}){
    const current=snapshot(),t=now();sweep(current,t);
    if(encodeMemorySnapshot(current)!==encodeMemorySnapshot(world))fail('current world required');
    let token;try{token=readSessionToken(request);}catch{fail('session denied');}
    if(typeof token!=='string'||!tokenPattern.test(token))fail('session denied');
    const row=byHash.get(digest(token));
    if(!row||!active(current,row.binding))fail('session denied');
    row.lastSeen=Math.max(row.lastSeen,t);
    return Object.freeze({...row.binding,revision:current.revision});
  }
  // Call after the authoritative CAS only; not a file/session deletion
  // publisher. Restart keeps stable ID; close removes it; a new ID cannot
  // inherit a name-keyed token. No secret appears in gameplay history.
  function reconcileCommittedWorld(){const current=snapshot();sweep(current,now());}
  function revoke(request){
    let token;try{token=readSessionToken(request);}catch{return false;}
    if(typeof token!=='string'||!tokenPattern.test(token))return false;
    const hash=digest(token),present=byHash.has(hash);remove(hash);return present;
  }
  return Object.freeze({issue,resolveAuthenticatedActor,reconcileCommittedWorld,revoke});
}

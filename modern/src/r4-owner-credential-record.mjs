/** Server-private credential record codec for the single future v2 authority.
 * No account database, file writes, registration admission or session issuer.
 * A trusted lookup must read the credential record from the same committed
 * world/identity generation. Do not publish this record to gameplay/history.
 */
import {randomBytes,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {validateMemoryWorld,encodeMemorySnapshot,PERIOD_WORLD_SCHEMA} from './game-core-contract.mjs';
const derive=promisify(scrypt),schema='r4-owner-scrypt.v2';
const options=Object.freeze({N:131072,r:8,p:1,maxmem:192*1024*1024});
const fail=()=>{throw new RangeError('R4 owner credential: invalid registration credential')};
const bindingKeys=['worldId','streetId','shopId','ownerName'];
function exact(x,keys){
  return x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype&&
    Reflect.ownKeys(x).length===keys.length&&keys.every(k=>{
      const d=Object.getOwnPropertyDescriptor(x,k);return d&&Object.hasOwn(d,'value')&&d.enumerable;
    });
}
const bounded=s=>typeof s==='string'&&s.length>0&&s.length<=100&&!/[\0\r\n\t]/.test(s);
const validBinding=b=>exact(b,bindingKeys)&&bounded(b.worldId)&&bounded(b.streetId)&&bounded(b.ownerName)&&
  Number.isSafeInteger(b.shopId)&&b.shopId>0;
// Only registration uses Perl's false-scalar gate. repass accepts '0'.
const passwordShape=p=>typeof p==='string'&&p.length>=1&&p.length<=12&&!/[^A-Za-z0-9_-]/.test(p);
const registrationPassword=p=>passwordShape(p)&&p!=='0';
const hex32=s=>typeof s==='string'&&s.length===64&&!/[^a-f0-9]/.test(s);
const hex16=s=>typeof s==='string'&&s.length===32&&!/[^a-f0-9]/.test(s);
const bindingText=b=>JSON.stringify(bindingKeys.map(k=>b[k]));
const stableText=b=>JSON.stringify([b.worldId,b.streetId,b.shopId]);
const validRecord=r=>exact(r,['schema','binding','salt','hash'])&&r.schema===schema&&
  validBinding(r.binding)&&hex16(r.salt)&&hex32(r.hash);
const copyBinding=b=>Object.freeze(Object.fromEntries(bindingKeys.map(k=>[k,b[k]])));
const copyRecord=r=>Object.freeze({schema,binding:copyBinding(r.binding),salt:r.salt,hash:r.hash});
function saltFor(b,salt){
  // Bind the verifier to the stable identity, not name or row index alone.
  return Buffer.concat([Buffer.from(schema+'\0'+stableText(b)+'\0','utf8'),Buffer.from(salt,'hex')]);
}
const sourcePin=s=>typeof s==='string'&&createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')==='9f0a590a6f1d4e93d2534056a0dc96c4d5c80ba7';
const membershipPin=s=>typeof s==='string'&&createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')==='8e817c535d4cd17e68d65f0e2f67846a344b5094';
async function deriveRecord(binding,password){
  const copied=copyBinding(binding);
  const salt=randomBytes(16).toString('hex');
  const hash=(await derive(password,saltFor(copied,salt),32,options)).toString('hex');
  return Object.freeze({schema,binding:copied,salt,hash});
}
export async function createOwnerCredentialRecord({newSource,binding,password}={}){
  // Source password alphabet/length and distinct name are registration rules;
  // scrypt and stable identity binding are modern private security measures.
  if(!sourcePin(newSource)||!validBinding(binding)||!registrationPassword(password)||password===binding.ownerName)fail();
  return deriveRecord(binding,password);
}
/** Private successor only: caller must authorize the source rename, validate
 * both worlds and commit the new metadata with the world under the same CAS.
 * No admission, fee, alias publication or session mutation occurs here. */
export function rebindOwnerCredentialForRename({membershipSource,record,binding,nextBinding}={}){
  if(!membershipPin(membershipSource)||!validRecord(record)||!validBinding(binding)||!validBinding(nextBinding)||
    bindingText(record.binding)!==bindingText(binding)||stableText(binding)!==stableText(nextBinding)||
    binding.ownerName===nextBinding.ownerName)fail();
  return copyRecord({...record,binding:nextBinding});
}
/** Private successor only: authenticated repass (not registration).
 * Publish with a new world revision and revoke the owner's session after CAS.
 * The caller must enforce authorization and never log submitted secrets. */
export async function changeOwnerCredentialPassword({membershipSource,record,binding,password,confirmation}={}){
  if(!membershipPin(membershipSource)||!validRecord(record)||!validBinding(binding)||
    bindingText(record.binding)!==bindingText(binding)||!passwordShape(password)||password!==confirmation)fail();
  return deriveRecord(binding,password);
}
export async function verifyOwnerCredential({record,binding,password}={}){
  if(!validBinding(binding)||!passwordShape(password)||!validRecord(record)||
    bindingText(record.binding)!==bindingText(binding))return false;
  const salt=record.salt,expected=Buffer.from(record.hash,'hex');
  const actual=await derive(password,saltFor(binding,salt),32,options);
  return timingSafeEqual(actual,expected);
}
/** Adapter for existing createStableOwnerSessions.authenticateOwner.
 * The caller owns the committed credential reader, not this adapter.
 * readCredentials returns only the submitted login name/password.
 */
export function createCredentialOwnerAuthenticator({readCredentialRecord,readCredentials}={}){
  if(typeof readCredentialRecord!=='function'||typeof readCredentials!=='function')
    throw new TypeError('R4 owner credential: trusted readers required');
  return async function authenticateOwner({request,world}){
    const submitted=readCredentials(request);
    if(!exact(submitted,['ownerName','password'])||!bounded(submitted.ownerName)||!passwordShape(submitted.password))return null;
    const {ownerName,password}=submitted;
    const active=world.shops.filter(s=>s.status===1&&s.name===ownerName);
    if(active.length!==1)return null;
    const binding={worldId:world.worldId,streetId:world.streetId,shopId:active[0].id,ownerName:active[0].name};
    if(!validBinding(binding))return null;
    const record=await readCredentialRecord({binding:Object.freeze(binding),world});
    if(!await verifyOwnerCredential({record,binding,password}))return null;
    return Object.freeze({...binding,revision:world.revision});
  };
}

/** Validate the private records of an account-enabled committed v2 world.
 * This is a pure codec, NOT a repository, admission check, or write authority.
 * The caller must own the single authenticated snapshot/CAS/save publisher.
 * Legacy local worlds without credentials do not silently acquire accounts.
 * The returned records are private; never put them in WorldState, receipts,
 * history, logs, or a public API response.
 */
export function validateCommittedOwnerCredentials({world,records}={}){
  const w=validateMemoryWorld(world);
  if(w.schema!==PERIOD_WORLD_SCHEMA||!bounded(w.worldId)||!bounded(w.streetId)||
    !Array.isArray(records)||records.length!==w.shops.length)
    fail();
  const byId=new Map(),names=new Set();
  for(const shop of w.shops){
    const b={worldId:w.worldId,streetId:w.streetId,shopId:shop.id,ownerName:shop.name};
    if(shop.status!==1||!validBinding(b)||names.has(shop.name)||
      (Object.hasOwn(shop,'pass')&&shop.pass!==''))fail();
    byId.set(shop.id,b);names.add(shop.name);
  }
  const seen=new Set(),result=[];
  for(const r of records){
    if(!validRecord(r))fail();
    const id=r.binding.shopId,b=byId.get(id);
    if(!b||seen.has(id)||bindingText(r.binding)!==bindingText(b))fail();
    seen.add(id);result.push(copyRecord(r));
  }
  return Object.freeze(result.sort((a,b)=>a.binding.shopId-b.binding.shopId));
}
/** Adapter for createCredentialOwnerAuthenticator, reading the world and
 * private records TOGETHER from the trusted committed publisher, never from
 * independently sampled stores or a client body. Compare the complete world,
 * not just its revision. No cache, file IO, credential mutation or CAS here.
 * The publisher must change the world revision with any credential transition;
 * a separate credential-only write would violate this contract.
 */
export function createCommittedOwnerCredentialReader({readCommittedSnapshot}={}){
  if(typeof readCommittedSnapshot!=='function')
    throw new TypeError('R4 owner credential: trusted committed reader required');
  return function readCredentialRecord({binding,world}={}){
    if(!validBinding(binding))return null;
    const committed=readCommittedSnapshot();
    if(!exact(committed,['world','ownerCredentials']))fail();
    const current=validateMemoryWorld(committed.world);
    if(encodeMemorySnapshot(current)!==encodeMemorySnapshot(world))return null;
    const records=validateCommittedOwnerCredentials({world:current,records:committed.ownerCredentials});
    return records.find(r=>bindingText(r.binding)===bindingText(binding))??null;
  };
}

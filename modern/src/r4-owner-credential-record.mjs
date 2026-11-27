/** Server-private credential record codec for the single future v2 authority.
 * No account database, file writes, registration admission or session issuer.
 * A trusted lookup must read the credential record from the same committed
 * world/identity generation. Do not publish this record to gameplay/history.
 */
import {randomBytes,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt),schema='r4-owner-scrypt.v1';
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
const passwordShape=p=>typeof p==='string'&&/^[A-Za-z0-9_-]{1,12}$/.test(p);
const hex32=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const hex16=s=>typeof s==='string'&&/^[a-f0-9]{32}$/.test(s);
const bindingText=b=>JSON.stringify(bindingKeys.map(k=>b[k]));
function saltFor(b,salt){
  // Bind the verifier to the stable identity, not name or row index alone.
  return Buffer.concat([Buffer.from(schema+'\0'+bindingText(b)+'\0','utf8'),Buffer.from(salt,'hex')]);
}
const sourcePin=s=>typeof s==='string'&&createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')==='9f0a590a6f1d4e93d2534056a0dc96c4d5c80ba7';
export async function createOwnerCredentialRecord({newSource,binding,password}={}){
  // Source password alphabet/length and distinct name are registration rules;
  // scrypt and stable identity binding are modern private security measures.
  if(!sourcePin(newSource)||!validBinding(binding)||!passwordShape(password)||password===binding.ownerName)fail();
  const copied=Object.freeze(Object.fromEntries(bindingKeys.map(k=>[k,binding[k]])));
  const salt=randomBytes(16).toString('hex');
  const hash=(await derive(password,saltFor(copied,salt),32,options)).toString('hex');
  return Object.freeze({schema,binding:copied,salt,hash});
}
export async function verifyOwnerCredential({record,binding,password}={}){
  if(!validBinding(binding)||!passwordShape(password)||!exact(record,['schema','binding','salt','hash'])||
    record.schema!==schema||!validBinding(record.binding)||bindingText(record.binding)!==bindingText(binding)||
    !hex16(record.salt)||!hex32(record.hash))return false;
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
    const active=world.shops.filter(s=>s.status===1&&s.name===submitted.ownerName);
    if(active.length!==1)return null;
    const binding={worldId:world.worldId,streetId:world.streetId,shopId:active[0].id,ownerName:active[0].name};
    if(!validBinding(binding))return null;
    const record=await readCredentialRecord({binding:Object.freeze(binding),world});
    if(!await verifyOwnerCredential({record,binding,password:submitted.password}))return null;
    return Object.freeze({...binding,revision:world.revision});
  };
}

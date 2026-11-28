/** Source header semantics only: not registration authorization or CAS.
 * DataWrite publishes the allocated ID; DataRead repairs the next ID.
 * A canonical modern header keeps the effective next ID, never a raw stale
 * registration header. The owner/session authority must still be integrated.
 */
import {createHash} from 'node:crypto';
const pins={read:'e7a8add7b0291901e71fe797783b664dff1568a0',write:'203f33b37511e838800a45b84183af98fcf46e4c',register:'9f0a590a6f1d4e93d2534056a0dc96c4d5c80ba7',membership:'8e817c535d4cd17e68d65f0e2f67846a344b5094'};
const reviews=new WeakSet(),fail=m=>{throw new RangeError('R4 lifecycle header: '+m)};
const positive=n=>Number.isSafeInteger(n)&&n>0;
const text=s=>typeof s==='string'&&!/[\r\n,\t\0]/.test(s);
const plain=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
export function reviewR4LifecycleHeader(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources?.[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const token=Object.freeze({committable:false});reviews.add(token);return token;
}
export function projectR4LifecycleHeader({reviewed,header,shops,nowSeconds,operation,registrationIp,actorId}){
  if(!reviews.has(reviewed)||!plain(header)||!positive(header.nextid)||!positive(header.lasttime)||
    !text(header.blockip)||!positive(nowSeconds)||nowSeconds<header.lasttime||!Array.isArray(shops))
    fail('reviewed canonical source header required');
  const ids=new Set();
  for(const shop of shops){
    if(!plain(shop)||!positive(shop.id)||shop.status!==1||shop.id>=header.nextid||
      !text(shop.remoteaddr)||ids.has(shop.id))fail('active stable IDs below canonical nextid required');
    ids.add(shop.id);
  }
  const raw={lasttime:header.lasttime,nextid:header.nextid,blockip:header.blockip};
  let allocatedId=null,effectiveNextId=header.nextid;
  if(operation==='register'){
    if(actorId!==undefined||!text(registrationIp)||!registrationIp||!positive(header.nextid+1))fail('trusted registration context required');
    allocatedId=header.nextid;effectiveNextId=allocatedId+1;
    if(shops.length===0)raw.lasttime=nowSeconds;
    raw.blockip=registrationIp;
  }else if(operation==='restart-shop'||operation==='close-shop'){
    if(registrationIp!==undefined||!ids.has(actorId))fail('current actor required');
    if(operation==='close-shop')raw.blockip=shops.find(s=>s.id===actorId).remoteaddr;
  }else fail('unsupported lifecycle operation');
  return Object.freeze({allocatedId,rawWrittenHeader:Object.freeze(raw),
    canonicalReloadHeader:Object.freeze({...raw,nextid:effectiveNextId}),committable:false});
}

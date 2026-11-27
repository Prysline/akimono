/** Successful new.cgi state projection, not admission, auth, CAS or persistence.
 * Reuse the existing Standard Street initializer, canonical header allocator
 * and GetDTPoint. A private credential authority must be supplied later;
 * never copy legacy plaintext/password hash into the modern game snapshot.
 */
import {createHash} from 'node:crypto';
import {reviewR4LifecycleHeader,projectR4LifecycleHeader} from './original-r4-lifecycle-header.mjs';
import {loadStandardStreetModel,createStandardStreetShop} from './standard-street-model.mjs';
import {reviewOriginalSoloSort,calculateSourceShopPoint} from './original-period-solo-sort.mjs';
const fail=m=>{throw new RangeError('R4 registration state: '+m)};
const pins={dsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',rebel:'923634e58a05beca9ab004515fc7669d53a1ba3a',
  compiler:'1da8cce1e76ad6159325a37faec68efaa82c7f69',detail:'9a83d26fb29edee4032958f1e6de837a250f3384'};
const reviews=new WeakMap();
const textFields=new Set(['name','shopname','pass','comment','remoteaddr','guild','blocklogin','nocheckip','job','rankingyesterday']);
const plain=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x)}return x;};
export function reviewRegistrationState(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources?.[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const header=reviewR4LifecycleHeader(sources);
  reviewOriginalSoloSort({detailSource:sources.detail,readSource:sources.read},{stableSingleSource:true});
  const fields=sources.read.match(/@DTindexnamelist=\s*qw\(([\s\S]*?)\)\s*;/)?.[1].trim().split(/\s+/);
  if(!fields||fields.length!==32||new Set(fields).size!==32)fail('source scalar schema');
  const model=loadStandardStreetModel(sources.dsl,sources.rebel);
  const token=Object.freeze({committable:false});reviews.set(token,{header,fields,model});return token;
}
export function projectRegistrationState({reviewed,header,shops,nowSeconds,identity}){
  const r=reviews.get(reviewed);
  if(!r||!plain(identity)||Object.keys(identity).sort().join(',')!=='icon,name,shopname,sourceIp'||
      !Array.isArray(shops)||!Number.isSafeInteger(nowSeconds)||nowSeconds<43200)fail('reviewed successful registration input required');
  // The input is already source-policy reviewed by the future owner service.
  // Reject ambiguous or invalid representation; this is not the CGI gate.
  for(const k of ['name','shopname','sourceIp']){
    if(typeof identity[k]!=='string'||!identity[k]||/[,:;\t\r\n<>&\0]/.test(identity[k]))fail('invalid identity '+k);
  }
  if(!Number.isSafeInteger(identity.icon)||identity.icon<0||
    shops.some(s=>s?.name===identity.name))fail('unambiguous active owner required');
  const headerEffect=projectR4LifecycleHeader({reviewed:r.header,header,shops,nowSeconds,operation:'register',registrationIp:identity.sourceIp});
  const base=createStandardStreetShop(r.model,{now:nowSeconds,id:headerEffect.allocatedId,
    name:identity.name,shopname:identity.shopname,icon:identity.icon});
  const shop={...Object.fromEntries(r.fields.map(k=>[k,textFields.has(k)?'':0])),...base,
    remoteaddr:identity.sourceIp,pass:'',exp:{},user:{}};
  shop.point=calculateSourceShopPoint(shop);
  return freeze({headerEffect,shop,committable:false,worldStateWritten:false});
}

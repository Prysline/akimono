/** LC-D2: normalize actual restart DataWrite/DataRead semantics into the
 * existing D single-store numeric WorldState. Source-only, no CAS or auth.
 * The original sparse/blank wire is not claimed identical to D's dense wire. */
import {createHash} from 'node:crypto';
import {reviewShopLifecycleSources,projectShopLifecycleSource} from './original-r4-shop-lifecycle-source.mjs';
import {reviewOriginalSoloSort,projectOriginalSoloSort} from './original-period-solo-sort.mjs';
const fail=m=>{throw new RangeError('R4 restart state: '+m)};
const blob=s=>typeof s==='string'?createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex'):null;
const reviews=new WeakMap();
const textFields=new Set(['name','shopname','pass','comment','remoteaddr','guild','blocklogin','nocheckip','job','rankingyesterday']);
export function reviewR4RestartState({sourceTexts,detailSource}){
  const source=reviewShopLifecycleSources(sourceTexts);
  if(blob(detailSource)!=='9a83d26fb29edee4032958f1e6de837a250f3384')fail('source drift detail');
  const match=sourceTexts.core.match(/@DTindexnamelist=\s*qw\(([\s\S]*?)\)\s*;/);
  const fields=match?.[1].trim().split(/\s+/);
  if(!fields||fields.length!==32||new Set(fields).size!==32)fail('source scalar schema');
  const sort=reviewOriginalSoloSort({detailSource,readSource:sourceTexts.core});
  const token=Object.freeze({committable:false});reviews.set(token,{source,fields,sort});return token;
}
export function projectR4RestartState({reviewed,world,actorRef,expectedRevision,confirmation,subdataNames}){
  const r=reviews.get(reviewed);
  if(!r||world?.shops?.length!==1||world.shops[0].id!==1||world.nowSeconds<43200)
    fail('reviewed D single-store numeric world required');
  const current=world.shops[0];
  const effect=projectShopLifecycleSource({review:r.source,snapshot:{revision:world.revision,worldId:world.worldId,street:world.streetId,shops:world.shops},
    actorRef,expectedRevision,now:world.nowSeconds,command:{kind:'restart-shop',confirmation},subdataNames});
  const t=effect.shopTransition,compiled=t.compiledFuncNew;
  const next=Object.fromEntries(r.fields.map(k=>[k,textFields.has(k)?'':0]));
  // The source preserves only these identity fields. For a current local
  // source shop they must already be valid canonical values.
  for(const k of t.retainIdentityKeys){
    if(k==='id'||k==='icon'){
      if(!Number.isSafeInteger(current[k])||current[k]<0)fail('invalid retained identity '+k);
    }else if(typeof current[k]!=='string')fail('invalid retained identity '+k);
    next[k]=current[k];
  }
  Object.assign(next,t.preFuncNew,{money:compiled.money,time:compiled.time,
    showcase:[0],price:[0],item:compiled.item.map(n=>n??0),
    itemyesterday:{},itemtoday:{},exp:{},user:{}});
  const sorted=projectOriginalSoloSort({shop:next,reviewed:r.sort});
  if(sorted.shop.point!==t.newPointAfterRead)fail('source restart point mismatch');
  return freeze({shop:sorted.shop,subdataDeletionSelection:effect.subdataDeletionSelection,
    sourceLogCalls:effect.sourceLogCalls,sessionIntent:effect.sessionIntent,
    committable:false,worldStateWritten:false});
}
function freeze(v){
  if(v&&typeof v==='object'&&!Object.isFrozen(v)){for(const x of Object.values(v))freeze(x);Object.freeze(v);}
  return v;
}

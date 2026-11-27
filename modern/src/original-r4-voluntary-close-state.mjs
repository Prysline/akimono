/** LC-D2 voluntary close: compose existing source-backed effects, native
 * hash ordering and immutable archive generation. Internal candidate only.
 * Archive/context can contain private source data; never expose as HTTP JSON.
 */
import {createHash} from 'node:crypto';
import {reviewShopLifecycleSources,projectShopLifecycleSource} from './original-r4-shop-lifecycle-source.mjs';
import {reviewR4CloseArchiveHash,resolveR4VoluntaryCloseArchiveHashOrders} from './original-r4-close-archive-hash.mjs';
import {reviewR4CloseShopEffects,projectR4CloseShopEffects,reviewR4ClosedShopPrune,projectR4ClosedShopPrune} from './original-r4-close-shop-effects.mjs';
import {reviewR4CloseShopArchiveSource,projectR4CloseShopArchiveGeneration} from './original-r4-close-shop-archive-file.mjs';
import {reviewOriginalCommerceLocale} from './original-r4-commerce-locale.mjs';
import {R4_INDEPENDENT_DISK} from './original-r4-independent-world-disk.mjs';
const fail=m=>{throw new RangeError('R4 voluntary close state: '+m)};
const blob=s=>typeof s==='string'?createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex'):null;
const reviews=new WeakMap();
const localized=Object.freeze({'自主閉店':'自行關店','%1が閉店しました。':'%1將店鋪關閉了。','%1が気持ちを新たに出直しました。':'%1重新出發了。'});
export function reviewR4VoluntaryCloseState({sourceTexts,detailSource,configSource,turnSource,errorSource,localeSources},{stableSingleSource=false}={}){
  if(typeof stableSingleSource!=='boolean')fail('explicit stable single shop review');
  const source=reviewShopLifecycleSources(sourceTexts);
  if(blob(detailSource)!=='9a83d26fb29edee4032958f1e6de837a250f3384'||
     blob(configSource)!=='87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0')fail('source drift');
  reviewOriginalCommerceLocale(localeSources);
  for(const [id,value] of Object.entries(localized)){
    const marker='msgid '+JSON.stringify(id)+'\n',line=marker+'msgstr '+JSON.stringify(value)+'\n';
    if(!localeSources.coreLocaleSource.includes(line)||
      localeSources.localLocaleSource.includes(marker)&&!localeSources.localLocaleSource.includes(line))fail('lifecycle translation drift '+id);
  }
  const readSource=sourceTexts.core,writeSource=sourceTexts.writer,userSource=sourceTexts.subdata;
  const close=reviewR4CloseShopEffects({writeSource,readSource,configSource},{fullCommerce:true});
  const prune=reviewR4ClosedShopPrune({detailSource,writeSource,reviewedClose:close});
  const hash=reviewR4CloseArchiveHash({readSource,turnSource,writeSource,userSource});
  const archive=reviewR4CloseShopArchiveSource({errorSource,userSource});
  const token=Object.freeze({committable:false});
  reviews.set(token,{source,close,prune,hash,archive,stableSingleSource});return token;
}
export function projectR4VoluntaryCloseState({reviewed,world,actorRef,expectedRevision,confirmation,subdataNames,archiveContext,expectedInterpreter=null}){
  const r=reviews.get(reviewed),disk=world?.period?.disk;
  if(!r||world?.shops?.length!==1||(!r.stableSingleSource&&world.shops[0].id!==1)||
    !Number.isSafeInteger(world.shops[0].id)||world.shops[0].id<1||disk?.source!==R4_INDEPENDENT_DISK||
    !disk.live||!Object.hasOwn(disk.live,'play.cgi'))fail('reviewed D single-store disk world required');
  const shop=world.shops[0];
  if(shop.pass!=='')fail('private legacy credential archive not yet supported by local world');
  const contextKeys=['scriptName','remoteAddress','remoteHost','trueIp','user'];
  if(!archiveContext||Object.getPrototypeOf(archiveContext)!==Object.prototype||
    Reflect.ownKeys(archiveContext).length!==contextKeys.length||
    contextKeys.some(k=>!Object.hasOwn(archiveContext,k)||typeof archiveContext[k]!=='string')||
    archiveContext.user!==shop.name)fail('trusted owner archive context required');
  const effect=projectShopLifecycleSource({review:r.source,snapshot:{worldId:world.worldId,street:world.streetId,revision:world.revision,shops:world.shops},
    actorRef,expectedRevision,now:world.nowSeconds,command:{kind:'close-shop',confirmation},subdataNames});
  const order=resolveR4VoluntaryCloseArchiveHashOrders({reviewed:r.hash,world,shopId:shop.id,expectedInterpreter});
  const close=projectR4CloseShopEffects({reviewed:r.close,shopId:shop.id,shop,reason:localized[effect.shopTransition.closeShopCall.reason],
    sessionFileNames:subdataNames,archiveHashOrders:order.archiveHashOrders});
  if(JSON.stringify(close.deletedSessions)!==JSON.stringify(effect.subdataDeletionSelection))fail('source deletion scope mismatch');
  const prune=projectR4ClosedShopPrune({reviewed:r.prune,closeEffect:close});
  const generation=projectR4CloseShopArchiveGeneration({reviewed:r.archive,effect:close,nowSeconds:world.nowSeconds,
    previous:disk.live['log/delete.cgi']??null,previousOld:disk.live['log/delete-old.cgi']??null,...archiveContext});
  return freeze({activeShops:prune.activeShops,archiveGeneration:generation,
    sourceLogCalls:[[1,0,localized['%1が閉店しました。'].replace('%1',()=>shop.shopname)]],
    subdataDeletionSelection:effect.subdataDeletionSelection,sessionIntent:effect.sessionIntent,blockIpEffect:effect.blockIpEffect,
    nativeInterpreter:order.interpreter,committable:false,worldStateWritten:false});
}
function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;}

/** Frozen item-t.cgi, ordinary independent no-guild branch.
 * Caller supplies only requested count; all prices/caps/flags are reviewed sources.
 * No external guild money or account authentication is manufactured. */
import {createHash} from 'node:crypto';
import {reviewNormalCommerceItems} from './reviewed-normal-commerce-items.mjs';
import {validateSourceSparseMarket} from './original-admin-world-bootstrap.mjs';
const pins={formSource:'714e623b9fd1f40ce7c51b89503d2a801330f1bb',submitSource:'ded6d1efc44003b000e4f76562c6eb4ddcda4b29',calcSource:'586354a9a300e26d0e12a4efa512fa25760e3197',readSource:'e7a8add7b0291901e71fe797783b664dff1568a0',writeSource:'203f33b37511e838800a45b84183af98fcf46e4c',logSource:'0f9143c49d1552233f27754e3937e1cdc2740f0a'};
const reviews=new WeakSet();
const fail=s=>{throw new RangeError('R4 original discard: '+s)};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
export function reviewOriginalDiscard(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('frozen source drift '+k);
  }
  const numeric=reviewNormalCommerceItems(sources);
  const items=numeric.items.map((row,i)=>{
    const meta=sources.catalog.items.find(x=>x.id===row.id),limit=sources.limits[i];
    if(!meta||typeof meta.name!=='string'||typeof meta.scaleRaw!=='string'||!Number.isFinite(limit?.wslimit))fail('source ITEM metadata');
    return Object.freeze({...row,name:meta.name,scale:meta.scaleRaw,wslimit:limit.wslimit});
  });
  const reviewed=Object.freeze({items:Object.freeze(items)});reviews.add(reviewed);return reviewed;
}
export function listOriginalDiscardOffers({reviewed,world}){
  if(!reviews.has(reviewed))fail('source review required');
  const shop=world?.shops?.length===1?world.shops[0]:null;
  if(shop?.status!==1||shop.id!==1)return [];
  return reviewed.items.filter(item=>safe(shop.item?.[item.id-1])&&shop.item[item.id-1]>0&&!item.flag.includes('t')).map(item=>{
    const owned=shop.item[item.id-1],human=item.flag.includes('h'),options=[];
    let prior=0;
    for(const n of [1,10,100,1000,10000,owned].sort((a,b)=>a-b)){
      if(n>owned||n===prior)break;
      options.push({count:n,label:n===owned?n+(human?'（全員）':'（全部）'):String(n)});
      prior=n;
    }
    return {itemId:item.id,owned,human,options};
  });
}
export function projectOriginalDiscard({reviewed,world,command}){
  if(!reviews.has(reviewed)||command.kind!=='discard-item'||command.shopId!==1||world.shops?.length!==1||
     !Number.isSafeInteger(command.itemId)||command.itemId<1||command.itemId>79||!safe(command.count)||!command.count||
     !validateSourceSparseMarket(world.market))fail('independent source discard command');
  const shop=world.shops[0],i=command.itemId-1,item=reviewed.items[i];
  if(shop.id!==1||shop.status!==1||![undefined,null,0,'',false].includes(shop.guild)||item.flag.includes('t')||
     !safe(shop.item?.[i])||shop.item[i]===0||!safe(shop.trush??0))fail('source discard gate');
  const count=Math.min(command.count,shop.item[i]),human=item.flag.includes('h');
  const next={...shop,item:[...shop.item],lastlogin:world.nowSeconds};
  next.item[i]-=count;
  let market=world.market,waste=0;
  if(!human){
    waste=Math.trunc(item.price*count/5);
    next.trush=(shop.trush??0)+waste;
    if(!safe(next.trush))fail('garbage integer overflow');
    // item-t.cgi uses int(wslimit * shop count), NOT CheckWholeStore's +.99.
    const cap=item.wslimit<0?-item.wslimit:Math.trunc(item.wslimit*world.shops.length);
    const wholesale=[...market.wholesale];
    wholesale[i]=Math.max(0,Math.min(wholesale[i]+count,cap-next.item[i]));
    const positions=[...new Set([...market.sparseWrittenSlots,i])].sort((a,b)=>a-b);
    const present=new Set(positions);
    const last=market.sourceWriteShape==='whole-store-79'?78:positions.at(-1);
    const originalWholesaleCsv=Array.from({length:last+1},(_,j)=>present.has(j)?String(wholesale[j]):'').join(',');
    market={...market,wholesale,sparseWrittenSlots:positions,originalWholesaleCsv};
    if(!validateSourceSparseMarket(market))fail('source wholesale wire');
  }
  // Frozen upstream locale/zh_TW.po: %1%2%3被丟棄了 / 被解雇了.
  const originalMessage=item.name+count+item.scale+(human?'被解雇了':'被丟棄了');
  return {shops:[next],market,receipt:{action:'discard-item',source:'r4-frozen-item-t-no-guild.v1',
    shopId:shop.id,itemId:item.id,requestedCount:command.count,discardedCount:count,stockAfter:next.item[i],
    timeSpentSeconds:0,garbageAdded:waste,garbageAfter:next.trush??0,wholesaleAfter:market.wholesale[i],originalMessage}};
}

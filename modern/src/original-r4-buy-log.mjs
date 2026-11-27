/** Frozen buy-s.cgi no-guild wholesale purchase message, before FUNCBUY.
 * Reuses committed purchase receipt; no payment, callback or authority change. */
import {createHash} from 'node:crypto';
import {formatOriginalBalanceDuration} from './original-r4-balance-view.mjs';
const pins={buySubmitSource:'6ba8df9a733ed16c490389414cd94934fe1185ca',wholeSource:'778badaf157326bcfd1f8fa1e310d94f94995eb3',readSource:'e7a8add7b0291901e71fe797783b664dff1568a0',logSource:'0f9143c49d1552233f27754e3937e1cdc2740f0a',configSource:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 source buy log: '+m)};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
const money=n=>'\\'+String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');
export function reviewOriginalWholesaleBuyLog(sources){
 for(const [key,sha] of Object.entries(pins)){
  const s=sources[key];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+key);
 }
 const items=Object.freeze(Object.fromEntries(sources.catalog.items.map(i=>[i.id,Object.freeze({name:i.name,scale:i.scaleRaw,human:i.flagRaw.split('|').includes('human')})])));
 if(Object.keys(items).length!==79||Object.values(items).some(i=>[i.name,i.scale].some(n=>typeof n!=='string'||/[\r\n\t]/.test(n))))fail('compiled ITEM names');
 const reviewed=Object.freeze({items});reviews.add(reviewed);return reviewed;
}
export function projectOriginalWholesaleBuyLog({reviewed,before,command,receipt:r,nowSeconds}){
 if(!reviews.has(reviewed)||command.kind!=='market-buy'||command.shopId!==1||before?.id!==1||before.status!==1||before.guild||r?.action!=='market-buy'||r.shopId!==1||r.itemId!==command.itemId||!safe(nowSeconds)||!reviewed.items[r.itemId])fail('source buy log identity');
 const i=reviewed.items[r.itemId];
 if(![r.purchasedCount,r.unitPrice,r.totalPaid,r.timeConsumedSeconds,r.stockBefore,r.stockAfter,r.marketShelf].every(safe)||r.purchasedCount<1||r.purchasedCount>command.requestedCount||r.unitPrice!==command.expectedPrice||r.marketShelf!==command.marketShelf||r.totalPaid!==r.purchasedCount*r.unitPrice||r.stockBefore!==before.item[r.itemId-1]||r.stockAfter!==r.stockBefore+r.purchasedCount)fail('source buy receipt');
 // Frozen locale/zh_TW.po a512f6887cee214e66828769a382ad2b18bcd5b3:
 // retain awkward original translation and literal currency prefix.
 const msg='購買市場的'+i.name+r.purchasedCount+i.scale+'@'+money(r.unitPrice)+'(合計'+money(r.totalPaid)+')'+(i.human?'雇用於':'購買於')+'/消費時間'+formatOriginalBalanceDuration(r.timeConsumedSeconds);
 return [nowSeconds,0,1,msg].join('\t')+'\n';
}

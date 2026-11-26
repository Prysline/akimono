/** Original buy.cgi read form, separate from buy-s authoritative CAS. */
import {createHash} from 'node:crypto';
const pins={formSource:'79ec6f92d873883dddc5e6442dcb4694638515d2',submitSource:'6ba8df9a733ed16c490389414cd94934fe1185ca',calcSource:'586354a9a300e26d0e12a4efa512fa25760e3197',itemSource:'b39400d7dc0ab80062c392ae2bbc923e24ecacf8',configSource:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 original buy form: '+m)};
export function reviewOriginalBuyForm(sources){
 for(const [k,sha] of Object.entries(pins)){
  const s=sources[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
 }
 const reviewed=Object.freeze({source:'r4-frozen-buy-form.v1'});reviews.add(reviewed);return reviewed;
}
export function describeOriginalBuyForm({reviewed,offer,shop,nowSeconds}){
 if(!reviews.has(reviewed))fail('source review required');
 const closed=reason=>({source:reviewed.source,available:false,reason,options:[]});
 if(!shop||shop.status!==1)return closed('請先開店');
 if(!offer.canBuy)return closed(offer.reason??(offer.owned>=offer.limit?'倉庫已滿':'目前無法購買'));
 const {price,marketStock,owned,limit,timeSeconds}=offer;
 if(![price,marketStock,owned,limit,timeSeconds,nowSeconds,shop.time,shop.money].every(Number.isSafeInteger)||price<0||marketStock<1||owned<0||limit<1||timeSeconds<0)fail('source quote');
 if(owned>=limit)return closed('倉庫已滿');
 if(price>0&&shop.money<price)return closed('資金不足');
 if(Math.min(259200,nowSeconds-shop.time)<timeSeconds)return closed('所需時間不足');
 const capacity=limit-owned,money=price?Math.trunc(shop.money/price):999999999;
 const labels=new Map([1,10,100,1000,10000].map(n=>[n,String(n)]));
 labels.set(marketStock,marketStock+'（全部）');
 labels.set(capacity,capacity+'（倉庫最多）');
 labels.set(money,money+'（資金最多）');
 const options=[];let old=0;
 // Original loop stops at first duplicate, rather than skipping it.
 for(const count of [1,10,100,1000,10000,marketStock,capacity,money].sort((a,b)=>a-b)){
  if(count>marketStock||count>capacity||count>money||count===old)break;
  options.push({count,label:labels.get(count)});old=count;
 }
 return {source:reviewed.source,available:true,reason:null,options};
}

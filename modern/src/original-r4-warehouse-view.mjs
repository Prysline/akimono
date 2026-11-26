/** Read-only original stock.cgi and plug/market.cgi::GetMarketStatus.
 * Not a new pricing engine, mutation, RNG, or multiplayer claim.
 * Uses the owning controller's compiled ITEMs and DataRead overlay. */
import {createHash} from 'node:crypto';
import {parseDsl} from './parse-dsl.mjs';
import {calculateSourceMarketStatus} from './shared-source-market-status.mjs';
import {isReviewedNormalCommerceItems} from './reviewed-normal-commerce-items.mjs';
const pins={stockViewSource:'8465b8dd3c0d2ef8c81078b617806fcc9ed469ae',marketSource:'1aca77e9b373c25e53e445d64c101a7cc2246825',itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',configSource:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 warehouse view: '+m)};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
export function reviewOriginalWarehouse(sources){
 for(const [key,pin] of Object.entries(pins)){
  const s=sources[key];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==pin)fail('frozen source drift '+key);
 }
 const d=parseDsl(sources.itemDsl,'custom/inc-item-data.cgi').blocks.find(b=>b.kind==='DEFINE');
 const types=Array.from({length:10},(_,i)=>({id:i+1,name:d.fields['type'+(i+1)][0].value}));
 if(!/\$SALE_SPEED\s*=\s*12\s*;/.test(sources.configSource))fail('source SALE_SPEED');
 if(sources.marketSurveySource!=null&&createHash('sha1').update('blob '+Buffer.byteLength(sources.marketSurveySource)+'\0').update(sources.marketSurveySource).digest('hex')!=='2cfdc8acbae1b2259cbf966d8e490b6a6329355f')fail('frozen source drift marketSurveySource');
 const review=Object.freeze({surveyReviewed:sources.marketSurveySource!=null,types:Object.freeze(types.map(Object.freeze)),saleSpeed:12});reviews.add(review);return review;
}
export function originalMarketBalance(per){
 if(!safe(per)||per>1000)fail('source supply point');
 return per>=110?{label:'飽和',percent:Math.trunc(per/10)}:per<=90?{label:'不足',percent:110-per}:{label:'平衡',percent:null};
}
export function describeOriginalWarehouse({reviewed,world,normalCommerce,overlay,order,limits}){
 if(!reviews.has(reviewed)||!isReviewedNormalCommerceItems(normalCommerce)||!overlay?.saleRules||world?.shops?.length!==1||!safe(world.period?.dtPeople)||world.period.dtPeople===0||!Array.isArray(order)||order.length!==79||new Set(order).size!==79||!Array.isArray(limits)||limits.length!==79)fail('source view inputs');
 const shop=world.shops[0],blocked=(shop.trush??0)>5000000;
 const market=new Map();
 for(const [shelf,id] of shop.showcase.entries()){
  if(!id)continue;
  const stock=shop.item[id-1];if(!stock)continue;
  const price=shop.price[shelf],r=overlay.saleRules[id];
  if(!safe(stock)||!safe(price)||!r||!safe(r.popularSeconds))fail('source displayed ITEM');
  const a=market.get(id)??{stock:0,weighted:0,low:price,high:price};
  a.stock+=stock;a.weighted+=price*stock;a.low=Math.min(a.low,price);a.high=Math.max(a.high,price);
  if(!safe(a.stock)||!safe(a.weighted))fail('source weighted price');
  market.set(id,a);
 }
 const rows=[],marketItems=[],survey=[];
 for(const id of order){
  const item=normalCommerce.items[id-1],count=shop.item[id-1],experience=shop.exp?.[id]??0,soldToday=shop.itemtoday?.[id]??0,soldYesterday=shop.itemyesterday?.[id]??0;
  if(!item||![count,experience,soldToday,soldYesterday].every(safe))fail('source warehouse row');
  const a=market.get(id),popular=overlay.saleRules[id]?.popularSeconds??item.popular;
  const status=a?calculateSourceMarketStatus({stock:a.stock,weightedPrice:a.weighted,popular,population:world.period.dtPeople,saleSpeed:reviewed.saleSpeed}):null;
  const point=status?.uppoint??0;
  const common={itemId:id,storage:item.flag.includes('s'),typeId:item.type,count,experience,soldToday,soldYesterday,compiledCost:item.cost,stockLimit:limits[id-1].limit,standardPrice:item.price,
    displayedStock:a?.stock??0,marketPrice:status?.marketprice??null,lowestPrice:a?.low??null,highestPrice:a?.high??null,popularSeconds:popular,supplyPoint:point,balance:originalMarketBalance(point)};
  marketItems.push(common);
  if(a)survey.push(common); // original %marketitemlist: only displayed positive stock
  // Yesterday alone does not qualify a row in stock.cgi; its graph uses ||=10.
  if(!blocked&&(count||soldToday||experience))rows.push({...common,supplyPoint:point||10,balance:originalMarketBalance(point||10)});
 }
 return {blocked,types:reviewed.types,rows,...(reviewed.surveyReviewed?{marketItems,survey}: {})};
}

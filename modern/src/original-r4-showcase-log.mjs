/** Original sc-s.cgi successful shelf mutation PushLog only.
 * No new command authority, time rule or shop state mutation. */
import {createHash} from 'node:crypto';
import {isReviewedCommerceLocale} from './original-r4-commerce-locale.mjs';
const pins={showcaseSource:'0bada620cff769bed782707d61b87e48cce0a58c',logSource:'0f9143c49d1552233f27754e3937e1cdc2740f0a',configSource:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0',readSource:'e7a8add7b0291901e71fe797783b664dff1568a0',itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 source showcase log: '+m)};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
export function reviewOriginalShowcaseLog(sources){
 if(!isReviewedCommerceLocale(sources.reviewedLocale))fail('frozen layered locale review required');
 for(const [key,sha] of Object.entries(pins)){
  const s=sources[key];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+key);
 }
 const names=Object.freeze(Object.fromEntries(sources.catalog.items.map(i=>[i.id,i.name])));
 if(Object.keys(names).length!==79||Object.values(names).some(n=>typeof n!=='string'||!n||/[\r\n\t]/.test(n)))fail('compiled item names');
 const reviewed=Object.freeze({names});reviews.add(reviewed);return reviewed;
}
export function projectOriginalShowcaseLog({reviewed,before,after,command,receipt,nowSeconds}){
 if(!reviews.has(reviewed)||command.kind!=='edit-showcase'||command.shopId!==1||before?.id!==1||after?.id!==1||before.status!==1||after.status!==1||!safe(command.shelf)||command.shelf>=before.showcasecount||!safe(nowSeconds)||receipt?.action!=='edit-showcase'||receipt.shopId!==1||receipt.shelf!==command.shelf)fail('source log identity');
 const shelf=command.shelf,id=after.showcase[shelf],price=after.price[shelf];
 if(!safe(id)||!safe(price)||receipt.displayedItemId!==id||receipt.unitPrice!==price||receipt.timeAfterSeconds!==after.time||after.showcasecount!==before.showcasecount||(id!==0&&id!==command.itemId)||(id===0)!==(price===0)||id&&!reviewed.names[id])fail('source shelf successor');
 // Frozen locale/zh_TW.po a512f6887cee214e66828769a382ad2b18bcd5b3,
 // GetMoneyString prefix from _config.cgi is literal backslash, no suffix.
 const message=id?'將'+reviewed.names[id]+'\\'+String(price).replace(/\B(?=(\d{3})+(?!\d))/g,',')+'陳列在展示架'+(shelf+1)+'上了。':'從展示架'+(shelf+1)+'下架了。';
 return [nowSeconds,0,1,message].join('\t')+'\n';
}

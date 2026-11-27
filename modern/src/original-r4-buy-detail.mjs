/** Frozen buy.cgi wholesale detail: read-only, never a second buy-s authority. */
import {createHash} from 'node:crypto';
import {parseDsl} from './parse-dsl.mjs';
const pins={buyFormSource:'79ec6f92d873883dddc5e6442dcb4694638515d2',wholeSource:'778badaf157326bcfd1f8fa1e310d94f94995eb3',compilerSource:'1da8cce1e76ad6159325a37faec68efaa82c7f69',itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 original buy detail: '+m)};
const safe=n=>Number.isSafeInteger(n)&&n>=0;
export function reviewOriginalBuyDetail(sources){
 for(const [key,sha] of Object.entries(pins)){
  const s=sources[key];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+key);
 }
 const parsed=parseDsl(sources.itemDsl,'custom/inc-item-data.cgi');
 if(parsed.issues.length||parsed.counts.items!==79)fail('frozen ITEM declarations');
 const field=(b,k)=>{const rows=b.fields[k]??[];if(rows.length>1)fail('duplicate '+k);return rows[0]?.value??''};
 // Frozen ITEM names/scales/info use single literal GetString tokens, not
 // macro expansion or arbitrary markup. Fail on unreviewed source syntax.
 const literal=s=>{if(/[\s$'",\\]/.test(s)||/<(?!\/?B>)/i.test(s))fail('unreviewed ITEM text');return s};
 const items={};
 for(const b of parsed.blocks.filter(b=>b.kind==='ITEM')){
  const id=Number(field(b,'no')),name=literal(field(b,'name')),scale=literal(field(b,'scale')),info=literal(field(b,'info'));
  if(!safe(id)||id<1||id>79||items[id]||!name||!scale)fail('source ITEM identity');
  items[id]=Object.freeze({name,scale,info});
 }
 const review=Object.freeze({items:Object.freeze(items)});reviews.add(review);return review;
}
export function describeOriginalBuyDetail({reviewed,offer,item,popular}){
 if(!reviews.has(reviewed)||!item||item.id!==offer.itemId||!reviewed.items[item.id])fail('reviewed ITEM required');
 if(!offer.form||!safe(offer.price)||!safe(offer.marketStock)||!offer.marketStock)return null;
 if(!safe(offer.owned)||!safe(popular)||typeof item.flag!=='string')fail('source detail');
 const meta=reviewed.items[item.id];
 if(meta.name!==offer.name)fail('source quote name');
 // buy.cgi suppresses both POP warnings for s (not listable). The
 // warning is informational; it must not become a purchase/listing gate.
 const saleWarning=item.flag.includes('s')?null:popular===0?'no-sales':popular>800000?'rare-sales':null;
 const human=item.flag.includes('h');
 return Object.freeze({source:'r4-frozen-buy-detail.v1',shopName:'市場',name:meta.name,nameLabel:human?'名字':'商品',info:meta.info,scale:meta.scale,price:offer.price,marketStock:offer.marketStock,owned:offer.owned,saleWarning,actionLabel:human?'雇用':'購買'});
}

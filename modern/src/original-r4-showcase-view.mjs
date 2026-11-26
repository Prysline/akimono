/** Frozen inc-sc.cgi shelf tax projection, independent shop only. */
import {createHash} from 'node:crypto';
import {calculateSourceSaleTax} from './shared-source-sale-tax.mjs';
import {isReviewedNormalCommerceItems} from './reviewed-normal-commerce-items.mjs';
const pins={showcaseViewSource:'2e328443f3f83bd862f56a540e1357b31917651d',saleTaxSource:'b39400d7dc0ab80062c392ae2bbc923e24ecacf8',detailSource:'9a83d26fb29edee4032958f1e6de837a250f3384',configSource:'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0'};
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 showcase view: '+m)};
export function reviewOriginalShowcaseView(sources){
 for(const [k,sha] of Object.entries(pins)){
  const s=sources[k];if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
 }
 const reviewed=Object.freeze({source:'r4-frozen-inc-sc.v1'});reviews.add(reviewed);return reviewed;
}
export function describeOriginalShowcase({reviewed,world,normalCommerce}){
 if(!reviews.has(reviewed)||!isReviewedNormalCommerceItems(normalCommerce)||world?.shops?.length!==1)fail('source shelf input');
 const shop=world.shops[0],mode=shop.taxmode??0;
 if(![0,1,2].includes(mode)||Number(world.market.originalBootstrapMeta.split(',')[3])!==0)fail('independent source tax context');
 const rows=shop.showcase.map((itemId,shelf)=>{
  if(!itemId)return {shelf,itemId,taxRate:null,tax:null};
  const basePrice=normalCommerce.items[itemId-1].price;
  return {shelf,itemId,...calculateSourceSaleTax({basePrice,count:1,totalPrice:shop.price[shelf],plusTaxRate:0})};
 });
 return {source:reviewed.source,taxModeLabel:['','（免稅）','（倍稅）'][mode],rows};
}

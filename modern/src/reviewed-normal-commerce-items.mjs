/** Frozen Standard Street ITEM numeric metadata, not acquisition authority.
 * Keep the compiler order (PRICE defaults, POP/POINT/COST overrides) and
 * original sc-s.cgi flag check separate from positive demand.
 * No arbitrary Perl/expression evaluation; only this reviewed DSL.
 */
import {createHash} from 'node:crypto';
import {parseDsl} from './parse-dsl.mjs';
import {isSourceShowcaseListedPrice} from './shared-showcase-price.mjs';

const reviewedCatalogs=new WeakSet();

const fail=s=>{throw new RangeError('R4 normal commerce ITEM: '+s);};
const pins={
  itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',
  compilerSource:'1da8cce1e76ad6159325a37faec68efaa82c7f69',
  showcaseSource:'0bada620cff769bed782707d61b87e48cce0a58c',
  turnSource:'b8a4980275f475a952846a8d6072fad45f8dff50',
};
const safe=(n,label)=>{
  if(!Number.isSafeInteger(n)||n<0)fail(label);
  return n;
};
const literal=(s,label)=>{
  const m=/^(\d+)([mhd%]?)$/.exec(s);
  if(!m)fail('unsupported literal '+label);
  return safe(Number(m[1])*({'':1,m:60,h:3600,d:86400,'%':10}[m[2]]),label);
};
const one=(b,k)=>{
  if(b.fields[k]?.length!==1)fail('missing or duplicate '+k+' at '+b.startLine);
  return b.fields[k][0].value;
};
export function reviewNormalCommerceItems(sources){
  for(const [key,sha] of Object.entries(pins)){
    const s=sources[key];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)
      fail('frozen source drift '+key);
  }
  const parsed=parseDsl(sources.itemDsl,'custom/inc-item-data.cgi');
  if(parsed.issues.length||parsed.counts.items!==79)fail('79 ITEM declarations');
  const define=parsed.blocks.find(b=>b.kind==='DEFINE');
  const types=new Map(Array.from({length:11},(_,i)=>[one(define,'type'+i),i]));
  if(types.size!==11)fail('source type definitions');
  const items=[],saleRules={},upkeepCosts={};
  const flagCodes={noshowcase:'s',norequest:'r',onlysend:'o',notrash:'t',human:'h'};
  for(const b of parsed.blocks.filter(b=>b.kind==='ITEM')){
    const id=literal(one(b,'no'),'ITEM id'),type=one(b,'type');
    if(id<1||id>79||items[id-1]||!types.has(type)||types.get(type)===0)fail('ITEM identity/type');
    let price=0,popular=0,point=0,cost=0,flag='';
    const numeric=[];
    for(const key of ['price','pop','point','cost']){
      if(!b.fields[key])continue;
      numeric.push({key,value:one(b,key),line:b.fields[key][0].line});
    }
    one(b,'price');
    for(const {key,value} of numeric.sort((a,b)=>a.line-b.line)){
      const n=literal(value,key+' #'+id);
      if(key==='price'){
        price=n;
        if(price>0){
          if(!cost)cost=Math.trunc(price/10);
          if(!popular){popular=Math.trunc(price*2*6*6/10);point=Math.trunc(popular*100/24/36);}
        }
      }else if(key==='pop'){popular=n;point=Math.trunc(popular*100/24/36);}
      else if(key==='point')point=n;
      else cost=n;
    }
    if(b.fields.flag){
      const flags=one(b,'flag').split('|');
      if(flags.some(f=>!Object.hasOwn(flagCodes,f))||new Set(flags).size!==flags.length)
        fail('unknown source flag #'+id);
      flag=Object.entries(flagCodes).filter(([key])=>flags.includes(key)).map(([,v])=>v).join('');
    }
    const item=Object.freeze({id,price,popular,point,cost,type:types.get(type),flag});
    items[id-1]=item;upkeepCosts[id]=cost;
    if(!flag.includes('s')&&price>0){
      // #65 is genuinely listable, but frozen natural loop assigns no
      // buypeople to POP=0. It still participates in type and holding cost.
      if(popular===0&&id!==65)fail('unreviewed zero-POP display #'+id);
      saleRules[id]=Object.freeze({itemId:id,itemType:type,unitPrice:price,
        popularSeconds:popular,point,cost,source:b.file+':'+b.startLine,
        ...(popular===0?{zeroPopularReviewed:true}:{})});
    }
  }
  if(items.length!==79||Array.from({length:79},(_,i)=>items[i]).some(x=>!x))
    fail('contiguous original ITEM ids');
  const review=Object.freeze({source:'r4-normal-commerce-frozen-item-metadata.v1',
    items:Object.freeze(items),saleRules:Object.freeze(saleRules),
    upkeepCosts:Object.freeze(upkeepCosts)});
  reviewedCatalogs.add(review);
  return review;
}

/** Shape-only source proof. A stocked ITEM or EXP key is not a grant:
 * authorized commands, CAS and history replay must establish provenance.
 * A valid zero-stock shelf may persist after a sale or theft.
 */
export function validateNormalCommerceInventory(shop,compiled,reviewed){
  if(!reviewedCatalogs.has(reviewed))fail('actual frozen ITEM review required');
  if(!shop||!Array.isArray(shop.item)||shop.item.length!==79||
     !Array.isArray(compiled?.limits)||compiled.limits.length!==79||
     compiled.limits.some(row=>!Number.isSafeInteger(row?.limit)||row.limit<0)||
     shop.item.some((n,i)=>!Number.isSafeInteger(n)||n<0||n>compiled.limits[i].limit)||
     !['','drug','tool','weapon','armor','material','book','peddle','cow'].includes(shop.job??''))
    fail('source holding cap, career or stock shape');
  if(!Number.isSafeInteger(shop.showcasecount)||shop.showcasecount<1||shop.showcasecount>8||
     !Array.isArray(shop.showcase)||!Array.isArray(shop.price)||
     shop.showcase.length!==shop.showcasecount||shop.price.length!==shop.showcasecount||
     shop.showcase.some((id,i)=>!Number.isSafeInteger(id)||id<0||id>79||
       (id===0?shop.price[i]!==0:
        !isSourceShowcaseListedPrice(reviewed.saleRules[id]?.unitPrice,shop.price[i]))))
    fail('source showcase shape, flag or listed price');
  const exp=shop.exp??{};
  if(typeof exp!=='object'||Array.isArray(exp)||
     Object.entries(exp).some(([id,n])=>!/^[1-9][0-9]*$/.test(id)||Number(id)>79||
       !Number.isSafeInteger(n)||n<0||n>1000)||
     Object.values(exp).reduce((a,b)=>a+b,0)>3600)
    fail('source ITEM EXP or LIMIT_EXP');
  return true;
}

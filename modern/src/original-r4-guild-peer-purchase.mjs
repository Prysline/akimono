/** R4 exact-source peer #79 purchase candidate, including global FUNCBUY no-op
 * for a non-market purchase. This never authorizes players, CAS or disk commits.
 * Controlled RNG values are source differential inputs, never runtime evidence.
 */
import {createHash} from 'node:crypto';
import {loadStandardStreetModel} from './standard-street-model.mjs';
import {quoteUnguildedPurchase} from './economy-model.mjs';
const pins=Object.freeze({
  buy:'6ba8df9a733ed16c490389414cd94934fe1185ca',
  calc:'586354a9a300e26d0e12a4efa512fa25760e3197',
  item:'b39400d7dc0ab80062c392ae2bbc923e24ecacf8',
  detail:'9a83d26fb29edee4032958f1e6de837a250f3384',
  guild:'6593aa8a3ae4a1695c2418f12a3776f0053454ac',
  itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',
  rebelDsl:'923634e58a05beca9ab004515fc7669d53a1ba3a',
});
const models=new WeakMap();
const fail=m=>{throw new RangeError('R4 guild peer purchase: '+m)};
const plain=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const int=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const signed=x=>Number.isSafeInteger(x);
const sameKeys=(a,b)=>Object.keys(a).sort().join(',')===Object.keys(b).sort().join(',');
const ledgerKeys=['money','in','out','atk','def'];
export function reviewGuildPeerPurchase(sources){
  if(!plain(sources)||!sameKeys(sources,pins))fail('exact source set');
  for(const [k,pin] of Object.entries(pins)){
    const s=sources[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==pin)fail('source drift '+k);
  }
  const model=loadStandardStreetModel(sources.itemDsl,sources.rebelDsl);
  const item=model.items.find(x=>x.id===79);
  if(!item||item.price!==10000||item.limitRaw!=='10/0'||item.funcbRaw!==null)fail('ITEM 79 metadata');
  const r=Object.freeze({source:'r4-guild-peer-purchase-candidate.v1',committable:false});
  models.set(r,model);return r;
}
function checkShop(s){
  if(!plain(s)||!int(s.id,1)||s.status!==1||typeof s.guild!=='string'||!int(s.money)||!signed(s.time)||
     !Array.isArray(s.item)||s.item.length!==79||!s.item.every(x=>int(x)))fail('explicit active shop');
}
export function projectGuildPeerPurchase({reviewed,before,definitions,command,nowSeconds,townTaxRate,sendItemTime,rankDraws=[]}){
  const model=models.get(reviewed);
  if(!model||!plain(before)||!plain(definitions)||!plain(before.ledgers)||!sameKeys(definitions,before.ledgers)||
     !plain(command)||!int(command.requestedCount)||!int(command.offeredPrice)||command.itemId!==79||command.shelf!==0||
     !int(nowSeconds,259200)||!int(townTaxRate,0,40)||sendItemTime!==1200||
     !Array.isArray(rankDraws)||rankDraws.length>1||!rankDraws.every(x=>int(x,0,999999)))fail('explicit reviewed peer context');
  const {buyer,seller,ledgers}=before;
  checkShop(buyer);checkShop(seller);
  if(!int(buyer.paytoday)||!int(seller.rank,0,10000)||![0,1,2].includes(seller.taxmode)||
     !int(seller.trush)||!int(seller.saletoday)||!int(seller.taxtoday)||!plain(seller.itemtoday)||
     !int(seller.itemtoday[79]??0)||seller.showcasecount!==1||seller.showcase?.length!==1||
     seller.price?.length!==1||!int(seller.price[0]))fail('reviewed seller fields');
  for(const [id,def] of Object.entries(definitions)){
    const g=ledgers[id];
    if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)||['constructor','prototype'].includes(id)||
       !plain(def)||!int(def.dealrate,0,1000)||!plain(g)||Object.keys(g).length!==ledgerKeys.length||
       !signed(g.money)||!ledgerKeys.slice(1).every(k=>int(g[k])))fail('definition or ledger mismatch');
  }
  for(const s of [buyer,seller])if(s.guild&&!Object.hasOwn(definitions,s.guild))fail('unknown membership');
  const refusal=reason=>{
    if(rankDraws.length)fail('unexpected rank draws on refusal');
    return {ok:false,reason,after:structuredClone(before),receipt:null,rankRanges:[],stages:[],committable:false};
  };
  if(buyer.id===seller.id)return refusal('self-purchase');
  let count=Math.min(command.requestedCount,10-buyer.item[78]);
  if(count<=0)return refusal('quantity');
  const baseprice=seller.price[0];
  let type=buyer.guild&&seller.guild?(buyer.guild===seller.guild?1:2):0;
  const deal=type?definitions[seller.guild].dealrate:0;
  if(!signed(baseprice*deal))fail('margin overflow');
  let margin=type?Math.trunc(baseprice*deal/1000):0;
  const rate=1000+(type===1?-deal:type===2?deal:0);
  if(type===1&&margin&&ledgers[buyer.guild].money<10000){type=-1;margin=0;}
  const saleprice=baseprice+(type===1?-margin:margin);
  if(!int(saleprice))fail('sale price overflow');
  if(seller.showcase[0]!==79||command.offeredPrice!==saleprice||!seller.item[78])return refusal('stale quote or stock');
  count=Math.min(count,seller.item[78],saleprice?Math.trunc(buyer.money/saleprice):Number.MAX_SAFE_INTEGER);
  if(!count)return refusal('cash or stock');
  if(nowSeconds<buyer.time)return refusal('time debt');
  if(!signed(baseprice*count)||!signed(saleprice*count)||!signed(margin*count))fail('total overflow');
  const q=quoteUnguildedPurchase(model,{...buyer,guild:'',money:baseprice*count},{...seller,guild:''},{
    shelf:0,itemId:79,offeredPrice:baseprice,requestedCount:count,itemLimit:10,
    baseTaxRate:seller.taxmode===1?0:seller.taxmode===2?2*townTaxRate:townTaxRate,sendItemTime,
  });
  const after=structuredClone(before),b=after.buyer,s=after.seller;
  b.item[78]+=count;s.item[78]-=count;b.money-=saleprice*count;b.paytoday+=saleprice*count;
  b.time=Math.max(b.time,nowSeconds-259200)+q.timeSeconds;
  s.money+=q.sellerProceeds;s.saletoday+=baseprice*count;s.taxtoday+=q.tax;s.trush+=q.sellerTrashIncrease;
  s.itemtoday[79]=(s.itemtoday[79]??0)+count;
  const rankRanges=[];
  if(s.item[78]===0&&type!==1&&type!==-1){
    let down=(s.rank/100)**3/1000;
    if(down>0&&down<1){
      if(rankDraws.length!==1)fail('missing fractional rank draw');
      const range=1/down;rankRanges.push(range);
      if(range*rankDraws[0]/1000000<1)down=1;
    }
    s.rank=Math.max(0,s.rank-Math.trunc(down));
  }
  if(rankRanges.length!==rankDraws.length)fail('unused rank draw');
  if(type===1){after.ledgers[buyer.guild].money-=margin*count;after.ledgers[buyer.guild].out+=margin*count;}
  if(type===2){after.ledgers[seller.guild].money+=margin*count;after.ledgers[seller.guild].in+=margin*count;}
  if(![b.money,b.paytoday,b.time,s.money,s.saletoday,s.taxtoday,s.trush,s.itemtoday[79],...Object.values(after.ledgers).flatMap(g=>Object.values(g))].every(signed))fail('result overflow');
  // Actual buy-s calls global FUNCBUY after the buy log. For a peer, BUY.whole
  // is false, so the pinned Standard Street callback cannot award vouchers.
  // Item 79 has no per-item buy callback. Stage order is a trace, not a commit.
  const stages=['buy-log','item-init','global-funcbuy',...(type>0?['guild-ledger-stage']:[]),'renew-log','data-write','commit-request','unlock'];
  return {ok:true,after,receipt:{type,rate,margin,baseprice,count,saleprice,tax:q.tax,taxrate:q.taxRate,usetime:q.timeSeconds},
    rankRanges,stages,ledgerWriteRequired:type>0,committable:false};
}

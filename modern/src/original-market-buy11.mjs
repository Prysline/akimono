/**
 * B-58 internal original market purchase for source ITEM #11 lottery tickets.
 * B-40 already audited the fixed buy-s.cgi / whole.cgi / item.cgi / calc.cgi
 * flow; this extension locks ITEM #11 identity, quantities, price and flags.
 * No HTTP/UI route, guild, auth or arbitrary item purchase support.
 */
import {validateSourceSparseMarket} from './original-admin-world-bootstrap.mjs';
import {parseDsl} from './parse-dsl.mjs';

export const B58_MARKET11_SOURCE='b58-original-source-market-item11-lottery-purchase';
const fail=s=>{throw new RangeError('B-58 source market ticket: '+s);};
const safe=(n,label,min=0)=>{
  if(!Number.isSafeInteger(n)||n<min)fail(label);
  return n;
};

export function reviewOriginalMarketBuy11({reviewedBuy10,model,compiled,itemDsl}){
  if(reviewedBuy10?.itemId!==10||
     reviewedBuy10.unitPrice!==5000||
     reviewedBuy10.marketTimeSeconds!==600)
    fail('fixed original B-40 purchase source prerequisite');
  const item=model?.items?.find(x=>x.id===11);
  if(item?.code!=='loto'||item.name!=='抽獎卷'||
     item.priceRaw!=='2000'||item.price!==2000||
     item.limitRaw!=='50/20'||item.plusRaw!=='10m'||
     item.flagRaw!=='noshowcase|norequest'||item.funcbRaw!==null||
     compiled?.limits?.[10]?.limit!==50||
     compiled?.limits?.[10]?.wslimit!==20)
    fail('actual ITEM #11 compiled DSL/price/limit/flag changed');
  const position=model.items.indexOf(item);
  if(position<=0||!itemDsl)fail('source sort or item DSL missing');
  const items=parseDsl(itemDsl,'custom/inc-item-data.cgi').blocks;
  const block=items.filter(x=>x.kind==='ITEM'&&
    x.fields.no?.[0]?.value==='11');
  if(block.length!==1||block[0].fields.cost?.[0]?.value!=='10'||
     block[0].fields.pop?.[0]?.value!=='0'||
     block[0].fields.pricehalf?.length||
     block[0].fields.funcbuy?.length||
     block[0].fields.funcb?.length)
    fail('ITEM #11 upkeep, nosale, or wholesale price changed');
  return Object.freeze({
    source:B58_MARKET11_SOURCE,itemId:11,
    itemName:'抽獎卷',unitPrice:2000,stockLimit:50,
    wholesaleCapPerShop:20,
    upkeepPerTicket:10,marketTimeSeconds:600,
    sourceOnly:true,position,
    scope:'genuine original ITEM #11 market stock/purchase, protected by B-40 fixed Core; no UI or general market',
  });
}
export function quoteOriginalMarket11({world,model,reviewed}){
  if(reviewed?.source!==B58_MARKET11_SOURCE||
     !Array.isArray(model?.items)||model.items[reviewed.position]?.id!==11||
     !validateSourceSparseMarket(world?.market))
    fail('source-reviewed market and ITEM #11 required');
  const stock=safe(world.market.wholesale[10],'ticket wholesale');
  const shelf=model.items.slice(0,reviewed.position)
    .filter(item=>world.market.wholesale[item.id-1]>0).length;
  return Object.freeze({
    itemId:11,name:reviewed.itemName,price:reviewed.unitPrice,
    marketStock:stock,shelf:stock?shelf:null,
    owned:world.shops[0]?.item?.[10]??0,
    limit:reviewed.stockLimit,canBuy:stock>0&&world.shops.length===1,
  });
}
export function projectOriginalMarketBuy11({
  world,model,reviewed,shopId,requestedCount,marketShelf,expectedPrice,
}){
  safe(shopId,'shopId',1);
  safe(requestedCount,'requestedCount',1);
  safe(marketShelf,'marketShelf');
  safe(expectedPrice,'expectedPrice');
  if(reviewed?.source!==B58_MARKET11_SOURCE||
     !validateSourceSparseMarket(world?.market)||
     world.events!==null||world.shops?.length!==1)
    fail('source single-shop market required');
  const shop=world.shops[0];
  if(shop.id!==shopId||shop.status!==1||
     !Array.isArray(shop.item)||shop.item.length!==79)
    fail('original active source shop required');
  const owned=safe(shop.item[10],'owned tickets');
  if(owned>50)fail('original ticket carrying limit exceeded');
  const quote=quoteOriginalMarket11({world,model,reviewed});
  if(!quote.marketStock)fail('original ticket wholesale sold out');
  if(marketShelf!==quote.shelf||expectedPrice!==quote.price)
    fail('ticket shelf or source wholesale price stale');
  let count=Math.min(requestedCount,reviewed.stockLimit-owned);
  if(count<=0)fail('original ticket stock limit');
  count=Math.min(count,quote.marketStock);
  count=Math.min(count,Math.trunc(safe(shop.money,'money')/quote.price));
  if(count<=0)fail('insufficient original purchase money');
  const total=safe(count*quote.price,'total');
  const elapsed=world.nowSeconds-safe(shop.time,'time');
  if(elapsed<0)fail('original UseTime negative balance');
  const timeBase=elapsed>259200?world.nowSeconds-259200:shop.time;
  const updated={
    ...shop,item:[...shop.item],
    money:safe(shop.money-total,'money after ticket purchase'),
    paytoday:safe(shop.paytoday+total,'paytoday'),
    time:safe(timeBase+reviewed.marketTimeSeconds,'time spent'),
  };
  updated.item[10]=safe(owned+count,'tickets purchased');
  const wholesale=[...world.market.wholesale];
  wholesale[10]=safe(quote.marketStock-count,'post-buy wholesale');
  const present=new Set(wholesale.map((n,i)=>n>0||i===10?i:-1)
    .filter(i=>i>=0));
  const defined=[...present].sort((a,b)=>a-b);
  const csv=Array.from({length:79},(_,i)=>
    present.has(i)?String(wholesale[i]):'').join(',');
  const market={...world.market,wholesale,
    sparseWrittenSlots:defined,originalWholesaleCsv:csv,
    sourceWriteShape:'whole-store-79'};
  if(!validateSourceSparseMarket(market))
    fail('original wholesale 79-field disk shape changed');
  return {
    shops:[updated],market,
    receipt:{
      action:'buy-market-item-11',
      source:B58_MARKET11_SOURCE,shopId,
      requestedCount,purchasedCount:count,
      unitPrice:2000,totalPaid:total,tax:0,timeConsumedSeconds:600,
      moneyBefore:shop.money,moneyAfter:updated.money,
      ticketsBefore:owned,ticketsAfter:updated.item[10],
      marketBefore:quote.marketStock,marketAfter:wholesale[10],
      marketShelf:quote.shelf,scope:reviewed.scope,
    },
  };
}

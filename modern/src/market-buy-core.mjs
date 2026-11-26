/**
 * Shared, source-bounded wholesale market purchase execution.
 * Original Core: buy-s.cgi::buy, plug/whole.cgi::{GetWholeStore,SetWholeStore},
 * plug/item.cgi::GetTimeDeal and plug/calc.cgi::UseTime.
 *
 * A StreetModule supplies reviewed item rules, original sort order and its
 * wholesale wire codec. No item IDs, DSL evaluation or Perl execution here.
 * Source global FUNCBUY executes before any item FUNCBUY, both AFTER
 * accounting and BEFORE SetWholeStore; unreviewed effects fail closed.
 */
export const MARKET_BUY_COMMAND='market-buy';

function fail(reason){throw new RangeError('shared market buy: '+reason);}
function safe(value,label,min=0){
  if(!Number.isSafeInteger(value)||value<min)fail(label);
  return value;
}
function exactFields(command){
  const required=['kind','expectedRevision','shopId','itemId',
    'requestedCount','marketShelf','expectedPrice'];
  if(Object.keys(command).length!==required.length ||
     required.some(key=>!Object.hasOwn(command,key)))
    fail('market-buy command fields');
  if(command.kind!==MARKET_BUY_COMMAND)fail('command kind');
  safe(command.expectedRevision,'expectedRevision');
  safe(command.shopId,'shopId',1);
  safe(command.itemId,'itemId',1);
  safe(command.requestedCount,'requestedCount',1);
  safe(command.marketShelf,'marketShelf');
  safe(command.expectedPrice,'expectedPrice');
}
function checkedSum(a,b,label){return safe(a+b,label);}
function checkedProduct(a,b,label){return safe(a*b,label);}

/**
 * Returns a transaction proposal, never mutating the original WorldState.
 * The caller's GameCore snapshot and CAS adapter commit it atomically.
 */
export function projectSharedMarketBuy({world,command,marketBuy}){
  exactFields(command);
  if(!marketBuy||typeof marketBuy.getRule!=='function'||
     typeof marketBuy.validateWorld!=='function'||
     typeof marketBuy.writeMarket!=='function'||
     typeof marketBuy.quote!=='function'||
     !Array.isArray(marketBuy.order)||
     !Object.hasOwn(marketBuy,'globalBuyCallback'))
    fail('StreetModule reviewed wholesale contract unavailable');
  if(!marketBuy.validateWorld(world))
    fail('unsupported market, event or shop configuration');
  const rule=marketBuy.getRule(command.itemId);
  if(!rule){
    const support=marketBuy.describe?.(command.itemId);
    fail(support?.reason??'unknown original ITEM or unsupported source market purchase semantics');
  }
  if(rule.itemId!==command.itemId)fail('reviewed item mismatch');
  const shopIndex=safe(rule.shopIndex,'reviewed shop index');
  const wholesaleIndex=safe(rule.wholesaleIndex,'reviewed wholesale index');
  const stockLimit=safe(rule.stockLimit,'reviewed stock limit',1);
  // StreetModule computes the ORIGINAL market price and delivery time
  // from the currently observed wholesale stock (whole.cgi BASE pricehalf,
  // item.cgi GetTimeDeal). GameCore must not hard-code street DSL or ITEM IDs.
  const zero=rule.zeroPriceReviewed===true;
  safe(rule.unitPrice,'original base item PRICE',zero?0:1);
  if(zero&&(rule.unitPrice!==0||rule.basePrice!==0||rule.pricePolicy?.kind!=='fixed'))
    fail('invalid reviewed zero-price policy');
  safe(rule.marketTimeSeconds,'original base market transport time');
  if(typeof rule.source!=='string'||!rule.source)
    fail('missing original review provenance');
  if(!Array.isArray(world.shops)||world.shops.length!==1)
    fail('single-shop original purchase boundary');
  const shop=world.shops[0];
  if(shop.id!==command.shopId||shop.status!==1||
     !Array.isArray(shop.item)||shopIndex>=shop.item.length)
    fail('active original shop required');
  if(!Array.isArray(world.market?.wholesale)||
     wholesaleIndex>=world.market.wholesale.length)
    fail('original wholesale array required');
  const owned=safe(shop.item[shopIndex],'owned stock');
  const inMarket=safe(world.market.wholesale[wholesaleIndex],
    'wholesale stock');
  if(owned>stockLimit)fail('original item holding limit already exceeded');
  if(inMarket===0)fail('original wholesale item sold out');
  if(zero&&checkedSum(owned,inMarket,'zero-price street stock')>
      safe(rule.wholesaleLimit,'reviewed zero-price wholesale limit',1))
    fail('original zero-price total street stock cap');
  const quote=marketBuy.quote({rule,marketStock:inMarket,shop});
  if(inMarket>0&&(!quote||typeof quote!=='object'))
    fail('missing source-reviewed market quote');
  const price=inMarket>0?
    safe(quote.price,'reviewed actual market price',zero?0:1):null;
  const timeCost=inMarket>0?
    safe(quote.timeSeconds,'reviewed actual market time'):null;
  if(zero&&(price!==0||timeCost<1||timeCost>rule.marketTimeSeconds))
    fail('invalid reviewed fixed zero-price quote');

  // The shelf is the rank among in-stock goods in original source sort order.
  const place=marketBuy.order.findIndex(row=>
    row?.itemId===command.itemId&&row.wholesaleIndex===wholesaleIndex);
  if(place<0||marketBuy.order.some((row,i)=>
    i!==place&&row?.itemId===command.itemId))
    fail('invalid original source sort order');
  let shelf=0;
  for(let i=0;i<place;i++){
    const index=safe(marketBuy.order[i]?.wholesaleIndex,
      'source wholesale sort index');
    if(index>=world.market.wholesale.length)
      fail('source wholesale sort bounds');
    if(safe(world.market.wholesale[index],'source wholesale stock')>0)
      shelf++;
  }
  if(inMarket===0)fail('original wholesale item sold out');
  if(command.marketShelf!==shelf||command.expectedPrice!==price)
    fail('stale wholesale shelf or price');

  const cashMin=marketBuy.reviewedSignedCash===true?-Number.MAX_SAFE_INTEGER:0;
  const money=safe(shop.money,'shop money',cashMin);
  const paytoday=safe(shop.paytoday,'shop paytoday');
  const originalTime=safe(shop.time,'shop time');
  const remaining=safe(world.nowSeconds,'world time')-originalTime;
  if(remaining<0)fail('original UseTime negative balance');
  // Original buy-s.cgi clips by cash only when price > 0. A verified
  // zero PRICE still consumes the original positive transport time.
  let count=Math.min(command.requestedCount,stockLimit-owned,inMarket);
  if(price>0)count=Math.min(count,Math.trunc(money/price));
  if(!Number.isSafeInteger(count)||count<=0)
    fail('item limit, money or market stock prevents buying');
  const total=checkedProduct(count,price,'purchase total');
  const timeBase=remaining>259200?world.nowSeconds-259200:originalTime;
  const updatedShop={...shop,item:[...shop.item],
    money:safe(money-total,'post-buy money',cashMin),
    paytoday:checkedSum(paytoday,total,'post-buy paytoday'),
    time:checkedSum(timeBase,timeCost,'post-buy action time')};
  updatedShop.item[shopIndex]=checkedSum(owned,count,'post-buy item stock');
  const updatedWholesale=[...world.market.wholesale];
  updatedWholesale[wholesaleIndex]=safe(inMarket-count,
    'post-buy wholesale stock');

  // The source taxes the synthetic wholesale seller, not the buyer. Retain
  // actual GetSaleTax in the receipt without charging it twice.
  const tax=marketBuy.reviewedSignedCash===true&&price>0?Math.trunc(total*Math.min(99,Math.trunc(Math.max(0,price/rule.unitPrice-1)*5+0.5))/100):0;
  const sourceTax=price===0?0:tax;
  const receipt={
    action:MARKET_BUY_COMMAND,shopId:shop.id,itemId:rule.itemId,
    source:rule.source,scope:rule.scope??'source-reviewed subset',
    requestedCount:command.requestedCount,purchasedCount:count,
    unitPrice:price,totalPaid:total,tax:sourceTax,marketShelf:shelf,
    timeConsumedSeconds:timeCost,moneyBefore:money,
    moneyAfter:updatedShop.money,paytodayBefore:paytoday,
    paytodayAfter:updatedShop.paytoday,stockBefore:owned,
    stockAfter:updatedShop.item[shopIndex],
    marketBefore:inMarket,marketAfter:updatedWholesale[wholesaleIndex],
  };
  let finalShop=updatedShop,finalWholesale=updatedWholesale;
  // Original buy-s.cgi calls global FUNCBUY first, then per-item FUNCBUY;
  // both see the buyer AFTER payment/stock transfers but BEFORE SetWholeStore.
  // For the reviewed Standard Street DSL, global FUNCBUY grants a voucher
  // only above a 500000 G purchase threshold; ordinary smaller buys are
  // verified zero-effect, not an assumption that the global hook is absent.
  const global=marketBuy.globalBuyCallback;
  if(global!==null){
    if(!global||typeof global!=='object'||
       typeof global.source!=='string'||!global.source||
       typeof global.key!=='string'||!global.key)
      fail('unreviewed global FUNCBUY metadata');
    const threshold=safe(global.minTotal,'global FUNCBUY threshold',1);
    if(total>=threshold){
      if(typeof marketBuy.runBuyCallback!=='function')
        fail('unreviewed global FUNCBUY callback');
      const result=marketBuy.runBuyCallback({
        key:global.key,phase:'global',world,command,rule,
        shop:finalShop,wholesale:finalWholesale,receipt,
      });
      if(!result||!result.shop||!Array.isArray(result.wholesale))
        fail('reviewed global FUNCBUY result');
      finalShop=result.shop;finalWholesale=result.wholesale;
    }
  }
  if(rule.buyCallback!==null){
    if(typeof rule.buyCallback!=='string'||!rule.buyCallback||
       typeof marketBuy.runBuyCallback!=='function')
      fail('unreviewed item FUNCBUY callback');
    const result=marketBuy.runBuyCallback({
      key:rule.buyCallback,phase:'item',world,command,rule,
      shop:finalShop,wholesale:finalWholesale,receipt,
    });
    if(!result||!result.shop||!Array.isArray(result.wholesale))
      fail('reviewed item FUNCBUY result');
    finalShop=result.shop;finalWholesale=result.wholesale;
  }
  const market=marketBuy.writeMarket({
    market:world.market,wholesale:finalWholesale,
    itemId:rule.itemId,wholesaleIndex,
  });
  if(!marketBuy.validateWorld({...world,market}))
    fail('invalid original wholesale write representation');
  return {shops:[finalShop],market,receipt};
}

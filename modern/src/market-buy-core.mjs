/**
 * Shared, source-bounded wholesale market purchase execution.
 * Original Core: buy-s.cgi::buy, plug/whole.cgi::{GetWholeStore,SetWholeStore},
 * plug/item.cgi::GetTimeDeal and plug/calc.cgi::UseTime.
 *
 * A StreetModule supplies reviewed item rules, original sort order and its
 * wholesale wire codec. No item IDs, DSL evaluation or Perl execution here.
 * The optional reviewed buy callback runs AFTER accounting and BEFORE the
 * market write, matching the original buy-s.cgi lifecycle.
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
     !Array.isArray(marketBuy.order))
    fail('StreetModule reviewed wholesale contract unavailable');
  if(!marketBuy.validateWorld(world))
    fail('unsupported market, event or shop configuration');
  const rule=marketBuy.getRule(command.itemId);
  if(!rule)fail('item has no source-reviewed market purchase semantics');
  if(rule.itemId!==command.itemId)fail('reviewed item mismatch');
  const shopIndex=safe(rule.shopIndex,'reviewed shop index');
  const wholesaleIndex=safe(rule.wholesaleIndex,'reviewed wholesale index');
  const stockLimit=safe(rule.stockLimit,'reviewed stock limit',1);
  const price=safe(rule.unitPrice,'reviewed wholesale price',1);
  const timeCost=safe(rule.marketTimeSeconds,'reviewed market time');
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

  const money=safe(shop.money,'shop money');
  const paytoday=safe(shop.paytoday,'shop paytoday');
  const originalTime=safe(shop.time,'shop time');
  const remaining=safe(world.nowSeconds,'world time')-originalTime;
  if(remaining<0)fail('original UseTime negative balance');
  let count=Math.min(command.requestedCount,stockLimit-owned,inMarket,
    Math.trunc(money/price));
  if(!Number.isSafeInteger(count)||count<=0)
    fail('item limit, money or market stock prevents buying');
  const total=checkedProduct(count,price,'purchase total');
  const timeBase=remaining>259200?world.nowSeconds-259200:originalTime;
  const updatedShop={...shop,item:[...shop.item],
    money:safe(money-total,'post-buy money'),
    paytoday:checkedSum(paytoday,total,'post-buy paytoday'),
    time:checkedSum(timeBase,timeCost,'post-buy action time')};
  updatedShop.item[shopIndex]=checkedSum(owned,count,'post-buy item stock');
  const updatedWholesale=[...world.market.wholesale];
  updatedWholesale[wholesaleIndex]=safe(inMarket-count,
    'post-buy wholesale stock');

  const receipt={
    action:MARKET_BUY_COMMAND,shopId:shop.id,itemId:rule.itemId,
    source:rule.source,scope:rule.scope??'source-reviewed subset',
    requestedCount:command.requestedCount,purchasedCount:count,
    unitPrice:price,totalPaid:total,tax:0,marketShelf:shelf,
    timeConsumedSeconds:timeCost,moneyBefore:money,
    moneyAfter:updatedShop.money,paytodayBefore:paytoday,
    paytodayAfter:updatedShop.paytoday,stockBefore:owned,
    stockAfter:updatedShop.item[shopIndex],
    marketBefore:inMarket,marketAfter:updatedWholesale[wholesaleIndex],
  };
  let finalShop=updatedShop,finalWholesale=updatedWholesale;
  // The actual source invokes global and item-specific FUNCBUY after monetary
  // and inventory changes, before SetWholeStore. Only a reviewed JS callback
  // may run here; unsupported original Perl callbacks must fail closed.
  if(rule.buyCallback!==null){
    if(typeof rule.buyCallback!=='string'||!rule.buyCallback||
       typeof marketBuy.runBuyCallback!=='function')
      fail('unreviewed source FUNCBUY callback');
    const effect=marketBuy.runBuyCallback({
      key:rule.buyCallback,world,command,rule,
      shop:updatedShop,wholesale:updatedWholesale,receipt,
    });
    if(!effect||!effect.shop||!Array.isArray(effect.wholesale))
      fail('reviewed buy callback result');
    finalShop=effect.shop;
    finalWholesale=effect.wholesale;
  }
  const market=marketBuy.writeMarket({
    market:world.market,wholesale:finalWholesale,
    itemId:rule.itemId,wholesaleIndex,
  });
  if(!marketBuy.validateWorld({...world,market}))
    fail('invalid original wholesale write representation');
  return {shops:[finalShop],market,receipt};
}

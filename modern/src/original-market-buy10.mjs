/**
 * B-40: source-guarded real Standard Street market purchase for ITEM #10 only.
 * Frozen Core buy-s.cgi / plug/whole.cgi / item.cgi / calc.cgi.
 * Prices, stock, time and counters are computed in StreetModule, never UI.
 * No CGI/auth, other items, guilds, callbacks, disk persistence or full turn.
 */
import {validateSourceSparseMarket} from './original-admin-world-bootstrap.mjs';

const fail = message => {throw new RangeError('B-40 original market purchase: '+message);};
const requireSource = (source,needle) => {
  if(typeof source!=='string'||!source.includes(needle))
    fail('frozen original source drift: '+needle);
};
const safe = (value,key,min=0) => {
  if(!Number.isSafeInteger(value)||value<min)fail(key);
  return value;
};

export function reviewOriginalMarketBuy10({
  buySource,wholeSource,itemSource,calcSource,compilerSource,
  model,compiled,
}){
  for(const marker of [
    '$num=CheckCount($Q{num1},$Q{num2},0,$ITEM[$itemno]->{limit}-$DT->{item}[$itemno-1]);',
    '$DTS=GetWholeStore();',
    '$num=$DTS->{item}[$itemno-1] if $DTS->{item}[$itemno-1]<$num;',
    '$num=int($DT->{money}/$price) if ($DT->{money}<$num*$price && $price > 0);',
    '$TIME_SEND_ITEM=int($TIME_SEND_ITEM/2) if !$id;',
    'UseTime($usetime);',
    '$DTS->{item}[$itemno-1]-=$num;',
    '$DT->{item}[$itemno-1]+=$num;',
    '$DT->{money}-=$num*$price;',
    '$DT->{paytoday}+=$num*$price;',
    'SetWholeStore($DTS) if $id==0;',
  ]) requireSource(buySource,marker);
  for(const marker of [
    'sub GetWholeStore', 'my @wholelist=grep($DTwholestore[$_],0..$MAX_ITEM-1);',
    'sort {$sortkey[$a]<=>$sortkey[$b]} @wholelist',
    'if($ITEM->{pricehalf})', 'sub SetWholeStore',
    '$DTwholestore[$i]=$DT->{item}[$i];',
  ])requireSource(wholeSource,marker);
  for(const marker of ['sub GetTimeDeal','return int($TIME_SEND_ITEM*$mul);',
    'sub GetSaleTax'])requireSource(itemSource,marker);
  for(const marker of ['sub CheckCount','sub UseTime',
    '$DT->{time}+=$tm;'])requireSource(calcSource,marker);
  requireSource(compilerSource,'foreach(0..$#out_item){$out_item[$_]->{sort}=$_;};');
  const item=model?.items?.find(entry=>entry.id===10);
  if(!item || item.code!=='book-make'||item.name!=='書本寫作工具'||
     item.priceRaw!=='5000'||item.price!==5000||item.limitRaw!=='20/10'||
     item.plusRaw!=='20m'||item.funcbRaw!==null)fail('ITEM #10 DSL drift');
  if(model.items[0]!==item)fail('source item sort order drift');
  if(compiled?.limits?.[9]?.limit!==20||
     compiled.limits[9].wslimit!==10)fail('compiled ITEM #10 limits drift');
  return Object.freeze({
    itemId:10,itemName:item.name,unitPrice:item.price,stockLimit:20,
    wholesaleCapPerShop:10,marketTimeSeconds:600,
    source:'fixed buy-s.cgi + whole.cgi + item.cgi + calc.cgi + DSL ITEM #10',
    scope:'real original source numeric market purchase; item #10 only, single shop, no guild or item buy callback',
  });
}

/** Quote is read-only. Market shelf is the index in the original source
 * declaration sort order, over only positive wholesale entries. */
export function quoteOriginalMarket10({world,model,reviewed}){
  if(!reviewed||reviewed.itemId!==10||!model?.items?.length)
    fail('source-reviewed model required');
  if(!validateSourceSparseMarket(world?.market))fail('source market required');
  const stock=safe(world.market.wholesale[9],'#10 source wholesale');
  const shelf=model.items.filter(entry=>entry.id!==10&&
    model.items.indexOf(entry)<model.items.findIndex(item=>item.id===10)&&
    world.market.wholesale[entry.id-1]>0).length;
  return Object.freeze({
    itemId:10,name:reviewed.itemName,price:reviewed.unitPrice,
    marketStock:stock,shelf:stock?shelf:null,
    owned:world.shops[0]?.item?.[9]??0,
    limit:reviewed.stockLimit,canBuy:stock>0&&world.shops.length===1,
  });
}

export function projectOriginalMarketBuy10({
  world,model,reviewed,shopId,requestedCount,marketShelf,expectedPrice,
}){
  safe(shopId,'shopId',1);
  safe(requestedCount,'requestedCount',1);
  safe(marketShelf,'marketShelf');
  safe(expectedPrice,'expectedPrice');
  if(!reviewed||reviewed.itemId!==10||!validateSourceSparseMarket(world?.market)||
     world.events!==null||world.shops.length!==1)fail('reviewed single-shop source market required');
  const shop=world.shops[0];
  if(shop.id!==shopId||shop.status!==1||!Array.isArray(shop.item)||
     shop.item.length!==79)fail('active source shop');
  const owned=safe(shop.item[9],'owned #10');
  if(owned>20)fail('original #10 limit already exceeded');
  const quote=quoteOriginalMarket10({world,model,reviewed});
  if(!quote.marketStock)fail('市場無貨：原版 CheckItemNo 拒絕');
  if(marketShelf!==quote.shelf||expectedPrice!==quote.price)
    fail('商品或市場價格已變動，請重新整理');
  // Original CheckCount clamps to remaining inventory room, then buy-s.cgi
  // clamps to wholesale and affordable quantity. It rejects only when zero.
  let count=Math.min(requestedCount,reviewed.stockLimit-owned);
  if(count<=0)fail('店內商品 #10 已達原版上限 20');
  count=Math.min(count,quote.marketStock);
  count=Math.min(count,Math.trunc(shop.money/quote.price));
  if(count<=0)fail('現金不足：原版買入量調整後為 0');
  // Original market has no guild; ITEM #10 baseprice=price=5000,
  // GetSaleTax(..., 0) => zero. Market purchase halves TIME_SEND_ITEM.
  const total=safe(count*quote.price,'total');
  const remaining=world.nowSeconds-shop.time;
  if(remaining<0)fail('行動時間不足：原版 UseTime 拒絕');
  const timeBase=remaining>259200?world.nowSeconds-259200:shop.time;
  const nextShop={
    ...shop,
    item:[...shop.item],
    money:safe(shop.money-total,'money after purchase'),
    paytoday:safe(shop.paytoday+total,'paytoday'),
    time:safe(timeBase+reviewed.marketTimeSeconds,'time after purchase'),
  };
  nextShop.item[9]=safe(owned+count,'owned #10 after purchase');
  const nextWholesale=[...world.market.wholesale];
  nextWholesale[9]=safe(quote.marketStock-count,'wholesale after purchase');
  // Original SetWholeStore loops over all 79 slots of the virtual market.
  // It writes undef for all absent market goods; the bought listing still
  // has a defined 0 slot after being sold out.
  const defined=nextWholesale.map((n,i)=>n>0||i===9?i:-1).filter(i=>i>=0);
  const present=new Set(defined);
  // Source SetWholeStore writes all MAX_ITEM=79 positions, even when the
  // last values are undef. Perl join preserves trailing empty CSV fields.
  // Trimming to last defined item loses source wire identity.
  const csv=Array.from({length:79},(_,i)=>
    present.has(i)?String(nextWholesale[i]):'').join(',');
  const market={...world.market,wholesale:nextWholesale,
    sparseWrittenSlots:defined,originalWholesaleCsv:csv};
  if(!validateSourceSparseMarket(market))fail('post-buy source wire consistency');
  return {
    shops:[nextShop],market,
    receipt:{
      action:'buy-market-item-10',source:reviewed.source,requestedCount,
      purchasedCount:count,unitPrice:quote.price,totalPaid:total,
      timeConsumedSeconds:reviewed.marketTimeSeconds,tax:0,
      moneyBefore:shop.money,moneyAfter:nextShop.money,
      stockBefore:owned,stockAfter:nextShop.item[9],
      marketBefore:quote.marketStock,marketAfter:nextWholesale[9],
      paytodayBefore:shop.paytoday,paytodayAfter:nextShop.paytoday,
      marketShelf:quote.shelf,scope:reviewed.scope,
    },
  };
}

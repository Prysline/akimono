/**
 * B-39: Actual Standard Street ITEM #70 ("那由多的項鍊") inline FUNCT
 * via source-executed original inc-turn FUNCTURN dispatch.
 * Controlled original natural-sale region -> this original callback only ->
 * original all 59 PLUS + CheckWholeStore. Explicitly SKIPS original
 * FUNCSALE, other callbacks, SortDT and period settlement.
 *
 * Displayed #70 unit is ARTIFICIAL fixture, not an invented acquisition.
 * B-37 original public <=3600s cap stays unchanged; internal source-reviewed
 * fixed 8640-second span is separately checked by Perl.
 */
import {parseDsl} from './parse-dsl.mjs';
import {ORIGINAL_SPARSE_MARKET_SOURCE,validateSourceSparseMarket}
  from './original-admin-world-bootstrap.mjs';
import {ALL_PLUS_SOURCE,projectOriginalSparseAllPlus}
  from './original-sparse-all-plus.mjs';
import {NATURAL_PLUS_SOURCE} from './original-natural-sale-plus.mjs';

export const NAYUTA_FUNCTURN_SOURCE='core-b39-original-item70-functurn-8640';
const bad=s=>{throw new RangeError('B-39 source FUNCTURN: '+s);};
const guard=(s,needle)=>{if(typeof s!=='string'||!s.includes(needle))
  bad('frozen original code drift: '+needle);};
const first=(b,key)=>b?.fields[key]?.[0]?.value;
function isSafe(n,min=0){return Number.isSafeInteger(n)&&n>=min;}
export function reviewOriginalNayutaFuncturn({
  itemDsl,turnSource,compilerSource,reviewedNaturalPlus,reviewedAllPlus,
}){
  if(reviewedNaturalPlus?.source!==NATURAL_PLUS_SOURCE||
    reviewedAllPlus?.source!==ALL_PLUS_SOURCE||
    reviewedAllPlus?.activeCount!==59||
    reviewedAllPlus?.maxUsers!==50||
    reviewedAllPlus?.population!==500000)
    bad('B-37/B-38 reviewed prerequisites missing');
  for(const marker of [
    'my @itemt=sort {$a->{no}<=>$b->{no}} grep($_->{functurn},@ITEM);',
    '@item::TURN_DT=grep($_->{item}[$item->{no}-1],@DT);',
    '&$func($item,@item::TURN_DT);',
    'undef &$func if !$funcexists;',
    '#@@item funct 処理','#@@item funcs 処理',
  ])guard(turnSource,marker);
  for(const marker of [
    'sub GetLocalFunction',
    '$g_item->{functurn},$g_item->{localfuncturn}',
    'sub $item->{functurn} {eval(<<',
  ])guard(compilerSource,marker);
  const itemBlocks=parseDsl(itemDsl,'custom/inc-item-data.cgi').blocks
    .filter(b=>b.kind==='ITEM');
  if(itemBlocks.length!==79)bad('79 source items required');
  const callbacks=itemBlocks.filter(b=>b.fields.funct?.length);
  if(callbacks.length!==1||first(callbacks[0],'no')!=='70'||
    first(callbacks[0],'funct')!=='_local_')
    bad('only fixed real #70 FUNCT supported');
  const nayuta=callbacks[0];
  for(const [key,val] of Object.entries({
    code:'sousyoku-nayuta',name:'那由多的項鍊',
    price:'50000',cost:'200',limit:'1/0',pop:'2d',
  }))if(first(nayuta,key)!==val)bad('#70 original '+key+' drift');
  if(nayuta.fields.funcs?.length||nayuta.fields.funcb?.length)
    bad('#70 unreviewed sales/purchase callback');
  const raw=nayuta.raw;
  for(const marker of [
    'funct\t_local_',
    'my($ITEM,@DT)=@_;',
    'my $rankup=$TIMESPAN/86.4;',
    '$rankup=$rankup<1 && rand(1)<$rankup ? 1 : int($rankup);',
    'next if $DT->{showcase}[0]!=$ITEM->{no} || $DT->{price}[0]>$ITEM->{price};',
    '$DT->{rank}+=$rankup;',
    '$DT->{rank}=10000 if $DT->{rank}>10000;',
    'DebugLog("item $ITEM->{name} $DT->{shopname}',
  ])guard(raw,marker);
  if(!/^\s*_local_\s*$/m.test(raw))bad('#70 local callback terminator');
  return Object.freeze({
    source:NAYUTA_FUNCTURN_SOURCE,
    itemId:70,itemName:'那由多的項鍊',itemPrice:50000,
    itemCost:200,popularSeconds:172800,
    point:Math.trunc(172800*100/24/36),
    timespanSeconds:8640,
    callbackRankUnits:100,
    giftCount:5,giftCost:10,
    oneShopSaleSpeed:12,
    scope:'reviewed original source natural region then only actual ITEM70 FUNCTURN, skip FUNCSALE/SortDT/period, original all59 PLUS at reviewed 8640s',
  });
}

/**
 * Independent reviewed #70 callback body, without a WorldState/turn.
 * The original FUNCTURN dispatcher determines the stocked-shop candidates;
 * this subroutine itself only checks shelf0 and its price.
 */
export function projectNayutaCallbackOnly({
  reviewed,rank,showcaseItemId,listedPrice,timespanSeconds,randomDraws,shopName,
}){
  if(reviewed?.source!==NAYUTA_FUNCTURN_SOURCE||
     reviewed.itemPrice!==50000)bad('callback original source prerequisites');
  if(!isSafe(rank)||rank>10000||
     ![0,70].includes(showcaseItemId)||
     !isSafe(listedPrice)||!isSafe(timespanSeconds,1)||timespanSeconds>8640||
     !Array.isArray(randomDraws)||randomDraws.length>1||
     randomDraws.some(v=>!isSafe(v)||v>=1000000)||
     typeof shopName!=='string'||shopName.length>200)
    bad('single callback source input');
  let amount=timespanSeconds/86.4,used=0;
  if(amount<1){
    if(randomDraws.length!==1)bad('required original conditional rand');
    amount=randomDraws[used++]/1000000<amount?1:Math.trunc(amount);
  }else amount=Math.trunc(amount);
  if(used!==randomDraws.length)bad('unused original callback rand sample');
  const applied=amount>0&&showcaseItemId===70&&listedPrice<=reviewed.itemPrice;
  const after=applied?Math.min(10000,rank+amount):rank;
  return {rank:after,drawsUsed:used,rankAdded:after-rank,
    debugMessages:applied?
      ['item '+reviewed.itemName+' '+shopName+' 人気 +'+amount/100+'%']:[],
  };
}

export function projectOriginalNayutaFuncturn({
  world,reviewed,reviewedAllPlus,compiled,randomDraws,
}){
  if(reviewed?.source!==NAYUTA_FUNCTURN_SOURCE||
    reviewed.itemId!==70||reviewed.itemPrice!==50000||
    reviewed.itemCost!==200||reviewed.popularSeconds!==172800||
    reviewed.point!==20000||reviewed.timespanSeconds!==8640||
    reviewed.callbackRankUnits!==100||reviewed.giftCount!==5||
    reviewed.giftCost!==10||reviewed.oneShopSaleSpeed!==12||
    reviewedAllPlus?.source!==ALL_PLUS_SOURCE)
    bad('reviewed fixed source/compiled constants missing');
  if(!Array.isArray(randomDraws)||randomDraws.length>119||
    randomDraws.some(n=>!isSafe(n)||n>=1000000))
    bad('source millionth random stream, at most 119');
  if(world?.market?.source!==ORIGINAL_SPARSE_MARKET_SOURCE||
     !validateSourceSparseMarket(world.market)||
     world.market.originalWholesaleCsv!==''||
     world.market.sparseWrittenSlots.length!==0||
     world.events!==null||world.nowSeconds!==1000000||
     !Array.isArray(world.shops)||world.shops.length!==1)
    bad('fresh source original one-shop world required');
  if(!Array.isArray(compiled?.limits)||compiled.limits.length!==79||
    compiled.limits[69]?.wslimit!==0)bad('source #70 wholesale cap');
  const shop=world.shops[0],stock=shop?.item;
  if(shop?.status!==1||shop.rank!==5010||shop.money!==100000||
     shop.showcasecount!==1||
     !Array.isArray(shop.showcase)||shop.showcase.length!==1||
     !Array.isArray(shop.price)||shop.price.length!==1||
     !Array.isArray(stock)||stock.length!==79||
     stock[62]!==1||stock[78]!==5||![0,1].includes(stock[69])||
     stock.some((v,i)=>!isSafe(v)||(![62,69,78].includes(i)&&v!==0))||
     ![0,70].includes(shop.showcase[0])||
     (shop.showcase[0]===0&&(stock[69]!==0||shop.price[0]!==0))||
     (shop.showcase[0]===70&&(stock[69]!==1||shop.price[0]!==50000))||
     ![undefined,0].includes(shop.trush)||
     shop.saletoday!==0||shop.taxtoday!==0||shop.costtoday!==0||
     Object.keys(shop.itemtoday??{}).length!==0||
     Object.keys(shop.itemyesterday??{}).length!==0)
    bad('only blank original new shop or explicitly artificial #70 showcase');
  const displayed=stock[69]===1,span=reviewed.timespanSeconds;
  let consumed=0;
  if(displayed){
    if(randomDraws.length===0)bad('natural sale random draw missing');
    // Source: single-shop rank cancels out, original buy base is exactly 1
    // for a price==50000 showcased stock. Forced rand(people)=0 => no sale.
    const buyers=reviewedAllPlus.population*reviewed.oneShopSaleSpeed/
      reviewed.popularSeconds*span/86400/2;
    if(!(buyers>0))bad('positive original source buyer rate missing');
    if(randomDraws[0]!==0)bad('only source-proven unsold ITEM70 case supported');
    consumed++;
  }
  const trushBefore=0;
  const rankDown=Math.sqrt(span)*(shop.rank/1000)**5/(5**5*20)*
    shop.showcasecount*(0.75+trushBefore/10000000);
  if(rankDown<1)bad('source rank-down RNG case not reviewed');
  const rankAfterNatural=Math.max(0,Math.min(10000,
    shop.rank-Math.trunc(rankDown)));
  const callbackIncrease=displayed?reviewed.callbackRankUnits:0;
  const rankAfterCallback=Math.min(10000,rankAfterNatural+callbackIncrease);
  const upkeep=stock[78]*reviewed.giftCost+
    (displayed?stock[69]*reviewed.itemCost/10:0);
  const accrued=upkeep*span/86400;
  if(!isSafe(accrued))bad('source fraction cannot enter JSON-only world');
  const nextShop={
    ...shop,rank:rankAfterCallback,temprank:shop.rank+(displayed?1000:0),
    trush:Math.trunc(accrued),costtoday:accrued,
    _sale_count_:{},
  };
  const plus=projectOriginalSparseAllPlus({
    world:{...world,shops:[nextShop]},compiled,reviewed:reviewedAllPlus,
    timespanSeconds:span,randomDraws:randomDraws.slice(consumed),
    reviewedB39Span8640:true,
  });
  const log=displayed?
    ['item '+reviewed.itemName+' '+shop.shopname+' 人気 +1%']:[];
  return {
    shops:plus.shops,market:plus.market,
    receipt:{
      action:'reviewed-nayuta-functurn',source:NAYUTA_FUNCTURN_SOURCE,
      fixture:displayed?'artificial #70 one stocked and showcased':'actual original empty showcase',
      saleCount:0,naturalDrawsUsed:consumed,
      rankAfterNatural,rankAfterCallback,
      callback:{itemId:70,invokedByOriginalLoop:true,
        matchingShops:displayed?1:0,rankIncrease:callbackIncrease,debugMessages:log},
      plusDrawsUsed:plus.receipt.drawsUsed,
      drawsUsed:consumed+plus.receipt.drawsUsed,
      originalWholesaleCsv:plus.market.originalWholesaleCsv,
      sparseWrittenSlots:plus.market.sparseWrittenSlots,
      scope:'source real natural-sale region + source real ITEM70 FUNCTURN dispatcher/body + 59 PLUS; other callbacks, SortDT, period, time, acquisition, persistence SKIPPED',
    },
  };
}

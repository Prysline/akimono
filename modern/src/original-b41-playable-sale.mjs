/**
 * B-41 source-gated single-store natural-sale + exact original 59 PLUS loop.
 * Real #10 must come through the B-40 market command in the live HTTP flow;
 * unlike B-38, NO artificial stock is written or permitted by this command.
 * Only ITEM #10 at its reviewed original price, no sale/turn callbacks.
 * Original period settlement, other merchandise, auth/disk/multiplayer remain
 * unsupported. Time is advanced by an explicit isolated local test slice.
 */
import {NATURAL_PLUS_SOURCE} from './original-natural-sale-plus.mjs';
import {ALL_PLUS_SOURCE,projectOriginalSparseAllPlus}
  from './original-sparse-all-plus.mjs';
import {validateSourceSparseMarket}
  from './original-admin-world-bootstrap.mjs';
import {PERIOD_WORLD_SCHEMA} from './game-core-contract.mjs';
import {B58_MARKET11_SOURCE} from './original-market-buy11.mjs';
import {B59_IRON_SOURCE,isReviewedB59EventPeriod,isB59IronActive}
  from './original-b59-iron-event-lifecycle.mjs';
import {B60_HAPPY_SOURCE,B60_HAPPY_CODE,isReviewedB60HappyPeriod}
  from './original-b60-happy-event-nowfunc.mjs';
import {B61_SWORD_SOURCE,B61_SWORD_CODE,isReviewedB61SwordPeriod,
  projectOriginalSwordDemand}
  from './original-b61-sword-demand-event.mjs';
import {validateOriginalPeriodSeed} from './original-period-world-seed.mjs';
import {B62_MAP_SOURCE} from './original-b62-sword-map-acquisition.mjs';

export const B41_SOURCE='b41-real-market10-showcase-natural-region-then-59-plus';
const bad=x=>{throw new RangeError('B-41 original sale boundary: '+x);};
const safe=(x,label,min=0)=>{
  if(!Number.isSafeInteger(x)||x<min)bad(label);
  return x;
};
export function reviewB41Sale({reviewedNatural,reviewedBuy,reviewedAllPlus,
  configSource,reviewedMarket11=null,reviewedB59Iron=null,
  reviewedB60Happy=null,reviewedB61Sword=null,reviewedB62Map=null}){
  // Exact fixed Core inc-turn clock: NOW_TIME + TZ_JST - DATE_REVISE_TIME.
  if(typeof configSource!=='string'||
     !/\$ONE_DAY_TIME\s*=\s*3600\*36\s*;/.test(configSource)||
     !/\$DATE_REVISE_TIME\s*=\s*3600\*6\s*;/.test(configSource)||
     !/\$TZ_JST\s*=\s*60\*60\*9\s*;/.test(configSource))
    bad('fixed original 36-hour period and JST/revision offsets changed');
  if(reviewedNatural?.source!==NATURAL_PLUS_SOURCE||
    reviewedNatural.saleItemId!==10||reviewedNatural.salePrice!==5000||
    reviewedNatural.popularSeconds!==1728000||reviewedNatural.point!==200000||
    reviewedNatural.bookCost!==100||reviewedNatural.giftCost!==10||
    reviewedNatural.saleSpeed!==12||reviewedNatural.popDownRate!==5||
    reviewedNatural.userTaxRate!==0||
    reviewedBuy?.itemId!==10||reviewedBuy.unitPrice!==5000||
    reviewedBuy.stockLimit!==20||reviewedAllPlus?.source!==ALL_PLUS_SOURCE)
    bad('frozen B-38/B-40 source contracts must both be reviewed');
  if(reviewedMarket11!==null&&(
     reviewedMarket11.source!==B58_MARKET11_SOURCE||
     reviewedMarket11.itemId!==11||reviewedMarket11.unitPrice!==2000||
     reviewedMarket11.stockLimit!==50||reviewedMarket11.upkeepPerTicket!==10))
    bad('B-58 ticket market source review changed');
  if(reviewedB59Iron!==null&&(
     reviewedB59Iron?.source!==B59_IRON_SOURCE||
     reviewedB59Iron.itemId!==5||reviewedB59Iron.plusSeconds!==720))
    bad('source reviewed B-59 iron event changed');
  if(reviewedB60Happy!==null&&(
     reviewedB60Happy.source!==B60_HAPPY_SOURCE||
     reviewedB60Happy.startProba!==100||
     reviewedB60Happy.rankCap!==10000))
    bad('source reviewed B-60 happy NOWFUNC changed');
  if(reviewedB61Sword!==null&&(
     reviewedB61Sword.source!==B61_SWORD_SOURCE||
     reviewedB61Sword.startProba!==100||
     reviewedB61Sword.swordItems?.length!==5))
    bad('source reviewed B-61 sword popular/2 changed');
  if(reviewedB62Map!==null&&(
     reviewedB62Map.source!==B62_MAP_SOURCE||
     reviewedB62Map.swordItemId!==40||
     reviewedB62Map.woodPrice!==1200||
     reviewedB62Map.mapItemId!==14))
    bad('B-62 real sword map acquisition source drift');
  return Object.freeze({
    source:B41_SOURCE,itemId:10,unitPrice:5000,
    swordMapSource:reviewedB62Map?.source??null,
    swordEventSource:reviewedB61Sword?.source??null,
    happyEventSource:reviewedB60Happy?.source??null,
    ironEventSource:reviewedB59Iron?.source??null,
    ticketSourceReviewed:reviewedMarket11!==null,
    maxMinutes:60,periodSeconds:129600,clockShiftSeconds:10800,sourceScope:'single reviewed #10 natural-sale region, followed by 59 original PLUS and CheckWholeStore; no callbacks, sorting, period settlement, persistence or other items',
  });
}

export function projectB41Sale({
  world,reviewed,reviewedAllPlus,compiled,shopId,minutes,randomDraws,
  reviewedB59Iron=null,reviewedB60Happy=null,
  reviewedB61Sword=null,reviewedB62Map=null,
  reviewedEventTimeSlice=false,
}){
  if(reviewed?.source!==B41_SOURCE||reviewedAllPlus?.source!==ALL_PLUS_SOURCE)
    bad('source review missing');
  safe(shopId,'shopId',1);
  safe(minutes,'minutes',1);
  if(minutes>reviewed.maxMinutes)bad('one local source slice cannot exceed 60 minutes');
  const span=safe(minutes*60,'timespan');
  if(!Array.isArray(randomDraws)||randomDraws.length>121||
    randomDraws.some(v=>!Number.isSafeInteger(v)||v<0||v>=1000000))
    bad('exact shared original random samples must be integer millionths');
  if(!validateSourceSparseMarket(world?.market)||
    world.market.sourceWriteShape!=='whole-store-79'||
    world.events!==null||world.shops?.length!==1)
    bad('real post-purchase source wholesale world required');
  if(reviewed.ironEventSource!==(reviewedB59Iron?.source??null)||
     reviewed.happyEventSource!==(reviewedB60Happy?.source??null)||
     reviewed.swordEventSource!==(reviewedB61Sword?.source??null)||
     reviewed.swordMapSource!==(reviewedB62Map?.source??null))
    bad('source durable event contracts mismatch');
  if(world.schema===PERIOD_WORLD_SCHEMA&&
     !validateOriginalPeriodSeed(world.period)&&
     !isReviewedB59EventPeriod({
       period:world.period,reviewed:reviewedB59Iron,
       nowSeconds:world.nowSeconds,
     })&&
     !isReviewedB60HappyPeriod({
       period:world.period,reviewed:reviewedB60Happy,
       nowSeconds:world.nowSeconds,
     })&&
     !isReviewedB61SwordPeriod({
       period:world.period,reviewed:reviewedB61Sword,
       nowSeconds:world.nowSeconds,
     }))
    bad('source-initialized city and known EVENT state required');
  // Legacy B-41 intentionally marks all unknown prior EVENT instances
  // NULL. Do not claim an iron modifier is active in that case, but do
  // preserve B-41's existing best-effort no-event non-equivalence behavior.
  const activeKeys=world.schema===PERIOD_WORLD_SCHEMA&&
    world.period?.eventState!==null&&
    typeof world.period?.eventState==='object'?
    Object.keys(world.period.eventState):[];
  const ironEventActive=activeKeys.includes('plusup-tetu');
  const happyEventActive=activeKeys.includes(B60_HAPPY_CODE);
  const swordDemandEventActive=activeKeys.includes(B61_SWORD_CODE);
  if((ironEventActive||happyEventActive||swordDemandEventActive)&&
     reviewedEventTimeSlice!==true)
    bad('known active EVENT requires fully reviewed lifecycle before advancing time');
  // B-61 source popular/2 is read at turn start. B-62 authorizes the
  // source-purchased #14 map -> source-created #40 sword market route;
  // never create or sell swords from the preview alone.
  const sourceSwordDemandPreview=reviewedB61Sword&&
    world.schema===PERIOD_WORLD_SCHEMA&&
    world.period?.eventState!==null?
    projectOriginalSwordDemand({
      reviewed:reviewedB61Sword,timespanSeconds:span,
      activeAtDataRead:swordDemandEventActive,
      population:world.period.dtPeople,saleSpeed:12,
    }):null;
  const shop=world.shops[0];
  if(shop?.id!==shopId||shop.status!==1||shop.showcasecount!==1||
    shop.showcase?.length!==1||shop.price?.length!==1||
    shop.item?.length!==79||shop.item.some(x=>!Number.isSafeInteger(x)||x<0)||
    shop.item[62]!==1||shop.item[78]!==5||
    shop.item.some((n,i)=>!(reviewedB62Map?
      [9,10,13,39,62,78]:reviewed.ticketSourceReviewed?
      [9,10,62,78]:[9,62,78]).includes(i)&&n!==0)||
    (reviewedB62Map&&(shop.item[13]>3||shop.item[39]>600||
      (shop.exp!==undefined&&(
        shop.exp===null||typeof shop.exp!=='object'||
        Object.keys(shop.exp).some(k=>k!=='14'||shop.exp[k]!==20)))))||
    (reviewed.ticketSourceReviewed&&shop.item[10]>50)||
    shop.paytoday<5000||
    shop.paytoday%(reviewed.ticketSourceReviewed?1000:5000)!==0||
    !Number.isSafeInteger(shop.money)||shop.money<0||
    !Number.isSafeInteger(shop.rank)||shop.rank<0||shop.rank>10000||
    !Number.isSafeInteger(shop.trush??0)|| (shop.trush??0)<0||
    !Number.isFinite(shop.costtoday)||shop.costtoday<0||
    !Number.isSafeInteger(shop.saletoday)||shop.saletoday<0||
    !Number.isSafeInteger(shop.taxtoday)||shop.taxtoday!==0||
    !(reviewedB62Map?[0,10,40]:[0,10]).includes(shop.showcase[0])||
    (shop.showcase[0]===0&&shop.price[0]!==0)||
    (shop.showcase[0]===10&&shop.price[0]!==5000)||
    (shop.showcase[0]===40&&shop.price[0]!==1200))
    bad('only source-reviewed real #10 or #40 inventory/shelf supported');
  const activeItemId=shop.showcase[0]===40?40:10;
  const beforeStock=shop.item[activeItemId-1];
  if(shop.item[9]>20)bad('original #10 carrying limit exceeded');
  // The local clock is a controllable test clock; crossing an unimplemented
  // 36-hour settlement boundary is rejected, not silently skipped.
  safe(world.nowSeconds,'world clock');
  const nextTime=safe(world.nowSeconds+span,'advanced world clock');
  // Original inc-turn: NOW_TIME + TZ_JST - DATE_REVISE_TIME,
  // Standard Street 36h period, JST +9h, date revision 6h => +3h.
  const period=reviewed.periodSeconds,shift=reviewed.clockShiftSeconds;
  if(period!==129600||shift!==10800||
     !Number.isSafeInteger(world.nowSeconds+shift)||
     !Number.isSafeInteger(nextTime+shift))
    bad('unreviewed or unsafe source period clock');
  if(Math.floor((world.nowSeconds+shift)/period)!==
     Math.floor((nextTime+shift)/period))
    bad('this interval crosses original period settlement; not yet supported');
  let used=0;
  function rand(){
    if(used>=randomDraws.length)bad('missing natural/PLUS source draw');
    return randomDraws[used++]/1000000;
  }
  const display=shop.showcase[0]===activeItemId&&
    shop.showcase[0]!==0&&beforeStock>0;
  const items=[...shop.item];
  const itemtoday={...shop.itemtoday};
  let sold=0,rankUp=0,rankDown=0;
  let money=shop.money,trush=shop.trush??0,saleToday=shop.saletoday;
  // Core's specialty group uses displayed ITEM type even when stock is zero.
  const tempRank=shop.rank+(shop.showcase[0]!==0?1000:0);
  if(display){
    // Exactly one store/one shelf at reviewed original fixed item price:
    // buypeoplebase=(sourcePrice/displayPrice)^4=1,
    // dtranksum=tempRank so store rank quotient=1.
    // B-61's DataRead sword popular/2 applies before natural sale.
    const itemPopular=activeItemId===40?
      (swordDemandEventActive?5400:10800):1728000;
    const itemPoint=activeItemId===40?1250:200000;
    const itemPrice=activeItemId===40?1200:5000;
    const buyers=500000*12/itemPopular*span/86400;
    const buypeople=buyers/2;
    let sale=0;
    if(buypeople>0)sale=rand()*buypeople;
    if(sale<1&&sale>0&&rand()*(1/sale)<1)sale=1;
    sale=Math.trunc(sale);
    if(sale>0){
      sold=Math.min(sale,items[activeItemId-1]);
      const marketPoint=Math.max(10,Math.min(1000,
        Math.trunc(beforeStock/40000*itemPopular)));
      const rankUpMulti=((10-shop.rank/1000)**2)/5;
      rankUp=Math.min(rand()*(rankUpMulti/marketPoint*itemPoint/10*sold),span/3);
      // Source GetSaleTax at normal original price with user taxrate 0 -> 0.
      const proceeds=safe(sold*itemPrice,'sale proceeds');
      money=safe(money+proceeds,'cash after natural sale');
      trush=safe(trush+proceeds,'trush after sale');
      saleToday=safe(saleToday+proceeds,'saletoday after sale');
      items[activeItemId-1]-=sold;
      itemtoday[activeItemId]=safe(
        (itemtoday[activeItemId]??0)+sold,'original itemtoday');
      if(items[activeItemId-1]===0)rankDown+=(shop.rank/100)**3/1000;
    }
  }
  rankDown+=Math.sqrt(span)*(shop.rank/1000)**5/(5**5*20);
  rankDown*=0.75+trush/10000000;
  let rankChange=Math.abs(rankUp-rankDown);
  if(rankChange<1&&rankDown>0&&rand()*(1/rankChange)<1)rankChange=1;
  const rank=Math.max(0,Math.min(10000,shop.rank+
    Math.trunc(rankUp>rankDown?rankChange:-rankChange)));
  // Original Core accumulates fractional costtoday. This is not rounded.
  // Exact original inc-turn.cgi upkeep loops through ALL owned ITEMs.
  // SOURCE ITEM #11 has COST 10 per held ticket, even though noshowcase.
  const upkeep=50+
    (items[9]? (shop.showcase[0]===10?items[9]/10:items[9])*100:0)+
    (reviewed.ticketSourceReviewed?items[10]*10:0)+
    (reviewedB62Map?(
      items[13]*500+
      (items[39]? (shop.showcase[0]===40?items[39]/10:items[39])*120:0)
    ):0);
  const accrual=upkeep*span/86400;
  const costtoday=shop.costtoday+accrual;
  if(!Number.isFinite(costtoday)||costtoday<0||
     Math.abs(costtoday)>Number.MAX_SAFE_INTEGER)
    bad('unsafe original fractional upkeep');
  trush=safe(trush+Math.trunc(accrual),'original integer waste increment');
  const nextShop={
    ...shop,item:items,itemtoday,money,trush,
    saletoday:saleToday,rank,temprank:tempRank,costtoday,
    _sale_count_:sold?{
      [activeItemId]:{count:sold,price:sold*(activeItemId===40?1200:5000)},
    }:{} ,
  };
  const naturalDraws=used;
  const plus=projectOriginalSparseAllPlus({
    world:{...world,shops:[nextShop]},reviewed:reviewedAllPlus,
    compiled,timespanSeconds:span,randomDraws:randomDraws.slice(used),
    reviewedB59Iron,ironEventActive,
    reviewedEventTimeSlice,
  });
  return {
    shops:plus.shops,market:plus.market,nowSeconds:nextTime,
    // B-41 deliberately omits original EVENT callbacks. From the first
    // elapsed turn onward, the active event instances are UNKNOWN, even
    // though the source admin created an empty map at world inception.
    ...(world.schema===PERIOD_WORLD_SCHEMA?{
      period:{...world.period,eventState:null},
    }:{}),
    receipt:{
      action:'advance-source-time',source:B41_SOURCE,
      minutes,elapsedSeconds:span,shopId,
      naturalSaleCount:sold,
      soldItemId:display?activeItemId:0,
      stockBefore:beforeStock,stockAfter:items[activeItemId-1],
      ironVeinModifierApplied:ironEventActive,
      festivalWasActiveAtDataRead:happyEventActive,
      swordDemandWasActiveAtDataRead:swordDemandEventActive,
      sourceSwordDemandPreview,
      moneyBefore:shop.money,moneyAfter:money,
      saleTodayBefore:shop.saletoday,saleTodayAfter:saleToday,
      rankBefore:shop.rank,rankAfter:rank,
      naturalDraws,plusDraws:plus.receipt.drawsUsed,
      totalDraws:used+plus.receipt.drawsUsed,
      sourceScope:reviewed.sourceScope,
    },
  };
}

/**
 * B-41 source-gated single-store natural-sale + exact original 59 PLUS loop.
 * Real #10 must come through the B-40 market command in the live HTTP flow;
 * unlike B-38, NO artificial stock is written or permitted by this command.
 * Only ITEM #10 at its reviewed original price, no sale/turn callbacks.
 * Original period settlement, other merchandise, auth/disk/multiplayer remain
 * unsupported. Time is advanced by an explicit isolated local test slice.
 */
import {NATURAL_PLUS_SOURCE} from './original-natural-sale-plus.mjs';
import {parseDsl} from './parse-dsl.mjs';
import {projectSharedNaturalSale} from './shared-natural-sale-core.mjs';
import {isSourceShowcasePercentPrice}
  from './shared-showcase-price.mjs';
import {reviewR3ItemCallbackStage,projectR3ItemCallbackStage}
  from './r3-reviewed-item-callback-stage.mjs';
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
import {B63_MAP_SOURCE} from './original-b63-sword-map-all-outcomes.mjs';

export const B41_SOURCE='b41-real-market10-showcase-natural-region-then-59-plus';
const bad=x=>{throw new RangeError('B-41 original sale boundary: '+x);};
const safe=(x,label,min=0)=>{
  if(!Number.isSafeInteger(x)||x<min)bad(label);
  return x;
};

// Core ITEM PRICE/POP/POINT/COST compilation, pinned to the six reviewed
// Standard Street items. Unlike the source-specific B-41 sale formula, this
// metadata is supplied to a single ITEM-id-independent shared Core executor.
function reviewR3SourceSaleItems(itemDsl){
  const parsed=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  if(parsed.issues.length)bad('original ITEM parse issues');
  const blocks=parsed.blocks.filter(b=>b.kind==='ITEM');
  const one=(b,k)=>b?.fields[k]?.length===1?b.fields[k][0].value:null;
  const items=new Map(blocks.map(b=>[Number(one(b,'no')),b]));
  const selected=[
    [10,'5000','20d',null,'100'],[40,'1200','3h',null,null],
    [41,'1500','3h',null,null],[42,'3200','5h','80%',null],
    [43,'8000','10h','70%',null],[44,'12000','16h','60%',null],
  ];
  const rules={};
  for(const [id,price,pop,point,cost] of selected){
    const b=items.get(id);
    if(!b||one(b,'price')!==price||one(b,'pop')!==pop||
       one(b,'point')!==point||one(b,'cost')!==cost||
       ['funct','functurn','funcs','funcsale','funcb'].some(k=>
         b.fields[k]?.length))
      bad('R3 ITEM or callback source drift: #'+id);
    const match=/^([1-9]\d*)(m|h|d)$/.exec(pop);
    if(!match)bad('unsupported source POP time');
    const seconds=Number(match[1])*({m:60,h:3600,d:86400}[match[2]]);
    rules[id]=Object.freeze({
      itemId:id,unitPrice:Number(price),popularSeconds:seconds,
      point:point===null?Math.trunc(seconds*100/24/36):
        Number(point.slice(0,-1))*10,
      cost:cost===null?Math.trunc(Number(price)/10):Number(cost),
      source:b.file+':'+b.startLine,
    });
  }
  const costs={};
  // Explicitly bound to all source stocks currently permitted by B-41/B-63.
  // Missing or changed upkeep data fails before any CAS.
  for(const id of [9,10,11,12,14,39,40,41,42,43,44,63,79]){
    const block=items.get(id),price=one(block,'price'),
      cost=one(block,'cost');
    if(!block||price===null||!/^\d+$/.test(price)||
       (cost!==null&&!/^\d+$/.test(cost)))
      bad('unsupported original upkeep ITEM #'+id);
    costs[id]=cost===null?Math.trunc(Number(price)/10):Number(cost);
  }
  return Object.freeze({
    rules:Object.freeze(rules),costs:Object.freeze(costs),
  });
}
export function reviewB41Sale({reviewedNatural,reviewedBuy,reviewedAllPlus,
  itemDsl,rebelDsl,turnSource,configSource,reviewedMarket11=null,reviewedB59Iron=null,
  reviewedB60Happy=null,reviewedB61Sword=null,reviewedB62Map=null,
  reviewedB63Map=null}){
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
  if(reviewedB63Map!==null&&(
     reviewedB63Map.source!==B63_MAP_SOURCE||
     reviewedB63Map.items?.join(',')!=='40,41,42,43,44'||
     reviewedB63Map.limits?.join(',')!=='600,500,300,100,75'||
     reviewedB63Map.cost?.join(',')!=='120,150,320,800,1200'))
    bad('B-63 original all-sword inventory source review drift');
  const r3=reviewR3SourceSaleItems(itemDsl);
  const itemCallbacks=reviewR3ItemCallbackStage({itemDsl,rebelDsl,turnSource});
  return Object.freeze({
    source:B41_SOURCE,itemId:10,unitPrice:5000,
    saleRules:r3.rules,upkeepCosts:r3.costs,itemCallbacks,
    swordOutcomesSource:reviewedB63Map?.source??null,
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
  reviewedB61Sword=null,reviewedB62Map=null,reviewedB63Map=null,
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
     reviewed.swordMapSource!==(reviewedB62Map?.source??null)||
     reviewed.swordOutcomesSource!==(reviewedB63Map?.source??null))
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
    shop.item.some((n,i)=>!(reviewedB63Map?
      [9,10,13,39,40,41,42,43,62,78]:reviewedB62Map?
      [9,10,13,39,62,78]:reviewed.ticketSourceReviewed?
      [9,10,62,78]:[9,62,78]).includes(i)&&n!==0)||
    (reviewedB63Map&&[500,300,100,75].some((cap,i)=>
      shop.item[40+i]>cap))||
    (reviewedB62Map&&(shop.item[13]>3||shop.item[39]>600||
      (shop.exp!==undefined&&(
        shop.exp===null||typeof shop.exp!=='object'||
        Object.keys(shop.exp).some(k=>k!=='14'||shop.exp[k]!==20)))))||
    (reviewed.ticketSourceReviewed&&shop.item[10]>50)||
    shop.paytoday<5000||
    // Earlier fixed-price receipts were multiples of 1000/5000 G.
    // A genuine Registry-compiled BASE wholesale #14 receipt is not.
    // GameCore has already verified its exact source price at CAS;
    // retaining the fixed-only modulus when B62 is reviewed would
    // reject a real original map BUY -> USE -> sword sale sequence.
    (!reviewedB62Map&&
      shop.paytoday%(reviewed.ticketSourceReviewed?1000:5000)!==0)||
    !Number.isSafeInteger(shop.money)||shop.money<0||
    !Number.isSafeInteger(shop.rank)||shop.rank<0||shop.rank>10000||
    !Number.isSafeInteger(shop.trush??0)|| (shop.trush??0)<0||
    !Number.isFinite(shop.costtoday)||shop.costtoday<0||
    !Number.isSafeInteger(shop.saletoday)||shop.saletoday<0||
    !Number.isSafeInteger(shop.taxtoday)||shop.taxtoday!==0||
    !(reviewedB63Map?[0,10,40,41,42,43,44]:reviewedB62Map?
      [0,10,40]:[0,10]).includes(shop.showcase[0])||
    (shop.showcase[0]===0&&shop.price[0]!==0)||
    (shop.showcase[0]!==0&&
      !isSourceShowcasePercentPrice(
        reviewed.saleRules?.[shop.showcase[0]]?.unitPrice,
        shop.price[0]))||
    ![undefined,0].includes(shop.taxmode))
    bad('only source-reviewed #10 or source-acquired #40..44 inventory/shelf supported');
  // New R3 sword sales may not interpret B-41 unknown EVENT as empty.
  // Preserve historical R2 #10 behavior, but reject later sword turns
  // until the original lifecycle has been source-reviewed.
  if(world.schema===PERIOD_WORLD_SCHEMA &&
     world.period?.eventState===null &&
     shop.showcase[0]>=40&&shop.showcase[0]<=44)
    bad('R3 sword natural sale blocked: EVENT state unknown; reviewed lifecycle required');
  const activeItemId=shop.showcase[0]||10;
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
  // B-41 has source-gated ownership/showcase/clock/EVENT preflight.
  // The six items now execute exactly the same GameCore sale math.
  const rule=shop.showcase[0]?reviewed.saleRules[shop.showcase[0]]:null;
  const popularOverride=rule&&swordDemandEventActive&&
    rule.itemId>=40&&rule.itemId<=44?
    Math.trunc(rule.popularSeconds/2):null;
  const natural=projectSharedNaturalSale({
    shop,rule,upkeepCosts:reviewed.upkeepCosts,
    spanSeconds:span,randomDraws,popularOverride,
  });
  const sold=natural.sold;
  const naturalDraws=natural.drawsUsed;
  // Exact original inc-turn callback placement precedes the 59 ITEM PLUS.
  const itemCallbackStage=projectR3ItemCallbackStage({
    reviewed:reviewed.itemCallbacks,shop:natural.shop,spanSeconds:span,
    randomDraws:randomDraws.slice(naturalDraws),
  });
  // Projected shop state belongs to WorldState, never inside the receipt.
  // Copying a fractional maintenance cost through the receipt violates the
  // original GameCore's strict receipt integer audit.
  const {shop:nextShop,...callbackReceipt}=itemCallbackStage;
  const callbackDraws=callbackReceipt.drawsUsed;
  const used=naturalDraws+callbackDraws;
  const newShop=nextShop;
  const money=newShop.money,saleToday=newShop.saletoday;
  const rank=newShop.rank,items=newShop.item;
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
      soldItemId:shop.showcase[0]?activeItemId:0,
      stockBefore:beforeStock,stockAfter:items[activeItemId-1],
      ironVeinModifierApplied:ironEventActive,
      festivalWasActiveAtDataRead:happyEventActive,
      swordDemandWasActiveAtDataRead:swordDemandEventActive,
      sourceSwordDemandPreview,
      moneyBefore:shop.money,moneyAfter:money,
      saleTodayBefore:shop.saletoday,saleTodayAfter:saleToday,
      rankBefore:shop.rank,rankAfter:rank,
      naturalDraws,callbackDraws,itemCallbackStage:callbackReceipt,
      plusDraws:plus.receipt.drawsUsed,
      totalDraws:used+plus.receipt.drawsUsed,
      sourceScope:reviewed.sourceScope,
    },
  };
}

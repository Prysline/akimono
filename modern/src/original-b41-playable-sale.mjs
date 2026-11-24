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
import {isSourceShowcaseListedPrice}
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
import {reviewOriginalR4TimeSlices,projectOriginalR4TimeSlices}
  from './original-r4-time-slices.mjs';
import {projectR4PreEventItemOverlay} from './original-r4-pre-event-item-overlay.mjs';
import {projectOriginalSoloSort} from './original-period-solo-sort.mjs';
import {projectOriginalSoloPeriodPhaseChain,B50_INTEGRATED_SOURCE} from './original-period-solo-chain.mjs';
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
       one(b,'type')!==(id===10?'道具':'劍')||
       ['funct','functurn','funcs','funcsale','funcb'].some(k=>
         b.fields[k]?.length))
      bad('R3 ITEM or callback source drift: #'+id);
    const match=/^([1-9]\d*)(m|h|d)$/.exec(pop);
    if(!match)bad('unsupported source POP time');
    const seconds=Number(match[1])*({m:60,h:3600,d:86400}[match[2]]);
    rules[id]=Object.freeze({
      itemId:id,itemType:one(b,'type'),
      unitPrice:Number(price),popularSeconds:seconds,
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
    p3TurnItems:reviewP3TurnItems(items),
  });
}

// P3 upstream and manufacture stock, NOT an acquisition whitelist. Every
// held ITEM still needs its compiled holding limit, cost, and reviewed
// callback; full source acquisition is proven separately by GameCore/replay.
const P3_TURN_IDS=Object.freeze([
  1,2,3,4,5,6,7,8,9,10,11,12,14,15,16,17,18,19,20,21,22,23,24,
  25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,
  ...Array.from({length:22},(_,i)=>40+i),63,64,66,67,68,69,70,78,79,
]);
const P3_EXP_IDS=new Set([9,10,12,14,15,16,17,20,21,22,23,25,37,39,66]);
function reviewP3TurnItems(items){
  const one=(b,k)=>b?.fields[k]?.length===1?b.fields[k][0].value:null;
  const costs={},rules={};
  for(const id of P3_TURN_IDS){
    const b=items.get(id),price=one(b,'price'),cost=one(b,'cost');
    if(!b||price===null||!/^\d+$/.test(price)||
       (cost!==null&&!/^\d+$/.test(cost))||
       (id!==70&&['funct','functurn','funcs','funcsale'].some(k=>b.fields[k]?.length)))
      bad('P3 unreviewed ITEM upkeep/callback #'+id);
    // Original GetBuffer PRICE defaults cost to int(price/10) when unset.
    costs[id]=cost===null?Math.trunc(Number(price)/10):Number(cost);
    if(!Number.isSafeInteger(costs[id]))bad('P3 unsafe ITEM cost');
    // The source rank-1 prizes may be held on the next slice. They do
    // not become sale/USE rules merely by adding reviewed holding costs.
    const prizeStock={27:['seven_face',0],28:['ramusyu',0],29:['boots',0],64:['defence-manbiki',5000]};
    if(Object.hasOwn(prizeStock,id)&&
       (one(b,'code')!==prizeStock[id][0]||costs[id]!==prizeStock[id][1]))
      bad('source period prize holding drift #'+id);
    // Include already-reviewed P1/P2 medicine and dairy alongside P3 goods.
    // Raw materials, skills, and books are supported as stock, not new shelves.
    if(id!==10&&id!==25&&id!==26&&!(id>=30&&id<=36)&&!(id>=40&&id<=61)&&!(id>=67&&id<=70))continue;
    const pop=one(b,'pop'),point=one(b,'point'),type=one(b,'type');
    const match=/^([1-9]\d*)(m|h|d)$/.exec(pop??'');
    if(!match||!type||Number(price)<=0||
       (point!==null&&!/^\d+%$/.test(point)))bad('P3 unreviewed ITEM sale #'+id);
    const seconds=Number(match[1])*({m:60,h:3600,d:86400}[match[2]]);
    rules[id]=Object.freeze({itemId:id,itemType:type,unitPrice:Number(price),
      popularSeconds:seconds,point:point===null?Math.trunc(seconds*100/24/36):
        Number(point.slice(0,-1))*10,cost:costs[id],source:b.file+':'+b.startLine});
  }
  return Object.freeze({costs:Object.freeze(costs),rules:Object.freeze(rules)});
}
export function validateP3Inventory(shop,compiled,reviewed){
  if(!shop||!Array.isArray(shop.item)||shop.item.length!==79||shop.item.some(n=>!Number.isSafeInteger(n)||n<0))bad('P3 source inventory shape');
  if(!Array.isArray(compiled?.limits)||compiled.limits.length!==79||
     !reviewed.p3TurnItems||shop.showcasecount!==1||
     shop.item.some((n,i)=>n!==0&&(!Object.hasOwn(reviewed.p3TurnItems.costs,i+1)||
       !Number.isSafeInteger(compiled.limits[i]?.limit)||n>compiled.limits[i].limit))||
     !['','drug','tool','weapon','armor','material','book','peddle','cow'].includes(shop.job??''))
    bad('P3 source holding cap, career or single shelf');
  const exp=shop.exp??{};
  if(typeof exp!=='object'||Array.isArray(exp)||
     Object.entries(exp).some(([id,n])=>String(Number(id))!==id||
       !P3_EXP_IDS.has(Number(id))||!Number.isSafeInteger(n)||n<0||n>1000)||
     Object.values(exp).reduce((a,b)=>a+b,0)>3600)
    bad('P3 original ITEM EXP or LIMIT_EXP');
  // This stage checks a shape only: never infer acquisition, skill provenance,
  // EXP transfers, or an authorized complete WorldState from a valid shape.
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
  const turnSlices=reviewOriginalR4TimeSlices({turnSource,configSource});
  return Object.freeze({
    source:B41_SOURCE,itemId:10,unitPrice:5000,
    saleRules:r3.rules,upkeepCosts:r3.costs,p3TurnItems:r3.p3TurnItems,itemCallbacks,turnSlices,
    swordOutcomesSource:reviewedB63Map?.source??null,
    swordMapSource:reviewedB62Map?.source??null,
    swordEventSource:reviewedB61Sword?.source??null,
    happyEventSource:reviewedB60Happy?.source??null,
    ironEventSource:reviewedB59Iron?.source??null,
    ticketSourceReviewed:reviewedMarket11!==null,
    maxMinutes:60,periodSeconds:129600,clockShiftSeconds:10800,
    sourceScope:'six source-reviewed ITEM price/POP/POINT/COST; one-shop original 1..200% pricing and GetSaleTax; reviewed empty-holder item callbacks, then 59 PLUS. EVENT, SortDT and 36h settlement still unsupported',
  });
}

function projectSourcePreEventSaleSlice({
  world,reviewed,reviewedAllPlus,compiled,shopId,minutes,randomDraws,
  reviewedB59Iron=null,reviewedB60Happy=null,
  reviewedB61Sword=null,reviewedB62Map=null,reviewedB63Map=null,
  reviewedEventTimeSlice=false,r4ReviewedSort=null,
  p3InventoryStage=false,reviewedNayuta=null,
  r4DataRead=null,
},boundary=null){
  if(reviewed?.source!==B41_SOURCE||reviewedAllPlus?.source!==ALL_PLUS_SOURCE)
    bad('source review missing');
  safe(shopId,'shopId',1);
  safe(minutes,'minutes',1);
  if(minutes>reviewed.maxMinutes)bad('one local source slice cannot exceed 60 minutes');
  // The private boundary candidate is the only path allowed to request
  // an exact sub-minute source slice. Public/legacy callers still use minutes.
  const span=safe(boundary===null?minutes*60:boundary.spanSeconds,'timespan',1);
  if(!Array.isArray(randomDraws)||randomDraws.length>(boundary===null?121:125)||
    randomDraws.some(v=>!Number.isSafeInteger(v)||v<0||v>=1000000))
    bad('exact shared original random samples must be integer millionths');
  if(!validateSourceSparseMarket(world?.market)||
    (!p3InventoryStage&&world.market.sourceWriteShape!=='whole-store-79')||
    world.events!==null||world.shops?.length!==1)
    bad('real post-purchase source wholesale world required');
  if(reviewed.ironEventSource!==(reviewedB59Iron?.source??null)||
     reviewed.happyEventSource!==(reviewedB60Happy?.source??null)||
     reviewed.swordEventSource!==(reviewedB61Sword?.source??null)||
     reviewed.swordMapSource!==(reviewedB62Map?.source??null)||
     reviewed.swordOutcomesSource!==(reviewedB63Map?.source??null))
    bad('source durable event contracts mismatch');
  // Source DataRead executes once per command, NOT once per time slice.
  const overlayWorld=boundary?.dataReadWorld??world;
  const overlay=r4DataRead===null?null:projectR4PreEventItemOverlay({reviewed:r4DataRead.reviewed,world:overlayWorld,activeOrder:r4DataRead.activeOrder,saleReview:reviewed,plusReview:reviewedAllPlus,candidateSettled:boundary?.candidateSettled===true});
  if(overlay!==null&&(!p3InventoryStage||!r4ReviewedSort||!reviewedEventTimeSlice))bad('R4 DataRead overlay requires full reviewed pre-EVENT stage');
  if(world.schema===PERIOD_WORLD_SCHEMA&&overlay===null&&
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
  const activeKeys=overlayWorld.schema===PERIOD_WORLD_SCHEMA&&
    overlayWorld.period?.eventState!==null&&
    typeof overlayWorld.period?.eventState==='object'?
    Object.keys(overlayWorld.period.eventState):[];
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
      reviewedDynamicPopulation:boundary!==null,
    }):null;
  const shop=world.shops[0];
  if(p3InventoryStage&&(world.schema!==PERIOD_WORLD_SCHEMA||
     world.period.eventState===null||
     (overlay===null&&(!validateOriginalPeriodSeed(world.period)||activeKeys.length||reviewedEventTimeSlice||r4ReviewedSort!==null))))
    bad('P3 pre-EVENT projection requires known bootstrap and no active EVENT');
  const saleRules=p3InventoryStage?reviewed.p3TurnItems?.rules:reviewed.saleRules;
  const upkeepCosts=p3InventoryStage?reviewed.p3TurnItems?.costs:reviewed.upkeepCosts;
  if(shop?.id!==shopId||shop.status!==1||
    (!Number.isSafeInteger(shop.showcasecount)||
      shop.showcasecount<1||shop.showcasecount>8)||
    shop.showcase?.length!==shop.showcasecount||
    shop.price?.length!==shop.showcasecount||
    shop.item?.length!==79||shop.item.some(x=>!Number.isSafeInteger(x)||x<0)||
    (shop.showcasecount===1?shop.item[62]!==1:shop.item[62]!==0)||
    (!p3InventoryStage&&(shop.item[78]!==5||
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
      shop.paytoday%(reviewed.ticketSourceReviewed?1000:5000)!==0)))||
    !Number.isSafeInteger(shop.paytoday)||shop.paytoday<0||
    !Number.isSafeInteger(shop.money)||shop.money<0||
    !Number.isSafeInteger(shop.rank)||shop.rank<0||shop.rank>10000||
    !Number.isSafeInteger(shop.trush??0)|| (shop.trush??0)<0||
    !Number.isFinite(shop.costtoday)||shop.costtoday<0||
    !Number.isSafeInteger(shop.saletoday)||shop.saletoday<0||
    !Number.isSafeInteger(shop.taxtoday)||shop.taxtoday<0||
    shop.showcase.some((itemId,shelf)=>
      (p3InventoryStage?itemId!==0&&!Object.hasOwn(saleRules??{},itemId):
        !(reviewedB63Map?[0,10,40,41,42,43,44]:reviewedB62Map?
        [0,10,40]:[0,10]).includes(itemId))||
      (itemId===0?shop.price[shelf]!==0:
        !isSourceShowcaseListedPrice(
          saleRules?.[itemId]?.unitPrice,shop.price[shelf])))||
    ![undefined,0].includes(shop.taxmode))
    bad('only source-reviewed #10 or source-acquired #40..44 inventory/shelf supported');
  if(p3InventoryStage)validateP3Inventory(shop,compiled,reviewed);
  // New R3 sword sales may not interpret B-41 unknown EVENT as empty.
  // Preserve historical R2 #10 behavior, but reject later sword turns
  // until the original lifecycle has been source-reviewed.
  if(world.schema===PERIOD_WORLD_SCHEMA &&
     world.period?.eventState===null &&
     (shop.showcasecount>1||
       shop.showcase.some(id=>id>=40&&id<=44)))
    bad('R3 multi-shelf or sword sale blocked: EVENT state unknown; reviewed lifecycle required');
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
  // Use the exact source-reviewed inc-turn @timespan partition, including
  // the dateupdate flag on an exact 36h boundary. Until R4 settlement is
  // implemented and composed, fail atomically rather than skipping it.
  const originalSlices=projectOriginalR4TimeSlices({
    reviewed:reviewed.turnSlices,
    lastSeconds:world.nowSeconds,nowSeconds:nextTime,
  });
  if(originalSlices.effectiveSlices.length!==1||
     originalSlices.effectiveSlices[0].timespanSeconds!==span||
     originalSlices.crossesSettlement!==(boundary?.dateupdate===1))
    bad('this interval crosses original period settlement; not yet supported');
  if(boundary!==null&&(!p3InventoryStage||!r4ReviewedSort||overlay===null||
     ![0,1].includes(boundary.dateupdate)||
     boundary.reviewed?.source!==B50_INTEGRATED_SOURCE||
     boundary.reviewed.nonCommittable!==true))
    bad('reviewed B50 boundary candidate required');
  // B-41 has source-gated ownership/showcase/clock/EVENT preflight.
  // The six items now execute exactly the same GameCore sale math.
  if(shop.showcasecount>1&&activeKeys.length)
    bad('multi-shelf active EVENT overlay not source-reviewed');
  const rule=shop.showcasecount===1&&shop.showcase[0]?
    (overlay?.saleRules??saleRules)[shop.showcase[0]]:null;
  const popularOverride=overlay===null&&rule&&swordDemandEventActive&&
    rule.itemId>=40&&rule.itemId<=44?
    Math.trunc(rule.popularSeconds/2):null;
  const natural=projectSharedNaturalSale({
    shop,rule,saleRules:shop.showcasecount>1?saleRules:null,
    upkeepCosts,
    spanSeconds:span,randomDraws:randomDraws.slice(0,121),popularOverride,
    ...(boundary===null?{}:{population:world.period.dtPeople}),
  });
  const sold=natural.sold;
  const naturalDraws=natural.drawsUsed;
  // Exact original inc-turn callback placement precedes the 59 ITEM PLUS.
  const itemCallbackStage=projectR3ItemCallbackStage({
    reviewed:reviewed.itemCallbacks,shop:natural.shop,spanSeconds:span,
    randomDraws:randomDraws.slice(naturalDraws),
    ...(p3InventoryStage?{reviewedNayuta}:{}),
  });
  // Projected shop state belongs to WorldState, never inside the receipt.
  // Copying a fractional maintenance cost through the receipt violates the
  // original GameCore's strict receipt integer audit.
  const {shop:nextShop,...callbackReceipt}=itemCallbackStage;
  const callbackDraws=callbackReceipt.drawsUsed;
  const used=naturalDraws+callbackDraws;
  // R4 source SortDT: ITEM callbacks -> SortDT -> settlement -> PLUS.
  // This is an opt-in uncommittable pure stage; legacy R3 is unchanged.
  if(r4ReviewedSort!==null&&world.schema!==PERIOD_WORLD_SCHEMA)
    bad('reviewed R4 SortDT requires original period world');
  const newShop=r4ReviewedSort===null?nextShop:
    projectOriginalSoloSort({shop:nextShop,reviewed:r4ReviewedSort}).shop;
  // The original period runs between SortDT and the 59 PLUS loop. It
  // observes the command's final NOW_TIME, not the intermediate boundary.
  // Only a candidate can use this seam; no WorldState or disk commit.
  let settlement=null,periodDraws=0,plusWorld={...world,shops:[newShop]};
  if(boundary!==null)plusWorld={...plusWorld,period:{...world.period,
    eventState:overlayWorld.period.eventState}};
  if(boundary?.dateupdate===1){
    const reviewedPeriod=boundary.reviewed;
    if(reviewedPeriod.dragon!==null||reviewedPeriod.guild!==null||
       reviewedPeriod.actualClose!==null||reviewedPeriod.periodBackup!==null||
       reviewedPeriod.postTech!==null||reviewedPeriod.dignity===null||
       reviewedPeriod.shopExpiry===null||
       ![undefined,''].includes(newShop.guild)||
       (newShop.dragon??0)!==0||(newShop.drmoney??0)!==0||
       (newShop.taxtoday!==0&&reviewedPeriod.territory?.reviewedSaleTax!==true))
      bad('boundary candidate only supports independent reviewed-tax no-external-effect source prefix');
    const dignity=(newShop.dignity??0)!==0;
    periodDraws=3+(dignity?1:0);
    if(randomDraws.length<used+periodDraws)bad('missing original period random samples');
    const draws=randomDraws.slice(used,used+periodDraws);
    settlement=projectOriginalSoloPeriodPhaseChain({
      reviewed:reviewedPeriod,shop:newShop,town:world.period.town,dtPeople:world.period.dtPeople,
      awardDrawMillionths:draws[0],
      dignityDrawMillionths:dignity?draws[1]:null,
      territoryDrawMillionths:draws.slice(dignity?2:1),
      nowSeconds:boundary.commandNowSeconds,
    });
    if(settlement.shopExpiry?.expiredOwner||!settlement.shop||settlement.nonCommittable!==true)
      bad('source closure requires external archive/session transaction');
    plusWorld={...world,shops:[settlement.shop],period:{...world.period,
      town:settlement.town,dtPeople:settlement.dtPeople}};
  }
  const money=newShop.money,saleToday=newShop.saletoday;
  const rank=newShop.rank,items=newShop.item;
  const plus=projectOriginalSparseAllPlus({
    world:plusWorld,reviewed:reviewedAllPlus,
    compiled,timespanSeconds:span,randomDraws:randomDraws.slice(used+periodDraws),
    ...(boundary===null?{}:{r4PeriodPopulation:true}),
    reviewedB59Iron,ironEventActive,
    reviewedEventTimeSlice,
    ...(overlay===null?{}:{r4DataReadOverlay:overlay}),
  });
  return {
    shops:plus.shops,market:plus.market,nowSeconds:nextTime,
    ...(boundary===null?{}:{settlement,...(settlement?{periodLogInput:{shop:newShop,town:world.period.town}}:{})}),
    // R3 only projects the pre-EVENT source stages. Do not write period:
    // the consumer must choose the original EVENT stage (R4) or explicitly
    // mark unknown state in the legacy B-41 player compatibility wrapper.
    receipt:{
      action:'advance-source-time',source:B41_SOURCE,
      minutes,elapsedSeconds:span,shopId,
      naturalSaleCount:sold,
      ...(shop.showcasecount>1?{soldByItem:natural.soldByItem}:{}),
      soldItemId:shop.showcase[0]?activeItemId:0,
      stockBefore:beforeStock,stockAfter:items[activeItemId-1],
      ironVeinModifierApplied:ironEventActive,
      festivalWasActiveAtDataRead:happyEventActive,
      swordDemandWasActiveAtDataRead:swordDemandEventActive,
      sourceSwordDemandPreview,
      moneyBefore:shop.money,moneyAfter:money,
      saleTodayBefore:shop.saletoday,saleTodayAfter:saleToday,
      taxTodayBefore:shop.taxtoday,taxTodayAfter:newShop.taxtoday,
      rankBefore:shop.rank,rankAfter:rank,
      naturalDraws,callbackDraws,itemCallbackStage:callbackReceipt,
      plusDraws:plus.receipt.drawsUsed,
      ...(r4ReviewedSort===null?{}:{originalSortApplied:true,originalSortPoint:newShop.point}),
      totalDraws:used+periodDraws+plus.receipt.drawsUsed,
      ...(boundary===null?{}:{periodDraws,plusPopulation:plusWorld.period.dtPeople,dateupdate:boundary.dateupdate}),
      sourceScope:reviewed.sourceScope,
    },
  };
}

/**
 * R3 source stage handoff to R4: unchanged verified incoming EVENT context,
 * source natural sale -> ITEM FUNCTURN/FUNCSALE -> all 59 PLUS, but no
 * EVENT/SortDT/period claim. Refuse unknown prior EVENT, even for #10.
 * No period write: R4 consumes the ORIGINAL input EVENT and must supply
 * its own fully reviewed successor period for a full WorldState commit.
 */
export function projectR3PreEventTurn(args){
  if(args?.world?.schema===PERIOD_WORLD_SCHEMA &&
     args.world.period?.eventState===null)
    bad('R3 pre-EVENT stage requires a known original incoming EVENT state');
  const stage=projectSourcePreEventSaleSlice(args);
  if(Object.hasOwn(stage,'period'))
    bad('pre-EVENT stage cannot replace an unfinished period');
  return stage;
}

/** Pure P3 handoff. No command registration, period write, HTTP or CAS. */
export function projectP3PreEventTurn(args){
  return projectR3PreEventTurn({...args,p3InventoryStage:true,
    reviewedEventTimeSlice:false,r4ReviewedSort:null,r4DataRead:null});
}

/** R4 continuation: caller must finish all EVENT phases before committing. */
export function projectR4InventoryPreEventTurn(args){
  const stage=projectR3PreEventTurn({...args,p3InventoryStage:true,
    reviewedEventTimeSlice:true});
  return {...stage,committable:false,receipt:{...stage.receipt,r4Committable:false}};
}

/** Source-only first boundary slice, derived from the exact original
 * @timespan plan. The remaining command slices, EVENT and disk effects
 * MUST still be handled by a future coordinator. No public time authority.
 */
export function projectR4BoundaryPreEventCandidate({reviewedPeriod,candidateSettled=false,...args}){
  const {world,reviewed,minutes}=args;
  if(!Number.isSafeInteger(minutes)||minutes<1||minutes>60||
     !Number.isSafeInteger(world?.nowSeconds))bad('bounded source command window');
  const commandNowSeconds=world.nowSeconds+minutes*60;
  const plan=projectOriginalR4TimeSlices({reviewed:reviewed.turnSlices,
    lastSeconds:world.nowSeconds,nowSeconds:commandNowSeconds});
  if(!plan.crossesSettlement||plan.effectiveSlices[0]?.dateupdate!==1)
    bad('source settlement boundary required');
  const spanSeconds=plan.effectiveSlices[0].timespanSeconds;
  const stage=projectSourcePreEventSaleSlice({...args,p3InventoryStage:true,reviewedEventTimeSlice:true},
    {spanSeconds,commandNowSeconds,reviewed:reviewedPeriod,dateupdate:1,dataReadWorld:world,candidateSettled});
  return {...stage,plan,committable:false,worldStateWritten:false};
}

/** Residual slice of the SAME inc-turn command. The original DataRead
 * snapshot is used only to calculate ITEM overlays; the real EVENT map
 * and settled population are carried independently by the coordinator.
 * This deliberately cannot be called as a public/legacy time action.
 */
export function projectR4ResidualPreEventCandidate({originWorld,reviewedPeriod,candidateSettled=false,...args}){
  const {world,reviewed,minutes}=args;
  if(!Number.isSafeInteger(minutes)||minutes<1||minutes>60||
     originWorld?.worldId!==world?.worldId||originWorld?.revision!==world?.revision)
    bad('same source command identity required');
  const commandNowSeconds=originWorld.nowSeconds+minutes*60;
  const plan=projectOriginalR4TimeSlices({reviewed:reviewed.turnSlices,
    lastSeconds:originWorld.nowSeconds,nowSeconds:commandNowSeconds});
  if(!plan.crossesSettlement||plan.effectiveSlices.length!==2||
     plan.effectiveSlices[1].dateupdate!==0||
     world.nowSeconds!==originWorld.nowSeconds+plan.effectiveSlices[0].timespanSeconds||
     world.period?.dtPeople<1||world.period?.eventState===null)
    bad('exact second source slice required');
  const stage=projectSourcePreEventSaleSlice({...args,p3InventoryStage:true,reviewedEventTimeSlice:true},
    {spanSeconds:plan.effectiveSlices[1].timespanSeconds,commandNowSeconds,
     reviewed:reviewedPeriod,dateupdate:0,dataReadWorld:originWorld,candidateSettled});
  return {...stage,plan,committable:false,worldStateWritten:false};
}

/** Candidate-only first command after a settlement; no extra boundary. */
export function projectR4PostSettlementPreEventCandidate({reviewedPeriod,...args}){
  const {world,reviewed,minutes}=args;
  if(!Number.isSafeInteger(minutes)||minutes<1||minutes>60||world.period?.state!=='source-cross-period-candidate-not-committed')bad('source settled candidate required');
  const spanSeconds=minutes*60,commandNowSeconds=world.nowSeconds+spanSeconds;
  const plan=projectOriginalR4TimeSlices({reviewed:reviewed.turnSlices,lastSeconds:world.nowSeconds,nowSeconds:commandNowSeconds});
  if(plan.crossesSettlement||plan.effectiveSlices.length!==1)bad('noncrossing candidate continuation required');
  const stage=projectSourcePreEventSaleSlice({...args,p3InventoryStage:true,reviewedEventTimeSlice:true},
    {spanSeconds,commandNowSeconds,reviewed:reviewedPeriod,dateupdate:0,dataReadWorld:world,candidateSettled:true});
  return {...stage,plan,committable:false,worldStateWritten:false};
}

/**
 * Legacy B-41 HTTP command. This is intentionally NOT a full source turn:
 * R4 EVENT isn't run, so the saved EVENT successor becomes UNKNOWN, not {}.
 * Keep old narrow regression behavior until the R4 event engine replaces it.
 */
export function projectB41Sale(args){
  const stage=projectSourcePreEventSaleSlice({...args,p3InventoryStage:false,r4DataRead:null});
  return {
    ...stage,
    ...(args.world?.schema===PERIOD_WORLD_SCHEMA?{
      period:{...args.world.period,eventState:null},
    }:{}),
  };
}

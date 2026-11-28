/** Source-only full pre-EVENT + external rebel two-slice coordinator.
 * Separate from normal CAS/replay; zero city tax-rate by default, one active shop,
 * no guild/dragon/closure or external save authority. Initial bytes may
 * be source fixture inputs. This never proves player acquisition.
 */
import {projectR4BoundaryPreEventCandidate,projectR4ResidualPreEventCandidate,projectR4PostSettlementPreEventCandidate,validateP3Inventory} from './original-b41-playable-sale.mjs';
import {projectOriginalR4TimeSlices} from './original-r4-time-slices.mjs';
import {projectR4PreEventItemOverlay} from './original-r4-pre-event-item-overlay.mjs';
import {resolveR4ExternalCommandHashOrders} from './original-r4-perl-hash-replay.mjs';
import {projectR4TerritoryMixedRebelSlice} from './original-r4-territory-mixed-rebel-slice.mjs';
import {validateNormalCommerceInventory} from './reviewed-normal-commerce-items.mjs';
import {createR4CrossPeriodDraws,R4_FULL_CROSS_SLICE_DRAWS} from './r4-time-command-draws.mjs';
import {LOTO_RANGE} from './original-b58-loto-startfunc.mjs';
import {createR4LordSaleTaxContext} from './original-r4-lord-sale-tax.mjs';
import {R4_SORTED_PRE_EVENT_SOURCE} from './original-r4-sorted-pre-event.mjs';
export const R4_EXTERNAL_CROSS_PERIOD_CANDIDATE='r4-external-rebel-cross-period-candidate.v1';
const fail=s=>{throw new RangeError('R4 external cross-period candidate: '+s)};
const sameOrder=(a,b)=>a.join(',')===b.join(',');
export function projectR4ExternalCrossPeriodCandidate({world,minutes,street,reviewedR4,
  reviewedDataRead,reviewedHash,reviewedEvents,reviewedPeriod,liveArmyBytes,
  taxRate=0,reviewedLordSaleTax=null,balJob='外敵',balName='首領',expectedInterpreter=null}){
  if(world?.schema!=='akimono.memory-world.v2'||world.events!==null||world.streetId!=='standard-street'||
     world.shops?.length!==1||world.shops[0].id!==1||world.shops[0].status!==1||
     Object.hasOwn(world.shops[0],'army')||reviewedR4?.source!==R4_SORTED_PRE_EVENT_SOURCE||
     !reviewedPeriod?.conflictTerritory||!reviewedDataRead?.rebel||!reviewedEvents?.rebel||
     reviewedEvents.guildbattle!==null||!reviewedEvents.support||!reviewedEvents.instant||
     !reviewedEvents.loto||!reviewedEvents.happy||!reviewedEvents.iron||!reviewedEvents.sword||
     (reviewedLordSaleTax===null?taxRate!==0:!Number.isSafeInteger(taxRate)||taxRate<0||taxRate>40)||!(liveArmyBytes===null||typeof liveArmyBytes==='string')||
     typeof balJob!=='string'||!balJob||typeof balName!=='string'||!balName||
     !sameOrder(reviewedEvents.eventCodes,reviewedHash?.declarationOrder??[]))
    fail('reviewed single-shop external candidate, no tax-rate or persisted DT.army');
  const normalCommerce=street.reviewedNormalCommerce??null;
  const maxDraws=normalCommerce===null?125:R4_FULL_CROSS_SLICE_DRAWS;
  const tape=createR4CrossPeriodDraws({world,minutes,fullCommerce:normalCommerce!==null});
  const plan=projectOriginalR4TimeSlices({reviewed:street.reviewedB41.turnSlices,
    lastSeconds:world.nowSeconds,nowSeconds:world.nowSeconds+minutes*60});
  const candidateSettled=world.period?.state==='source-cross-period-candidate-not-committed';
  if(plan.effectiveSlices.length<1||plan.effectiveSlices.length>2||(!plan.crossesSettlement&&!candidateSettled))
    fail('crossing or settled source candidate required');
  const initial=resolveR4ExternalCommandHashOrders({reviewed:reviewedHash,world,minutes,expectedInterpreter});
  const overlay=projectR4PreEventItemOverlay({reviewed:reviewedDataRead,world,activeOrder:initial.initialOrder,
    saleReview:street.reviewedB41,plusReview:street.reviewedAllPlus,candidateSettled,externalCandidate:true,normalCommerce});
  const steps=[],slices=[];
  let cursor=world,hash=initial,used=0,pendingArmyBytes=null,currentTax=taxRate,transientArmy=null;
  for(const [i,part] of plan.effectiveSlices.entries()){
    // DataRead ITEM overlays remain frozen for both slices, but the original
    // GetUserTaxRate reads live %DTevent and DTTaxrate at EACH actual sale.
    // The complete EVENT map was independently validated by the overlay
    // and callback lineage; only its rebel key participates in taxation.
    const lordTaxContext=reviewedLordSaleTax===null?null:createR4LordSaleTaxContext({
      reviewed:reviewedLordSaleTax,townTaxRate:currentTax,taxMode:cursor.shops[0].taxmode,
      eventState:cursor.period.eventState.rebel?{rebel:cursor.period.eventState.rebel}:{}});
    const args={world:cursor,minutes,shopId:1,reviewed:street.reviewedB41,
      reviewedAllPlus:street.reviewedAllPlus,compiled:street.reviewedGiftMapUse,
      reviewedB59Iron:street.reviewedB59Iron,reviewedB60Happy:street.reviewedB60Happy,
      reviewedB61Sword:street.reviewedB61Sword,reviewedB62Map:street.reviewedB62Map,
      reviewedB63Map:street.reviewedB63Map,reviewedNayuta:street.reviewedNayuta,
      reviewedPeriod,candidateSettled,r4ReviewedSort:reviewedR4.sort,normalCommerce,lordTaxContext,
      r4DataRead:{reviewed:reviewedDataRead,activeOrder:initial.initialOrder}};
    const project=!plan.crossesSettlement?projectR4PostSettlementPreEventCandidate:
      i===0?a=>projectR4BoundaryPreEventCandidate({...a,conflictNames:{balJob,balName}}):
      a=>projectR4ResidualPreEventCandidate({...a,originWorld:world});
    const preSamples=[];let pre=null;
    for(let n=0;n<=maxDraws;n++){
      try{pre=project({...args,randomDraws:preSamples});break;}
      catch(e){
        if(!/missing.*(draw|sample|rand\(1\))|requires.*random|random.*required|rand\(1\).*required|explicit.*maximum 118/.test(e.message))throw e;
        if(n===maxDraws)fail('pre-EVENT draw budget exhausted');
        preSamples.push(tape.unit(used+n));
      }
    }
    if(!pre||pre.receipt.totalDraws!==preSamples.length||pre.nowSeconds!==cursor.nowSeconds+part.timespanSeconds)
      fail('exact prefix draw accounting');
    used+=preSamples.length;
    const settlement=pre.settlement;
    if(Boolean(settlement)!==(part.dateupdate===1)||settlement&&!settlement.conflictTerritory)fail('source period lineage');
    const events={...cursor.period.eventState};
    let periodRebel=null;
    if(settlement){
      periodRebel=settlement.conflictTerritory.activeUntilSeconds;
      if(periodRebel!==null)events.rebel=periodRebel;
      else if(Object.hasOwn(events,'rebel'))fail('unexpected period rebel deletion');
    }
    const priorOrder=periodRebel===null?hash.nextPriorOrder:
      resolveR4ExternalCommandHashOrders({reviewed:reviewedHash,world,minutes,pendingPeriodRebel:periodRebel,
        expectedInterpreter:initial.interpreter}).nextPriorOrder;
    let op=null,preNow=null;
    const mixed=projectR4TerritoryMixedRebelSlice({reviewedEvent:reviewedEvents,town:settlement?.town??cursor.period.town,
      items:overlay.baseItems,shop:{...pre.shops[0],army:transientArmy},startSeconds:cursor.nowSeconds,
      spanSeconds:part.timespanSeconds,activeUntilSeconds:events,activeHashOrderFixture:priorOrder,
      eventHashOrderFixture:initial.eventOrder,taxRate:currentTax,balJob,balName,liveArmyBytes,pendingArmyBytes,
      reviewedSubminute:true,reviewedInventory:{sale:street.reviewedB41,compiled:street.reviewedGiftMapUse,normalCommerce},
      randomDrawProvider:(index,range)=>range===LOTO_RANGE?tape.lottery(used+index):tape.unit(used+index),
      resolveNowOrder:({expired,started,activeUntilSeconds})=>{
        op={periodRebel,expired:[...expired],started:started.map(code=>[code,activeUntilSeconds[code]]),nowDeleted:[]};
        preNow=resolveR4ExternalCommandHashOrders({reviewed:reviewedHash,world,minutes,steps:[...steps,op],expectedInterpreter:initial.interpreter});
        const order=preNow.steps.at(-1);
        if(!sameOrder(order.prior,priorOrder)||!sameOrder(preNow.eventOrder,initial.eventOrder))fail('native pre-NOW lineage');
        return order.now;
      }});
    if(!op||!preNow||!mixed.event.shop)fail('complete mixed source callback required');
    const event=mixed.event,nowOrder=preNow.steps.at(-1).now;
    op.nowDeleted=nowOrder.filter(code=>!Object.hasOwn(event.activeUntilSeconds,code));
    steps.push(op);
    hash=resolveR4ExternalCommandHashOrders({reviewed:reviewedHash,world,minutes,steps,expectedInterpreter:initial.interpreter});
    if(!sameOrder(hash.steps.at(-1).now,nowOrder))fail('native NOW traversal drift');
    const period={...cursor.period,town:mixed.town,
      ...(settlement?{dtPeople:settlement.dtPeople,settledCount:cursor.period.settledCount+1,
        lastSettledBoundarySeconds:pre.nowSeconds,state:'source-cross-period-candidate-not-committed'}:{}),
      eventState:Object.fromEntries(hash.nextPriorOrder.map(code=>[code,event.activeUntilSeconds[code]]))};
    const {army,...persistedShop}=event.shop;
    transientArmy=army;
    if(normalCommerce===null)validateP3Inventory(persistedShop,street.reviewedGiftMapUse,street.reviewedB41);
    else validateNormalCommerceInventory(persistedShop,street.reviewedGiftMapUse,normalCommerce);
    used+=mixed.drawsUsed;pendingArmyBytes=mixed.stagedArmyBytes;currentTax=mixed.taxRate;
    slices.push({dateupdate:part.dateupdate,spanSeconds:part.timespanSeconds,startSeconds:cursor.nowSeconds,
      preEvent:pre,preEventDraws:preSamples,periodRebel,
      ...(lordTaxContext===null?{}:{lordTax:{townRateBefore:lordTaxContext.townTaxRate,userTaxRate:lordTaxContext.userTaxRate,
        taxMode:lordTaxContext.taxMode,rebellionBefore:lordTaxContext.rebellion,townRateAfter:currentTax}}),activeOrder:[...priorOrder],eventOrder:[...initial.eventOrder],
      nowOrder:[...nowOrder],afterOrder:[...hash.nextPriorOrder],eventDrawRanges:mixed.randomDrawRanges,
      eventSamples:mixed.consumedSamples,eventLogs:mixed.logs,periodLogs:settlement?.conflictTerritory.logs??[],
      eventState:period.eventState,town:mixed.town,shop:persistedShop,transientArmy,armyRead:mixed.armyRead,stagedArmyBytes:pendingArmyBytes});
    cursor={...cursor,shops:[persistedShop],market:pre.market,period,nowSeconds:pre.nowSeconds};
  }
  if(cursor.nowSeconds!==plan.nowAfter)fail('incomplete source command');
  return Object.freeze({source:R4_EXTERNAL_CROSS_PERIOD_CANDIDATE,committable:false,worldStateWritten:false,
    shops:cursor.shops,market:cursor.market,period:cursor.period,nowSeconds:cursor.nowSeconds,
    liveArmyBytes,stagedArmyBytes:pendingArmyBytes,taxRate:currentTax,transientArmy,
    evidence:{drawPolicy:tape.policy,hashPolicy:hash.policy,seed:hash.seed,interpreter:hash.interpreter,
      dataReadOrder:initial.initialOrder,plusSeconds:overlay.plusSeconds,drawsUsed:used,slices}});
}

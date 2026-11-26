import {resolveR4ExactPreEventPrefix} from './r4-exact-pre-event-prefix.mjs';
import {isR4IndependentCloseReview,projectR4EmptyStreetPreEvent} from './original-r4-independent-close-candidate.mjs';
/** Source-only crossing command candidate. One DataRead overlay and
 * native hash mutation lineage; one server tape spans both source slices.
 * The B50 disk tail/commit is NOT yet included. Never publish as WorldState.
 */
import {projectR4BoundaryPreEventCandidate,projectR4ResidualPreEventCandidate,projectR4PostSettlementPreEventCandidate,validateP3Inventory} from './original-b41-playable-sale.mjs';
import {projectOriginalR4TimeSlices} from './original-r4-time-slices.mjs';
import {projectR4PreEventItemOverlay,validateR4PreEventPeriod} from './original-r4-pre-event-item-overlay.mjs';
import {projectOriginalR4MultiEventFixture,R4_MULTI_EVENT_FIXTURE_SOURCE} from './original-r4-multi-event-order-fixture.mjs';
import {resolveR4CommandHashOrders} from './original-r4-perl-hash-replay.mjs';
import {validateNormalCommerceInventory} from './reviewed-normal-commerce-items.mjs';
import {R4_FULL_CROSS_SLICE_DRAWS,createR4CrossPeriodDraws} from './r4-time-command-draws.mjs';
import {LOTO_RANGE} from './original-b58-loto-startfunc.mjs';
import {R4_SORTED_PRE_EVENT_SOURCE} from './original-r4-sorted-pre-event.mjs';
export const R4_CROSS_PERIOD_CANDIDATE='r4-reviewed-cross-period-candidate.v1';
const fail=s=>{throw new RangeError('R4 cross-period candidate: '+s)};
const lineage=new WeakMap();
export function projectR4CrossPeriodCandidate(args){
  return projectCandidate(args,false);
}
// A pure successor may also be reprojected by the trusted CAS reviewer from
// its source-validated settled world. This export grants NO commit authority.
export function projectR4SettledPeriodCandidate(args){
  if(args.world?.period?.state!=='source-cross-period-candidate-not-committed')fail('settled candidate input required');
  return projectCandidate(args,true);
}
// Only the exact returned object can continue. Its mutable public payload
// is never trusted as input: use the private cloned source successor.
export function continueR4CrossPeriodCandidate({previous,minutes}){
  const prior=lineage.get(previous);
  if(!prior)fail('source candidate lineage required');
  return projectCandidate({...prior,world:structuredClone(prior.world),minutes},true);
}
function projectCandidate({world,minutes,street,reviewedR4,reviewedDataRead,reviewedHash,reviewedEvents,reviewedPeriod,expectedInterpreter=null,r4CloseReview=null,sessionFileNames=null},candidateSettled){
  const closeEnabled=r4CloseReview!==null;
  if(closeEnabled&&(!isR4IndependentCloseReview(r4CloseReview)||!street?.reviewedNormalCommerce||
     reviewedPeriod?.actualClose?.fullCommerceArchive!==true||!Array.isArray(sessionFileNames)))fail('reviewed independent closure candidate required');
  if(!closeEnabled&&sessionFileNames!==null)fail('unreviewed session inventory');
  if(world?.schema!=='akimono.memory-world.v2'||world.events!==null||(world.shops?.length!==1&&!(closeEnabled&&candidateSettled&&world.shops?.length===0))||
     world.streetId!=='standard-street'||reviewedR4?.source!==R4_SORTED_PRE_EVENT_SOURCE||
     reviewedR4.committable!==false||reviewedEvents?.source!==R4_MULTI_EVENT_FIXTURE_SOURCE||
     !reviewedEvents.support||!reviewedEvents.instant||!reviewedEvents.loto||!reviewedEvents.happy||
     !reviewedEvents.iron||!reviewedEvents.sword||reviewedEvents.guildbattle!==null||reviewedEvents.rebel!==null)
    fail('reviewed independent single-shop source dependencies required');
  if(reviewedEvents.eventCodes.join(',')!==reviewedHash?.declarationOrder?.join(','))fail('EVENT catalog mismatch');
  const tape=createR4CrossPeriodDraws({world,minutes,fullCommerce:street.reviewedNormalCommerce!==undefined});
  const normalCommerce=street.reviewedNormalCommerce??null;
  const maxDraws=normalCommerce===null?125:R4_FULL_CROSS_SLICE_DRAWS;
  const plan=projectOriginalR4TimeSlices({reviewed:street.reviewedB41.turnSlices,lastSeconds:world.nowSeconds,nowSeconds:world.nowSeconds+minutes*60});
  if(plan.effectiveSlices.length<1||plan.effectiveSlices.length>2||(!plan.crossesSettlement&&!candidateSettled)||plan.effectiveSlices[0].dateupdate!==(plan.crossesSettlement?1:0))
    fail('one actual source settlement required');
  const initialHash=resolveR4CommandHashOrders({reviewed:reviewedHash,world,minutes,expectedInterpreter});
  validateR4PreEventPeriod({reviewed:reviewedDataRead,period:world.period,activeOrder:initialHash.initialOrder,candidateSettled});
  const overlay=projectR4PreEventItemOverlay({reviewed:reviewedDataRead,world,activeOrder:initialHash.initialOrder,saleReview:street.reviewedB41,plusReview:street.reviewedAllPlus,candidateSettled,normalCommerce});
  const steps=[],slices=[];let cursor=world,hash=initialHash,used=0,settlement=null;
  for(const [i,part] of plan.effectiveSlices.entries()){
    const args={world:cursor,minutes,shopId:1,reviewed:street.reviewedB41,
      reviewedAllPlus:street.reviewedAllPlus,compiled:street.reviewedGiftMapUse,
      reviewedB59Iron:street.reviewedB59Iron,reviewedB60Happy:street.reviewedB60Happy,
      reviewedB61Sword:street.reviewedB61Sword,reviewedB62Map:street.reviewedB62Map,
      reviewedB63Map:street.reviewedB63Map,reviewedNayuta:street.reviewedNayuta,
      reviewedPeriod,candidateSettled,r4ReviewedSort:reviewedR4.sort,normalCommerce,
      ...(closeEnabled?{r4CloseReview,sessionFileNames,expectedInterpreter:initialHash.interpreter}:{}),
      r4DataRead:{reviewed:reviewedDataRead,activeOrder:initialHash.initialOrder}};
    const project=cursor.shops.length===0?a=>projectR4EmptyStreetPreEvent({reviewed:r4CloseReview,
      world:cursor,originWorld:world,street,reviewedDataRead,activeOrder:initialHash.initialOrder,
      candidateSettled,spanSeconds:part.timespanSeconds,dateupdate:part.dateupdate,randomDraws:a.randomDraws}):
      !plan.crossesSettlement?projectR4PostSettlementPreEventCandidate:i===0?projectR4BoundaryPreEventCandidate:
      a=>projectR4ResidualPreEventCandidate({...a,originWorld:world});
    const {pre,samples}=resolveR4ExactPreEventPrefix({maxDraws,unit:index=>tape.unit(used+index),
      project:randomDraws=>project({...args,randomDraws})});
    if(pre.nowSeconds!==cursor.nowSeconds+part.timespanSeconds)fail('exact source slice and draw accounting');
    used+=samples.length;
    if(part.dateupdate===1&&cursor.shops.length){
      settlement=pre.settlement;
      if(!settlement?.shop&&!(closeEnabled&&settlement?.actualCloseEffect?.closed===true&&pre.shops.length===0))fail('missing source settlement');
    }else if(pre.settlement!==null)fail('unexpected source settlement');
    let finalHash=null;
    const event=projectOriginalR4MultiEventFixture({
      reviewed:reviewedEvents,items:overlay.baseItems,shop:pre.shops[0]??null,
      ...(pre.shops.length===0?{r4EmptyStreetReview:r4CloseReview.emptyEvents}:{}),
      startSeconds:cursor.nowSeconds,spanSeconds:part.timespanSeconds,activeUntilSeconds:cursor.period.eventState,
      activeHashOrderFixture:hash.nowOrder,eventHashOrderFixture:hash.eventOrder,
      reviewedInventory:{sale:street.reviewedB41,compiled:street.reviewedGiftMapUse,normalCommerce},
      exactTicketDraws:true,reviewedSubminute:true,
      randomDrawProvider:(index,range)=>range===LOTO_RANGE?tape.lottery(used+index):tape.unit(used+index),
      resolveNowOrder:({expired,started,activeUntilSeconds})=>{
        const op={expired:[...expired],started:started.map(code=>[code,activeUntilSeconds[code]])};
        finalHash=resolveR4CommandHashOrders({reviewed:reviewedHash,world,minutes,steps:[...steps,op],expectedInterpreter:hash.interpreter});
        if(finalHash.steps.at(-1).prior.join(',')!==hash.nowOrder.join(',')||finalHash.eventOrder.join(',')!==hash.eventOrder.join(','))fail('native command hash lineage');
        steps.push(op);return finalHash.nowOrder;
      }
    });
    if(!finalHash||event.committable!==false||(pre.shops.length===0?event.shop!==null:!event.shop))fail('complete source EVENT successor required');
    used+=event.drawsUsed;
    if(event.shop!==null){
      if(normalCommerce!==null)validateNormalCommerceInventory(event.shop,street.reviewedGiftMapUse,normalCommerce);
      else validateP3Inventory(event.shop,street.reviewedGiftMapUse,street.reviewedB41);
    }
    const period={...cursor.period,
      ...(pre.settlement?{town:settlement.town,dtPeople:settlement.dtPeople,
        settledCount:cursor.period.settledCount+1,lastSettledBoundarySeconds:pre.nowSeconds,
        state:'source-cross-period-candidate-not-committed'}:{}),
      eventState:Object.fromEntries(finalHash.nowOrder.map(code=>[code,event.activeUntilSeconds[code]]))};
    slices.push({dateupdate:part.dateupdate,spanSeconds:part.timespanSeconds,
      startSeconds:cursor.nowSeconds,nowSeconds:pre.nowSeconds,preEvent:pre,
      preEventDraws:[...samples],activeOrder:[...hash.nowOrder],eventOrder:[...hash.eventOrder],
      nowOrder:[...finalHash.nowOrder],eventDrawRanges:event.randomDrawRanges,eventSamples:event.consumedSamples,
      eventLogs:event.logs,eventState:period.eventState,shop:event.shop,
      ...(normalCommerce!==null?{happyEffects:event.happyEffects,instantEffects:event.instantEffects}: {})});
    cursor={...cursor,shops:event.shop===null?[]:[event.shop],market:pre.market,period,nowSeconds:pre.nowSeconds};hash=finalHash;
  }
  if(cursor.nowSeconds!==plan.nowAfter||Boolean(settlement)!==(plan.crossesSettlement&&world.shops.length===1))fail('complete crossing command required');
  const result=Object.freeze({source:R4_CROSS_PERIOD_CANDIDATE,committable:false,worldStateWritten:false,
    shops:cursor.shops,market:cursor.market,period:cursor.period,nowSeconds:cursor.nowSeconds,
    evidence:{drawPolicy:tape.policy,hashPolicy:hash.policy,seed:hash.seed,interpreter:hash.interpreter,
      dataReadOrder:initialHash.initialOrder,plusSeconds:overlay.plusSeconds,drawsUsed:used,slices}});
  lineage.set(result,{world:structuredClone({...cursor,revision:world.revision+1}),street,reviewedR4,reviewedDataRead,reviewedHash,reviewedEvents,reviewedPeriod,expectedInterpreter:hash.interpreter,r4CloseReview,
    sessionFileNames:closeEnabled?[...(settlement?.actualCloseEffect?.remainingSessions??sessionFileNames)]:null});
  return result;
}

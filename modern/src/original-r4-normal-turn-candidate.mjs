/** Candidate shared normal-turn projection. Still NOT a command or commit.
 * Connects the same source pre-EVENT and full 17-key EVENT engine; does not
 * write a WorldState, issue a player action, or persist a proof by itself.
 */
import {projectR4SortedInventoryPreEventTurn} from './original-r4-sorted-pre-event.mjs';
import {projectR4PreEventItemOverlay,validateR4PreEventPeriod} from './original-r4-pre-event-item-overlay.mjs';
import {projectOriginalR4MultiEventFixture,R4_MULTI_EVENT_FIXTURE_SOURCE} from './original-r4-multi-event-order-fixture.mjs';
import {resolveR4HashOrders} from './original-r4-perl-hash-replay.mjs';
import {createR4TimeDraws} from './r4-time-command-draws.mjs';
import {LOTO_RANGE} from './original-b58-loto-startfunc.mjs';
import {validateP3Inventory} from './original-b41-playable-sale.mjs';
export const R4_NORMAL_TURN_PROJECTION='r4-reviewed-normal-turn-candidate.v1';
const fail=s=>{throw new RangeError('R4 normal turn candidate: '+s)};
export function projectR4NormalTurnCandidate({world,minutes,street,reviewedR4,reviewedDataRead,reviewedHash,reviewedEvents,expectedInterpreter=null}){
  if(world?.schema!=='akimono.memory-world.v2'||world.events!==null||world.shops?.length!==1||world.streetId!=='standard-street')fail('one reviewed source shop required');
  if(reviewedEvents?.source!==R4_MULTI_EVENT_FIXTURE_SOURCE||!reviewedEvents.support||!reviewedEvents.instant||!reviewedEvents.loto||!reviewedEvents.happy||!reviewedEvents.iron||!reviewedEvents.sword||reviewedEvents.guildbattle!==null||reviewedEvents.rebel!==null)fail('complete normal EVENT review required');
  if(reviewedEvents.eventCodes.join(',')!==reviewedHash?.declarationOrder?.join(','))fail('EVENT catalog mismatch');
  const hash=resolveR4HashOrders({reviewed:reviewedHash,world,minutes,expectedInterpreter});
  validateR4PreEventPeriod({reviewed:reviewedDataRead,period:world.period,activeOrder:hash.activeOrder});
  const tape=createR4TimeDraws({world,minutes});
  const args={world,minutes,shopId:world.shops[0].id,reviewed:street.reviewedB41,
    reviewedAllPlus:street.reviewedAllPlus,compiled:street.reviewedGiftMapUse,
    reviewedB59Iron:street.reviewedB59Iron,reviewedB60Happy:street.reviewedB60Happy,
    reviewedB61Sword:street.reviewedB61Sword,reviewedB62Map:street.reviewedB62Map,
    reviewedB63Map:street.reviewedB63Map,reviewedNayuta:street.reviewedNayuta,
    reviewedR4,reviewedDataRead,activeOrder:hash.activeOrder};
  // Existing exact-consumption projectors are pure. Find the unique prefix,
  // only extending on their explicit missing-draw errors, never on another
  // boundary violation. The caller cannot supply or select RNG.
  let pre=null;
  const samples=[];
  for(let n=0;n<=121;n++){
    try{pre=projectR4SortedInventoryPreEventTurn({...args,randomDraws:samples});break;}
    catch(e){
      if(!/missing.*(draw|sample)|requires.*random|random.*required|rand\(1\).*required|explicit.*maximum 118/.test(e.message))throw e;
      if(n===121)fail('pre-EVENT draw budget exhausted');
      samples.push(tape.unit(n));
    }
  }
  if(!pre||pre.receipt.totalDraws!==samples.length)fail('pre-EVENT exact draw accounting');
  const overlay=projectR4PreEventItemOverlay({reviewed:reviewedDataRead,world,activeOrder:hash.activeOrder,saleReview:street.reviewedB41,plusReview:street.reviewedAllPlus});
  let finalOrder=null;
  const event=projectOriginalR4MultiEventFixture({
    reviewed:reviewedEvents,items:overlay.baseItems,shop:pre.shops[0],
    startSeconds:world.nowSeconds,spanSeconds:minutes*60,activeUntilSeconds:world.period.eventState,
    activeHashOrderFixture:hash.activeOrder,eventHashOrderFixture:hash.eventOrder,
    reviewedInventory:{sale:street.reviewedB41,compiled:street.reviewedGiftMapUse},
    exactTicketDraws:true,
    randomDrawProvider:(index,range)=>range===LOTO_RANGE?tape.lottery(samples.length+index):tape.unit(samples.length+index),
    resolveNowOrder:({expired,started,activeUntilSeconds})=>{
      finalOrder=resolveR4HashOrders({reviewed:reviewedHash,world,minutes,expired,started:started.map(code=>[code,activeUntilSeconds[code]]),expectedInterpreter:hash.interpreter});
      if(finalOrder.activeOrder.join(',')!==hash.activeOrder.join(',')||finalOrder.eventOrder.join(',')!==hash.eventOrder.join(','))fail('native hash replay mismatch');
      return finalOrder.nowOrder;
    }
  });
  if(!finalOrder||!event.shop||event.committable!==false)fail('complete source EVENT successor required');
  validateP3Inventory(event.shop,street.reviewedGiftMapUse,street.reviewedB41);
  // Preserve the native write order: next DataRead reconstructs this hash
  // from CSV in a new CGI process; never serialize a sorted key list instead.
  const nextEvents=Object.fromEntries(finalOrder.nowOrder.map(code=>[code,event.activeUntilSeconds[code]]));
  const period={...world.period,eventState:nextEvents};
  validateR4PreEventPeriod({reviewed:reviewedDataRead,period,activeOrder:finalOrder.nowOrder});
  return Object.freeze({source:R4_NORMAL_TURN_PROJECTION,committable:false,
    shops:[event.shop],market:pre.market,nowSeconds:pre.nowSeconds,period,
    evidence:{drawPolicy:tape.policy,hashPolicy:hash.policy,seed:hash.seed,interpreter:hash.interpreter,
      activeOrder:hash.activeOrder,eventOrder:hash.eventOrder,nowOrder:finalOrder.nowOrder,
      preEventDraws:Object.freeze([...samples]),eventDrawRanges:event.randomDrawRanges,eventSamples:event.consumedSamples,
      started:event.started,expired:event.expired,zeroStartTransient:event.zeroStartTransient,logs:event.logs,
      preEventReceipt:pre.receipt}});
}

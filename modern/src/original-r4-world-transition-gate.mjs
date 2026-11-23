/**
 * R4 WorldState v2 transition gate for Standard Street.
 *
 * A source-reviewed clock calculation is necessary but NOT sufficient to
 * settle a period. Until the complete 36-hour original settlement and
 * external guild/army/backup effects have a durable source-reviewed commit,
 * every boundary-crossing GameCore action must fail BEFORE memory CAS.
 *
 * This does not authorize full EVENT, IO, period commits, or disk writes.
 */
import {reviewOriginalR4TimeSlices,projectOriginalR4TimeSlices,
  R4_TIME_SLICE_SOURCE} from './original-r4-time-slices.mjs';
import {validateOriginalPeriodSeed}
  from './original-period-world-seed.mjs';
import {B59_IRON_SOURCE,isReviewedB59EventPeriod}
  from './original-b59-iron-event-lifecycle.mjs';
import {B60_HAPPY_SOURCE,isReviewedB60HappyPeriod}
  from './original-b60-happy-event-nowfunc.mjs';
import {B61_SWORD_SOURCE,isReviewedB61SwordPeriod}
  from './original-b61-sword-demand-event.mjs';

export const R4_TRANSITION_GATE_SOURCE='r4-original-source-36h-v2-memory-transition-gate';
const fail=s=>{throw new RangeError('R4 source WorldState transition: '+s);};
const safe=(n)=>Number.isSafeInteger(n)&&n>=0;
function validSourcePeriod(world){
  if(!world||world.schema!=='akimono.memory-world.v2'||
     world.streetId!=='standard-street'||!safe(world.nowSeconds))
    return false;
  return validateOriginalPeriodSeed(world.period)||
    isReviewedB59EventPeriod({
      period:world.period,nowSeconds:world.nowSeconds,
      reviewed:{source:B59_IRON_SOURCE},
    })||
    isReviewedB60HappyPeriod({
      period:world.period,nowSeconds:world.nowSeconds,
      reviewed:{source:B60_HAPPY_SOURCE},
    })||
    isReviewedB61SwordPeriod({
      period:world.period,nowSeconds:world.nowSeconds,
      reviewed:{source:B61_SWORD_SOURCE},
    });
}
export function reviewR4WorldTransitionGate({turnSource,configSource}){
  const clock=reviewOriginalR4TimeSlices({turnSource,configSource});
  if(clock.source!==R4_TIME_SLICE_SOURCE||
     clock.periodSeconds!==129600||clock.shiftSeconds!==10800)
    fail('original frozen 36h clock source changed');
  return Object.freeze({
    source:R4_TRANSITION_GATE_SOURCE,
    clock,committable:false,
    scope:'Standard Street v2 GameCore in-memory pre-CAS v2 period/time transition veto; no settled WorldState or file IO',
  });
}
/** Only true authorizes GameCore to apply a nonsettling v2 transition. */
export function allowR4UnsettledWorldTransition({reviewed,before,after}){
  if(reviewed?.source!==R4_TRANSITION_GATE_SOURCE||
     reviewed.committable!==false||
     reviewed.clock?.source!==R4_TIME_SLICE_SOURCE||
     reviewed.clock.periodSeconds!==129600||
     reviewed.clock.shiftSeconds!==10800)
    fail('source-reviewed original R4 transition gate required');
  if(!validSourcePeriod(before)||!validSourcePeriod(after))
    fail('unreviewed or settled period/city/event WorldState');
  if(before.worldId!==after.worldId||
     before.streetId!==after.streetId||
     before.schema!==after.schema||
     after.revision!==before.revision+1)
    fail('source WorldState identity or revision drift');
  if(!safe(after.nowSeconds)||after.nowSeconds<before.nowSeconds)
    fail('original clock regression');
  // Source EVENT start/expiry is driven by inc-turn's nonzero time span.
  // A syntactically valid single EVENT overlay alone is not proof that it
  // started or ended. In particular, direct CAS at an identical timestamp
  // may NOT silently invent an iron/happy/sword event or expiry.
  if(after.nowSeconds===before.nowSeconds&&
     JSON.stringify(before.period.eventState)!==
       JSON.stringify(after.period.eventState))
    fail('original EVENT schedule cannot change with zero time span');
  // Even when an otherwise trusted StreetModule supplies a period receipt,
  // crossing the source clock boundary requires the entire ORIGINAL
  // settlement state and durable transaction that are not yet reviewed.
  const clock=projectOriginalR4TimeSlices({
    reviewed:reviewed.clock,lastSeconds:before.nowSeconds,
    nowSeconds:after.nowSeconds,
  });
  if(clock.crossesSettlement)
    fail('unreviewed 36h period settlement cannot enter GameCore CAS');
  return true;
}

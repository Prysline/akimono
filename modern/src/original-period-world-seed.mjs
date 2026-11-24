/**
 * B-51: a source-backed *initial* Standard Street city/period envelope.
 * It is a persistent v2 WorldState field, not a full period transition.
 * The original admin init CITY record, Core field wire order, and B-42
 * shift-adjusted 36h clock must all be verified before this may be seeded.
 * Unknown EVENT runtime contents remain null, never a fabricated empty list.
 */
import {reviewOriginalPeriodTerritory}
  from './original-period-territory.mjs';
import {reviewOriginalEmptyEventBootstrap,createOriginalEmptyEventState,
  validateOriginalEventBootstrapState,B52_EVENT_BOOTSTRAP}
  from './original-event-world-bootstrap.mjs';
export const SOURCE_PERIOD_SEED='standard-street-original-period-bootstrap.v1';
const fail=s=>{throw new RangeError('B-51 original period bootstrap: '+s);};
const SOURCE_BOOTSTRAP_META='500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0';
const INIT_TOWN=Object.freeze({
  leader:0,money:0,in:0,out:0,develop:5001,devem:0,
  safety:5001,safem:0,army:0,robina:2000,robinb:0,
});
const expected=['source','state','periodSeconds','clockShiftSeconds',
  'settledCount','lastSettledBoundarySeconds','dtPeople','town','eventState'];
function plain(v){
  return v!==null&&typeof v==='object'&&!Array.isArray(v)&&
    (Object.getPrototypeOf(v)===Object.prototype||
      Object.getPrototypeOf(v)===null);
}
export function reviewOriginalPeriodBootstrap({
  periodSource,adminSource,readSource,writeSource,reviewedB41,
}){
  if(reviewedB41?.periodSeconds!==129600||
     reviewedB41?.clockShiftSeconds!==10800)
    fail('source-reviewed 36h +3h clock prerequisite');
  const territory=reviewOriginalPeriodTerritory({
    periodSource,adminSource,readSource,
    bootstrapMeta:SOURCE_BOOTSTRAP_META,
  });
  if(territory.initialDtPeople!==500000||
     Object.keys(INIT_TOWN).some(k=>territory.initialTown[k]!==INIT_TOWN[k])||
     Object.keys(territory.initialTown).length!==11)
    fail('original city bootstrap changed');
  const eventBootstrap=reviewOriginalEmptyEventBootstrap({
    adminSource,readSource,writeSource,
  });
  return Object.freeze({
    source:SOURCE_PERIOD_SEED,
    periodSeconds:reviewedB41.periodSeconds,
    clockShiftSeconds:reviewedB41.clockShiftSeconds,
    dtPeople:territory.initialDtPeople,
    town:territory.initialTown,
    eventBootstrap,
    scope:'initial original city/period metadata only, event and complete settlement unsupported',
  });
}
export function createOriginalPeriodSeed(reviewed){
  if(reviewed?.source!==SOURCE_PERIOD_SEED||
     reviewed.dtPeople!==500000||
     reviewed.periodSeconds!==129600||
     reviewed.clockShiftSeconds!==10800||
     reviewed.eventBootstrap?.source!==B52_EVENT_BOOTSTRAP)
    fail('reviewed source seed required');
  const record={
    source:SOURCE_PERIOD_SEED,
    state:'bootstrap-only-no-period-turn',
    periodSeconds:129600,clockShiftSeconds:10800,
    settledCount:0,
    lastSettledBoundarySeconds:null,
    dtPeople:500000,
    town:{...reviewed.town},
    eventState:createOriginalEmptyEventState(reviewed.eventBootstrap),
  };
  if(!validateOriginalPeriodSeed(record))
    fail('reviewed initial source city must match original');
  return record;
}
/**
 * B-43 can read legacy v1 records; this validator only accepts exact
 * source-initialized v2 state, not invented or unreviewed settled periods.
 * When period commits become source-reviewed, replace this with a versioned
 * full-period validator, not permissive JSON acceptance.
 */
export function validateOriginalPeriodSeed(value){
  if(!plain(value)||Object.keys(value).length!==expected.length||
     expected.some(key=>!Object.hasOwn(value,key))||
     value.source!==SOURCE_PERIOD_SEED||
     value.state!=='bootstrap-only-no-period-turn'||
     value.periodSeconds!==129600||
     value.clockShiftSeconds!==10800||
     value.settledCount!==0||
     value.lastSettledBoundarySeconds!==null||
     value.dtPeople!==500000||
     !validateOriginalEventBootstrapState(value.eventState)||
     !plain(value.town)||Object.keys(value.town).length!==11||
     Object.keys(INIT_TOWN).some(k=>value.town[k]!==INIT_TOWN[k]))
    return false;
  return true;
}

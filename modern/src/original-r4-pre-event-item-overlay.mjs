import {R4_MANUAL_COMMERCE_EVENT_CODES,isReviewedManualCommerceEvents,projectManualCommerceEventItems,reviewManualCommerceEvents,reviewedManualSaleRule,isReviewedManualSaleRule} from './original-r4-manual-commerce-events.mjs';
import {isReviewedNormalCommerceItems} from './reviewed-normal-commerce-items.mjs';
/** R4 DataRead overlay for the common single-shop pre-EVENT stage.
 * No EVENT transition, acquisition proof or commit authority is granted.
 */
import {createHash} from 'node:crypto';
import {reviewOriginalCompiledEventCatalog} from './original-event-compiled-catalog.mjs';
import {reviewR4EventItemParams,projectR4EventItemParams} from './original-r4-event-item-param.mjs';
import {validateOriginalPeriodSeed} from './original-period-world-seed.mjs';
import {loadStandardStreetModel} from './standard-street-model.mjs';
const fail=s=>{throw new RangeError('R4 DataRead ITEM overlay: '+s)};
const reviews=new WeakSet(),overlays=new WeakSet();
const durable=['boom-posyon','ken-sale','tate-sale','yoroi-sale','tue-sale','plusdown-yakusou','plusup-tetu','plusup-misuriru','plusup-oriharukon','happy'];
const pins={itemDsl:'7a18185e98b32aee82ca1ce30d6f3c395157dbcb',rebelDsl:'923634e58a05beca9ab004515fc7669d53a1ba3a',compilerSource:'1da8cce1e76ad6159325a37faec68efaa82c7f69',turnSource:'b8a4980275f475a952846a8d6072fad45f8dff50',readSource:'e7a8add7b0291901e71fe797783b664dff1568a0'};
export function reviewR4PreEventItemOverlay(sources,{includeReviewedManualCommerce=false}={}){
  if(typeof includeReviewedManualCommerce!=='boolean')fail('explicit manual commerce review');
  for(const [k,sha] of Object.entries(pins)){
    const s=sources[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const {itemDsl,rebelDsl,compilerSource,turnSource,readSource}=sources;
  const catalog=reviewOriginalCompiledEventCatalog({itemDsl,rebelDsl,compilerSource,turnSource});
  const params=reviewR4EventItemParams({catalog,compilerSource,model:loadStandardStreetModel(itemDsl,rebelDsl)});
  if(!readSource.includes('foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}'))fail('DataRead order drift');
  const manual=includeReviewedManualCommerce?reviewManualCommerceEvents(sources):null;
  const r=Object.freeze({catalog,params,manual,committable:false});reviews.add(r);return r;
}
// Candidate-only city shape. It conveys no runtime authorization; the
// continuation coordinator keeps its own private source lineage.
function isCandidateSettledPeriod(p){
  const keys=['source','state','periodSeconds','clockShiftSeconds','settledCount','lastSettledBoundarySeconds','dtPeople','town','eventState'];
  const fields=['leader','money','in','out','develop','devem','safety','safem','army','robina','robinb','people'];
  return p?.source==='standard-street-original-period-bootstrap.v1'&&p.state==='source-cross-period-candidate-not-committed'&&Object.keys(p).length===keys.length&&keys.every(k=>Object.hasOwn(p,k))&&p.periodSeconds===129600&&p.clockShiftSeconds===10800&&Number.isSafeInteger(p.settledCount)&&p.settledCount>0&&Number.isSafeInteger(p.lastSettledBoundarySeconds)&&p.lastSettledBoundarySeconds>=0&&(p.lastSettledBoundarySeconds+10800)%129600===0&&Number.isSafeInteger(p.dtPeople)&&p.dtPeople>0&&p.town&&Object.keys(p.town).length===fields.length&&fields.every(k=>Number.isSafeInteger(p.town[k])&&p.town[k]>=0)&&p.town.leader===0&&p.town.people>0;
}
export function validateR4PreEventPeriod({reviewed,period,activeOrder,candidateSettled=false}){
  if(!reviews.has(reviewed)||!period||!period.eventState||typeof period.eventState!=='object'||Array.isArray(period.eventState)||(!validateOriginalPeriodSeed({...period,eventState:{}})&&!(candidateSettled===true&&isCandidateSettledPeriod(period))))fail('known source nonsettled city and EVENT required');
  const keys=Object.keys(period.eventState);
  if(!Array.isArray(activeOrder)||activeOrder.length!==keys.length||new Set(activeOrder).size!==keys.length||activeOrder.some(k=>!Object.hasOwn(period.eventState,k)||(!durable.includes(k)&&!(reviewed.manual&&R4_MANUAL_COMMERCE_EVENT_CODES.includes(k)))||!Number.isSafeInteger(period.eventState[k])||period.eventState[k]<0))fail('complete reviewed active EVENT order required');
  // START=-1 manual keys have no compiled %EVENT record. The original
  // active loop uses an empty group for them, not their DSL ordinal.
  const groups=activeOrder.filter(code=>!R4_MANUAL_COMMERCE_EVENT_CODES.includes(code)).map(code=>reviewed.catalog.compiled.find(e=>e.code===code)?.group);
  if(groups.some(g=>!g)||new Set(groups).size!==groups.length)fail('conflicting source EVENT groups');
  return true;
}
export function projectR4PreEventItemOverlay({reviewed,world,activeOrder,saleReview,plusReview,candidateSettled=false,normalCommerce=null}){
  validateR4PreEventPeriod({reviewed,period:world?.period,activeOrder,candidateSettled});
  if(world.schema!=='akimono.memory-world.v2'||world.events!==null||!saleReview?.p3TurnItems||plusReview?.plusSeconds?.length!==79)fail('source-reviewed P3 inventory and all PLUS required');
  // Only fields consumed by this common stage. Other source price fields
  // cannot be silently defaulted; current nine overlays only use these three.
  if(normalCommerce!==null&&!isReviewedNormalCommerceItems(normalCommerce))fail('frozen full ITEM review required');
  if(activeOrder.some(k=>R4_MANUAL_COMMERCE_EVENT_CODES.includes(k))&&(normalCommerce===null||!isReviewedManualCommerceEvents(reviewed.manual)))fail('manual event requires full source ITEM review');
  const sourceRules=normalCommerce?.saleRules??saleReview.p3TurnItems.rules;
  let items=Array.from({length:79},(_,i)=>({itemId:i+1,
    popular:normalCommerce?.items[i].popular??sourceRules[i+1]?.popularSeconds??0,
    point:normalCommerce?.items[i].point??sourceRules[i+1]?.point??0,
    plus:plusReview.plusSeconds[i]}));
  const baseItems=Object.freeze(items.map(item=>Object.freeze({...item})));
  for(const code of activeOrder){
    if(code==='happy')continue;
    if(R4_MANUAL_COMMERCE_EVENT_CODES.includes(code)){
      items=projectManualCommerceEventItems({reviewed:reviewed.manual,code,items});continue;
    }
    if(reviewed.params.rules[code].some(r=>!['popular','point','plus'].includes(r.field)))fail('unreviewed field overlay');
    items=projectR4EventItemParams({reviewed:reviewed.params,eventCode:code,items}).items;
  }
  const saleRules=Object.fromEntries(Object.entries(sourceRules).map(([id,r])=>{
    const next={...r,popularSeconds:items[id-1].popular,point:items[id-1].point};
    return [id,next.point<0?reviewedManualSaleRule({reviewed:reviewed.manual,rule:next,activeOrder}):Object.freeze(next)];
  }));
  const plusSeconds=items.map(x=>x.plus);
  if(plusSeconds.filter(Boolean).length!==59||plusSeconds.some(n=>!Number.isSafeInteger(n))||Object.values(saleRules).some(r=>!Number.isSafeInteger(r.popularSeconds)||(r.popularSeconds<1&&!(r.itemId===65&&r.popularSeconds===0&&r.zeroPopularReviewed===true))||!Number.isSafeInteger(r.point)||r.point<0&&!isReviewedManualSaleRule(r)))fail('unreviewed derived ITEM values');
  const o=Object.freeze({baseItems,saleRules:Object.freeze(saleRules),plusSeconds:Object.freeze(plusSeconds),activeOrder:Object.freeze([...activeOrder]),committable:false});overlays.add(o);return o;
}
export function reviewedR4OverlayPlus(overlay,world,reviewed){
  if(!overlays.has(overlay)||overlay.committable!==false||!world?.period?.eventState||overlay.activeOrder.length!==Object.keys(world.period.eventState).length||overlay.activeOrder.some(k=>!Object.hasOwn(world.period.eventState,k))||reviewed.plusSeconds.length!==79)fail('source DataRead overlay required');
  return overlay.plusSeconds;
}

/** Ordinary buy/USE/showcase read only fields unaffected by the nine
 * reviewed normal EVENT overlays. No empty-map substitution or unknown
 * state acceptance. Source-supported recipe/market checks still run.
 */
export function validateR4OrdinaryEventContext({reviewed,world,candidateSettled=false}){
  try{
    if(world?.schema!=='akimono.memory-world.v2'||world.events!==null||world.streetId!=='standard-street'||world.shops?.length!==1)return false;
    const order=Object.keys(world.period.eventState);
    validateR4PreEventPeriod({reviewed,period:world.period,activeOrder:order,candidateSettled});
    return order.every(code=>code==='happy'||(reviewed.manual&&R4_MANUAL_COMMERCE_EVENT_CODES.includes(code))||reviewed.params.rules[code].every(r=>['popular','point','plus'].includes(r.field)));
  }catch{return false}
}

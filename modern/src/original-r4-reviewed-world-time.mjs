/** Opt-in source-reviewed local normal-time command and exact CAS reviewer.
 * No crossing settlement, external special EVENT context, arbitrary draw or
 * caller ordering. The original legacy/fixture StreetModule remains separate.
 */
import {applyGameCommand,encodeMemorySnapshot,PERIOD_WORLD_SCHEMA} from './game-core-contract.mjs';
import {reviewR4SortedPreEvent} from './original-r4-sorted-pre-event.mjs';
import {reviewR4PreEventItemOverlay,validateR4PreEventPeriod} from './original-r4-pre-event-item-overlay.mjs';
import {reviewR4HashPolicy} from './original-r4-perl-hash-replay.mjs';
import {reviewOriginalR4DeclarativeEventCycle} from './original-r4-declarative-event-cycle.mjs';
import {reviewOriginalR4MultiEventFixture} from './original-r4-multi-event-order-fixture.mjs';
import {projectR4NormalTurnCandidate,R4_NORMAL_TURN_PROJECTION} from './original-r4-normal-turn-candidate.mjs';
import {validateP3Inventory} from './original-b41-playable-sale.mjs';
import {validateSourceSparseMarket} from './original-admin-world-bootstrap.mjs';
export const REVIEWED_WORLD_TIME_COMMAND='advance-reviewed-world-time';
const fail=s=>{throw new RangeError('R4 reviewed local world time: '+s)};
const keys=(o)=>Object.keys(o).sort().join(',');
export function isReviewedWorldTimeCommand(command){
  return command!==null&&typeof command==='object'&&!Array.isArray(command)&&keys(command)==='expectedRevision,kind,minutes'&&
    command.kind===REVIEWED_WORLD_TIME_COMMAND&&Number.isSafeInteger(command.expectedRevision)&&command.expectedRevision>=0&&
    Number.isSafeInteger(command.minutes)&&command.minutes>=1&&command.minutes<=60;
}
const same=(a,b)=>encodeMemorySnapshot(a)===encodeMemorySnapshot(b);
const ordinaryKinds=['initialize-source-market','open-shop','edit-showcase','market-buy','use-item','discard-item'];
export function attachR4ReviewedTimeController({street,sources,reviewedDataRead=null}){
  if(!street?.reviewedB41||!street.reviewedAllPlus||!street.reviewedNayuta||!street.reviewedEventCatalog||!street.reviewedLoto||!street.reviewedB59Iron||!street.reviewedB60Happy||!street.reviewedB61Sword||!street.reviewedSupportEventCallbacks||!street.reviewedInstantEventCallbacks)fail('all normal source dependencies required');
  const data=reviewedDataRead??reviewR4PreEventItemOverlay(sources);
  const sorted=reviewR4SortedPreEvent(sources);
  const hash=reviewR4HashPolicy(sources);
  const seven=reviewOriginalR4DeclarativeEventCycle({
    compiledCatalog:street.reviewedEventCatalog,reviewedParams:data.params,itemDsl:sources.itemDsl,turnSource:sources.turnSource,readSource:sources.readSource});
  const events=reviewOriginalR4MultiEventFixture({
    compiledCatalog:street.reviewedEventCatalog,reviewedSeven:seven,turnSource:sources.turnSource,readSource:sources.readSource,
    reviewedSupportCallbacks:street.reviewedSupportEventCallbacks,reviewedInstantCallbacks:street.reviewedInstantEventCallbacks,
    reviewedLotoCallbacks:street.reviewedLoto,reviewedHappyEvent:street.reviewedB60Happy,reviewedIronEvent:street.reviewedB59Iron,reviewedSwordEvent:street.reviewedB61Sword});
  function validate(world){
    if(world?.schema!==PERIOD_WORLD_SCHEMA||world.streetId!==street.id||world.events!==null||world.shops.length>1)fail('reviewed local one-shop v2 world required');
    validateR4PreEventPeriod({reviewed:data,period:world.period,activeOrder:Object.keys(world.period.eventState??{})});
    if(world.market===null){
      if(world.revision!==0||world.shops.length!==0||Object.keys(world.period.eventState).length!==0)fail('only fresh source market anchor');
    }else if(!validateSourceSparseMarket(world.market))fail('reviewed market');
    for(const shop of world.shops){
      if(shop.id!==1||shop.status!==1||![undefined,null,0,'',false].includes(shop.guild))fail('single independent active shop required');
      // Ordinary commerce/save scope is not the much narrower normal-turn
      // projection scope. No unreviewed time passage is granted here.
      const limits=street.reviewedGiftMapUse.limits;
      if(!Array.isArray(shop.item)||shop.item.length!==79||
         shop.item.some((n,i)=>!Number.isSafeInteger(n)||n<0||
           !Number.isSafeInteger(limits[i]?.limit)||n>limits[i].limit)||
         !Number.isSafeInteger(shop.showcasecount)||shop.showcasecount<1||shop.showcasecount>8||
         shop.showcase?.length!==shop.showcasecount||shop.price?.length!==shop.showcasecount||
         !['','drug','tool','weapon','armor','material','book','peddle','cow'].includes(shop.job??''))
        fail('ordinary source stock, career or shelf shape');
      const exp=shop.exp??{};
      if(typeof exp!=='object'||Array.isArray(exp)||Object.entries(exp).some(([id,n])=>
        !/^[1-9][0-9]*$/.test(id)||Number(id)>79||
        !Number.isSafeInteger(n)||n<0||n>1000)||Object.values(exp).reduce((a,b)=>a+b,0)>3600)
        fail('ordinary source EXP bounds');
    }
    return true;
  }
  function propose(world,command){
    if(!isReviewedWorldTimeCommand(command)||command.expectedRevision!==world.revision)fail('exact reviewed time command and revision');
    validate(world);
    if(world.shops.length!==1)fail('reviewed time requires one shop');
    validateP3Inventory(world.shops[0],street.reviewedGiftMapUse,street.reviewedB41);
    const candidate=projectR4NormalTurnCandidate({world,minutes:command.minutes,street,
      reviewedR4:sorted,reviewedDataRead:data,reviewedHash:hash,reviewedEvents:events});
    if(candidate.source!==R4_NORMAL_TURN_PROJECTION||candidate.committable!==false||
       candidate.evidence.eventOrder.length!==17||candidate.evidence.preEventReceipt.originalSortApplied!==true||
       candidate.evidence.eventDrawRanges.length!==candidate.evidence.eventSamples.length||
       candidate.nowSeconds!==world.nowSeconds+command.minutes*60)fail('incomplete reviewed normal phases');
    const {shops,market,period,nowSeconds,evidence}=candidate;
    // Separate reviewed command adapter owns the complete successor and
    // exact CAS recheck. Never pass a partial noncommittable proposal to Core.
    validate({...world,shops,market,period,nowSeconds,revision:world.revision+1});
    validateP3Inventory(shops[0],street.reviewedGiftMapUse,street.reviewedB41);
    const {preEventReceipt,...trace}=evidence;
    return {shops,market,period,nowSeconds,receipt:{
      action:REVIEWED_WORLD_TIME_COMMAND,source:R4_NORMAL_TURN_PROJECTION,
      minutes:command.minutes,elapsedSeconds:command.minutes*60,
      naturalSaleCount:preEventReceipt.naturalSaleCount,
      sourceTrace:trace,preEventDrawCount:evidence.preEventDraws.length,
      totalDraws:evidence.preEventDraws.length+evidence.eventSamples.length,
      scope:'source-reviewed local single-shop nonsettling normal time; no external special EVENT or 36h settlement',
    }};
  }
  const wrapped=Object.freeze({...street,
    capabilities:Object.freeze([...street.capabilities.filter(k=>ordinaryKinds.includes(k)),REVIEWED_WORLD_TIME_COMMAND]),
    reviewedNormalTime:true,
    validateReviewedWorldTimeState:validate,
    apply({world,command}){
      if(command.kind===REVIEWED_WORLD_TIME_COMMAND)return propose(world,command);
      if(!ordinaryKinds.includes(command.kind))fail('legacy or internal fixture cannot enter reviewed normal-time runtime');
      validate(world);
      return street.apply({world,command});
    },
    reviewPeriodTransition({before,after,command=null,initial=false}){
      validate(before);
      if(before.worldId!==after.worldId||before.streetId!==after.streetId||after.revision!==before.revision+1)fail('identity/revision transition');
      if(initial){
        if(command!==null||!same({...before,revision:after.revision},after))fail('initial validation must not alter source state');
        return true;
      }
      validate(after);
      if(command?.kind===REVIEWED_WORLD_TIME_COMMAND){
        const p=propose(before,command);
        const expected={...before,shops:p.shops,market:p.market,period:p.period,nowSeconds:p.nowSeconds,revision:before.revision+1};
        if(!same(expected,after))fail('CAS successor differs from exact source normal-time replay');
        return true;
      }
      if(!ordinaryKinds.includes(command?.kind)||before.nowSeconds!==after.nowSeconds||
         JSON.stringify(before.period)!==JSON.stringify(after.period))fail('unreviewed clock, EVENT or command transition');
      // Normal commerce still goes through the same GameCore registry;
      // direct CAS cannot invent assets or EXP. No recursion: ordinary
      // commands in this path cannot change the clock or period.
      const applied=applyGameCommand({world:before,command,streetModule:wrapped});
      if(!applied.ok||!same(applied.world,after))fail('CAS ordinary command replay mismatch');
      return true;
    }
  });
  return wrapped;
}

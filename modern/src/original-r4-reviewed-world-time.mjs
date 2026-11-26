import {createHash} from 'node:crypto';
import {isReviewedHistoryCheckpointStore} from './reviewed-history-checkpoint-store.mjs';
/** Opt-in source-reviewed local normal-time command and exact CAS reviewer.
 * No crossing settlement, external special EVENT context, arbitrary draw or
 * caller ordering. The original legacy/fixture StreetModule remains separate.
 */
import {projectR4CrossPeriodCandidate,projectR4SettledPeriodCandidate,R4_CROSS_PERIOD_CANDIDATE} from './original-r4-cross-period-candidate.mjs';
import {projectR4ExternalCrossPeriodCandidate,R4_EXTERNAL_CROSS_PERIOD_CANDIDATE} from './original-r4-external-cross-period-candidate.mjs';
import {projectExternalTimeTrace} from './original-r4-external-time-trace.mjs';
import {projectOriginalR4TimeSlices} from './original-r4-time-slices.mjs';
import {reviewOriginalSoloPeriodPhaseChain} from './original-period-solo-chain.mjs';
import {loadStandardStreetModel} from './standard-street-model.mjs';
import {createIndependentDiskProjection,independentCandidateWorld,R4_SETTLED_STATE} from './original-r4-independent-world-disk.mjs';
import {applyGameCommand,encodeMemorySnapshot,PERIOD_WORLD_SCHEMA} from './game-core-contract.mjs';
import {reviewR4SortedPreEvent} from './original-r4-sorted-pre-event.mjs';
import {reviewR4PreEventItemOverlay,reviewR4ExternalPreEventItemOverlay,validateR4PreEventPeriod} from './original-r4-pre-event-item-overlay.mjs';
import {reviewR4HashPolicy} from './original-r4-perl-hash-replay.mjs';
import {reviewOriginalR4DeclarativeEventCycle} from './original-r4-declarative-event-cycle.mjs';
import {reviewOriginalR4MultiEventFixture} from './original-r4-multi-event-order-fixture.mjs';
import {projectR4NormalTurnCandidate,R4_NORMAL_TURN_PROJECTION} from './original-r4-normal-turn-candidate.mjs';
import {validateP3Inventory} from './original-b41-playable-sale.mjs';
import {validateSourceSparseMarket} from './original-admin-world-bootstrap.mjs';
import {PALACE_COMMAND} from './original-r4-palace-mission.mjs';
import {ARMY_COMMANDS,CONFLICT_COMMANDS} from './original-r4-independent-army.mjs';
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
export function attachR4ReviewedTimeController({street,sources,reviewedDataRead=null,enableReviewedCrossPeriod=false,enableReviewedRebelTime=false}){
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
  if(typeof enableReviewedRebelTime!=='boolean'||enableReviewedRebelTime&&!enableReviewedCrossPeriod)fail('external time requires reviewed crossing disk');
  const externalData=enableReviewedRebelTime?reviewR4ExternalPreEventItemOverlay(sources):null;
  const externalEvents=externalData?reviewOriginalR4MultiEventFixture({
    compiledCatalog:street.reviewedEventCatalog,reviewedSeven:seven,turnSource:sources.turnSource,readSource:sources.readSource,
    reviewedSupportCallbacks:street.reviewedSupportEventCallbacks,reviewedInstantCallbacks:street.reviewedInstantEventCallbacks,
    reviewedLotoCallbacks:street.reviewedLoto,reviewedHappyEvent:street.reviewedB60Happy,reviewedIronEvent:street.reviewedB59Iron,
    reviewedSwordEvent:street.reviewedB61Sword,reviewedRebelEvent:externalData.rebel}):null;
  const disk=enableReviewedCrossPeriod?createIndependentDiskProjection({sources,sort:sorted.sort,street,externalRebel:enableReviewedRebelTime}):null;
  const allowedOrdinary=k=>ordinaryKinds.includes(k)||(Boolean(disk?.palace)&&k===PALACE_COMMAND)||(Boolean(disk?.army)&&ARMY_COMMANDS.includes(k))||(enableReviewedRebelTime&&CONFLICT_COMMANDS.includes(k));
  const reviewedPeriod=enableReviewedCrossPeriod?reviewOriginalSoloPeriodPhaseChain({...sources,model:loadStandardStreetModel(sources.itemDsl,sources.rebelDsl),bootstrapMeta:'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',compiledLimits:street.reviewedGiftMapUse.limits.map(x=>x.limit),includeReviewedDignity:true,includeReviewedShopExpiry:true,includeReviewedSaleTax:true}):null;
  const externalPeriod=externalData?reviewOriginalSoloPeriodPhaseChain({...sources,model:loadStandardStreetModel(sources.itemDsl,sources.rebelDsl),bootstrapMeta:'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',compiledLimits:street.reviewedGiftMapUse.limits.map(x=>x.limit),includeReviewedDignity:true,includeReviewedShopExpiry:true,includeReviewedSaleTax:true,reviewedRebelNow:externalData.rebel}):null;
  const needsExternal=period=>Object.hasOwn(period.eventState??{},'rebel')||period.town?.leader!==0;
  // A structurally valid settled snapshot is NOT an acquisition proof.
  // Only exact derived successors or an authenticated replay anchor may
  // initialize the crossing CAS adapter. Retain bounded canonical digests.
  const approved=new Set();
  const identity=w=>createHash('sha256').update(encodeMemorySnapshot(w)).digest('hex');
  function remember(w){if(!disk)return;const key=identity(w);approved.delete(key);approved.add(key);if(approved.size>4096)approved.delete(approved.values().next().value);}
  function requireProvenance(w){if(disk&&w.revision!==0&&!approved.has(identity(w)))fail('crossing world has no verified command provenance');}
  function validate(world){
    if(world?.schema!==PERIOD_WORLD_SCHEMA||world.streetId!==street.id||world.events!==null||world.shops.length>1)fail('reviewed local one-shop v2 world required');
    const period=disk?independentCandidateWorld(world).period:world.period;
    if(disk){
      if(world.revision===0&&(world.market!==null||world.shops.length!==0||period.settledCount!==0||world.period.disk!==undefined))fail('revision zero requires fresh source seed');
      if(period.settledCount>0&&world.period.state!==R4_SETTLED_STATE)fail('committed settlement state required');
      if(period.settledCount>0&&(period.lastSettledBoundarySeconds!==Math.floor((world.nowSeconds+10800)/129600)*129600-10800))fail('settled clock lineage');
      disk.validate(world);
    }
    const external=enableReviewedRebelTime&&needsExternal(period);
    if(external&&period.settledCount<1)fail('external time requires settled source state');
    validateR4PreEventPeriod({reviewed:external?externalData:data,period,activeOrder:Object.keys(period.eventState??{}),candidateSettled:Boolean(disk),externalCandidate:external});
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
    const input=disk?independentCandidateWorld(world):world;
    const args={world:input,minutes:command.minutes,street,reviewedR4:sorted,reviewedDataRead:data,reviewedHash:hash,reviewedEvents:events,reviewedPeriod};
    const crossing=disk&&projectOriginalR4TimeSlices({reviewed:street.reviewedB41.turnSlices,lastSeconds:world.nowSeconds,nowSeconds:world.nowSeconds+command.minutes*60}).crossesSettlement;
    if(enableReviewedRebelTime&&needsExternal(world.period)){
      requireProvenance(world);
      const candidate=projectR4ExternalCrossPeriodCandidate({...args,reviewedDataRead:externalData,reviewedEvents:externalEvents,reviewedPeriod:externalPeriod,
        liveArmyBytes:world.period.disk.live['army.cgi']?.bytes??null});
      const {shops,market,period,nowSeconds,evidence,stagedArmyBytes}=candidate;
      if(candidate.source!==R4_EXTERNAL_CROSS_PERIOD_CANDIDATE||candidate.committable!==false||candidate.taxRate!==0||nowSeconds!==world.nowSeconds+command.minutes*60)fail('complete external time candidate required');
      const sourceTrace=projectExternalTimeTrace(candidate);
      return disk.finalize({before:world,command,applied:{shops,market,period,nowSeconds,armyBytes:stagedArmyBytes,receipt:{
        action:REVIEWED_WORLD_TIME_COMMAND,source:candidate.source,minutes:command.minutes,elapsedSeconds:command.minutes*60,
        naturalSaleCount:evidence.slices.reduce((n,s)=>n+s.preEvent.receipt.naturalSaleCount,0),
        itemTurnAffectedSlices:evidence.slices.reduce((n,s)=>n+s.preEvent.receipt.itemCallbackStage.itemTurnAffectedShops,0),
        settlementReceipt:null,sourceTrace,preEventDrawCount:evidence.slices.reduce((n,s)=>n+s.preEventDraws.length,0),totalDraws:evidence.drawsUsed,
        scope:'source-reviewed independent settled external rebel time; no leader tax, guild or dragon'}},logRows:disk.externalLogs(candidate)});
    }
    if(disk&&(crossing||world.period.settledCount>0)){
      const candidate=(world.period.settledCount>0?projectR4SettledPeriodCandidate:projectR4CrossPeriodCandidate)(args);
      const {shops,market,period,nowSeconds,evidence}=candidate;
      if(candidate.source!==R4_CROSS_PERIOD_CANDIDATE||candidate.committable!==false||nowSeconds!==world.nowSeconds+command.minutes*60)fail('complete crossing source candidate required');
      validateP3Inventory(shops[0],street.reviewedGiftMapUse,street.reviewedB41);
      const trace={drawPolicy:evidence.drawPolicy,hashPolicy:evidence.hashPolicy,seed:evidence.seed,interpreter:evidence.interpreter,slices:evidence.slices.map(s=>({dateupdate:s.dateupdate,spanSeconds:s.spanSeconds,activeOrder:s.activeOrder,eventOrder:s.eventOrder,nowOrder:s.nowOrder,preEventDraws:s.preEventDraws,eventDrawRanges:s.eventDrawRanges,eventSamples:s.eventSamples,logs:s.eventLogs}))};
      // Compact source-derived receipts for actual player acceptance. These
      // are derived from the same reviewed candidate, not a second formula.
      const itemTurnAffectedSlices=evidence.slices.reduce((n,s)=>n+s.preEvent.receipt.itemCallbackStage.itemTurnAffectedShops,0);
      const boundary=evidence.slices.find(s=>s.dateupdate===1)?.preEvent;
      const settlementReceipt=boundary?{prize:boundary.settlement.prize,maintenance:boundary.settlement.maintenance,
        naturalSaleCount:boundary.receipt.naturalSaleCount,soldItemId:boundary.receipt.soldItemId,
        cashBeforeLedger:boundary.periodLogInput.shop.money,cashAfterLedger:boundary.settlement.shop.money,
        saleBeforeLedger:boundary.periodLogInput.shop.saletoday,payBeforeLedger:boundary.periodLogInput.shop.paytoday,
        taxBeforeLedger:boundary.periodLogInput.shop.taxtoday,rankingCount:boundary.settlement.shop.rankingcount,
        expAfterLedger:boundary.settlement.shop.exp,cityTaxIn:boundary.settlement.town.in}:null;
      return disk.finalize({before:world,command,applied:{shops,market,period,nowSeconds,receipt:{action:REVIEWED_WORLD_TIME_COMMAND,source:R4_CROSS_PERIOD_CANDIDATE,minutes:command.minutes,elapsedSeconds:command.minutes*60,naturalSaleCount:evidence.slices.reduce((n,s)=>n+s.preEvent.receipt.naturalSaleCount,0),itemTurnAffectedSlices,settlementReceipt,sourceTrace:trace,preEventDrawCount:evidence.slices.reduce((n,s)=>n+s.preEventDraws.length,0),totalDraws:evidence.drawsUsed,scope:'reviewed independent local world crossing and subsequent source time'}},logRows:disk.crossLogs(candidate)});
    }
    const candidate=projectR4NormalTurnCandidate(args);
    if(candidate.source!==R4_NORMAL_TURN_PROJECTION||candidate.committable!==false||
       candidate.evidence.eventOrder.length!==17||candidate.evidence.preEventReceipt.originalSortApplied!==true||
       candidate.evidence.eventDrawRanges.length!==candidate.evidence.eventSamples.length||
       candidate.nowSeconds!==world.nowSeconds+command.minutes*60)fail('incomplete reviewed normal phases');
    const {shops,market,period,nowSeconds,evidence}=candidate;
    // Separate reviewed command adapter owns the complete successor and
    // exact CAS recheck. Never pass a partial noncommittable proposal to Core.
    if(!disk)validate({...world,shops,market,period,nowSeconds,revision:world.revision+1});
    validateP3Inventory(shops[0],street.reviewedGiftMapUse,street.reviewedB41);
    const {preEventReceipt,...trace}=evidence;
    const applied={shops,market,period,nowSeconds,receipt:{
      action:REVIEWED_WORLD_TIME_COMMAND,source:R4_NORMAL_TURN_PROJECTION,
      minutes:command.minutes,elapsedSeconds:command.minutes*60,
      naturalSaleCount:preEventReceipt.naturalSaleCount,
      itemTurnAffectedSlices:preEventReceipt.itemCallbackStage.itemTurnAffectedShops,settlementReceipt:null,
      sourceTrace:trace,preEventDrawCount:evidence.preEventDraws.length,
      totalDraws:evidence.preEventDraws.length+evidence.eventSamples.length,
      scope:'source-reviewed local single-shop nonsettling normal time; no external special EVENT or 36h settlement',
    }};
    return disk?disk.finalize({before:world,command,applied,logRows:disk.normalLogs(trace.logs,nowSeconds)}):applied;
  }
  const wrapped=Object.freeze({...street,
    capabilities:Object.freeze([...street.capabilities.filter(k=>ordinaryKinds.includes(k)),REVIEWED_WORLD_TIME_COMMAND,...(disk?.palace?[PALACE_COMMAND]:[]),...(disk?.army?ARMY_COMMANDS:[]),...(enableReviewedRebelTime?CONFLICT_COMMANDS:[])]),
    reviewedNormalTime:true,
    reviewedCrossPeriod:Boolean(disk),
    ...(enableReviewedRebelTime?{reviewedRebelTime:true,describeConflict:world=>{validate(world);requireProvenance(world);return disk.describeConflict(world);}}:{}),
    ...(disk?.palace?{reviewedPalace:true,describePalace:world=>{validate(world);return world.period.disk?disk.describePalace(world):null;}}:{}),
    ...(disk?.army?{reviewedArmy:true,describeArmy:world=>{validate(world);return world.period.disk?disk.describeArmy(world):null;}}:{}),
    ...(disk?{finalizeReviewedTransition({before,command,applied}){
      validate(before);
      if(command.kind===REVIEWED_WORLD_TIME_COMMAND)return applied;
      if(!allowedOrdinary(command.kind)||command.kind==='reviewed-sparse-all-plus')fail('unreviewed independent ordinary command');
      return disk.finalize({before,command,applied});
    }}:{}),
    validateReviewedWorldTimeState:validate,
    ...(disk?{authorizeVerifiedCheckpoint({world,proof,checkpointStore,generation}){
      if(!isReviewedHistoryCheckpointStore(checkpointStore)||proof.anchor!==encodeMemorySnapshot(world))fail('authenticated checkpoint anchor required');
      checkpointStore.verifyChain(proof,generation);validate(world);remember(world);
    }}:{}),
    apply({world,command}){
      if(command.kind===REVIEWED_WORLD_TIME_COMMAND)return propose(world,command);
      if(!allowedOrdinary(command.kind))fail('legacy or internal fixture cannot enter reviewed normal-time runtime');
      validate(world);
      if(disk&&command.kind==='reviewed-sparse-all-plus')fail('isolated PLUS fixture cannot enter crossing runtime');
      if(command.kind===PALACE_COMMAND){requireProvenance(world);return disk.applyPalace(world,command);}
      if(enableReviewedRebelTime&&CONFLICT_COMMANDS.includes(command.kind)){requireProvenance(world);return disk.applyConflict(world,command);}
      if(ARMY_COMMANDS.includes(command.kind)){requireProvenance(world);return disk.applyArmy(world,command);}
      return street.apply({world,command});
    },
    reviewPeriodTransition({before,after,command=null,initial=false}){
      validate(before);requireProvenance(before);
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
        remember(after);return true;
      }
      if(disk){
        if(!allowedOrdinary(command?.kind)||command.kind==='reviewed-sparse-all-plus'||before.nowSeconds!==after.nowSeconds)fail('unreviewed independent ordinary transition');
        let applied;
        if(command.kind===PALACE_COMMAND)applied=disk.applyPalace(before,command);
        else if(enableReviewedRebelTime&&CONFLICT_COMMANDS.includes(command.kind))applied=disk.applyConflict(before,command);
        else if(ARMY_COMMANDS.includes(command.kind))applied=disk.applyArmy(before,command);
        else{
          const result=applyGameCommand({world:before,command,streetModule:street});
          if(!result.ok)fail('source ordinary replay rejected');
          applied={shops:result.world.shops,market:result.world.market,period:result.world.period,receipt:result.details};
        }
        const p=disk.finalize({before,command,applied});
        if(!same({...before,shops:p.shops,market:p.market,period:p.period,revision:before.revision+1},after))fail('independent ordinary CAS replay mismatch');
        remember(after);return true;
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

import {createHash} from 'node:crypto';
import {reviewOriginalBuyDetail,describeOriginalBuyDetail} from './original-r4-buy-detail.mjs';
import {reviewR4IndependentCloseCandidate} from './original-r4-independent-close-candidate.mjs';
import {projectSharedUseItem} from './shared-use-item-core.mjs';
import {isReviewedHistoryCheckpointStore} from './reviewed-history-checkpoint-store.mjs';
/** Opt-in source-reviewed local normal-time command and exact CAS reviewer.
 * No crossing settlement, external special EVENT context, arbitrary draw or
 * caller ordering. The original legacy/fixture StreetModule remains separate.
 */
import {projectR4CrossPeriodCandidate,projectR4SettledPeriodCandidate,R4_CROSS_PERIOD_CANDIDATE} from './original-r4-cross-period-candidate.mjs';
import {projectOriginalR4TimeSlices} from './original-r4-time-slices.mjs';
import {reviewOriginalSoloPeriodPhaseChain} from './original-period-solo-chain.mjs';
import {loadStandardStreetModel} from './standard-street-model.mjs';
import {createIndependentDiskProjection,independentCandidateWorld,R4_SETTLED_STATE} from './original-r4-independent-world-disk.mjs';
import {applyGameCommand,encodeMemorySnapshot,PERIOD_WORLD_SCHEMA} from './game-core-contract.mjs';
import {reviewR4SortedPreEvent} from './original-r4-sorted-pre-event.mjs';
import {reviewOriginalShowcaseView,describeOriginalShowcase} from './original-r4-showcase-view.mjs';
import {reviewOriginalNews,describeOriginalNews} from './original-r4-news-view.mjs';
import {reviewOriginalBalanceView,describeOriginalBalance} from './original-r4-balance-view.mjs';
import {reviewOriginalWarehouse,describeOriginalWarehouse} from './original-r4-warehouse-view.mjs';
import {reviewR4PreEventItemOverlay,validateR4PreEventPeriod,projectR4PreEventItemOverlay,validateR4OrdinaryEventContext} from './original-r4-pre-event-item-overlay.mjs';
import {reviewR4HashPolicy} from './original-r4-perl-hash-replay.mjs';
import {reviewOriginalR4DeclarativeEventCycle} from './original-r4-declarative-event-cycle.mjs';
import {reviewOriginalR4MultiEventFixture} from './original-r4-multi-event-order-fixture.mjs';
import {projectR4NormalTurnCandidate,R4_NORMAL_TURN_PROJECTION} from './original-r4-normal-turn-candidate.mjs';
import {reviewNormalCommerceItems,validateNormalCommerceInventory,capReviewedCommerceCash} from './reviewed-normal-commerce-items.mjs';
import {validateP3Inventory} from './original-b41-playable-sale.mjs';
import {validateSourceSparseMarket} from './original-admin-world-bootstrap.mjs';
import {PALACE_COMMAND} from './original-r4-palace-mission.mjs';
import {ARMY_COMMANDS} from './original-r4-independent-army.mjs';
export const REVIEWED_WORLD_TIME_COMMAND='advance-reviewed-world-time';
const fail=s=>{throw new RangeError('R4 reviewed local world time: '+s)};
const keys=(o)=>Object.keys(o).sort().join(',');
export function isReviewedWorldTimeCommand(command){
  return command!==null&&typeof command==='object'&&!Array.isArray(command)&&keys(command)==='expectedRevision,kind,minutes'&&
    command.kind===REVIEWED_WORLD_TIME_COMMAND&&Number.isSafeInteger(command.expectedRevision)&&command.expectedRevision>=0&&
    Number.isSafeInteger(command.minutes)&&command.minutes>=1&&command.minutes<=60;
}
const same=(a,b)=>encodeMemorySnapshot(a)===encodeMemorySnapshot(b);
const ordinaryKinds=['initialize-source-market','open-shop','edit-showcase','market-buy','use-item','discard-item','sweep-shop'];
export function attachR4ReviewedTimeController({street,sources,reviewedDataRead=null,enableReviewedCrossPeriod=false,enableReviewedFullCommerce=false}){
  if(!street?.reviewedB41||!street.reviewedAllPlus||!street.reviewedNayuta||!street.reviewedEventCatalog||!street.reviewedLoto||!street.reviewedB59Iron||!street.reviewedB60Happy||!street.reviewedB61Sword||!street.reviewedSupportEventCallbacks||!street.reviewedInstantEventCallbacks)fail('all normal source dependencies required');
  if(typeof enableReviewedFullCommerce!=='boolean')fail('explicit full commerce review');
  const normalCommerce=enableReviewedFullCommerce?reviewNormalCommerceItems(sources):null;
  if(normalCommerce!==null){
    if(!sources.writeSource.includes('$DT->{money}=$MAX_MONEY if $DT->{money}>$MAX_MONEY;'))fail('original DataWrite money cap required');
    street=Object.freeze({...street,reviewedNormalCommerce:normalCommerce});
  }
  const capApplied=p=>normalCommerce===null?p:{...p,shops:p.shops.map(s=>capReviewedCommerceCash(s,normalCommerce))};
  const validateTimeShop=shop=>normalCommerce===null?validateP3Inventory(shop,street.reviewedGiftMapUse,street.reviewedB41):validateNormalCommerceInventory(shop,street.reviewedGiftMapUse,normalCommerce);
  const data=reviewedDataRead??reviewR4PreEventItemOverlay(sources);
  const warehouse=normalCommerce&&sources.stockViewSource!=null?reviewOriginalWarehouse(sources):null;
  const buyDetail=normalCommerce&&sources.buyFormSource!=null?reviewOriginalBuyDetail(sources):null;
  function buyDetailOverlay(world){
    if(!buyDetail||world?.shops?.[0]?.id!==1||world.shops[0].status!==1||world.shops[0].guild)return null;
    const input=disk?independentCandidateWorld(world):world;
    if(!validateR4OrdinaryEventContext({reviewed:data,world:input,candidateSettled:Boolean(disk)}))return null;
    return projectR4PreEventItemOverlay({reviewed:data,world:input,activeOrder:Object.keys(input.period.eventState),saleReview:street.reviewedB41,plusReview:street.reviewedAllPlus,candidateSettled:Boolean(disk),normalCommerce});
  }
  function addBuyDetail(offer,overlay){
    if(!overlay)return offer;
    const item=normalCommerce.items[offer.itemId-1];
    const detail=describeOriginalBuyDetail({reviewed:buyDetail,offer,item,popular:overlay.saleRules[offer.itemId]?.popularSeconds??item.popular});
    return detail?Object.freeze({...offer,detail}):offer;
  }
  const balanceInputs=[sources.balanceViewSource,sources.infoViewSource];
  if(balanceInputs.some(s=>s!=null)&&balanceInputs.some(s=>s==null))fail('incomplete original balance source set');
  const balance=normalCommerce&&balanceInputs.every(s=>s!=null)?reviewOriginalBalanceView(sources):null;
  const newsInputs=[sources.newsViewSource,sources.newsHtmlSource,sources.newsPageSource,sources.newsTimeSource];
  if(newsInputs.some(s=>s!=null)&&newsInputs.some(s=>s==null))fail('incomplete original news source set');
  const news=normalCommerce&&enableReviewedCrossPeriod&&newsInputs.every(s=>s!=null)?reviewOriginalNews(sources):null;
  const showcaseView=normalCommerce&&sources.showcaseViewSource!=null?reviewOriginalShowcaseView(sources):null;
  const sorted=reviewR4SortedPreEvent(sources);
  const hash=reviewR4HashPolicy(sources,{manualCommerce:data.manual??null});
  const seven=reviewOriginalR4DeclarativeEventCycle({
    compiledCatalog:street.reviewedEventCatalog,reviewedParams:data.params,itemDsl:sources.itemDsl,turnSource:sources.turnSource,readSource:sources.readSource});
  const events=reviewOriginalR4MultiEventFixture({
    compiledCatalog:street.reviewedEventCatalog,reviewedSeven:seven,turnSource:sources.turnSource,readSource:sources.readSource,
    reviewedSupportCallbacks:street.reviewedSupportEventCallbacks,reviewedInstantCallbacks:street.reviewedInstantEventCallbacks,
    reviewedLotoCallbacks:street.reviewedLoto,reviewedHappyEvent:street.reviewedB60Happy,reviewedIronEvent:street.reviewedB59Iron,reviewedSwordEvent:street.reviewedB61Sword,reviewedManualCommerce:data.manual??null});
  const closeInputs=[sources.userSource,sources.errorSource];
  if(enableReviewedCrossPeriod&&enableReviewedFullCommerce&&closeInputs.some(s=>s!=null)&&closeInputs.some(s=>s==null))fail('incomplete original closure sources');
  const closeReview=enableReviewedCrossPeriod&&enableReviewedFullCommerce&&closeInputs.every(s=>s!=null)?reviewR4IndependentCloseCandidate(sources):null;
  const disk=enableReviewedCrossPeriod?createIndependentDiskProjection({sources,sort:sorted.sort,street,r4CloseReview:closeReview}):null;
  const allowedOrdinary=k=>ordinaryKinds.includes(k)||(Boolean(disk?.palace)&&k===PALACE_COMMAND)||(Boolean(disk?.army)&&ARMY_COMMANDS.includes(k));
  const reviewedPeriod=enableReviewedCrossPeriod?reviewOriginalSoloPeriodPhaseChain({...sources,model:loadStandardStreetModel(sources.itemDsl,sources.rebelDsl),bootstrapMeta:'500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0',compiledLimits:street.reviewedGiftMapUse.limits.map(x=>x.limit),includeReviewedDignity:true,includeReviewedShopExpiry:true,includeReviewedSaleTax:true,includeReviewedMultiShelf:enableReviewedFullCommerce,includeReviewedActualCloseShop:Boolean(closeReview),includeReviewedFullCommerceClose:Boolean(closeReview)}):null;
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
      disk.validate(world);
      const latestBoundary=Math.floor((world.nowSeconds+10800)/129600)*129600-10800;
      if(period.settledCount>0&&(disk.hasClosed(world)?period.lastSettledBoundarySeconds>latestBoundary:period.lastSettledBoundarySeconds!==latestBoundary))fail('settled clock lineage');
      if(period.settledCount>0&&world.shops.length===0&&!disk.hasClosed(world))fail('empty settled world requires archived local career');
    }
    validateR4PreEventPeriod({reviewed:data,period,activeOrder:Object.keys(period.eventState??{}),candidateSettled:Boolean(disk)});
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
      if(normalCommerce!==null){validateTimeShop(shop);if(!Number.isSafeInteger(shop.money)||shop.money>normalCommerce.maxMoney)fail('source committed cash bound');}
    }
    return true;
  }
  function propose(world,command){
    if(!isReviewedWorldTimeCommand(command)||command.expectedRevision!==world.revision)fail('exact reviewed time command and revision');
    validate(world);
    if(world.shops.length!==1&&!disk?.hasClosed(world))fail('reviewed time requires one shop or archived local career');
    for(const shop of world.shops)validateTimeShop(shop);
    const input=disk?independentCandidateWorld(world):world;
    const args={world:input,minutes:command.minutes,street,reviewedR4:sorted,reviewedDataRead:data,reviewedHash:hash,reviewedEvents:events,reviewedPeriod,...(closeReview?{r4CloseReview:closeReview,sessionFileNames:[]}: {})};
    const crossing=disk&&projectOriginalR4TimeSlices({reviewed:street.reviewedB41.turnSlices,lastSeconds:world.nowSeconds,nowSeconds:world.nowSeconds+command.minutes*60}).crossesSettlement;
    if(disk&&(crossing||world.period.settledCount>0)){
      const candidate=(world.period.settledCount>0?projectR4SettledPeriodCandidate:projectR4CrossPeriodCandidate)(args);
      const {shops,market,period,nowSeconds,evidence}=candidate;
      if(candidate.source!==R4_CROSS_PERIOD_CANDIDATE||candidate.committable!==false||nowSeconds!==world.nowSeconds+command.minutes*60)fail('complete crossing source candidate required');
      for(const shop of shops)validateTimeShop(shop);
      const trace={drawPolicy:evidence.drawPolicy,hashPolicy:evidence.hashPolicy,seed:evidence.seed,interpreter:evidence.interpreter,slices:evidence.slices.map(s=>({dateupdate:s.dateupdate,spanSeconds:s.spanSeconds,activeOrder:s.activeOrder,eventOrder:s.eventOrder,nowOrder:s.nowOrder,preEventDraws:s.preEventDraws,eventDrawRanges:s.eventDrawRanges,eventSamples:s.eventSamples,logs:s.eventLogs,
        ...(normalCommerce!==null?{eventCommerce:s.preEvent.receipt.eventCommerce??null,happyEffects:s.happyEffects??[],instantEffects:s.instantEffects??[]}: {})}))};
      // Compact source-derived receipts for actual player acceptance. These
      // are derived from the same reviewed candidate, not a second formula.
      const itemTurnAffectedSlices=evidence.slices.reduce((n,s)=>n+s.preEvent.receipt.itemCallbackStage.itemTurnAffectedShops,0);
      const boundary=evidence.slices.find(s=>s.preEvent.settlement)?.preEvent;
      const closeEffect=boundary?.settlement.actualCloseEffect??null;
      const ledgerShop=boundary?.settlement.shop??boundary?.settlement.closedShop;
      const closureReceipt=closeEffect?{shopId:closeEffect.shop.id,reason:'経営者不在',archiveHash:boundary.closeHashEvidence,
        deletedSessions:closeEffect.deletedSessions,remainingSessions:closeEffect.remainingSessions}:null;
      const settlementReceipt=boundary?{prize:boundary.settlement.prize,maintenance:boundary.settlement.maintenance,
        naturalSaleCount:boundary.receipt.naturalSaleCount,soldItemId:boundary.receipt.soldItemId,
        ...(normalCommerce!==null?{soldByItem:boundary.receipt.soldByItem,
          shelfSales:boundary.receipt.shelfSales.map(row=>({...row,sliceIndex:0})),
          // Preserve the exact round-trippable decimal, not a fractional JSON
          // number outside GameCore's receipt integer contract.
          costBeforeLedger:String(boundary.periodLogInput.shop.costtoday)}:{}),
        cashBeforeLedger:boundary.periodLogInput.shop.money,cashAfterLedger:ledgerShop.money,
        saleBeforeLedger:boundary.periodLogInput.shop.saletoday,payBeforeLedger:boundary.periodLogInput.shop.paytoday,
        taxBeforeLedger:boundary.periodLogInput.shop.taxtoday,rankingCount:ledgerShop.rankingcount,
        expAfterLedger:ledgerShop.exp,cityTaxIn:boundary.settlement.town.in}:null;
      const soldByItem={},shelfSales=normalCommerce===null?null:evidence.slices.flatMap((s,sliceIndex)=>s.preEvent.receipt.shelfSales.map(row=>({...row,sliceIndex})));
      if(normalCommerce!==null)for(const slice of evidence.slices)for(const [id,n] of Object.entries(slice.preEvent.receipt.soldByItem))soldByItem[id]=(soldByItem[id]??0)+n;
      return disk.finalize({before:world,command,applied:{shops,market,period,nowSeconds,receipt:{action:REVIEWED_WORLD_TIME_COMMAND,source:R4_CROSS_PERIOD_CANDIDATE,minutes:command.minutes,elapsedSeconds:command.minutes*60,naturalSaleCount:evidence.slices.reduce((n,s)=>n+s.preEvent.receipt.naturalSaleCount,0),...(normalCommerce!==null?{soldByItem,shelfSales}:{}),itemTurnAffectedSlices,settlementReceipt,...(closeReview?{closureReceipt}:{}),sourceTrace:trace,preEventDrawCount:evidence.slices.reduce((n,s)=>n+s.preEventDraws.length,0),totalDraws:evidence.drawsUsed,scope:'reviewed independent local world crossing and subsequent source time'}},logRows:disk.crossLogs(candidate),closeEffect});
    }
    const candidate=projectR4NormalTurnCandidate(args);
    if(candidate.source!==R4_NORMAL_TURN_PROJECTION||candidate.committable!==false||
       candidate.evidence.eventOrder.length!==17||candidate.evidence.preEventReceipt.originalSortApplied!==true||
       candidate.evidence.eventDrawRanges.length!==candidate.evidence.eventSamples.length||
       candidate.nowSeconds!==world.nowSeconds+command.minutes*60)fail('incomplete reviewed normal phases');
    const {shops,market,period,nowSeconds,evidence}=candidate;
    // Separate reviewed command adapter owns the complete successor and
    // exact CAS recheck. Never pass a partial noncommittable proposal to Core.
    if(!disk)validate({...world,shops:capApplied({shops}).shops,market,period,nowSeconds,revision:world.revision+1});
    validateTimeShop(shops[0]);
    const {preEventReceipt,...trace}=evidence;
    if(normalCommerce!==null)trace.eventCommerce=preEventReceipt.eventCommerce;
    const applied={shops,market,period,nowSeconds,receipt:{
      action:REVIEWED_WORLD_TIME_COMMAND,source:R4_NORMAL_TURN_PROJECTION,
      minutes:command.minutes,elapsedSeconds:command.minutes*60,
      naturalSaleCount:preEventReceipt.naturalSaleCount,
      ...(normalCommerce!==null?{soldByItem:preEventReceipt.soldByItem,
        shelfSales:preEventReceipt.shelfSales.map(row=>({...row,sliceIndex:0}))}:{}),
      itemTurnAffectedSlices:preEventReceipt.itemCallbackStage.itemTurnAffectedShops,settlementReceipt:null,
      sourceTrace:trace,preEventDrawCount:evidence.preEventDraws.length,
      totalDraws:evidence.preEventDraws.length+evidence.eventSamples.length,
      scope:'source-reviewed local single-shop nonsettling normal time; no external special EVENT or 36h settlement',
    }};
    return disk?disk.finalize({before:world,command,applied,logRows:disk.normalLogs(trace.logs,nowSeconds)}):capApplied(applied);
  }
  const wrapped=Object.freeze({...street,
    capabilities:Object.freeze([...street.capabilities.filter(k=>ordinaryKinds.includes(k)),REVIEWED_WORLD_TIME_COMMAND,...(disk?.palace?[PALACE_COMMAND]:[]),...(disk?.army?ARMY_COMMANDS:[])]),
    reviewedNormalTime:true,
    reviewedCrossPeriod:Boolean(disk),
    reviewedOwnerClosure:Boolean(closeReview),
    ...(buyDetail?{quoteMarketOffer(world,itemId){
      const offer=street.quoteMarketOffer(world,itemId);
      return addBuyDetail(offer,buyDetailOverlay(world));
    },listMarketOffers(world){
      const offers=street.listMarketOffers(world);
      if(!offers.length)return offers;
      const overlay=buyDetailOverlay(world);
      return Object.freeze(offers.map(offer=>addBuyDetail(offer,overlay)));
    }}:{}),
    ...(showcaseView?{describeShowcase(world){
      if(!world?.shops?.length)return null;
      validate(world);
      return describeOriginalShowcase({reviewed:showcaseView,world,normalCommerce});
    }}:{}),
    ...(news?{describeNews(world){
      if(!world?.shops?.length||!world.period?.disk)return null;
      validate(world);
      return describeOriginalNews({reviewed:news,world});
    }}:{}),
    ...(balance?{describeBalance(world){
      if(!world?.shops?.length)return null;
      validate(world);
      return describeOriginalBalance({reviewed:balance,world});
    }}:{}),
    ...(warehouse?{describeWarehouse(world){
      if(!world?.shops?.length)return null;
      validate(world);
      const input=disk?independentCandidateWorld(world):world;
      const overlay=projectR4PreEventItemOverlay({reviewed:data,world:input,activeOrder:Object.keys(input.period.eventState),saleReview:street.reviewedB41,plusReview:street.reviewedAllPlus,candidateSettled:Boolean(disk),normalCommerce});
      return describeOriginalWarehouse({reviewed:warehouse,world:input,normalCommerce,overlay,order:street.marketBuyRegistry.entries.map(e=>e.itemId),limits:street.reviewedGiftMapUse.limits});
    }}:{}),
    ...(disk?.palace?{reviewedPalace:true,describePalace:world=>{validate(world);return world.period.disk?disk.describePalace(world):null;}}:{}),
    ...(disk?.army?{reviewedArmy:true,describeArmy:world=>{validate(world);return world.period.disk?disk.describeArmy(world):null;}}:{}),
    ...((disk||normalCommerce!==null)?{finalizeReviewedTransition({before,command,applied}){
      validate(before);
      if(command.kind===REVIEWED_WORLD_TIME_COMMAND)return applied;
      if(!allowedOrdinary(command.kind)||command.kind==='reviewed-sparse-all-plus')fail('unreviewed independent ordinary command');
      return disk?disk.finalize({before,command,applied}):capApplied(applied);
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
        else if(ARMY_COMMANDS.includes(command.kind))applied=disk.applyArmy(before,command);
        else if(command.kind==='use-item'&&street.useItem?.getRule(command.itemId,command.useId)?.inlineCallback?.kind==='local-self-industry-rumor'){
          if(command.expectedRevision!==before.revision)fail('manual EVENT USE revision');
          // Recompute shared USE directly; outer reviewer owns period mutation.
          applied=projectSharedUseItem({world:before,command,useItem:street.useItem});
        }else{
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

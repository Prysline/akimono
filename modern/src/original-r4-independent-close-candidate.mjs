/** Composed source-only closure prerequisites. Not an account, filesystem
 * transaction or authority to commit an expired shop.
 */
import {reviewR4CloseArchiveHash} from './original-r4-close-archive-hash.mjs';
import {reviewR4EmptyStreetPlus,projectOriginalSparseAllPlus} from './original-sparse-all-plus.mjs';
import {reviewR4EmptyStreetEvents} from './original-r4-multi-event-order-fixture.mjs';
import {reviewR4EmptyStreetItemCallbacks,projectR3ItemCallbackStage} from './r3-reviewed-item-callback-stage.mjs';
import {projectR4PreEventItemOverlay} from './original-r4-pre-event-item-overlay.mjs';
import {isReviewedNormalCommerceItems} from './reviewed-normal-commerce-items.mjs';
const reviews=new WeakSet();
const fail=m=>{throw new RangeError('R4 independent close candidate: '+m)};
export function reviewR4IndependentCloseCandidate(sources){
  const r=Object.freeze({archiveHash:reviewR4CloseArchiveHash(sources),
    emptyPlus:reviewR4EmptyStreetPlus(sources),emptyEvents:reviewR4EmptyStreetEvents(sources),
    emptyCallbacks:reviewR4EmptyStreetItemCallbacks(sources),committable:false});
  reviews.add(r);return r;
}
export const isR4IndependentCloseReview=r=>reviews.has(r);

/** The original empty @DT skips per-shop natural sale, SortDT has no
 * shops and inc-period is skipped even when dateupdate is true. The
 * #70 global callback, PLUS and later EVENT stages still execute.
 * DataRead's ITEM overlays remain fixed for the whole command.
 */
export function projectR4EmptyStreetPreEvent({reviewed,world,originWorld,street,
  reviewedDataRead,activeOrder,candidateSettled,spanSeconds,dateupdate,randomDraws}){
  if(!reviews.has(reviewed)||!isReviewedNormalCommerceItems(street?.reviewedNormalCommerce)||
     world?.shops?.length!==0||originWorld?.worldId!==world.worldId||
     originWorld.revision!==world.revision||![0,1].includes(dateupdate)||
     !Number.isSafeInteger(spanSeconds)||spanSeconds<1||spanSeconds>3600||
     !Array.isArray(randomDraws)||randomDraws.length>148||
     randomDraws.some(n=>!Number.isSafeInteger(n)||n<0||n>=1000000))
    fail('reviewed zero-shop source slice required');
  const overlay=projectR4PreEventItemOverlay({reviewed:reviewedDataRead,world:originWorld,
    activeOrder,saleReview:street.reviewedB41,plusReview:street.reviewedAllPlus,
    candidateSettled,normalCommerce:street.reviewedNormalCommerce});
  const {shop,...itemCallbackStage}=projectR3ItemCallbackStage({
    reviewed:street.reviewedB41.itemCallbacks,shop:null,spanSeconds,randomDraws,
    r4EmptyStreetReview:reviewed.emptyCallbacks});
  if(shop!==null)fail('empty ITEM callback successor');
  const plusWorld={...world,period:{...world.period,eventState:originWorld.period.eventState}};
  const plus=projectOriginalSparseAllPlus({world:plusWorld,reviewed:street.reviewedAllPlus,
    compiled:street.reviewedGiftMapUse,timespanSeconds:spanSeconds,
    randomDraws:randomDraws.slice(itemCallbackStage.drawsUsed),
    r4PeriodPopulation:true,reviewedEventTimeSlice:true,
    reviewedB59Iron:street.reviewedB59Iron,ironEventActive:activeOrder.includes('plusup-tetu'),
    r4DataReadOverlay:overlay,r4EmptyStreetReview:reviewed.emptyPlus});
  return {shops:[],market:plus.market,nowSeconds:world.nowSeconds+spanSeconds,settlement:null,
    receipt:{naturalSaleCount:0,soldByItem:{},shelfSales:[],naturalDraws:0,
      callbackDraws:itemCallbackStage.drawsUsed,itemCallbackStage,periodDraws:0,
      plusDraws:plus.receipt.drawsUsed,totalDraws:itemCallbackStage.drawsUsed+plus.receipt.drawsUsed,
      plusPopulation:world.period.dtPeople,dateupdate,originalSortApplied:true},
    committable:false,worldStateWritten:false};
}

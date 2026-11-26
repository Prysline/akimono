import {compileReviewedNoGuildAdvertiseUse,projectOriginalNoGuildAdvertisement} from './reviewed-guild-advertise-no-guild-use.mjs';
import {reviewUseExpHash,resolveR4UseExpOrder} from './original-r4-use-exp-hash-replay.mjs';
import {independentCandidateWorld} from './original-r4-independent-world-disk.mjs';
import {reviewOriginalTopPrize} from './original-period-top-prize.mjs';
import {compileReviewedLocalTargetUses,projectReviewedLocalTargetUse} from './reviewed-local-target-uses.mjs';
/**
 * Standard Street source-reviewed module (B-31 baseline through R2-A).
 * Supplies DSL/source-backed item rules, market ordering/wire format, shop
 * creation and showcase constraints to the shared GameCore.
 * R2-A: common market-buy accounting runs in market-buy-core.mjs, NOT here.
 * Standard Street @@FUNCBUY voucher threshold is source-reviewed; buyers
 * above the threshold fail closed until its actual effect is implemented.
 * R2-B: compiled ordinary market rules come from source ITEM data.
 * R2-C: source buying has one formal command and one GameCore engine; no legacy projections.
 * Original Perl is never evaluated by live Node game commands.
 * Full generic USE, natural sales, period settlement, auth, and CGI are NOT
 * established by R2-A; B-xx reviewed portions remain source-bounded.
 */
import {parseDsl} from './parse-dsl.mjs';
import {compileStandardStreetMarketBuyRegistry}
  from './standard-street-market-buy-registry.mjs';
import {compileReviewedGiftMapUse}
  from './reviewed-gift-map-use.mjs';
import {compileReviewedGiftUseVariants}
  from './reviewed-gift-use-variants.mjs';
import {compileReviewedDeclarativeUses}
  from './reviewed-declarative-use-compiler.mjs';
import {compileReviewedGatheringMapUses}
  from './reviewed-gathering-map-uses.mjs';
import {reviewOriginalSparseWorldBootstrap,createOriginalSparseMarket,
  validateSourceSparseMarket,ORIGINAL_SPARSE_MARKET_SOURCE,
  traceOriginalSparseGiftWholesale}
  from './original-admin-world-bootstrap.mjs';
import {reviewOriginalSparsePlusTurn,projectOriginalSparsePlusTurn}
  from './original-sparse-wholesale-plus.mjs';
import {reviewOriginalSparseMultiPlus,projectOriginalSparseMultiPlus}
  from './original-sparse-multi-plus.mjs';
import {reviewOriginalSparseAllPlus,projectOriginalSparseAllPlus}
  from './original-sparse-all-plus.mjs';
import {reviewOriginalNaturalSalePlus,projectOriginalNaturalSalePlus}
  from './original-natural-sale-plus.mjs';
import {reviewOriginalNayutaFuncturn,projectOriginalNayutaFuncturn}
  from './original-nayuta-functurn.mjs';
import {reviewOriginalMarketBuy10}
  from './original-market-buy10.mjs';
import {reviewB41Sale,projectB41Sale} from './original-b41-playable-sale.mjs';
import {reviewOriginalCompiledEventCatalog}
  from './original-event-compiled-catalog.mjs';
import {reviewOriginalInstantEventCallbacks,projectOriginalInstantEventCallback}
  from './original-instant-event-callbacks.mjs';
import {reviewB56EventSlice,projectB56EventSlice}
  from './original-b56-event-time-slice.mjs';
import {reviewOriginalSupportEventCallbacks}
  from './original-b57-support-event-callbacks.mjs';
import {reviewOriginalMarketBuy11}
  from './original-market-buy11.mjs';
import {reviewOriginalLotoStartfunc}
  from './original-b58-loto-startfunc.mjs';
import {reviewOriginalB59IronEvent}
  from './original-b59-iron-event-lifecycle.mjs';
import {reviewOriginalB60HappyEvent}
  from './original-b60-happy-event-nowfunc.mjs';
import {reviewOriginalB61SwordDemand}
  from './original-b61-sword-demand-event.mjs';
import {reviewR4PreEventItemOverlay,validateR4OrdinaryEventContext} from './original-r4-pre-event-item-overlay.mjs';
import {attachR4ReviewedTimeController} from './original-r4-reviewed-world-time.mjs';
import {reviewR4WorldTransitionGate,allowR4UnsettledWorldTransition}
  from './original-r4-world-transition-gate.mjs';
import {reviewOriginalB62SwordMap}
  from './original-b62-sword-map-acquisition.mjs';
import {reviewOriginalB63SwordMapOutcomes}
  from './original-b63-sword-map-all-outcomes.mjs';
import {PERIOD_WORLD_SCHEMA}
  from './game-core-contract.mjs';
import {SOURCE_STANDARD_STREET_MAX_MONEY}
  from './shared-showcase-price.mjs';
import {originalSourceUseClock} from './shared-use-experience.mjs';
import {compileReviewedShowcaseResizeUses}
  from './reviewed-showcase-resize-use.mjs';
import {compileReviewedSelfAdvertiseUse}
  from './reviewed-self-advertise-use.mjs';
import {projectOriginalSelfAdvertisement}
  from './original-inline-self-advertise-model.mjs';
import {compileReviewedTargetAdvertiseUse,projectOriginalTargetAdvertisement}
  from './reviewed-target-advertise-use.mjs';
import {compileReviewedPartyUse}
  from './reviewed-party-use.mjs';
import {projectOriginalPartyPopup}
  from './original-inline-party-popup-model.mjs';
import {compileReviewedCareerChangeUses}
  from './reviewed-career-change-uses.mjs';
import {projectOriginalCareerChange}
  from './original-inline-career-change-model.mjs';
import {compileReviewedBookWorkUses}
  from './reviewed-book-work-uses.mjs';
import {projectOriginalBookWorkCallback}
  from './original-inline-work-showcase-model.mjs';
import {compileReviewedDairyInlineUses}
  from './reviewed-dairy-inline-uses.mjs';
import {projectOriginalDairyInlineCallback}
  from './original-inline-dairy-callback-model.mjs';
import {projectOriginalShowcaseResizeCallback}
  from './original-inline-work-showcase-model.mjs';
import {
  loadStandardStreetModel,
  createStandardStreetShop,
  editShowcase,
} from './standard-street-model.mjs';

export const STANDARD_STREET_ID='standard-street';
const actions=Object.freeze(['open-shop','edit-showcase','discard-item']);
function bad(message){throw new RangeError('B-31 Standard Street: '+message);}
function ownKeysExact(command,required,optional=[]){
  const allowed=new Set(['kind','expectedRevision',...required,...optional]);
  for(const key of Object.keys(command)){
    if(!allowed.has(key))bad('unsupported action field '+key);
  }
  for(const key of required){
    if(!Object.hasOwn(command,key))bad('missing '+key);
  }
}
function integer(n,name,min=0){
  if(!Number.isSafeInteger(n)||n<min)bad(name);
  return n;
}
function name(v,key){
  if(typeof v!=='string'||!v.trim()||v.length>200)bad(key);
  return v;
}

/**
 * Structured SOURCE METADATA only. Item/USE/EVENT fields are raw original
 * DSL entries, NOT compiled/evaluated behaviors or executable actions.
 */
function structuralCatalog(itemDsl,rebelDsl,model){
  const blocks=[
    parseDsl(itemDsl,'custom/inc-item-data.cgi'),
    parseDsl(rebelDsl,'custom/inc-rebel-data.cgi'),
  ].flatMap(p=>p.blocks);
  const records=kind=>Object.freeze(blocks.filter(x=>x.kind===kind).map(x=>
    Object.freeze({
      kind,sourceFile:x.file,sourceLine:x.startLine,
      ownerItemLine:x.ownerItemLine,
      sourceFields:Object.freeze(Object.fromEntries(
        Object.entries(x.fields).map(([name,rows])=>[
          name,Object.freeze(rows.map(row=>Object.freeze({
            raw:row.value,line:row.line,
          }))),
        ]))),
      runtimeSupported:false,
      sourceMode:'raw-nonexecuting-dsl',
    })));
  return Object.freeze({
    items:Object.freeze(model.items.map(x=>{
      const block=blocks.find(b=>b.kind==='ITEM'&&
        b.file===x.source&&b.startLine===x.line);
      const raw=key=>block?.fields?.[key]?.[0]?.value??null;
      return Object.freeze({
        id:x.id,name:x.name,code:x.code,
        priceRaw:x.priceRaw,limitRaw:x.limitRaw,flagRaw:x.flagRaw,
        typeRaw:raw('type'),costRaw:raw('cost'),
        infoRaw:raw('info'),scaleRaw:raw('scale'),
        source:x.source,line:x.line,
        runtimeSupported:false,
      });
    })),
    uses:records('USE'),
    events:records('EVENT'),
  });
}

/** Only trusted locally supplied original DSL strings; no web fetch. */
export function createStandardStreetModule({itemDsl,rebelDsl,
  originalAdminInitSource=null,originalDataReadSource=null,
  originalDataWriteSource=null,
  originalTurnSource=null,originalWholeSource=null,originalConfigSource=null,
  originalCompilerSource=null,
  originalMarketSource=null,originalItemSource=null,originalDetailSource=null,
  originalBuySource=null,originalBuyItemSource=null,originalBuyCalcSource=null,
  originalUseSource=null,originalItemHelperSource=null,
  originalPeriodSource=null,originalNewSource=null,originalCustomSource=null,originalLogSource=null,
  originalPalaceViewSource=null,originalPalaceCommandSource=null,originalPalaceConfigSource=null,
  originalArmyViewSource=null,originalArmyCommandSource=null,originalArmyFileSource=null,
  originalShowcaseSource=null,enableReviewedFullCommerce=false,
  enableReviewedNormalTime=false,enableReviewedCrossPeriod=false,
}){
  if(typeof itemDsl!=='string'||typeof rebelDsl!=='string')
    bad('original DSL source text');
  if(typeof enableReviewedNormalTime!=='boolean')bad('explicit reviewed time mode');
  if(typeof enableReviewedCrossPeriod!=='boolean'||enableReviewedCrossPeriod&&!enableReviewedNormalTime)bad('cross period requires reviewed normal time');
  if(typeof enableReviewedFullCommerce!=='boolean'||enableReviewedFullCommerce&&!enableReviewedNormalTime)bad('full commerce requires reviewed normal time');
  const r4Sources={itemDsl,rebelDsl,showcaseSource:originalShowcaseSource,compilerSource:originalCompilerSource,turnSource:originalTurnSource,readSource:originalDataReadSource,writeSource:originalDataWriteSource,detailSource:originalDetailSource,periodSource:originalPeriodSource,configSource:originalConfigSource,adminSource:originalAdminInitSource,originalAddItemSource:originalUseSource,newSource:originalNewSource,customSource:originalCustomSource,logSource:originalLogSource,palaceViewSource:originalPalaceViewSource,palaceCommandSource:originalPalaceCommandSource,palaceConfigSource:originalPalaceConfigSource,armyViewSource:originalArmyViewSource,armyCommandSource:originalArmyCommandSource,armyFileSource:originalArmyFileSource,armyCalcSource:originalArmyViewSource===null&&originalArmyCommandSource===null&&originalArmyFileSource===null?null:originalBuyCalcSource};
  const ordinaryEventReview=enableReviewedNormalTime?reviewR4PreEventItemOverlay(r4Sources,{includeReviewedManualCommerce:enableReviewedFullCommerce&&enableReviewedCrossPeriod}):null;
  const knownOrdinaryEvents=world=>ordinaryEventReview!==null&&validateR4OrdinaryEventContext({reviewed:ordinaryEventReview,world:enableReviewedCrossPeriod?independentCandidateWorld(world):world,candidateSettled:enableReviewedCrossPeriod});
  const model=loadStandardStreetModel(itemDsl,rebelDsl);
  const rankOnePrize=enableReviewedFullCommerce&&enableReviewedCrossPeriod?
    reviewOriginalTopPrize({itemDsl,model,originalAddItemSource:originalUseSource,
      periodSource:originalPeriodSource,includeReviewedMultiShelf:true}):null;
  if(model.maxMoney!==SOURCE_STANDARD_STREET_MAX_MONEY)
    bad('original MaxMoney declaration changed; review direct price cap');
  const catalog=structuralCatalog(itemDsl,rebelDsl,model);
  const giftMap=compileReviewedGiftMapUse({itemDsl,rebelDsl,model});
  const sources=[originalAdminInitSource,originalDataReadSource,originalDataWriteSource];
  if(sources.some(x=>x!==null)&&sources.some(x=>x===null))
    bad('incomplete frozen original bootstrap sources');
  const reviewedBootstrap=originalAdminInitSource===null?null:
    reviewOriginalSparseWorldBootstrap({
      adminSource:originalAdminInitSource,
      readSource:originalDataReadSource,
      writeSource:originalDataWriteSource,
    });
  const plusInputs=[originalTurnSource,originalWholeSource,originalConfigSource];
  if(plusInputs.some(x=>x!==null)&&plusInputs.some(x=>x===null))
    bad('incomplete frozen original PLUS sources');
  if(plusInputs.some(x=>x!==null)&&!reviewedBootstrap)
    bad('source PLUS needs reviewed B-34 original bootstrap');
  const reviewedSparsePlus=originalTurnSource===null?null:
    reviewOriginalSparsePlusTurn({
      turnSource:originalTurnSource,wholeSource:originalWholeSource,
      configSource:originalConfigSource,model,compiled:giftMap,
    });
  const reviewedMultiPlus=reviewedSparsePlus?
    reviewOriginalSparseMultiPlus({
      turnSource:originalTurnSource,wholeSource:originalWholeSource,
      configSource:originalConfigSource,model,compiled:giftMap,
    }):null;
  if(originalCompilerSource!==null&&!reviewedMultiPlus)
    bad('B-37 compiler source requires full reviewed bootstrap and turn sources');
  const reviewedAllPlus=originalCompilerSource===null?null:
    reviewOriginalSparseAllPlus({
      turnSource:originalTurnSource,wholeSource:originalWholeSource,
      configSource:originalConfigSource,compilerSource:originalCompilerSource,
      model,compiled:giftMap,
    });
  const naturalInputs=[originalMarketSource,originalItemSource,originalDetailSource];
  if(naturalInputs.some(x=>x!==null)&&naturalInputs.some(x=>x===null))
    bad('incomplete frozen B-38 natural-sale sources');
  if(naturalInputs.some(x=>x!==null)&&!reviewedAllPlus)
    bad('original natural-sale requires reviewed all-item PLUS and compiler sources');
  const reviewedNaturalPlus=originalMarketSource===null?null:
    reviewOriginalNaturalSalePlus({
      turnSource:originalTurnSource,marketSource:originalMarketSource,
      itemSource:originalItemSource,detailSource:originalDetailSource,
      configSource:originalConfigSource,compilerSource:originalCompilerSource,
      itemDsl,reviewedAllPlus,
    });
  const reviewedNayuta=reviewedNaturalPlus===null?null:
    reviewOriginalNayutaFuncturn({
      itemDsl,turnSource:originalTurnSource,compilerSource:originalCompilerSource,
      reviewedNaturalPlus,reviewedAllPlus,
    });
  const buySources=[originalBuySource,originalBuyItemSource,originalBuyCalcSource];
  if(buySources.some(x=>x!==null)&&buySources.some(x=>x===null))
    bad('incomplete frozen original B-40 buy sources');
  if(originalBuySource!==null&&(!reviewedAllPlus||!originalWholeSource||
      !originalCompilerSource))
    bad('B-40 buy requires source-verified sparse market and full PLUS inputs');
  const reviewedMarketBuy10=originalBuySource===null?null:
    reviewOriginalMarketBuy10({
      buySource:originalBuySource,wholeSource:originalWholeSource,
      itemSource:originalBuyItemSource,calcSource:originalBuyCalcSource,
      compilerSource:originalCompilerSource,model,compiled:giftMap,
    });
  const reviewedEventCatalog=originalCompilerSource&&originalTurnSource?
    reviewOriginalCompiledEventCatalog({
      itemDsl,rebelDsl,compilerSource:originalCompilerSource,
      turnSource:originalTurnSource,
    }):null;
  const reviewedInstantEventCallbacks=reviewedEventCatalog?
    reviewOriginalInstantEventCallbacks({
      itemDsl,turnSource:originalTurnSource,
      compilerSource:originalCompilerSource,
      compiledCatalog:reviewedEventCatalog,
    }):null;
  const reviewedMarketBuy11=reviewedMarketBuy10?
    reviewOriginalMarketBuy11({
      reviewedBuy10:reviewedMarketBuy10,model,compiled:giftMap,itemDsl,
    }):null;
  const reviewedB59Iron=reviewedEventCatalog&&reviewedAllPlus&&
    originalDataReadSource?
    reviewOriginalB59IronEvent({
      itemDsl,turnSource:originalTurnSource,
      compilerSource:originalCompilerSource,
      readSource:originalDataReadSource,
      compiledCatalog:reviewedEventCatalog,reviewedAllPlus,model,
    }):null;
  const reviewedB60Happy=reviewedEventCatalog&&originalDataReadSource?
    reviewOriginalB60HappyEvent({
      itemDsl,turnSource:originalTurnSource,
      compilerSource:originalCompilerSource,
      readSource:originalDataReadSource,
      compiledCatalog:reviewedEventCatalog,
    }):null;
  const reviewedB61Sword=reviewedEventCatalog&&originalDataReadSource?
    reviewOriginalB61SwordDemand({
      itemDsl,turnSource:originalTurnSource,
      compilerSource:originalCompilerSource,
      readSource:originalDataReadSource,
      compiledCatalog:reviewedEventCatalog,model,
    }):null;
  const reviewedB62Map=reviewedMarketBuy10&&originalBuySource&&
    originalDataReadSource&&originalUseSource?
    reviewOriginalB62SwordMap({
      itemDsl,model,compiled:giftMap,
      reviewedMarket10:reviewedMarketBuy10,
      buySource:originalBuySource,wholeSource:originalWholeSource,
      calcSource:originalBuyCalcSource,
      itemSource:originalBuyItemSource,
      compilerSource:originalCompilerSource,
      useSource:originalUseSource,
      readSource:originalDataReadSource,
    }):null;
  const reviewedB63Map=reviewedB62Map&&originalItemHelperSource?
    reviewOriginalB63SwordMapOutcomes({
      reviewedB62Map,itemDsl,
      originalUseSource,originalHelperSource:originalItemHelperSource,
      originalCalcSource:originalBuyCalcSource,
      originalWholeSource,
    }):null;
  // R2-A: The real Standard Street @@FUNCBUY is NOT empty. Its source
  // awards gift vouchers at int(wholesale-spend/500000), and only when
  // the buying seller is the virtual market. Current three reviewed item
  // limits keep total spend below this threshold: source-verified no-op.
  // Do not silently skip this globally executable callback for future items.
  const globalBuyBlocks=parseDsl(itemDsl,'custom/inc-item-data.cgi')
    .blocks.filter(block=>block.kind==='FUNCBUY');
  let reviewedGlobalBuyCallback=null;
  if(reviewedMarketBuy10){
    const block=globalBuyBlocks[0];
    if(globalBuyBlocks.length!==1||!block||
       !block.raw.includes('if($BUY->{whole})')||
       !block.raw.includes('my $price=$BUY->{num}*$BUY->{price};')||
       !block.raw.includes('my $count=int $price/500000;')||
       !block.raw.includes('AddItemSub(@@ITEMNO"禮物卷",$count,$BUY->{dt}) if $count;')||
       !block.raw.includes('WriteLog(0,$BUY->{dt}{id},')||
       !originalBuySource.includes('require "$ITEM_DIR/funcbuy.cgi" if $DEFINE_FUNCBUY;')||
       !originalBuySource.includes('SetWholeStore($DTS) if $id==0;'))
      bad('unreviewed original @@FUNCBUY global voucher effect');
    reviewedGlobalBuyCallback=Object.freeze({
      key:'standard-street-global-wholesale-voucher',
      source:'custom/inc-item-data.cgi:'+block.startLine,
      minTotal:500000,
    });
  }
  // R2-B: all source ITEMs, including original BASE dynamic prices,
  // use the same compiled Registry and one shared GameCore transaction.
  // The legacy R2-A oracle's missing BASE is only a historical test fixture.
  const buyRegistry=reviewedMarketBuy10?
    compileStandardStreetMarketBuyRegistry({
      itemDsl,rebelDsl,model,compiled:giftMap,
      compilerSource:originalCompilerSource,
      buySource:originalBuySource,wholeSource:originalWholeSource,
      itemSource:originalBuyItemSource,
      globalBuyCallback:reviewedGlobalBuyCallback,includeReviewedShowcaseTool:enableReviewedFullCommerce,
    }):null;
  const marketBuy=Object.freeze({
    reviewedSignedCash:enableReviewedFullCommerce,
    globalBuyCallback:reviewedGlobalBuyCallback,
    order:buyRegistry?.order??Object.freeze([]),
    getRule(itemId){return buyRegistry?.getRule(itemId)??null;},
    describe(itemId){return buyRegistry?.describe(itemId)??null;},
    quote({rule,marketStock,shop=null}){
      return buyRegistry?.quote({rule,marketStock,shop})??null;
    },
    validateWorld(world){
      // Original DataRead may load EVENT overlays and guild effects before
      // source buy-s.cgi. This standalone market-buy slice has neither a
      // reviewed event-overlaid ITEM compiler nor a guild transaction hook.
      // An empty source eventState is evidence; null/active is not.
      const eventState=world?.period?.eventState;
      const reviewedEvents=world?.period===undefined||
        (eventState!==null&&eventState!==undefined&&
         typeof eventState==='object'&&!Array.isArray(eventState)&&
         Object.keys(eventState).length===0)||knownOrdinaryEvents(world);
      const guild=world?.shops?.[0]?.guild;
      const noGuild=guild===undefined||guild===null||guild===0||
        guild===''||guild===false;
      return reviewedEvents&&noGuild&&
        world?.events===null&&world.shops?.length===1&&
        validateSourceSparseMarket(world.market);
    },
    writeMarket({market,wholesale,wholesaleIndex}){
      if(!validateSourceSparseMarket(market)||
         !Array.isArray(wholesale)||wholesale.length!==model.items.length)
        bad('original wholesale wire shape');
      const positions=wholesale.map((n,i)=>
        n>0||i===wholesaleIndex?i:-1).filter(i=>i>=0);
      const present=new Set(positions);
      const originalWholesaleCsv=Array.from({length:wholesale.length},(_,i)=>
        present.has(i)?String(wholesale[i]):'').join(',');
      const next={...market,wholesale,sparseWrittenSlots:positions,
        originalWholesaleCsv,sourceWriteShape:'whole-store-79'};
      if(!validateSourceSparseMarket(next))
        bad('original SetWholeStore write inconsistency');
      return next;
    },
    // Original @@FUNCBUY voucher crosses 500000G only with a reviewed
    // handler. Shared GameCore refuses an unknown nonzero callback effect.
  });

  // R2-D: StreetModule compiles source-approved USE recipes and callbacks.
  // All use-item accounting, material clipping, MakeAmount and EXP happen
  // once inside GameCore. Unknown USEs are described but not executable.
  const giftUseVariants=compileReviewedGiftUseVariants({
    itemDsl,model,giftMap,
  });
  const declarativeUses=compileReviewedDeclarativeUses({
    itemDsl,model,limits:giftMap.limits,
  });
  const gatheringUses=compileReviewedGatheringMapUses({
    itemDsl,model,limits:giftMap.limits,
  });
  const showcaseResizeUses=compileReviewedShowcaseResizeUses({
    itemDsl,model,limits:giftMap.limits,
  });
  const dairyInlineUses=compileReviewedDairyInlineUses({
    itemDsl,model,limits:giftMap.limits,
  });
  const bookWorkUses=compileReviewedBookWorkUses({
    itemDsl,model,limits:giftMap.limits,
  });
  const careerChangeUses=compileReviewedCareerChangeUses({
    itemDsl,model,limits:giftMap.limits,
  });
  const partyUse=compileReviewedPartyUse({
    itemDsl,model,limits:giftMap.limits,
  });
  const selfAdvertiseUse=compileReviewedSelfAdvertiseUse({
    itemDsl,model,limits:giftMap.limits,
  });
  const targetAdvertiseUse=compileReviewedTargetAdvertiseUse({
    itemDsl,model,limits:giftMap.limits,
  });
  // Only the authenticated local shop is a legal HTTP target. Preserve
  // the existing two-shop memory rule separately outside this mode.
  const localTargetUses=enableReviewedFullCommerce&&enableReviewedCrossPeriod?
    compileReviewedLocalTargetUses({sources:r4Sources,model,limits:giftMap.limits,targetAdvertiseUse}):[];
  const noGuildAdvertiseUse=enableReviewedFullCommerce?compileReviewedNoGuildAdvertiseUse({itemDsl,model,limits:giftMap.limits}):null;
  const declarativeUseIndex=new Map([
    ...declarativeUses,...gatheringUses,...dairyInlineUses,
    ...bookWorkUses,...careerChangeUses,partyUse,selfAdvertiseUse,
    targetAdvertiseUse,...(noGuildAdvertiseUse?[noGuildAdvertiseUse]:[]),...localTargetUses,
  ].map(rule=>[
    rule.itemId+':'+rule.useId,rule,
  ]));
  const giftUseRule=Object.freeze({
    supported:true,itemId:giftMap.itemId,useId:giftMap.useNo,
    source:'reviewed-original-gift-use',sourceFile:giftMap.sourceFile,
    sourceLine:giftMap.sourceLine,name:giftMap.name,
    uses:giftMap.use,creates:giftMap.create,limits:giftMap.limits,
    time:giftMap.time,exptime:giftMap.exptime,money:giftMap.money,
    resultOk:giftMap.resultOk,marketCodec:'gift',
    scope:giftMap.limitations,
  });
  const swordUseRule=reviewedB62Map?Object.freeze({
    supported:true,itemId:reviewedB62Map.mapItemId,useId:0,
    source:reviewedB63Map?.source??reviewedB62Map.source,
    sourceFile:'custom/inc-item-data.cgi',sourceLine:null,
    name:'去劍的市場收購',uses:Object.freeze([]),
    creates:Object.freeze(reviewedB62Map.outputs.map(x=>Object.freeze({
      itemId:x.itemId,countPerUse:x.count,
      probabilityPermille:x.probabilityPermille,
    }))),
    limits:giftMap.limits,time:reviewedB62Map.mapUseTimeSeconds,
    exptime:3600,money:reviewedB62Map.mapUsePrice,
    jobTimeModifier:Object.freeze({job:'peddle',numerator:2,denominator:3}),
    requiresOwnedItem:true,
    ownedMaximum:reviewedB62Map.mapStockLimit,
    outputAllowlist:reviewedB63Map?null:Object.freeze([40]),
    marketCodec:'source-sparse',
    beforeCallback:Object.freeze({
      kind:'double-create',threshold:100,
      allowDouble:Boolean(reviewedB63Map),
      resultOk:'這次我們收穫的比平時多。',
    }),
    afterCallback:Object.freeze({
      kind:'lostbook',threshold:100,consumedCount:1,
      allowLoss:Boolean(reviewedB63Map),
      message:'到劍市的地圖已經破爛到看不懂，就扔掉了。',
    }),
    experienceCallback:Object.freeze({kind:'gain-fixed-exp',points:20}),
    outputMessages:Object.freeze({
      40:'',41:'',42:'',
      43:'秘銀劍很便宜',44:'發現便宜的奧利哈鋼劍了!',
    }),
    scope:reviewedB63Map?.scope??reviewedB62Map.scope,
  }):null;
  const expHashReview=enableReviewedFullCommerce?reviewUseExpHash({useSource:originalUseSource,readSource:originalDataReadSource}):null;
  const useItem=Object.freeze({
    ...(expHashReview?{resolveExperienceOrder:args=>resolveR4UseExpOrder({...args,review:expHashReview})}:{}),
    reviewedSignedCash:enableReviewedFullCommerce,
    getRule(itemId,useId){
      if(itemId===giftUseRule.itemId)
        return useId===0?giftUseRule:
          giftUseVariants.find(x=>x.useId===useId)??null;
      if(itemId===63)return showcaseResizeUses[useId]??null;
      if(itemId===swordUseRule?.itemId&&useId===0)return swordUseRule;
      return declarativeUseIndex.get(itemId+':'+useId)??null;
    },
    describe(itemId,useId){
      if(!Number.isSafeInteger(itemId)||itemId<1||
         !Number.isSafeInteger(useId)||useId<0)
        return 'invalid source USE id';
      const sourceItem=model.items.find(x=>x.id===itemId);
      if(!sourceItem)return 'unknown original ITEM';
      const sourceUse=catalog.uses.filter(x=>x.ownerItemLine===
        catalog.items.find(v=>v.id===itemId)?.line)?.[useId];
      return sourceUse?
        'original USE effects/callbacks not reviewed at '+
          sourceUse.sourceFile+':'+sourceUse.sourceLine:
        'original ITEM has no reviewed USE #'+useId;
    },
    runInlineCallback({rule,shop,count,random,targetShop,world}){
      if(localTargetUses.includes(rule))return projectReviewedLocalTargetUse({rule,shop,count,random,world});
      if(noGuildAdvertiseUse&&rule===noGuildAdvertiseUse)return projectOriginalNoGuildAdvertisement({rule,shop,count});
      if(rule===targetAdvertiseUse){
        if(rule.inlineCallback?.kind!=='advertise-other'||count!==1)
          bad('unreviewed original target advertisement');
        return projectOriginalTargetAdvertisement({
          rule,shop,target:targetShop,count,
        });
      }
      if(rule===selfAdvertiseUse){
        if(rule.inlineCallback?.kind!=='advertise-self'||count!==1)
          bad('unreviewed self-advertising callback');
        return projectOriginalSelfAdvertisement({rule,shop,count,random});
      }
      if(rule===partyUse){
        if(rule.inlineCallback?.kind!=='party-popularity'||count!==1)
          bad('unreviewed original party popup');
        return projectOriginalPartyPopup({rule,shop,count});
      }
      if(careerChangeUses.includes(rule)){
        if(rule.inlineCallback?.kind!=='career-change'||count!==1)
          bad('unreviewed career source callback');
        return projectOriginalCareerChange({
          rule,shop,
          sourceItemNames:Array.from({length:79},(_,i)=>
            model.items.find(x=>x.id===i+1)?.name),
        });
      }
      if(bookWorkUses.includes(rule)){
        const amount=rule.inlineCallback?.param;
        if(rule.itemId!==13||
           rule.inlineCallback?.kind!=='book-work'||
           amount!==(rule.useId===0?3000:10000)||
           !Number.isSafeInteger(count)||count<1)
          bad('unreviewed source work callback');
        return projectOriginalBookWorkCallback({
          money:shop.money,param1:amount,count,
          shopId:shop.id,shopName:shop.shopname,
          moneyPrefix:'¥',moneySuffix:'',
        });
      }
      if(dairyInlineUses.includes(rule)){
        if(!['milk-cow','drink-milk'].includes(rule.inlineCallback?.kind))
          bad('unsupported dairy source callback');
        return projectOriginalDairyInlineCallback({
          kind:rule.inlineCallback.kind,level:rule.inlineCallback.level,
          shop:{...shop},count,random,limits:rule.limits,
        });
      }
      if(rule?.itemId!==63||rule.inlineCallback?.kind!=='showcase-resize'||
        !Number.isSafeInteger(rule.inlineCallback.newCount)||
        rule.inlineCallback.newCount<1||rule.inlineCallback.newCount>8||
        !showcaseResizeUses.includes(rule)||
        !Number.isSafeInteger(shop?.showcasecount)||
        !Array.isArray(shop.showcase)||!Array.isArray(shop.price)||
        shop.showcase.length!==shop.showcasecount||
        shop.price.length!==shop.showcasecount)
        bad('unsupported inline showcase callback');
      return projectOriginalShowcaseResizeCallback({
        showcaseCount:shop.showcasecount,showcase:shop.showcase,
        prices:shop.price,newCount:rule.inlineCallback.newCount,
        shopId:shop.id,shopName:shop.shopname,
      });
    },
    ...(enableReviewedNormalTime?{validateEventState:({world})=>knownOrdinaryEvents(world)}:{}),
    validateWorld({world,rule}){
      const market=world?.market;
      if(rule?.marketCodec==='gift'&&
         market?.source==='explicit-b33-test-fixture')
        return Array.isArray(market.wholesale)&&
          market.wholesale.length===giftMap.limits.length;
      return validateSourceSparseMarket(market)&&
        (rule?.marketCodec==='gift'||rule?.marketCodec==='source-sparse')&&
        (rule.marketCodec!=='source-sparse'||world.shops.length===1||
          (rule===targetAdvertiseUse&&world.shops.length===2));
    },
    writeMarket({world,rule,original}){
      if(rule.marketCodec==='gift'){
        if(world.market.source===ORIGINAL_SPARSE_MARKET_SOURCE)
          return traceOriginalSparseGiftWholesale({
            world,compiled:giftMap,original,
          });
        return {...world.market,wholesale:[...original.wholesale]};
      }
      if(rule.marketCodec==='source-sparse'&&
         world.market.source===ORIGINAL_SPARSE_MARKET_SOURCE){
        // Frozen CheckWholeStore may leave both numeric wholesale AND sparse
        // wire untouched. Preserve that existing source wire exactly so R3
        // does not mistake a no-op USE for a fresh wholesale market write.
        if(original.multiItem.discarded.length===0&&
           original.wholesale.every((n,i)=>
             n===world.market.wholesale[i]))
          return world.market;
        // Original overflow creates a defined wholesale slot even when a
        // later CheckWholeStore reduces its numeric value to zero.
        return traceOriginalSparseGiftWholesale({
          world,compiled:giftMap,original,
        });
      }
      bad('unreviewed USE market write/overflow branch');
    },
  });
  const reviewedB41=reviewedMarketBuy10&&reviewedNaturalPlus?
    reviewB41Sale({reviewedNatural:reviewedNaturalPlus,
       itemDsl,rebelDsl,turnSource:originalTurnSource,
        reviewedBuy:reviewedMarketBuy10,reviewedAllPlus,
      configSource:originalConfigSource,
      reviewedMarket11:reviewedMarketBuy11,
      reviewedB59Iron,reviewedB60Happy,reviewedB61Sword,
      reviewedB62Map,reviewedB63Map}):null;
  const reviewedSupportEventCallbacks=reviewedEventCatalog?
    reviewOriginalSupportEventCallbacks({
      itemDsl,turnSource:originalTurnSource,
      compilerSource:originalCompilerSource,
      compiledCatalog:reviewedEventCatalog,
    }):null;
  const reviewedLoto=reviewedEventCatalog&&reviewedMarketBuy11&&
    reviewedSupportEventCallbacks?
    reviewOriginalLotoStartfunc({
      itemDsl,turnSource:originalTurnSource,
      compiledCatalog:reviewedEventCatalog,
      reviewedMarket11:reviewedMarketBuy11,
      reviewedSupportCallbacks:reviewedSupportEventCallbacks,
    }):null;
  const reviewedR4Transition=originalTurnSource&&originalConfigSource?
    reviewR4WorldTransitionGate({
      turnSource:originalTurnSource,configSource:originalConfigSource,
    }):null;
  const reviewedB56=reviewedB41&&reviewedInstantEventCallbacks?
    reviewB56EventSlice({turnSource:originalTurnSource,
      reviewedB41,reviewedCatalog:reviewedEventCatalog,
      reviewedCallbacks:reviewedInstantEventCallbacks,
      reviewedSupportCallbacks:reviewedSupportEventCallbacks,
      reviewedLoto,reviewedB59Iron,reviewedB60Happy,
      reviewedB61Sword,reviewedB62Map,reviewedB63Map}):null;
  const metadata=Object.freeze({
    source:'custom/inc-item-data.cgi + custom/inc-rebel-data.cgi',
    compiler:'reviewed-declarative-subset; NO full Perl compiler',
    itemCount:model.items.length,
    modelSourceMode:model.sourceMode,
    opaqueCallbacks:true,
    unsupported:Object.freeze([...model.unsupported,
      'other item-use actions', 'market sales', 'period settlement', 'multiworld runtime']),
  });
  const base=Object.freeze({
    id:STANDARD_STREET_ID,
    capabilities:Object.freeze([...actions,
      ...(reviewedBootstrap?['initialize-source-market']:[]),
      ...(reviewedSparsePlus?['reviewed-sparse-plus']:[]),
      ...(reviewedMultiPlus?['reviewed-sparse-multi-plus']:[]),
      ...(reviewedAllPlus?['reviewed-sparse-all-plus']:[]),
      ...(reviewedNaturalPlus?['reviewed-natural-sale-plus']:[]),
      ...(reviewedNayuta?['reviewed-nayuta-functurn']:[]),
      ...(buyRegistry?['market-buy']:[]),
      'use-item',
      ...(reviewedB41?['advance-source-time']:[]),
      ...(reviewedB56?['advance-source-time-reviewed-events']:[]),
      ...(reviewedInstantEventCallbacks?[
        'reviewed-instant-event-callback-fixture']:[]),
    ]),
    metadata,
    // Read-only value parsed from source @@DEFINE TimeEditShowcase (10m).
    showcaseEditTimeSeconds:model.showcaseEditTime,
    sourceMaxShowcasePrice:model.maxMoney,
    catalog,
    reviewedGiftMapUse:giftMap,
    reviewedBootstrap,
    reviewedSparsePlus,
    reviewedMultiPlus,
    reviewedAllPlus,
    reviewedNaturalPlus,
    reviewedNayuta,
    reviewedMarketBuy10,
    reviewedMarketBuy11,
    reviewedB41,
    reviewedEventCatalog,
    ...(ordinaryEventReview?.manual?{reviewedManualCommerceEvents:ordinaryEventReview.manual}:{}),
    reviewedInstantEventCallbacks,
    reviewedSupportEventCallbacks,
    reviewedLoto,
    reviewedB59Iron,
    reviewedB60Happy,
    reviewedB61Sword,
    reviewedB62Map,
    reviewedB63Map,
    reviewedB56,
    reviewedR4Transition,
    reviewPeriodTransition({before,after}){
      if(!reviewedR4Transition)
        bad('unreviewed Standard Street v2 original period transition');
      return allowR4UnsettledWorldTransition({
        reviewed:reviewedR4Transition,before,after,
      });
    },
    marketBuy:buyRegistry?marketBuy:null,
    marketBuyRegistry:buyRegistry,
    useItem,
    // R2-E: read-only view of the SAME source-reviewed USE registry that
    // GameCore executes. This is UI affordance, never a second USE preflight.
    listUseOffers(world){
      const shop=world?.shops?.length===1?world.shops[0]:null;
      const eventState=world?.period?.eventState;
      const safeEvents=world?.events===null&&
        (world?.period===undefined||
          (eventState!==null&&eventState!==undefined&&
           typeof eventState==='object'&&!Array.isArray(eventState)&&
           Object.keys(eventState).length===0)||knownOrdinaryEvents(world));
      const rules=[giftUseRule,...giftUseVariants,swordUseRule,
        ...showcaseResizeUses,...declarativeUses,...gatheringUses,
        ...dairyInlineUses,...bookWorkUses,
        ...careerChangeUses,partyUse,selfAdvertiseUse,noGuildAdvertiseUse,...localTargetUses].filter(Boolean);
      const offers=rules.map(rule=>{
          const owned=shop?.item?.[rule.itemId-1]??0;
          const sourceName=model.items.find(x=>x.id===rule.itemId)?.name;
          const materials=rule.uses.length?
            rule.uses.map(x=>({itemId:x.itemId,count:x.countPerUse})):
            (rule.requiresOwnedItem?[{itemId:rule.itemId,count:1}]:[]);
          const priorExp=shop?.exp;
          const invalidExp=priorExp!==undefined&&
            (priorExp===null||typeof priorExp!=='object'||
             Array.isArray(priorExp)||Object.entries(priorExp).some(
               ([id,value])=>!/^[1-9]\d*$/.test(id)||Number(id)>79||
                 !Number.isSafeInteger(value)||value<0||value>1000));
          const exp=invalidExp?0:(priorExp?.[String(rule.itemId)]??0);
          const actualTime=originalSourceUseClock({
            rule,job:shop?.job??'',experience:exp,
          }).seconds;
          const missing=materials.find(row=>
            (shop?.item?.[row.itemId-1]??0)<row.count);
          const validMarket=world?.market&&
            useItem.validateWorld({world,rule});
          // Display-only original CheckUseItem count ceiling. Actual server
          // request still runs the shared preflight and may be clipped.
          const timeMaximum=shop&&actualTime>0?
            Math.max(0,Math.floor((world.nowSeconds-shop.time)/actualTime)):0;
          const moneyMaximum=shop&&rule.money>0?
            Math.max(0,Math.floor(shop.money/rule.money)):Number.MAX_SAFE_INTEGER;
          const materialsMaximum=shop?rule.uses.reduce((maximum,input)=>{
            const available=shop.item[input.itemId-1]??0;
            // NEED/proba=0 is a holding requirement, not consumption per use.
            return input.probabilityPermille===0?
              (available>=input.countPerUse?maximum:0):
              Math.min(maximum,Math.floor(available/input.countPerUse));
          },rule.requiresOwnedItem&&owned<1?0:Number.MAX_SAFE_INTEGER):0;
          const sourceGate=rule.firstUseOnly&&exp!==0?'僅限首次使用':
            exp<(rule.needExperience??0)?'熟練度不足：需要 '+((rule.needExperience??0)/10)+'%':
            rule.needJob&&(shop?.job??'')!==rule.needJob?'職業條件不足':
            (shop?.point??0)<(rule.needPoint??0)?'點數不足':
            (shop?.rank??0)<(rule.needPopularity??0)?'人氣不足':null;
          const policyMaximum=sourceGate?0:rule.firstUseOnly||rule.singleUseOnly?
            1:Number.MAX_SAFE_INTEGER;
          const constraints=[
            {label:'材料最大',maximum:materialsMaximum},
            {label:'時間最大',maximum:timeMaximum},
            {label:'資金最大',maximum:moneyMaximum},
            {label:sourceGate??'使用次數限制',maximum:policyMaximum},
          ];
          const maxUseCount=Math.max(0,Math.min(
            ...constraints.map(limit=>limit.maximum)));
          const maxUseCountReason=constraints.find(limit=>
            limit.maximum===maxUseCount)?.label??'可執行上限';
          const reason=!shop?'請先開店':
            !safeEvents?'尚未審閱的 EVENT 世界狀態':
            shop.status!==1?'尚未審閱的商店狀態':
            ![undefined,null,0,'',false].includes(shop.guild)?
              '尚未審閱的公會效果':
            !validMarket?'來源市場尚未驗證':
            invalidExp?'熟練度紀錄不合法':
            rule.requiresOwnedItem&&owned<1?'尚未持有使用此功能的商品':
            sourceGate?sourceGate:
            missing?'材料不足：'+
              (model.items.find(item=>item.id===missing.itemId)?.name??
                '未知材料')+'需要 '+missing.count+' 件':
            (rule.money>0||!enableReviewedFullCommerce)&&shop.money<rule.money?'資金不足':
            shop.time+actualTime>world.nowSeconds?'可用行動時間不足':
            null;
          return Object.freeze({
            itemId:rule.itemId,useId:rule.useId,
            itemName:sourceName,useName:rule.name,
            owned,materials,moneyPerUse:rule.money,
            timePerUseSeconds:actualTime,
            proficiency:exp,requiredProficiency:rule.needExperience??0,maxUseCount,maxUseCountReason,
            missingMaterialId:missing?.itemId??null,
            firstUseOnly:Boolean(rule.firstUseOnly),
            singleUseOnly:Boolean(rule.singleUseOnly),
            ...(rule.localSelfTarget===true?{targetShopId:shop?.id??null,targetShopName:shop?.shopname??null}:{}),
            randomSampleRequired:Boolean(rule.beforeCallback)||
               Boolean(rule.inlineCallback&&
                 !['showcase-resize','advertise-no-guild','local-self-advertise-other','local-self-theft'].includes(rule.inlineCallback.kind))||
               [...rule.uses,...rule.creates].some(x=>
                 x.probabilityPermille>0&&x.probabilityPermille<1000),
            supported:true,canUse:reason===null,reason,
            source:rule.source,sourceFile:rule.sourceFile,
          });
        });
      const byUse=new Map(offers.map(q=>[q.itemId+':'+q.useId,q]));
      return Object.freeze(offers.map(offer=>{
          // Read-only source-backed acquisition hints; never synthesize
          // inventory, wholesale stock, or a new player transaction.
          // A positive PLUS is a replenishment possibility, not a promise
          // of an in-stock purchase or sufficient funds.
          const materialRoutes=Object.freeze(offer.materials.map(row=>{
            const sourceItem=model.items.find(item=>item.id===row.itemId);
            const ownedCount=shop?.item?.[row.itemId-1]??0;
            const missingCount=Math.max(0,row.count-ownedCount);
            const marketStock=world?.market?.wholesale?.[row.itemId-1]??0;
            const buyRule=buyRegistry?.getRule(row.itemId)??null;
            const plus=sourceItem?.plusRaw??'';
            const replenishes=Boolean(buyRule&&
              /^[1-9][0-9]*(?:\.[0-9]+)?[mhd]$/.test(plus));
            const providers=rules.filter(provider=>
                provider?.creates?.some(output=>
                  output.itemId===row.itemId&&output.countPerUse>0)||
                (row.itemId===26&&provider?.itemId===25&&
                 provider.inlineCallback?.kind==='milk-cow'));
            // Match the actual read-only USE offer, not just material stock.
            // EXP, point, time, money and other source gates remain authoritative.
            const providerOffer=provider=>byUse.get(provider.itemId+':'+provider.useId);
            const availableProvider=providers.find(provider=>{
              const q=providerOffer(provider);
              return q?.canUse===true&&q.maxUseCount>0;
            });
            const prizeChoices=rankOnePrize?.topChoices.filter(choice=>choice.itemId===row.itemId)??[];
            const kind=missingCount===0?'owned':
              buyRule&&marketStock>=missingCount?'market-stock':
              availableProvider?'registered-use':
              replenishes?'source-plus':
              prizeChoices.length?'source-rank-one-prize':
              providers.length?'upstream-use-not-ready':
              'source-acquisition-not-implemented';
            return Object.freeze({
              itemId:row.itemId,name:sourceItem?.name??'未知商品',
              required:row.count,owned:ownedCount,missing:missingCount,
              marketStock,kind,sourcePlus:replenishes?plus:null,
              ...(prizeChoices.length?{rankOnePrize:Object.freeze({
                choices:Object.freeze(prizeChoices.map(choice=>Object.freeze({index:choice.index,count:choice.count}))),
                totalChoices:rankOnePrize.topChoices.length,
              })}:{}),
              provider:kind==='registered-use'?Object.freeze({
                itemId:availableProvider.itemId,useId:availableProvider.useId,
              }):null,
              providerCandidates:providers.map(p=>Object.freeze({
                itemId:p.itemId,useId:p.useId,
                canUse:providerOffer(p)?.canUse===true,
                reason:providerOffer(p)?.reason??null,
              })),
            });
          }));
          return Object.freeze({...offer,materialRoutes});
        }));
    },
    // R2-C read-only common wholesale offer projection: identical Registry,
    // source sorting and live pricing as the GameCore transaction.
    quoteMarketOffer(world,itemId){
      const entry=buyRegistry?.describe(itemId);
      if(!entry||!validateSourceSparseMarket(world?.market))
        bad('source-backed wholesale offer unavailable');
      const marketStock=world.market.wholesale[entry.wholesaleIndex];
      if(!Number.isSafeInteger(marketStock)||marketStock<0)
        bad('invalid original wholesale stock');
      const rule=buyRegistry.getRule(itemId);
      const shelf=marketStock>0?buyRegistry.order.slice(0,entry.sort)
        .filter(row=>world.market.wholesale[row.wholesaleIndex]>0).length:null;
      const shop=world.shops?.[0]??null;
      const quote=rule&&marketStock>0?
        buyRegistry.quote({rule,marketStock,shop}):null;
      const canBuy=Boolean(quote&&marketBuy.validateWorld(world)&&
        shop?.id===1&&shop.status===1&&
        shop.item[entry.shopIndex]<entry.stockLimit);
      return Object.freeze({
        itemId,name:entry.itemName,itemCode:entry.itemCode,
        price:quote?.price??null,timeSeconds:quote?.timeSeconds??null,
        basePrice:entry.basePrice,marketStock,shelf,
        owned:shop?.item?.[entry.shopIndex]??0,limit:entry.stockLimit,
        classification:entry.classification,source:entry.source,
        reason:entry.reason??(rule?null:'unsupported original source semantics'),
        canBuy,
      });
    },
    listMarketOffers(world){
      if(!buyRegistry||!validateSourceSparseMarket(world?.market))
        return Object.freeze([]);
      // Frozen whole.cgi::GetWholeStore first greps nonzero wholesale stock,
      // then sorts that subset by ITEM declaration order. The full Registry
      // is a product catalog, never the original market's visible shelves.
      return Object.freeze(buyRegistry.entries
        .filter(e=>world.market.wholesale[e.wholesaleIndex]>0)
        .map(e=>this.quoteMarketOffer(world,e.itemId)));
    },
    apply({world,command}){
      if(world.streetId!==STANDARD_STREET_ID)bad('street mismatch');
      if(command.kind==='open-shop'){
        ownKeysExact(command,['shopId','ownerName','shopName'],['icon']);
        integer(command.shopId,'shopId',1);
        name(command.ownerName,'ownerName');
        name(command.shopName,'shopName');
        if(command.icon!==undefined)integer(command.icon,'icon');
        if(world.shops.some(s=>s.id===command.shopId))bad('duplicate shop id');
        const created=createStandardStreetShop(model,{
          now:world.nowSeconds,id:command.shopId,name:command.ownerName,
          shopname:command.shopName,icon:command.icon,
        });
        return {
          shops:[...world.shops,created],
          receipt:{
            action:'open-shop',shopId:created.id,
            money:created.money,remainingTimeSeconds:world.nowSeconds-created.time,
            source:'fixed Core new.cgi + reviewed Standard Street FUNCNEW subset',
          },
        };
      }
      if(command.kind==='initialize-source-market'&&reviewedBootstrap){
        ownKeysExact(command,[]);
        if(world.revision!==0||world.shops.length!==0||
           world.market!==null||world.events!==null)
          bad('original first-world bootstrap requires fresh empty revision-zero world');
        return {
          shops:world.shops,
          market:createOriginalSparseMarket(reviewedBootstrap),
          receipt:{
            action:'initialize-source-market',source:reviewedBootstrap.source,
            originalWholesaleCsv:'',originalSuppliedSlots:0,
            scope:'source-verified first-time admin init in memory; not CGI, not actual install or live world import',
          },
        };
      }
      if(command.kind==='reviewed-sparse-plus'&&reviewedSparsePlus){
        ownKeysExact(command,['timespanSeconds','randomDraws']);
        return projectOriginalSparsePlusTurn({
          world,reviewed:reviewedSparsePlus,compiled:giftMap,
          timespanSeconds:command.timespanSeconds,randomDraws:command.randomDraws,
        });
      }
      if(command.kind==='reviewed-sparse-multi-plus'&&reviewedMultiPlus){
        ownKeysExact(command,['timespanSeconds','randomDraws']);
        return projectOriginalSparseMultiPlus({
          world,reviewed:reviewedMultiPlus,compiled:giftMap,
          timespanSeconds:command.timespanSeconds,randomDraws:command.randomDraws,
        });
      }
      if(command.kind==='reviewed-sparse-all-plus'&&reviewedAllPlus){
        ownKeysExact(command,['timespanSeconds','randomDraws']);
        return projectOriginalSparseAllPlus({
          world,reviewed:reviewedAllPlus,compiled:giftMap,
          timespanSeconds:command.timespanSeconds,randomDraws:command.randomDraws,
        });
      }
      if(command.kind==='reviewed-natural-sale-plus'&&reviewedNaturalPlus){
        ownKeysExact(command,['randomDraws']);
        return projectOriginalNaturalSalePlus({
          world,reviewed:reviewedNaturalPlus,reviewedAllPlus,
          compiled:giftMap,randomDraws:command.randomDraws,
        });
      }
      if(command.kind==='reviewed-nayuta-functurn'&&reviewedNayuta){
        ownKeysExact(command,['randomDraws']);
        return projectOriginalNayutaFuncturn({
          world,reviewed:reviewedNayuta,reviewedAllPlus,
          compiled:giftMap,randomDraws:command.randomDraws,
        });
      }
      if(command.kind==='advance-source-time'&&reviewedB41){
        ownKeysExact(command,['shopId','minutes','randomDraws']);
        return projectB41Sale({world,reviewed:reviewedB41,
          reviewedAllPlus,compiled:giftMap,shopId:command.shopId,
          minutes:command.minutes,randomDraws:command.randomDraws,
          reviewedB59Iron,reviewedB60Happy,reviewedB61Sword,
          reviewedB62Map,reviewedB63Map});
      }
      if(command.kind==='advance-source-time-reviewed-events'&&reviewedB56){
        ownKeysExact(command,['shopId','minutes','saleDraws',
          'eventDraws','eventHashOrderFixture']);
        // Internal only; caller's order is not certified Perl hash iteration.
        return projectB56EventSlice({
          world,reviewed:reviewedB56,reviewedB41,reviewedAllPlus,
          compiled:giftMap,reviewedCatalog:reviewedEventCatalog,
          reviewedCallbacks:reviewedInstantEventCallbacks,
          reviewedSupportCallbacks:reviewedSupportEventCallbacks,
          reviewedLoto,reviewedB59Iron,reviewedB60Happy,
          reviewedB61Sword,reviewedB62Map,reviewedB63Map,
          shopId:command.shopId,minutes:command.minutes,
          saleDraws:command.saleDraws,eventDraws:command.eventDraws,
          eventHashOrderFixture:command.eventHashOrderFixture,
        });
      }
      if(command.kind==='reviewed-instant-event-callback-fixture'&&
         reviewedInstantEventCallbacks){
        ownKeysExact(command,['eventCode','randomDraws']);
        // INTERNAL development/proof action only. Never expose as HTTP
        // gameplay: full source EVENT selection/hash/callback order is absent.
        if(world.schema!==PERIOD_WORLD_SCHEMA||
           world.period?.eventState!==null||
           world.events!==null||world.shops.length!==1)
          bad('event callback fixture requires a v2 source shop after unreviewed EVENT time');
        const effect=projectOriginalInstantEventCallback({
          reviewed:reviewedInstantEventCallbacks,shop:world.shops[0],
          eventCode:command.eventCode,randomDraws:command.randomDraws,
        });
        return {
          shops:[effect.shop],
          receipt:{
            action:'reviewed-instant-event-callback-fixture',
            source:effect.source,eventCode:effect.eventCode,
            returnCode:effect.returnCode,message:effect.message,
            changed:effect.changed,randomDrawsUsed:effect.randomDrawsUsed,
            naturalEventTriggered:false,
            scope:effect.scope,
          },
        };
      }
      if(command.kind==='discard-item'){
        ownKeysExact(command,['shopId','itemId','count']);
        integer(command.shopId,'shopId',1);
        integer(command.itemId,'itemId',1);
        integer(command.count,'count',1);
        const idx=world.shops.findIndex(s=>s.id===command.shopId);
        if(idx<0)bad('unknown shop');
        const shop=world.shops[idx];
        const item=model.items.find(x=>x.id===command.itemId);
        if(shop.status!==1||!item||item.flagRaw.split('|').includes('notrash')||
          !Number.isSafeInteger(shop.item?.[command.itemId-1])||
          shop.item[command.itemId-1]<command.count)
          bad('source discard not permitted or stock insufficient');
        // Source item-detail.cgi permits discard unless the t/notrash flag
        // is present; original player screen specifies NO action-time cost.
        // Do not mutate price, wholesale, money, time or showcase locations.
        const next={...shop,item:[...shop.item]};
        next.item[command.itemId-1]-=command.count;
        const shops=[...world.shops];shops[idx]=next;
        return {shops,receipt:{
          action:'discard-item',shopId:shop.id,
          itemId:command.itemId,discardedCount:command.count,
          stockAfter:next.item[command.itemId-1],
          timeSpentSeconds:0,
          source:'original item-detail discard gate; bounded local no-time discard',
        }};
      }
      if(command.kind==='edit-showcase'){
        ownKeysExact(command,['shopId','shelf','itemId'],
          ['per','priceOverride']);
        integer(command.shopId,'shopId',1);
        integer(command.shelf,'shelf');
        integer(command.itemId,'itemId');
        const idx=world.shops.findIndex(s=>s.id===command.shopId);
        if(idx<0)bad('unknown shop');
        const before=world.shops[idx];
        const edited=editShowcase(model,before,{
          now:world.nowSeconds,shelf:command.shelf,
          itemId:command.itemId,per:command.per,
          priceOverride:command.priceOverride,
        });
        const shops=[...world.shops];
        shops[idx]=edited;
        return {
          shops,
          receipt:{
            action:'edit-showcase',shopId:edited.id,
            shelf:command.shelf,displayedItemId:edited.showcase[command.shelf],
            unitPrice:edited.price[command.shelf],
            timeAfterSeconds:edited.time,
            source:'fixed Core sc-s.cgi + reviewed Standard Street item projection',
          },
        };
      }
      bad('unreviewed Standard Street action '+command.kind);
    },
  });
  return enableReviewedNormalTime?attachR4ReviewedTimeController({street:base,sources:r4Sources,reviewedDataRead:ordinaryEventReview,enableReviewedCrossPeriod,enableReviewedFullCommerce}):base;
}

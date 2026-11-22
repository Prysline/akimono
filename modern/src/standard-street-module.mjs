/**
 * B-31 Standard Street MODULE, not shared GameCore rules.
 * Recognized, source-backed subset only:
 * - original Core new.cgi plus reviewed Standard Street FUNCNEW declarations
 * - original Core sc-s.cgi editShowcase behavior from B-01..B-30 models
 *
 * No market lifecycle, sales, Perl callbacks, DSL evaluation, auth, money
 * transfer, persistence, default prices for opaque DSL fields, or CGI.
 */
import {parseDsl} from './parse-dsl.mjs';
import {compileReviewedGiftMapUse,projectReviewedGiftMapUse}
  from './reviewed-gift-map-use.mjs';
import {reviewOriginalSparseWorldBootstrap,createOriginalSparseMarket,
  validateSourceSparseMarket}
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
import {reviewOriginalMarketBuy10,quoteOriginalMarket10,projectOriginalMarketBuy10}
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
import {reviewOriginalMarketBuy11,quoteOriginalMarket11,projectOriginalMarketBuy11}
  from './original-market-buy11.mjs';
import {reviewOriginalLotoStartfunc}
  from './original-b58-loto-startfunc.mjs';
import {reviewOriginalB59IronEvent}
  from './original-b59-iron-event-lifecycle.mjs';
import {reviewOriginalB60HappyEvent}
  from './original-b60-happy-event-nowfunc.mjs';
import {reviewOriginalB61SwordDemand}
  from './original-b61-sword-demand-event.mjs';
import {reviewOriginalB62SwordMap,quoteOriginalMarket14,
  projectOriginalMarketBuy14,projectOriginalSwordMapUse}
  from './original-b62-sword-map-acquisition.mjs';
import {reviewOriginalB63SwordMapOutcomes,projectOriginalSwordMapAllOutcomes}
  from './original-b63-sword-map-all-outcomes.mjs';
import {PERIOD_WORLD_SCHEMA}
  from './game-core-contract.mjs';
import {
  loadStandardStreetModel,
  createStandardStreetShop,
  editShowcase,
} from './standard-street-model.mjs';

export const STANDARD_STREET_ID='standard-street';
const actions=Object.freeze(['open-shop','edit-showcase','gift-exchange-maps']);
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
    items:Object.freeze(model.items.map(x=>Object.freeze({
      id:x.id,name:x.name,code:x.code,
      priceRaw:x.priceRaw,limitRaw:x.limitRaw,flagRaw:x.flagRaw,
      source:x.source,line:x.line,
      runtimeSupported:false,
    }))),
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
}){
  if(typeof itemDsl!=='string'||typeof rebelDsl!=='string')
    bad('original DSL source text');
  const model=loadStandardStreetModel(itemDsl,rebelDsl);
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
  // R2-A shared purchase formula in GameCore. R2-B still needs the item
  // registry and R2-C must remove the legacy buy-market-item-* paths.
  const sharedBuyRules=Object.freeze([
    reviewedMarketBuy10?{
      itemId:10,shopIndex:9,wholesaleIndex:9,
      unitPrice:reviewedMarketBuy10.unitPrice,
      stockLimit:reviewedMarketBuy10.stockLimit,
      marketTimeSeconds:reviewedMarketBuy10.marketTimeSeconds,
      source:reviewedMarketBuy10.source,scope:reviewedMarketBuy10.scope,
      buyCallback:null,
    }:null,
    reviewedMarketBuy11?{
      itemId:11,shopIndex:10,wholesaleIndex:10,
      unitPrice:reviewedMarketBuy11.unitPrice,
      stockLimit:reviewedMarketBuy11.stockLimit,
      marketTimeSeconds:reviewedMarketBuy11.marketTimeSeconds,
      source:reviewedMarketBuy11.source,scope:reviewedMarketBuy11.scope,
      buyCallback:null,
    }:null,
    reviewedB62Map?{
      itemId:14,shopIndex:13,wholesaleIndex:13,
      unitPrice:reviewedB62Map.mapPrice,
      stockLimit:reviewedB62Map.mapStockLimit,
      marketTimeSeconds:reviewedB62Map.mapBuyTimeSeconds,
      source:reviewedB62Map.source,scope:reviewedB62Map.scope,
      buyCallback:null,
    }:null,
  ].filter(Boolean).map(rule=>Object.freeze(rule)));
  const marketBuy=Object.freeze({
    globalBuyCallback:reviewedGlobalBuyCallback,
    order:Object.freeze(model.items.map(item=>Object.freeze({
      itemId:item.id,wholesaleIndex:item.id-1,
    }))),
    getRule(itemId){
      const rule=sharedBuyRules.find(row=>row.itemId===itemId);
      // Do not infer missing callback support from an arbitrary DSL item.
      if(rule&&model.items.find(row=>row.id===itemId)?.funcbRaw!==null)
        bad('original market item callback has not been reviewed');
      return rule??null;
    },
    validateWorld(world){
      return world?.events===null&&world.shops?.length===1&&
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
    // Global voucher on this three-item slice is a proven no-op (<500000 G).
    // If a future item crosses that threshold, GameCore rejects unless its
    // reviewed callback handler is provided. No original Perl is evaluated.
  });
  const reviewedB41=reviewedMarketBuy10&&reviewedNaturalPlus?
    reviewB41Sale({reviewedNatural:reviewedNaturalPlus,
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
  return Object.freeze({
    id:STANDARD_STREET_ID,
    capabilities:Object.freeze([...actions,
      ...(reviewedBootstrap?['initialize-source-market']:[]),
      ...(reviewedSparsePlus?['reviewed-sparse-plus']:[]),
      ...(reviewedMultiPlus?['reviewed-sparse-multi-plus']:[]),
      ...(reviewedAllPlus?['reviewed-sparse-all-plus']:[]),
      ...(reviewedNaturalPlus?['reviewed-natural-sale-plus']:[]),
      ...(reviewedNayuta?['reviewed-nayuta-functurn']:[]),
      ...(reviewedMarketBuy10?['market-buy','buy-market-item-10']:[]),
      ...(reviewedMarketBuy11?['buy-market-item-11']:[]),
      ...(reviewedB62Map?['buy-market-item-14',
        'use-original-sword-map-14']:[]),
      ...(reviewedB63Map?['use-original-sword-map-14-all-outcomes']:[]),
      ...(reviewedB41?['advance-source-time']:[]),
      ...(reviewedB56?['advance-source-time-reviewed-events']:[]),
      ...(reviewedInstantEventCallbacks?[
        'reviewed-instant-event-callback-fixture']:[]),
    ]),
    metadata,
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
    reviewedInstantEventCallbacks,
    reviewedSupportEventCallbacks,
    reviewedLoto,
    reviewedB59Iron,
    reviewedB60Happy,
    reviewedB61Sword,
    reviewedB62Map,
    reviewedB63Map,
    reviewedB56,
    marketBuy:reviewedMarketBuy10?marketBuy:null,
    quoteMarketItem10(world){
      return quoteOriginalMarket10({world,model,reviewed:reviewedMarketBuy10});
    },
    quoteMarketItem11(world){
      return quoteOriginalMarket11({world,model,reviewed:reviewedMarketBuy11});
    },
    quoteMarketItem14(world){
      return quoteOriginalMarket14({world,model,reviewed:reviewedB62Map});
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
      if(command.kind==='buy-market-item-10'&&reviewedMarketBuy10){
        ownKeysExact(command,['shopId','requestedCount','marketShelf','expectedPrice']);
        return projectOriginalMarketBuy10({
          world,model,reviewed:reviewedMarketBuy10,
          shopId:command.shopId,requestedCount:command.requestedCount,
          marketShelf:command.marketShelf,expectedPrice:command.expectedPrice,
        });
      }
      if(command.kind==='buy-market-item-11'&&reviewedMarketBuy11){
        ownKeysExact(command,['shopId','requestedCount','marketShelf','expectedPrice']);
        // SOURCE-REVIEWED INTERNAL acquisition of ITEM #11, not HTTP/UI.
        return projectOriginalMarketBuy11({
          world,model,reviewed:reviewedMarketBuy11,
          shopId:command.shopId,requestedCount:command.requestedCount,
          marketShelf:command.marketShelf,expectedPrice:command.expectedPrice,
        });
      }
      if(command.kind==='buy-market-item-14'&&reviewedB62Map){
        ownKeysExact(command,['shopId','requestedCount','marketShelf','expectedPrice']);
        return projectOriginalMarketBuy14({
          world,model,reviewed:reviewedB62Map,
          shopId:command.shopId,requestedCount:command.requestedCount,
          marketShelf:command.marketShelf,expectedPrice:command.expectedPrice,
        });
      }
      if(command.kind==='use-original-sword-map-14'&&reviewedB62Map){
        ownKeysExact(command,['shopId','randomDraws']);
        return projectOriginalSwordMapUse({
          world,reviewed:reviewedB62Map,
          shopId:command.shopId,randomDraws:command.randomDraws,
        });
      }
      if(command.kind==='use-original-sword-map-14-all-outcomes'&&reviewedB63Map){
        ownKeysExact(command,['shopId','randomDraws']);
        return projectOriginalSwordMapAllOutcomes({
          world,reviewed:reviewedB63Map,reviewedB62Map,
          shopId:command.shopId,randomDraws:command.randomDraws,
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
      if(command.kind==='gift-exchange-maps'){
        ownKeysExact(command,['shopId','requestedCount']);
        const result=projectReviewedGiftMapUse({
          world,shopId:command.shopId,
          requestedCount:command.requestedCount,compiled:giftMap,
        });
        return result;
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
}

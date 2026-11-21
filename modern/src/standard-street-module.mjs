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
import {reviewOriginalSparseWorldBootstrap,createOriginalSparseMarket}
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
      ...(reviewedMarketBuy10?['buy-market-item-10']:[]),
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
    quoteMarketItem10(world){
      return quoteOriginalMarket10({world,model,reviewed:reviewedMarketBuy10});
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

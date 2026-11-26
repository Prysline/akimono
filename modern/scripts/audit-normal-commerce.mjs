/** Read-only inventory of source declarations versus installed reviewed rules.
 * This is not acquisition, HTTP, CAS, or persistence acceptance.
 * Run: node modern/scripts/audit-normal-commerce.mjs
 */
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseDsl,validateStandardStreet} from '../src/parse-dsl.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {loadStandardStreetModel} from '../src/standard-street-model.mjs';
import {compileStandardStreetMarketBuyRegistry} from '../src/standard-street-market-buy-registry.mjs';
import {reviewNormalCommerceItems,validateNormalCommerceInventory} from '../src/reviewed-normal-commerce-items.mjs';
import {reviewOriginalTopPrize} from '../src/original-period-top-prize.mjs';
import {validateP3Inventory} from '../src/original-b41-playable-sale.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const locations=[
 ['itemDsl','custom/inc-item-data.cgi'],
 ['rebelDsl','custom/inc-rebel-data.cgi'],
 ['originalAdminInitSource','modern/tests/original-perl/core-inc-admin-func.cgi'],
 ['originalDataReadSource','modern/tests/original-perl/inc-func.cgi'],
 ['originalDataWriteSource','modern/tests/original-perl/write.cgi'],
 ['originalTurnSource','modern/tests/original-perl/inc-turn.cgi'],
 ['originalWholeSource','modern/tests/original-perl/whole.cgi'],
 ['originalConfigSource','_config.cgi'],
 ['originalCompilerSource','modern/tests/original-perl/inc-makeitem.cgi'],
 ['originalBuySource','modern/tests/original-perl/buy-s.cgi'],
 ['originalBuyItemSource','modern/tests/original-perl/item.cgi'],
 ['originalBuyCalcSource','modern/tests/original-perl/calc.cgi'],
 ['originalMarketSource','modern/tests/original-perl/market.cgi'],
 ['originalItemSource','modern/tests/original-perl/item.cgi'],
 ['originalDetailSource','modern/tests/original-perl/core-detail.cgi'],
 ['originalPeriodSource','modern/tests/original-perl/period.cgi'],
 ['originalUseSource','modern/tests/original-perl/use.cgi'],
 ['originalItemHelperSource','modern/tests/original-perl/core-inc-item.cgi'],
 ['originalShowcaseSource','modern/tests/original-perl/sc-s.cgi'],
];
const one=(b,k)=>b.fields[k]?.[0]?.value??null;
const fields=b=>Object.fromEntries(Object.entries(b.fields).map(([k,v])=>[k,v.map(x=>x.value)]));
const source=b=>({file:b.file,line:b.startLine});
function shapeProbe(street,id,kind){
  const shop={item:Array(79).fill(0),showcasecount:1,job:'',exp:{}};
  if(kind==='hold')shop.item[id-1]=1;
  else shop.exp[id]=1;
  try {validateP3Inventory(shop,street.reviewedGiftMapUse,street.reviewedB41);return true;}
  catch(e){if(!(e instanceof RangeError))throw e;return false;}
}
export async function auditNormalCommerce(){
  const input=Object.fromEntries(await Promise.all(locations.map(
    async ([key,p])=>[key,await readFile(path.join(root,p),'utf8')])));
  const parsed=[parseDsl(input.itemDsl,locations[0][1]),parseDsl(input.rebelDsl,locations[1][1])];
  const audit=validateStandardStreet(parsed);
  if(!audit.ok)throw new Error('source declaration audit failed');
  const blocks=parsed.flatMap(p=>p.blocks);
  const street=createStandardStreetModule(input);
  const numeric=JSON.parse(execFileSync('perl',['original-normal-commerce-item-compiler.pl'],{
    cwd:path.join(root,'modern/tests/original-perl'),encoding:'utf8',
  }));
  if(numeric.length!==79||numeric.some((r,i)=>r.id!==i+1||
    ['price','popular','point','cost'].some(k=>!Number.isSafeInteger(r[k])||r[k]<0)))
    throw new Error('incomplete original ITEM compiler output');
  if(!street.reviewedB41?.p3TurnItems||!street.marketBuyRegistry||!street.useItem)
    throw new Error('reviewed commerce registries unavailable');
  const turn=street.reviewedB41.p3TurnItems;
  const model=loadStandardStreetModel(input.itemDsl,input.rebelDsl);
  const full=reviewNormalCommerceItems({itemDsl:input.itemDsl,compilerSource:input.originalCompilerSource,showcaseSource:input.originalShowcaseSource,turnSource:input.originalTurnSource});
  const fullMarket=compileStandardStreetMarketBuyRegistry({itemDsl:input.itemDsl,rebelDsl:input.rebelDsl,model,compiled:street.reviewedGiftMapUse,compilerSource:input.originalCompilerSource,buySource:input.originalBuySource,wholeSource:input.originalWholeSource,itemSource:input.originalBuyItemSource,globalBuyCallback:street.marketBuy.globalBuyCallback,includeReviewedShowcaseTool:true});
  const prizes=reviewOriginalTopPrize({itemDsl:input.itemDsl,model,originalAddItemSource:input.originalUseSource,periodSource:input.originalPeriodSource,includeReviewedMultiShelf:true});
  const producerRules=[];
  for(const item of model.items){
    const uses=blocks.filter(u=>u.kind==='USE'&&u.file===item.source&&u.ownerItemLine===item.line);
    for(let useId=0;useId<uses.length;useId++){
      const rule=street.useItem.getRule(item.id,useId);
      if(!rule)continue;
      const outputs=(rule.creates??[]).filter(o=>o.countPerUse>0&&o.probabilityPermille>0).map(o=>({itemId:o.itemId,count:o.countPerUse,probabilityPermille:o.probabilityPermille}));
      if(rule.inlineCallback?.kind==='milk-cow')outputs.push({itemId:26,sourceCallback:'milk-cow'});
      if(!outputs.length)continue;
      producerRules.push({itemId:item.id,useId,source:source(uses[useId]),outputs,
        requires:[...new Set([...(rule.requiresOwnedItem?[item.id]:[]),...(rule.uses??[]).map(o=>o.itemId)])],
        money:rule.money,needJob:rule.needJob??'',needPoint:rule.needPoint??0,needExperience:rule.needExperience??0,needPopularity:rule.needPopularity??0});
    }
  }
  const routes=id=>[
    ...model.grants.filter(g=>g.id===id).map(g=>({kind:'source-open-shop',count:g.count})),
    ...prizes.topChoices.filter(p=>p.itemId===id).map(p=>({kind:'source-rank-one-prize',index:p.index,count:p.count})),
    ...(id===79?[{kind:'source-global-FUNCBUY',minTotal:street.marketBuy.globalBuyCallback.minTotal}]:[]),
    ...(fullMarket.getRule(id)&&street.reviewedAllPlus.plusSeconds[id-1]>0?[{kind:'source-wholesale-plus',seconds:street.reviewedAllPlus.plusSeconds[id-1]}]:[]),
    ...producerRules.filter(p=>p.outputs.some(o=>o.itemId===id)).map(p=>({kind:'registered-use-output',itemId:p.itemId,useId:p.useId,requires:p.requires,outputs:p.outputs.filter(o=>o.itemId===id),money:p.money,needJob:p.needJob,needPoint:p.needPoint,needExperience:p.needExperience,needPopularity:p.needPopularity,source:p.source})),
  ];
  const potential=new Set(model.items.filter(i=>routes(i.id).some(r=>['source-open-shop','source-rank-one-prize','source-wholesale-plus'].includes(r.kind))).map(i=>i.id));
  for(let changed=true;changed;){changed=false;for(const p of producerRules)if(p.requires.every(id=>potential.has(id)))for(const o of p.outputs)if(!potential.has(o.itemId)){potential.add(o.itemId);changed=true;}}
  const fullShape=(id,kind)=>{
    const shop={item:Array(79).fill(0),showcasecount:1,showcase:[0],price:[0],job:'',exp:{}};
    if(kind==='hold')shop.item[id-1]=1;else shop.exp[id]=1;
    try{validateNormalCommerceInventory(shop,street.reviewedGiftMapUse,full);return true;}catch(e){if(!(e instanceof RangeError))throw e;return false;}
  };
  const items=blocks.filter(b=>b.kind==='ITEM').map(b=>{
    const id=Number(one(b,'no')), original=numeric[id-1];
    const flags=(one(b,'flag')??'').split('|').filter(Boolean);
    const sale=turn.rules[id]??null;
    const ownedUses=blocks.filter(u=>u.kind==='USE'&&u.file===b.file&&u.ownerItemLine===b.startLine);
    return {
      id,name:one(b,'name'),code:one(b,'code'),source:source(b),
      declaration:fields(b),compiledPricePopPointCost:original,
      // Positive compiled POP is not proof of an accessible showcase route.
      positivePop:original.popular>0,sourceNoShowcase:flags.includes('noshowcase'),
      marketBuyRule:street.marketBuyRegistry.getRule(id)!==null,
      fullCommerce:{marketBuyRule:fullMarket.getRule(id)!==null,holdingShape:fullShape(id,'hold'),experienceShape:fullShape(id,'exp'),
        upkeep:full.upkeepCosts[id],saleRule:full.saleRules[id]??null,sourceRoutes:routes(id),staticDependencyReachable:potential.has(id)},
      // These calls only probe the inventory guard, not a real transaction.
      timeHoldingShapeAccepted:shapeProbe(street,id,'hold'),
      timeExperienceShapeAccepted:shapeProbe(street,id,'exp'),
      timeUpkeepRule:turn.costs[id]??null,
      timeSaleRule:sale?{price:sale.unitPrice,popular:sale.popularSeconds,point:sale.point,cost:sale.cost}:null,
      uses:ownedUses.map((u,useId)=>({
        useId,source:source(u),declaration:fields(u),
        registryRule:street.useItem.getRule(id,useId)!==null,
      })),
      // Explicitly do not infer any of these from declaration or registry.
      lawfulAcquisition:'requires route evidence',
      lawfulShowcase:'requires original edit and player route evidence',
      eventCrossPeriodCasSaveReplayRestart:'requires scenario evidence',
    };
  }).sort((a,b)=>a.id-b.id);
  const events=blocks.filter(b=>b.kind==='EVENT').map(b=>({
    compiled:street.reviewedEventCatalog.declared.find(e=>e.code===one(b,'code'))?.compiled??null,
    code:one(b,'code'),source:source(b),declaration:fields(b),
    runtimeAndPlayerEvidence:'requires separate lifecycle and replay audit',
  }));
  const globalCallbacks=blocks.filter(b=>b.kind.startsWith('FUNC')).map(b=>({
    kind:b.kind,source:source(b),
  }));
  return {scope:'source declaration, original numeric compiler and reviewed registry/shape inspection only',
    counts:audit.actual,
    summary:{
      explicitPositivePop:items.filter(x=>x.positivePop&&x.declaration.pop!==undefined).length,
      positivePop:items.filter(x=>x.positivePop).length,
      timeSaleRules:items.filter(x=>x.timeSaleRule!==null).length,
      positivePopMissingTimeSale:items.filter(x=>x.positivePop&&!x.timeSaleRule).map(x=>x.id),
      positivePopWithoutExplicitPop:items.filter(x=>x.positivePop&&x.declaration.pop===undefined).map(x=>x.id),
      positivePopNoShowcase:items.filter(x=>x.positivePop&&x.sourceNoShowcase).map(x=>x.id),
      holdingShapeRejected:items.filter(x=>!x.timeHoldingShapeAccepted).map(x=>x.id),
      experienceShapeAccepted:items.filter(x=>x.timeExperienceShapeAccepted).map(x=>x.id),
      registeredUses:items.flatMap(x=>x.uses).filter(x=>x.registryRule).length,
      fullCommerceSaleRules:items.filter(x=>x.fullCommerce.saleRule!==null).length,
      fullCommerceHoldingRejected:items.filter(x=>!x.fullCommerce.holdingShape).map(x=>x.id),
      fullCommerceExpRejected:items.filter(x=>!x.fullCommerce.experienceShape).map(x=>x.id),
      fullCommerceStaticDependencyMissing:items.filter(x=>!x.fullCommerce.staticDependencyReachable).map(x=>x.id),
      unregisteredUses:items.flatMap(x=>x.uses.filter(u=>!u.registryRule).map(u=>({itemId:x.id,useId:u.useId,source:u.source}))),
      sourceRouteCaveat:'Static material closure ignores available time, money, career, EXP, point gates, exact RNG and external authorization; never proof of player acquisition.',
    },items,events,globalCallbacks};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  console.log(JSON.stringify(await auditNormalCommerce(),null,2));
}

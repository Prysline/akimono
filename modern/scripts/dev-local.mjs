/**
 * B-43 local-only browser adapter. No public server or authentication.
 * All authoritative changes pass GameCore -> StreetModule -> WorldState CAS.
 * Only complete reviewed normal time is admitted; no PLUS-only supply.
 */
import {originalSourceUseClock} from '../src/shared-use-experience.mjs';
import {projectOriginalUseTransaction}
  from '../src/original-use-transaction-model.mjs';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {sourceCommandDraws}
  from '../src/local-source-command-draws.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createLocalWorldSaveStore} from '../src/local-world-save-store.mjs';
import {isReviewedOrdinaryCommand} from '../src/reviewed-ordinary-command-policy.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed}
  from '../src/original-period-world-seed.mjs';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
import {reviewOriginalLibrary,describeOriginalLibrary} from '../src/original-library-view.mjs';
import {reviewOriginalSettlementMenu,describeOriginalSettlementMenu,reviewOriginalOwnerClock,describeOriginalOwnerClock} from '../src/original-r4-settlement-menu.mjs';
import {createPeriodMemoryWorld,createSourceReviewedMemoryWorldAdapter,
  applyGameCommand,executeMemoryCommand,encodeMemorySnapshot} from '../src/game-core-contract.mjs';

import {beginReviewedWorldHistory,appendReviewedWorldHistory,verifyReviewedWorldHistory} from '../src/reviewed-world-time-history.mjs';
import {createReviewedHistoryCheckpointStore,fingerprintReviewedCheckpointRuntime} from '../src/reviewed-history-checkpoint-store.mjs';
import {createIndependentPeriodDiskStore} from '../src/r4-independent-period-disk-store.mjs';
import {checkRuntimeEnvironment} from '../src/runtime-environment.mjs';
// Same v2 authority in both reviewed modes; crossing must be explicitly enabled with a new save directory.
const reviewedCrossPeriod=process.env.AKIMONO_REVIEWED_CROSS_PERIOD==='1';
// Temporary D integration gate, not full commerce or an alternate save authority.
const reviewedMarketCommerce=process.env.AKIMONO_REVIEWED_MARKET_COMMERCE==='1';
if(reviewedMarketCommerce&&(!reviewedCrossPeriod||!process.env.AKIMONO_SAVE_DIR))throw Error('reviewed market commerce requires crossing and explicit save directory');
if(process.env.AKIMONO_E2E_DETERMINISTIC_RNG==='1'||process.env.AKIMONO_R2_TARGET_AD_MEMORY_ONLY==='1'||process.env.AKIMONO_REVIEWED_NORMAL_TIME==='0')
  throw Error('唯一新版玩家存檔不支援舊模式、fixture RNG 或多店稽核');
// Fail before opening a save store, generating a key or listening on HTTP.
const runtimeEnvironment=checkRuntimeEnvironment();
const exactKeys=(obj,keys)=>{
  const names=Object.keys(obj),expected=keys===''?[]:keys.split(',');
  return names.length===expected.length&&expected.every(k=>Object.hasOwn(obj,k));
};
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=rel=>readFile(path.join(root,rel),'utf8');
// Windows Git checkouts can use CRLF while the frozen source review markers
// refer to the original LF Git blobs. Normalize only source inputs in memory.
const readPinnedSource=async rel=>normalizeLocalSourceText(await read(rel));
const reviewedLibrary=reviewOriginalLibrary(await readPinnedSource('custom/library.cgi'));
const [
  itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,
  originalConfigSource,originalCompilerSource,originalBuySource,
  originalBuyItemSource,originalBuyCalcSource,
  originalMarketSource,originalItemSource,originalDetailSource,
  originalPeriodSource,originalUseSource,originalItemHelperSource,
  originalNewSource,originalCustomSource,originalLogSource,originalShowcaseSource,
  coreLocaleSource,localLocaleSource,localeLoaderSource,originalBuyFormSource,originalMarketListSource,originalMarketPageSource,
]=await Promise.all([
  'custom/inc-item-data.cgi','custom/inc-rebel-data.cgi',
  'modern/tests/original-perl/core-inc-admin-func.cgi',
  'modern/tests/original-perl/inc-func.cgi',
  'modern/tests/original-perl/write.cgi',
  'modern/tests/original-perl/inc-turn.cgi',
  'modern/tests/original-perl/whole.cgi','_config.cgi',
  'modern/tests/original-perl/inc-makeitem.cgi',
  'modern/tests/original-perl/buy-s.cgi',
  'modern/tests/original-perl/item.cgi',
  'modern/tests/original-perl/calc.cgi',
  'modern/tests/original-perl/market.cgi',
  'modern/tests/original-perl/item.cgi',
  'modern/tests/original-perl/core-detail.cgi',
  'modern/tests/original-perl/period.cgi',
  'modern/tests/original-perl/use.cgi',
  'modern/tests/original-perl/core-inc-item.cgi',
  'modern/tests/original-perl/new.cgi','modern/tests/original-perl/pinned-custom.cgi','modern/tests/original-perl/pinned-log.cgi','modern/tests/original-perl/sc-s.cgi',
  'modern/tests/original-perl/pinned-core-zh_TW.po','locale/zh_TW.po','custom/inc-locale.cgi','modern/tests/original-perl/core-buy-view.cgi','modern/tests/original-perl/core-shop-m.cgi','modern/tests/original-perl/core-page.cgi',
].map(readPinnedSource));

const reviewedSettlementMenu=reviewOriginalSettlementMenu({menuSource:await readPinnedSource('custom/inc-menu.cgi'),configSource:originalConfigSource,readSource:originalDataReadSource,timeSource:await readPinnedSource('modern/tests/original-perl/pinned-time.cgi')});
const reviewedOwnerClock=reviewOriginalOwnerClock({reviewed:reviewedSettlementMenu,incMainSource:await readPinnedSource('modern/tests/original-perl/core-inc-main.cgi'),infoSource:await readPinnedSource('modern/tests/original-perl/core-inc-info.cgi')});
const streetModule=createStandardStreetModule({
  itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,
  originalConfigSource,originalCompilerSource,
  originalBuySource,originalBuyItemSource,originalBuyCalcSource,
  originalMarketSource,originalItemSource,originalDetailSource,
  originalUseSource,originalItemHelperSource,
  originalPeriodSource,originalNewSource,originalCustomSource,originalLogSource,originalShowcaseSource,
  coreLocaleSource,localLocaleSource,localeLoaderSource,originalBuyFormSource,originalMarketListSource,originalMarketPageSource,
  enableReviewedNormalTime:true,enableReviewedCrossPeriod:reviewedCrossPeriod,enableReviewedMarketCommerce:reviewedMarketCommerce,
  expectedNativeInterpreter:runtimeEnvironment.interpreter,
});
if(!['initialize-source-market','open-shop',
  'market-buy','use-item','edit-showcase','advance-reviewed-world-time']
  .every(c=>streetModule.capabilities.includes(c)))
  throw Error('R2-E runtime source-review capabilities missing');
if(!streetModule.reviewedB63Map)
  throw Error('R2-E requires reviewed full original first-use map callbacks');
if(streetModule.reviewedEventCatalog?.declaredCount!==25||
   streetModule.reviewedEventCatalog.compiledCount!==17||
   streetModule.reviewedEventCatalog.runtimeSupported!==false)
  throw Error('B-53 compiled EVENT metadata source review is missing');
const reviewedPeriodSeed=reviewOriginalPeriodBootstrap({
  periodSource:originalPeriodSource,
  adminSource:originalAdminInitSource,
  readSource:originalDataReadSource,
  writeSource:originalDataWriteSource,
  reviewedB41:streetModule.reviewedB41,
});

function createInitialWorld({worldId,nowSeconds}){
  return createPeriodMemoryWorld({worldId,streetId:streetModule.id,nowSeconds,
    period:createOriginalPeriodSeed(reviewedPeriodSeed)});
}
// The player never supplies this history or RNG; only committed local commands
// are recorded. Unsupported actions are rejected before CAS.
let repo=null,careerProof=null,liveGeneration=0;
function verifyOrdinaryDraws(world,command){
  if(command.kind==='use-item'){
    const expected=sampleSourceUse(world,command);
    return expected.length?JSON.stringify(expected)===JSON.stringify(command.randomDraws):!Object.hasOwn(command,'randomDraws');
  }
  return !Object.hasOwn(command,'randomDraws');
}
// Single source-history player runtime. Old development records are not migrated.
const isOrdinaryCommand=command=>isReviewedOrdinaryCommand(command,streetModule);
const historyPolicy={streetModule,createInitialWorld,isOrdinaryCommand,verifyOrdinaryDraws};
const saveDirectory=process.env.AKIMONO_SAVE_DIR??path.join(root,'modern/.local-data');
const checkpointRuntime=fingerprintReviewedCheckpointRuntime({
    sourceDirectory:path.join(root,'modern/src'),entrypoint:fileURLToPath(import.meta.url),
    sources:[itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,originalDataWriteSource,
      originalTurnSource,originalWholeSource,originalConfigSource,originalCompilerSource,originalBuySource,
      originalBuyItemSource,originalBuyCalcSource,originalMarketSource,originalItemSource,originalDetailSource,
      originalPeriodSource,originalUseSource,originalItemHelperSource,originalNewSource,originalCustomSource,originalLogSource,
       ...(reviewedMarketCommerce?['D9-reviewed-market-commerce.v1',originalShowcaseSource,coreLocaleSource,localLocaleSource,localeLoaderSource,originalBuyFormSource,originalMarketListSource,originalMarketPageSource]:[])],
});
if(checkpointRuntime.interpreter!==runtimeEnvironment.interpreter)
  throw Error('AKIMONO_PERL_FINGERPRINT: native interpreter changed during startup');
const checkpointStore=createReviewedHistoryCheckpointStore({
  directory:saveDirectory,crossPeriod:reviewedCrossPeriod,...checkpointRuntime,
});
const periodDiskStore=reviewedCrossPeriod?createIndependentPeriodDiskStore({directory:saveDirectory}):null;
const saveStore=createLocalWorldSaveStore({
  directory:saveDirectory,
  historyReplay:{checkpointStore,periodDiskStore,
    verify:({world,proof,generation})=>verifyReviewedWorldHistory({world,proof,generation,checkpointStore,...historyPolicy})},
});
const port=Number(process.env.AKIMONO_PORT??'4173');
if(!Number.isSafeInteger(port)||port<0||port>65535)throw Error('invalid port');
const send=(res,status,obj)=>{
  res.writeHead(status,{'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(JSON.stringify(obj));
};
// Read-only original GetDTPoint projection: frozen Core inc-func.cgi.
// Uninitialized Perl shop fields count as zero; invalid fields never become a
// guessed score. This is NOT a leaderboard/RANK implementation.
function sourceShopPoint(shop){
  if(!shop)return null;
  const keys=['rank','profitstock','saletoday','taxtoday','paytoday',
    'rankingcount'];
  const values=keys.map(key=>shop[key]??0);
  if(values.some(value=>!Number.isSafeInteger(value)))return null;
  const [rank,profitstock,sales,tax,paid,wins]=values;
  // Profit and adjustments may be signed; Perl GetDTPoint accepts losses.
  if(rank<0||wins<0)return null;
  let profit=(profitstock*3+sales-tax-paid)/500000+1;
  const winFactor=0.5+5/(wins+10);
  if(profit>10)profit=15-50/profit;
  if(profit<1)profit=1/(2-profit);
  const point=Math.trunc(rank*winFactor*profit);
  return Number.isSafeInteger(point)?point:null;
}
function state(){
  const world=repo?.read()??null;
  const save=saveStore.status();
  const period=streetModule.reviewedB41.periodSeconds;
  const shift=streetModule.reviewedB41.clockShiftSeconds;
  const nextSettlementAtSeconds=world?
    (Math.floor((world.nowSeconds+shift)/period)+1)*period-shift:null;
  const marketOffers=world?.market?streetModule.listMarketOffers(world):[];
  return {
    world,
    save,
    nextSettlementAtSeconds,
    secondsUntilSettlement:world?nextSettlementAtSeconds-world.nowSeconds:null,
    settlementMenu:world&&reviewedCrossPeriod?describeOriginalSettlementMenu({reviewed:reviewedSettlementMenu,lasttime:world.nowSeconds,nextSettlementAtSeconds}):null,
    ownerClock:reviewedMarketCommerce?describeOriginalOwnerClock({reviewed:reviewedOwnerClock,world}):null,
    shop:world?.shops[0]??null,
    // Original point calculation; RANK is unknown until true multi-shop
    // SortDT is available. Do not label the rank field as point or RANK.
    shopSummary:{
      point:sourceShopPoint(world?.shops?.[0]??null),
      rankPosition:null,
    },
    marketOffers,
    marketPageRows:streetModule.marketPageRows??null,
    // Product names for owned inventory must not disappear when source
    // wholesale stock is sold out; catalog is not the market's offers.
    itemCatalog:(streetModule.marketBuyRegistry?.entries??[])
      .map(e=>{
        const item=streetModule.catalog.items.find(i=>i.id===e.itemId);
        return {
          itemId:e.itemId,name:e.itemName,
          basePrice:e.basePrice,stockLimit:e.stockLimit,
          flagRaw:item?.flagRaw??'',
          type:item?.typeRaw??null,
          costRaw:item?.costRaw??null,
          info:item?.infoRaw??null,
        };
      }),
    useOffers:streetModule.listUseOffers(world),
    showcaseEditTimeSeconds:streetModule.showcaseEditTimeSeconds,
    showcaseOffers:Object.values(world?.shops?.[0]?.showcasecount===1?
       streetModule.reviewedB41?.p3TurnItems?.rules??{}:streetModule.reviewedB41?.saleRules??{})
      .map(rule=>{
        const shop=world?.shops?.[0]??null;
        const owned=shop?.item?.[rule.itemId-1]??0;
        return {itemId:rule.itemId,
          name:streetModule.marketBuyRegistry?.describe(rule.itemId)?.itemName??
            '商品 #'+rule.itemId,
          unitPrice:rule.unitPrice,owned,
          canShow:Boolean(shop&&owned>0&&world.nowSeconds>=shop.time),
          source:rule.source};
      }),
    capabilities:['建立來源世界','原版開店',reviewedCrossPeriod?'來源審閱的完整單架跨期時間推進':'來源審閱的完整非跨期時間推進',
      '來源市場實際有貨商品進貨','已審閱 #79／#14 共用 USE／製作',
      '來源 #10／#40～#44 共用展示架；P3 單架製成品可設定售價',
      '原版 #63 擴建/拆卸 USE（1～8 架）','來源物品丟棄（不耗時間）',
      reviewedCrossPeriod?'單架已審閱庫存的跨期時間推進（外部效果仍拒絕）':'單架已審閱庫存的非跨期時間推進（其他狀態仍拒絕）'],
    disabled:[...(reviewedCrossPeriod?['公會／龍族／關店等外部跨期效果']:['跨期決算']),'完整原版所有商品回呼','多人'],
    reviewedCrossPeriod,
    reviewedMarketCommerce,
    reviewedTimeMode:true,
    historyCommands:careerProof?.commands.length??null,
    historyCheckpointRevision:careerProof?.checkpoint?.revision??null,
    memoryOnly:!save.available,
    diskSaveAvailable:true,
    sourceCityState:world?.period?.town??null,
    sourcePeriodMetadata:world?.period?{
      state:world.period.state,dtPeople:world.period.dtPeople,
      settledCount:world.period.settledCount,
      activeEventsKnownEmpty:world.period.eventState!==null&&Object.keys(world.period.eventState).length===0,
    }:null,
    eventDefinitionStatus:{
      declared:streetModule.reviewedEventCatalog.declaredCount,
      compilerIncluded:streetModule.reviewedEventCatalog.compiledCount,
      sourceDisabled:streetModule.reviewedEventCatalog.manuallyDisabledCount,
      runtimeSupported:streetModule.reviewedEventCatalog.runtimeSupported,
    },
  };
}
function commit(command){
  if(!repo) return {ok:false,code:'WORLD_NOT_INITIALIZED',
    details:{reason:'請先初始化來源世界'}};
  {
    const before=repo.read();
    const preview=applyGameCommand({world:before,streetModule,command});
    if(!preview.ok)return preview;
    let nextProof;
    try{
      nextProof=appendReviewedWorldHistory({proof:careerProof,before,command,result:preview,isOrdinaryCommand,verifyOrdinaryDraws,
        continuation:{...historyPolicy,checkpointStore,generation:liveGeneration}});
      saveStore.preflight(preview.world,{expectedGeneration:liveGeneration,careerProof:nextProof});
    }catch(error){return {ok:false,code:'HISTORY_REJECTED',details:{reason:error.message}};}
    const result=executeMemoryCommand({repository:repo,streetModule,command});
    if(result.ok){
      if(encodeMemorySnapshot(result.world)!==encodeMemorySnapshot(preview.world))throw Error('reviewed CAS replay mismatch');
      careerProof=nextProof;
    }
    return result;
  }
}
async function jsonBody(req){
  let text='';
  for await(const chunk of req){
    text+=chunk;
    if(text.length>4096)throw Error('請求內容超過 4 KB');
  }
  const payload=JSON.parse(text||'{}');
  if(payload===null||Array.isArray(payload)||typeof payload!=='object')
    throw Error('請傳送 JSON 物件');
  return payload;
}
function commandNumber(value,key,min=0){
  if(!Number.isSafeInteger(value)||value<min)
    throw Error(key+' 必須為不小於 '+min+' 的安全整數');
  return value;
}
function ensureRevision(payload){
  return commandNumber(payload.expectedRevision,'expectedRevision');
}
// HTTP NEVER accepts randomDraws from a player. These source-reviewed
// samples are server-owned and command/revision-scoped; fixture RNG is rejected.
function sampleSourceUse(world,{itemId,useId,requestedCount}){
  const rule=streetModule.useItem.getRule(itemId,useId);
  if(!rule)return [];
  if(!rule.beforeCallback){
    // Rules without a pre-callback use the bounded original preflight to
    // sample MakeAmount, plus one more draw for a reviewed lostbook callback.
    // A dry-run with 0.5 samples changes no WorldState; all source random
    // branches consume a fixed count from the effective material quantities.
    const shopIndex=world.shops.findIndex(row=>row.id===1);
    if(shopIndex<0)throw Error('USE 需要已開設的店舖');
    const shop=world.shops[shopIndex];
    const exp=shop.exp?.[String(itemId)]??0;
    const clock=originalSourceUseClock({rule,job:shop.job??'',
      experience:exp});
    const trial=projectOriginalUseTransaction({
      shops:world.shops.map(x=>x.item),actingShopIndex:shopIndex,
      items:rule.limits,wholesale:world.market.wholesale,
      uses:rule.uses,creates:rule.creates,requestedCount,
      experience:exp,experienceOld:exp,
      needExperience:rule.needExperience??0,
      job:shop.job??'',needJob:rule.needJob??'',
      point:shop.point??0,needPoint:rule.needPoint??0,
      rank:shop.rank,needPopularity:rule.needPopularity??0,
      needsEvent:false,eventActive:false,
      money:shop.money,costPerUse:rule.money,
      paytoday:shop.paytoday,nowSeconds:world.nowSeconds,
      storedTimeSeconds:shop.time,baseUseTimeSeconds:clock.base,
      trainedUseTimeSeconds:clock.trained,maxStockTimeSeconds:259200,
      shopStatus:true,random:()=>0.5,
    });
    const n=trial.multiItem?.randomDraws??0;
    if(!trial.performed)return [];
    const inline=rule.inlineCallback?.kind;
    const inlineDraws=inline==='milk-cow'?trial.count+1:
      inline==='advertise-self'?1:
        inline==='drink-milk'&&trial.count<10?1:0;
    const needed=n+(rule.afterCallback?1:0)+inlineDraws;
    if(needed===0)return [];
    return sourceCommandDraws({world,kind:'use-item',
        args:{shopId:1,itemId,useId,requestedCount},count:needed});
  }
  // #14 has no material USE list. The frozen UseItem preflight clips the
  // batch by money and remaining action time BEFORE MakeAmount, and the
  // latter selects the Gaussian two-draw branch at 20+ requested products.
  // This is the reviewed source rule, not a separate player command.
  const shop=world.shops.find(row=>row.id===1);
  const experience=shop?.exp?.[String(itemId)]??0;
  const time=originalSourceUseClock({rule,job:shop?.job??'',
    experience}).seconds;
  const count=Math.max(0,Math.min(requestedCount,
    Math.floor(shop.money/rule.money),
    Math.floor((world.nowSeconds-shop.time)/time)));
  const batchGaussian=count>=2;
  const draws=sourceCommandDraws({world,kind:'use-item',
    args:{shopId:1,itemId,useId,requestedCount},count:52});
  // One funcb, then five MakeAmount calls, then one lostbook.
  return draws.slice(0,batchGaussian||draws[0]<=100000?12:52);
}
async function api(req,res,url){
  if(url.pathname==='/api/library'){
    if(req.method!=='GET')return send(res,405,{ok:false,error:'圖書館為唯讀'});
    const entries=[...url.searchParams];
    if(entries.length===0)return send(res,200,describeOriginalLibrary(reviewedLibrary));
    if(entries.length!==1||entries[0][0]!=='t'||!/^[0-7]$/.test(entries[0][1]))
      return send(res,400,{ok:false,error:'圖書館項目不存在'});
    return send(res,200,describeOriginalLibrary(reviewedLibrary,Number(entries[0][1])));
  }
  if(req.method==='GET'&&url.pathname==='/api/state'){
    return send(res,200,state());
  }
  if(req.method!=='POST')return send(res,405,{ok:false,error:'不支援的 HTTP 方法'});
  if(req.headers.origin && req.headers.origin!==`http://127.0.0.1:${server.address().port}`)
    return send(res,403,{ok:false,error:'僅允許相同來源的本機請求'});
  const body=await jsonBody(req);
  let result;
  switch(url.pathname){
    case '/api/reset': {
      // Destructive LOCAL TEST maintenance, not a gameplay delete-shop command.
      // Match the whole payload to reject accidental/legacy unconfirmed POSTs.
      if(Object.keys(body).sort().join(',')!==
           'confirm,expectedGeneration,expectedRevision,expectedWorldId'||
         body.confirm!=='RESET_LOCAL_TEST_WORLD')
        return send(res,400,{ok:false,
          error:'重置需要明確確認，不接受未確認的刪除請求',state:state()});
      const current=repo?.read()??null;
      if(body.expectedRevision!==null)
        commandNumber(body.expectedRevision,'expectedRevision');
      if(body.expectedWorldId!==null&&
         (typeof body.expectedWorldId!=='string'||!body.expectedWorldId))
        throw Error('expectedWorldId 必須是世界 ID 或 null');
      const expectedGeneration=commandNumber(body.expectedGeneration,
        'expectedGeneration');
      if(body.expectedRevision!==(current?.revision??null)||
         body.expectedWorldId!==(current?.worldId??null)||
         expectedGeneration!==saveStore.status().generation)
        return send(res,409,{ok:false,code:'RESET_CONFLICT',
          error:'世界或存檔已更新，請重新確認後再重置',state:state()});
      const cleared=saveStore.clear({expectedGeneration});
      // Only discard live memory AFTER both disk slots are successfully cleared.
      repo=null;careerProof=null;liveGeneration=0;
      return send(res,200,{ok:true,code:'RESET',
        details:{action:'reset-local-test-world',
          deletedSlots:cleared.deletedSlots,generation:cleared.generation},
        state:state()});
    }
    case '/api/load': {
      if(!exactKeys(body,''))throw Error('載入世界不接受任何欄位');
      if(repo)return send(res,409,{ok:false,
        error:'目前世界已啟用；不能將磁碟世界覆蓋正在營業的記憶體世界',state:state()});
      const saved=saveStore.load();
      repo=createSourceReviewedMemoryWorldAdapter({
        initialWorld:saved.world,streetModule,
      });
      careerProof=saved.careerProof;
      liveGeneration=saved.generation;
      return send(res,200,{ok:true,code:'LOADED',
        details:{action:'load-world',generation:saved.generation,
          recoveredPreviousGeneration:saved.recovered,
          revision:saved.world.revision},
        state:state()});
    }
    case '/api/save': {
      if(Object.keys(body).sort().join(',')!=='expectedGeneration,expectedRevision')
        throw Error('存檔只接受世界版本及存檔世代，不接受外部命令歷史');
      if(repo?.read().shops.length>1)
        return send(res,409,{ok:false,
          code:'MULTI_SHOP_PERSISTENCE_UNREVIEWED',
          error:'多店來源保存尚未驗證，B-43 不接受雙店存檔',state:state()});
      if(!repo)return send(res,409,{ok:false,
        error:'請先初始化／載入世界才可存檔',state:state()});
      const world=repo.read();
      if(world.revision!==ensureRevision(body))
        return send(res,409,{ok:false,error:'REVISION_CONFLICT',state:state()});
      const expectedGeneration=commandNumber(body.expectedGeneration,
        'expectedGeneration');
      const saved=saveStore.save(world,{expectedGeneration,careerProof});
      liveGeneration=saved.generation;
      return send(res,200,{ok:true,code:'SAVED',
        details:{action:'save-world',generation:saved.generation,
          revision:saved.revision,durable:'two-slot-atomic-rename-fsync'},
        state:state()});
    }
    case '/api/initialize': {
      if(!exactKeys(body,''))throw Error('初始化世界不接受任何欄位');
      if(repo)return send(res,409,{ok:false,error:'世界已存在；請使用當前世界',state:state()});
      const existing=saveStore.status();
      if(existing.available||existing.unreadable)
        return send(res,409,{ok:false,
          error:'已有存檔（或損毀的存檔）；請先載入或修復，不可覆寫既有世界',
          state:state()});
      const nowSeconds=process.env.AKIMONO_E2E_FIXED_NOW===undefined?
         Math.floor(Date.now()/1000):commandNumber(
           Number(process.env.AKIMONO_E2E_FIXED_NOW),'AKIMONO_E2E_FIXED_NOW',1);
      const w=createInitialWorld({worldId:randomUUID(),nowSeconds});
      const staged=createSourceReviewedMemoryWorldAdapter({
        initialWorld:w,streetModule,
      });
      const applied=executeMemoryCommand({repository:staged,streetModule,
        command:{kind:'initialize-source-market',expectedRevision:0}});
      if(!applied.ok)return send(res,409,{...applied});
      const initialProof=beginReviewedWorldHistory(applied.world);
      if(reviewedCrossPeriod)saveStore.preflight(applied.world,{expectedGeneration:0,careerProof:initialProof});
      repo=staged;
      careerProof=initialProof;
      result=applied;
      break;
    }
    case '/api/open-shop': {
      if(!exactKeys(body,'expectedRevision,ownerName,shopName'))throw Error('開店僅接受 expectedRevision、ownerName、shopName');
      const ownerName=body.ownerName,shopName=body.shopName;
      if(typeof ownerName!=='string'||typeof shopName!=='string')
        throw Error('店主與店名必須是文字');
      if(!repo)return send(res,409,{ok:false,error:'請先初始化世界',state:state()});
      if(repo.read().shops.length) return send(res,409,
        {ok:false,error:'B-40 本機來源限定單店；已經開店',state:state()});
      result=commit({kind:'open-shop',expectedRevision:ensureRevision(body),
        shopId:1,ownerName,shopName});
      break;
    }
    case '/api/r2/advertisement-package-market-preflight':
    case '/api/r2/target-advertisement-preflight':
    case '/api/r2/open-target-shop':
      return send(res,403,{ok:false,error:'僅歷史測試稽核支援多店，不是正式玩家指令',state:state()});
    case '/api/supply':
      return send(res,409,{ok:false,error:'只支援完整世界時間推進，不允許單獨供貨',state:state()});
    case '/api/buy': {
      if(!repo)return send(res,409,{ok:false,error:'請先初始化世界',state:state()});
      const fields=['expectedRevision','itemId','requestedCount',
        'marketShelf','expectedPrice'];
      if(Object.keys(body).length!==fields.length||
         fields.some(key=>!Object.hasOwn(body,key)))
        throw Error('市場只接受 market-buy 共用交易欄位；舊商品命令無效');
      result=commit({kind:'market-buy',
        expectedRevision:ensureRevision(body),shopId:1,
        itemId:commandNumber(body.itemId,'itemId',1),
        requestedCount:commandNumber(body.requestedCount,'requestedCount',1),
        marketShelf:commandNumber(body.marketShelf,'marketShelf'),
        expectedPrice:commandNumber(body.expectedPrice,'expectedPrice'),
      });
      break;
    }
    case '/api/use': {
      if(!repo)return send(res,409,{ok:false,
        error:'請先初始化來源世界',state:state()});
      if(Object.hasOwn(body,'targetShopId'))return send(res,403,{ok:false,error:'多人目標尚未授權',state:state()});
      const fields=['expectedRevision','itemId','useId','requestedCount'];
      if(Object.keys(body).length!==fields.length||
         fields.some(key=>!Object.hasOwn(body,key)))
        throw Error('USE 僅接受共用 use-item 四欄；不可指定回呼、亂數或舊商品命令');
      const expectedRevision=ensureRevision(body);
      const itemId=commandNumber(body.itemId,'itemId',1);
      const useId=commandNumber(body.useId,'useId');
      const requestedCount=commandNumber(body.requestedCount,'requestedCount',1);
      const world=repo.read();
      if(world.revision!==expectedRevision)
        return send(res,409,{ok:false,code:'REVISION_CONFLICT',
          error:'REVISION_CONFLICT',state:state()});
      const randomDraws=sampleSourceUse(world,{itemId,useId,requestedCount});
      result=commit({kind:'use-item',expectedRevision,
        shopId:1,itemId,useId,requestedCount,
        ...(randomDraws.length?{randomDraws}:{})});
      break;
    }
    case '/api/discard': {
      if(!repo)return send(res,409,{ok:false,
        error:'請先初始化世界',state:state()});
      if(Object.keys(body).sort().join(',')!=='count,expectedRevision,itemId')
        throw Error('丟棄僅接受 itemId、count、expectedRevision');
      result=commit({kind:'discard-item',
        expectedRevision:ensureRevision(body),shopId:1,
        itemId:commandNumber(body.itemId,'itemId',1),
        count:commandNumber(body.count,'count',1)});
      break;
    }
    case '/api/showcase': {
      if(!repo)return send(res,409,{ok:false,error:'請先初始化世界',state:state()});
      const itemId=commandNumber(body.itemId,'itemId');
      const p3Shelf=repo.read().shops[0]?.showcasecount===1;
      const sourceRule=(p3Shelf?streetModule.reviewedB41?.p3TurnItems?.rules?.[itemId]:
        streetModule.reviewedB41?.saleRules?.[itemId])??null;
      if(itemId!==0&&!sourceRule)
        throw Error('僅支援已審閱自然販售 ITEM 或清空展示架');
      const keys=Object.keys(body);
      if(keys.some(key=>!['expectedRevision','itemId','per',
        'priceOverride','shelf'].includes(key))||
         !Object.hasOwn(body,'expectedRevision')||
         !Object.hasOwn(body,'itemId')||
         (!Object.hasOwn(body,'per')&&
           !Object.hasOwn(body,'priceOverride')))
        throw Error('展示架僅接受原版比例 per、直接售價 priceOverride 與架號 shelf');
      const per=Object.hasOwn(body,'per')?
        commandNumber(body.per,'per',1):100;
      if(per>200)throw Error('原版展示架比例限制 1–200%');
      const priceOverride=Object.hasOwn(body,'priceOverride')?
        commandNumber(body.priceOverride,'priceOverride',1):0;
      if(priceOverride>streetModule.sourceMaxShowcasePrice)
        throw Error('直接售價超出原版 MaxMoney 上限');
      const shelf=Object.hasOwn(body,'shelf')?
        commandNumber(body.shelf,'shelf'):0;
      if(shelf>=(repo.read().shops[0]?.showcasecount??0))
        throw Error('展示架不存在，請先使用擴建工具');
      result=commit({kind:'edit-showcase',
        expectedRevision:ensureRevision(body),shopId:1,shelf,
        itemId,per,priceOverride});
      break;
    }
    case '/api/advance-reviewed-time': {
      if(!exactKeys(body,'expectedRevision,minutes'))throw Error('reviewed time accepts only expectedRevision and minutes');
      result=commit({kind:'advance-reviewed-world-time',expectedRevision:ensureRevision(body),minutes:commandNumber(body.minutes,'minutes',1)});
      break;
    }
    case '/api/advance-time':
      return send(res,409,{ok:false,error:'舊時間指令已淘汰，請使用 /api/advance-reviewed-time',state:state()});
    default:return send(res,404,{ok:false,error:'API 不存在'});
  }
  return send(res,result.ok?200:409,{
    ok:result.ok,code:result.code,details:result.details,
    state:state(),
  });
}
const statics=new Map([
  ['/','modern/local-ui/index.html'],
  ['/app.js','modern/local-ui/app.js'],
  ['/news-query.js','modern/src/shared-source-news-query.mjs'],
  ['/style.css','modern/local-ui/style.css'],
]);
const server=http.createServer(async (req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname.startsWith('/api/'))return await api(req,res,url);
    if(req.method!=='GET'||!statics.has(url.pathname))
      return send(res,404,{ok:false,error:'頁面不存在'});
    const mime=url.pathname.endsWith('.js')?'text/javascript':
      url.pathname.endsWith('.css')?'text/css':'text/html';
    res.writeHead(200,{'content-type':mime+'; charset=utf-8',
      'cache-control':'no-store','x-content-type-options':'nosniff',
      'content-security-policy':"default-src 'self'; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
    res.end(await read(statics.get(url.pathname)));
  }catch(error){
    send(res,400,{ok:false,error:error.message,state:state()});
  }
});
server.listen(port,'127.0.0.1',()=>{
  console.log(`商人物語 B-54 本機介面：http://127.0.0.1:${server.address().port}`);
  console.log('本機獨立存檔；未按「儲存」的變更仍只在記憶體。Ctrl+C 停止。');
});

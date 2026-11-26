/**
 * B-43 local-only browser adapter. No public server or authentication.
 * All authoritative changes pass GameCore -> StreetModule -> WorldState CAS.
 * Only complete reviewed normal time is admitted; no PLUS-only supply.
 */
import {originalSourceUseClock} from '../src/shared-use-experience.mjs';
import {calculateSourceShopPoint} from '../src/original-period-solo-sort.mjs';
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
import {createPeriodMemoryWorld,createSourceReviewedMemoryWorldAdapter,
  applyGameCommand,executeMemoryCommand,encodeMemorySnapshot} from '../src/game-core-contract.mjs';

import {beginReviewedWorldHistory,appendReviewedWorldHistory,verifyReviewedWorldHistory} from '../src/reviewed-world-time-history.mjs';
import {createReviewedHistoryCheckpointStore,fingerprintReviewedCheckpointRuntime} from '../src/reviewed-history-checkpoint-store.mjs';
import {createIndependentPeriodDiskStore} from '../src/r4-independent-period-disk-store.mjs';
// Same v2 authority in both reviewed modes; crossing must be explicitly enabled with a new save directory.
const reviewedCrossPeriod=process.env.AKIMONO_REVIEWED_CROSS_PERIOD==='1';
const reviewedRebelTime=process.env.AKIMONO_REVIEWED_REBEL_TIME==='1';
if(reviewedRebelTime&&(!reviewedCrossPeriod||!process.env.AKIMONO_SAVE_DIR))throw Error('反亂審閱模式需要跨期及明確獨立存檔目錄');
if(process.env.AKIMONO_E2E_DETERMINISTIC_RNG==='1'||process.env.AKIMONO_R2_TARGET_AD_MEMORY_ONLY==='1'||process.env.AKIMONO_REVIEWED_NORMAL_TIME==='0')
  throw Error('唯一新版玩家存檔不支援舊模式、fixture RNG 或多店稽核');
const exactKeys=(obj,keys)=>Object.keys(obj).sort().join(',')===keys.split(',').sort().join(',');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=rel=>readFile(path.join(root,rel),'utf8');
// Windows Git checkouts can use CRLF while the frozen source review markers
// refer to the original LF Git blobs. Normalize only source inputs in memory.
const readPinnedSource=async rel=>normalizeLocalSourceText(await read(rel));
const [
  itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,
  originalConfigSource,originalCompilerSource,originalBuySource,
  originalBuyItemSource,originalBuyCalcSource,
  originalMarketSource,originalItemSource,originalDetailSource,
  originalPeriodSource,originalUseSource,originalItemHelperSource,
  originalNewSource,originalCustomSource,originalLogSource,
  originalPalaceViewSource,originalPalaceCommandSource,originalPalaceConfigSource,
  originalArmyViewSource,originalArmyCommandSource,originalArmyFileSource,
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
  'modern/tests/original-perl/new.cgi','modern/tests/original-perl/pinned-custom.cgi','modern/tests/original-perl/pinned-log.cgi',
  'modern/tests/original-perl/pinned-palace.cgi','modern/tests/original-perl/pinned-palace-s.cgi','custom/inc-palace.cgi',
  'modern/tests/original-perl/pinned-army-view.cgi','modern/tests/original-perl/pinned-army-s.cgi','modern/tests/original-perl/pinned-army.cgi',
].map(readPinnedSource));

const streetModule=createStandardStreetModule({
  itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,
  originalConfigSource,originalCompilerSource,
  originalBuySource,originalBuyItemSource,originalBuyCalcSource,
  originalMarketSource,originalItemSource,originalDetailSource,
  originalUseSource,originalItemHelperSource,
  originalPeriodSource,originalNewSource,originalCustomSource,originalLogSource,
  originalPalaceViewSource,originalPalaceCommandSource,originalPalaceConfigSource,
  originalArmyViewSource,originalArmyCommandSource,originalArmyFileSource,
  enableReviewedNormalTime:true,enableReviewedCrossPeriod:reviewedCrossPeriod,enableReviewedRebelTime:reviewedRebelTime,
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
const checkpointStore=createReviewedHistoryCheckpointStore({
  directory:saveDirectory,crossPeriod:reviewedCrossPeriod,externalRebel:reviewedRebelTime,...fingerprintReviewedCheckpointRuntime({
    sourceDirectory:path.join(root,'modern/src'),entrypoint:fileURLToPath(import.meta.url),
    sources:[itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,originalDataWriteSource,
      originalTurnSource,originalWholeSource,originalConfigSource,originalCompilerSource,originalBuySource,
      originalBuyItemSource,originalBuyCalcSource,originalMarketSource,originalItemSource,originalDetailSource,
      originalPeriodSource,originalUseSource,originalItemHelperSource,originalNewSource,originalCustomSource,originalLogSource,
       originalPalaceViewSource,originalPalaceCommandSource,originalPalaceConfigSource,
       originalArmyViewSource,originalArmyCommandSource,originalArmyFileSource],
  }),
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
  const keys=['rank','profitstock','saletoday','taxtoday','paytoday','rankingcount'];
  const fields=Object.fromEntries(keys.map(key=>[key,shop[key]??0]));
  try{return calculateSourceShopPoint(fields);}
  catch(error){if(error instanceof RangeError)return null;throw error;}
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
    shop:world?.shops[0]??null,
    // Original point calculation; RANK is unknown until true multi-shop
    // SortDT is available. Do not label the rank field as point or RANK.
    shopSummary:{
      point:sourceShopPoint(world?.shops?.[0]??null),
      rankPosition:null,
    },
    palace:world&&streetModule.reviewedPalace?streetModule.describePalace(world):null,
    army:world&&streetModule.reviewedArmy?streetModule.describeArmy(world):null,
    ...(reviewedRebelTime?{reviewedRebelTime:true,armyConflict:world?streetModule.describeConflict(world):null}:{}),
    marketOffers,
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
    case '/api/palace-complete': {
      if(!streetModule.reviewedPalace)return send(res,409,{ok:false,error:'宮殿需已審閱的跨期來源存檔模式',state:state()});
      if(!exactKeys(body,'expectedRevision'))throw Error('宮殿只接受 expectedRevision，不接受商品、爵位、evt、點數或 RNG');
      result=commit({kind:'complete-palace-mission',expectedRevision:ensureRevision(body),shopId:1});
      break;
    }
    case '/api/army-hire':
    case '/api/army-fire': {
      if(!streetModule.reviewedArmy)return send(res,409,{ok:false,error:'傭兵所需已審閱的跨期來源存檔模式',state:state()});
      if(!exactKeys(body,'expectedRevision,requestedCount'))throw Error('傭兵所只接受 expectedRevision、requestedCount');
      result=commit({kind:url.pathname==='/api/army-hire'?'hire-army':'fire-army',
        expectedRevision:ensureRevision(body),shopId:1,requestedCount:commandNumber(body.requestedCount,'requestedCount',1)});
      break;
    }
    case '/api/army-start-rebellion':
    case '/api/army-join-rebellion':
    case '/api/army-dispatch-guard': {
      if(!streetModule.reviewedRebelTime)return send(res,409,{ok:false,error:'反亂操作需獨立審閱模式',state:state()});
      const kind=url.pathname.slice('/api/army-'.length);
      const dispatch=kind==='dispatch-guard';
      if(!exactKeys(body,dispatch?'expectedRevision':'expectedRevision,confirmation')||(!dispatch&&body.confirmation!=='rebel'))
        throw Error('反亂指令只接受版本及原版確認值，不接受兵力、城市、EVENT 或 RNG');
      result=commit({kind,expectedRevision:ensureRevision(body),shopId:1,...(dispatch?{}:{confirmation:'rebel'})});
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

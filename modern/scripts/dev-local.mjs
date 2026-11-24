/**
 * B-43 local-only browser adapter. No public server or authentication.
 * All authoritative changes pass GameCore -> StreetModule -> WorldState CAS.
 * "供貨子步驟" calls the reviewed 59-item original PLUS fragment, not a turn.
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
import {beginCareerProof,appendCareerCommand}
  from '../src/reviewed-career-save-replay.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed}
  from '../src/original-period-world-seed.mjs';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
import {createPeriodMemoryWorld,createSourceReviewedMemoryWorldAdapter,
  applyGameCommand,executeMemoryCommand} from '../src/game-core-contract.mjs';

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
].map(readPinnedSource));

const streetModule=createStandardStreetModule({
  itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,
  originalConfigSource,originalCompilerSource,
  originalBuySource,originalBuyItemSource,originalBuyCalcSource,
  originalMarketSource,originalItemSource,originalDetailSource,
  originalUseSource,originalItemHelperSource,
});
if(!['initialize-source-market','open-shop','reviewed-sparse-all-plus',
  'market-buy','use-item','edit-showcase','advance-source-time']
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
// are recorded. Unsupported actions invalidate the proof, not the old save.
let repo=null,careerProof=null,careerRequired=false;
function verifyCareerDraws(world,command){
  if(command.kind==='reviewed-sparse-all-plus'){
    const expected=sampleOriginalPlus(world,command.timespanSeconds);
    return JSON.stringify(expected.randomDraws)===JSON.stringify(command.randomDraws);
  }
  if(command.kind==='use-item'){
    const expected=sampleSourceUse(world,command);
    return JSON.stringify(expected)===JSON.stringify(command.randomDraws??[]);
  }
  return !Object.hasOwn(command,'randomDraws');
}
const saveStore=createLocalWorldSaveStore({
  directory:process.env.AKIMONO_SAVE_DIR??path.join(root,'modern/.local-data'),
  marketBuyRegistry:streetModule.marketBuyRegistry,
  useItem:streetModule.useItem,
  careerReplay:{streetModule,createInitialWorld,verifyDraws:verifyCareerDraws},
});
// Opt-in R2 memory-only audit. NOT player authentication or durable multi-shop.
const targetAdvertisementMemoryAudit=
  process.env.AKIMONO_R2_TARGET_AD_MEMORY_ONLY==='1';
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
// Read-only evidence for opt-in local #62/1 audit. Market canBuy means
// source-stock/registry availability, NOT sufficient player cash or complete
// authority to USE; never advertise a positive player-readiness verdict.
function targetAdvertisementReadiness(world,marketOffers){
  const actor=world?.shops.find(shop=>shop.id===1)??null;
  const quote=marketOffers.find(offer=>offer.itemId===62)??null;
  const sourcePrice=Number.isSafeInteger(quote?.price)&&quote.price>0?
    quote.price:null;
  const cash=Number.isSafeInteger(actor?.money)&&actor.money>=0?
    actor.money:null;
  return {
    evidenceOnly:true,authoritativeUseApproval:false,
    actorShopId:actor?.id??null,authenticated:false,
    packageOwned:actor?.item?.[61]??null,
    sourceQuote:sourcePrice===null?null:{
      itemId:62,unitPrice:sourcePrice,
      marketStock:quote.marketStock,
      sourceListed:quote.canBuy===true,
      cashShortfall:cash===null?null:Math.max(0,sourcePrice-cash),
    },
    cash:cash,
    eventStateKnowledge:world?.period?.eventState===null?
      'unreviewed':world?'source-known':'no-world',
    twoShopDiskSaveRejected:(world?.shops.length??0)>1,
  };
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
    // Only source-created live shops, never client-supplied target records.
    targetAdvertisementAudit:targetAdvertisementMemoryAudit?{
      memoryOnly:true,authenticated:false,durable:false,
      targets:world?.shops?.length===2&&world.shops[0]?.id===1?
        world.shops.filter(shop=>shop.id!==1&&shop.status===1)
          .map(shop=>({shopId:shop.id,shopName:shop.shopname})):[],
      readiness:targetAdvertisementReadiness(world,marketOffers),
    }:null,
    showcaseEditTimeSeconds:streetModule.showcaseEditTimeSeconds,
    showcaseOffers:Object.values(streetModule.reviewedB41?.saleRules??{})
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
    capabilities:['建立來源世界','原版開店','真實 PLUS 供貨子步驟',
      '來源市場實際有貨商品進貨','已審閱 #79／#14 共用 USE／製作',
      '來源 #10／#40～#44 共用展示架',
      '原版 #63 擴建/拆卸 USE（1～8 架）','來源物品丟棄（不耗時間）',
      '原版自然販售片段／時間（多架／EVENT 待審閱）'],
    disabled:['跨期決算','完整原版所有商品回呼','多人'],
    memoryOnly:!save.available,
    diskSaveAvailable:true,
    sourceCityState:world?.period?.town??null,
    sourcePeriodMetadata:world?.period?{
      state:world.period.state,dtPeople:world.period.dtPeople,
      settledCount:world.period.settledCount,
      activeEventsKnownEmpty:world.period.eventState!==null,
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
  const result=executeMemoryCommand({repository:repo,streetModule,command});
  if(result.ok){
    if(command.kind==='use-item'&&command.itemId===78)careerRequired=true;
    careerProof=appendCareerCommand(careerProof,command);
  }
  return result;
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
function sampleOriginalPlus(world,timespanSeconds){
  // Reviewed B-37 accepts integer-millionth external rand draws only.
  // Each of 59 PLUS directives takes 1 or 2 random draws in source order.
  // Determine the exact consumed prefix with a NON-COMMITTING GameCore probe.
  const pool=process.env.AKIMONO_E2E_DETERMINISTIC_RNG==='1'
    ?Array(118).fill(0)
    :sourceCommandDraws({world,kind:'reviewed-sparse-all-plus',
      args:{timespanSeconds},count:118});
  for(let n=59;n<=118;n++){
    const command={kind:'reviewed-sparse-all-plus',
      expectedRevision:world.revision,timespanSeconds,
      randomDraws:pool.slice(0,n)};
    const probe=applyGameCommand({world,command,streetModule});
    if(probe.ok)return command;
    if(probe.code==='SOURCE_BOUNDARY_REJECTED' &&
       /missing original random draw|unused source random samples/.test(
         probe.details?.reason??''))continue;
    throw Error('來源供貨拒絕：'+(probe.details?.reason??probe.code));
  }
  throw Error('無法配對原版 PLUS 隨機抽樣消耗次序');
}
// HTTP NEVER accepts randomDraws from a player. These source-reviewed
// samples are command/revision-scoped; deterministic E2E cases match the
// original frozen Perl probes and are selected ONLY by a local test env var.
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
    return process.env.AKIMONO_E2E_DETERMINISTIC_RNG==='1'
      ?Array(needed).fill(500000)
      :sourceCommandDraws({world,kind:'use-item',
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
  const testMode=process.env.AKIMONO_E2E_DETERMINISTIC_RNG==='1';
  let draws;
  if(testMode){
    const scenario=process.env.AKIMONO_E2E_USE_SCENARIO??'mixed';
    const ordinary=Array.from({length:5},
      ()=>[0,0,...Array(8).fill(999999)]).flat();
    const gaussian=Array(10).fill(0);
    const cases={
      mixed:[999999,...(batchGaussian?gaussian:ordinary),999999],
      'mixed-loss':[999999,...(batchGaussian?gaussian:ordinary),0],
      'zero-loss':[999999,...(batchGaussian?gaussian:
        Array(50).fill(999999)),0],
      doubled:[0,...gaussian,999999],
      'doubled-loss':[0,...gaussian,0],
      boundary:[100000,...gaussian,100000],
    };
    draws=cases[scenario];
    if(!draws)throw Error('不支援的來源 E2E 亂數測試情境');
  }else{
    draws=sourceCommandDraws({world,kind:'use-item',
      args:{shopId:1,itemId,useId,requestedCount},count:52});
  }
  // One funcb, then five MakeAmount calls, then one lostbook.
  return draws.slice(0,batchGaussian||draws[0]<=100000?12:52);
}
function sampleSourceTime(world,minutes){
  // One source stream: natural sales, ITEM FUNCTURN/FUNCSALE, then 59 PLUS.
  // The no-stock #70 callback consumes rand(1) at a 1-minute interval.
  const pool=process.env.AKIMONO_E2E_DETERMINISTIC_RNG==='1'
    ?[500000,...Array(120).fill(0)]
    :sourceCommandDraws({world,kind:'advance-source-time',
      args:{shopId:1,minutes},count:121});
  for(let n=59;n<=121;n++){
    const command={kind:'advance-source-time',expectedRevision:world.revision,
      shopId:1,minutes,randomDraws:pool.slice(0,n)};
    const probe=applyGameCommand({world,command,streetModule});
    if(probe.ok)return command;
    if(probe.code==='SOURCE_BOUNDARY_REJECTED' &&
       /missing natural\/PLUS source draw|missing original random draw|unused source random samples/.test(
         probe.details?.reason??''))continue;
    throw Error('原版時間片遭拒絕：'+(probe.details?.reason??probe.code));
  }
  throw Error('原版自然販售與供貨共用亂數串流未能完整配對');
}
async function api(req,res,url){
  if(req.method==='GET'&&url.pathname==='/api/state'){
    return send(res,200,state());
  }
  if(req.method!=='POST')return send(res,405,{ok:false,error:'不支援的 HTTP 方法'});
  if(req.headers.origin && req.headers.origin!==`http://127.0.0.1:${server.address().port}`)
    return send(res,403,{ok:false,error:'僅允許相同來源的本機請求'});
  const body=await jsonBody(req);
  // Opening a second shop is an isolated memory audit, not permission to
  // run arbitrary single-shop player commands against a two-shop world.
  const inTwoShopAudit=targetAdvertisementMemoryAudit&&
    repo?.read().shops.length===2;
  const reviewedTargetUse=inTwoShopAudit&&
    url.pathname==='/api/use'&&body.itemId===62&&body.useId===1&&
    Object.hasOwn(body,'targetShopId');
  if(inTwoShopAudit&&!reviewedTargetUse&&
     ['/api/use','/api/buy','/api/supply','/api/discard',
       '/api/showcase','/api/advance-time'].includes(url.pathname))
    return send(res,409,{ok:false,code:'UNREVIEWED_TWO_SHOP_ACTION',
      error:'雙店驗證只允許原版 #62/1，共用單店玩法不得在多店中執行',
      state:state()});
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
      repo=null;careerProof=null;careerRequired=false;
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
      careerRequired=Boolean(saved.careerProof);
      careerProof=saved.careerProof??beginCareerProof(saved.world,'legacy');
      return send(res,200,{ok:true,code:'LOADED',
        details:{action:'load-world',generation:saved.generation,
          recoveredPreviousGeneration:saved.recovered,
          revision:saved.world.revision},
        state:state()});
    }
    case '/api/save': {
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
      if(careerRequired&&!careerProof)
        return send(res,409,{ok:false,code:'CAREER_HISTORY_UNREVIEWED',
          error:'轉職後的操作超出已審閱保存範圍，保留上一有效存檔',state:state()});
      const saved=saveStore.save(world,{expectedGeneration,
        ...(careerRequired?{careerProof}:{})});
      // Ordinary checkpoints remain backwards compatible. If a previously
      // untracked action was accepted by legacy B-43, begin at that checked
      // checkpoint rather than inventing a missing command history.
      if(!careerRequired&&!careerProof)careerProof=beginCareerProof(world,'legacy');
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
      repo=staged;careerRequired=false;
      careerProof=beginCareerProof(applied.world,'fresh');
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
    case '/api/r2/advertisement-package-market-preflight': {
      // Read-only original #62 market-buy proposal. Both the shelf and the
      // exact wholesale quote come from this server's source WorldState,
      // never from the HTTP caller. No CAS, stock, money, or time mutation.
      if(!targetAdvertisementMemoryAudit)
        return send(res,403,{ok:false,code:'R2_AUDIT_DISABLED',
          error:'原版廣告包市場稽核未啟用',state:state()});
      if(Object.keys(body).sort().join(',')!=='expectedRevision')
        throw Error('廣告包購買稽核只接受 expectedRevision；價格、架位、金錢與商品皆由來源世界決定');
      const expectedRevision=ensureRevision(body);
      if(!repo)return send(res,409,{ok:false,code:'WORLD_NOT_INITIALIZED',
        error:'沒有來源世界',state:state()});
      const world=repo.read();
      if(expectedRevision!==world.revision)
        return send(res,409,{ok:false,code:'REVISION_CONFLICT',
          error:'REVISION_CONFLICT',state:state()});
      if(world.shops.length!==1||world.shops[0]?.id!==1)
        return send(res,409,{ok:false,code:'R2_PREFLIGHT_REQUIRES_ONE_SHOP',
          error:'原版市場買入只允許來源單店世界',state:state()});
      const offer=world.market?streetModule.quoteMarketOffer(world,62):null;
      // An on-shelf quote can still be unbuyable under the original EVENT
      // gate. Project anyway, so the shared core reports that precise gate.
      const available=Number.isSafeInteger(offer?.marketStock)&&
        offer.marketStock>0&&
        Number.isSafeInteger(offer?.price)&&offer.price>0&&
        Number.isSafeInteger(offer?.shelf)&&offer.shelf>=0;
      const projected=available?applyGameCommand({world,streetModule,
        command:{kind:'market-buy',expectedRevision,shopId:1,
          itemId:62,requestedCount:1,marketShelf:offer.shelf,
          expectedPrice:offer.price}}):null;
      return send(res,200,{ok:true,code:'R2_MARKET_PREFLIGHT_CHECKED',
        details:{
          action:'r2-advertisement-package-source-market-preflight',
          sourceRevision:expectedRevision,itemId:62,
          memoryOnly:true,authenticated:false,committed:false,
          persisted:false,authoritativeBuyApproval:false,
          sourceOfferAvailable:available,
          sourceAdvertisedCanBuy:offer?.canBuy===true,
          sourceQuote:available?{
            unitPrice:offer.price,marketShelf:offer.shelf,
            marketStock:offer.marketStock,
          }:null,
          sourceProjectionSucceeded:projected?.ok??false,
          sourceProjectionCode:projected?.code??
            'SOURCE_MARKET_OFFER_UNAVAILABLE',
          sourceRejectionReason:projected?
            (projected.ok?null:
              (projected.details?.reason??projected.code)):
            'source ITEM #62 wholesale offer is not currently available',
          ...(projected?.ok?{
            projectedPackageStock:projected.world.shops[0].item[61],
            projectedMoney:projected.world.shops[0].money,
          }:{}),
        },
        state:state()});
    }
    case '/api/r2/target-advertisement-preflight': {
      // Non-committing, opt-in R2 diagnostic. Execute the same GameCore
      // source transaction projector without publishing its proposed world.
      // Not auth, an inventory grant, or a player USE authorization.
      if(!targetAdvertisementMemoryAudit)
        return send(res,403,{ok:false,code:'R2_AUDIT_DISABLED',
          error:'原版跨店廣告稽核未啟用',state:state()});
      if(Object.keys(body).sort().join(',')!==
           'expectedRevision,targetShopId')
        throw Error('稽核只接受 expectedRevision、targetShopId；不得提供亂數、角色、資金或回呼');
      const expectedRevision=ensureRevision(body);
      const targetShopId=commandNumber(body.targetShopId,'targetShopId',1);
      if(!repo)return send(res,409,{ok:false,code:'WORLD_NOT_INITIALIZED',
        error:'沒有來源世界',state:state()});
      const world=repo.read();
      if(expectedRevision!==world.revision)
        return send(res,409,{ok:false,code:'REVISION_CONFLICT',
          error:'REVISION_CONFLICT',state:state()});
      if(world.shops.length!==2||world.shops[0]?.id!==1||
         !world.shops.some(shop=>shop.id===targetShopId&&
           shop.status===1&&shop.id!==1))
        return send(res,409,{ok:false,code:'INVALID_SOURCE_TARGET',
          error:'目標必須是來源世界中的另一間有效店舖',state:state()});
      const projected=applyGameCommand({world,streetModule,
        command:{kind:'use-item',expectedRevision,shopId:1,
          itemId:62,useId:1,requestedCount:1,targetShopId}});
      return send(res,200,{ok:true,code:'R2_PREFLIGHT_CHECKED',
        details:{
          action:'r2-target-advertisement-source-preflight',
          targetShopId,sourceRevision:expectedRevision,
          memoryOnly:true,authenticated:false,committed:false,
          persisted:false,authoritativeUseApproval:false,
          sourceProjectionSucceeded:projected.ok,
          sourceProjectionCode:projected.code,
          sourceRejectionReason:projected.ok?null:
            (projected.details?.reason??projected.code),
          ...(projected.ok?{
            projectedTargetRank:projected.world.shops.find(
              shop=>shop.id===targetShopId)?.rank??null,
          }:{}),
        },
        state:state()});
    }
    case '/api/r2/open-target-shop': {
      // Auditing only: source open-shop for a second shop, not a second
      // authenticated player. Disable by default; no injected inventory.
      if(!targetAdvertisementMemoryAudit)
        return send(res,403,{ok:false,code:'R2_AUDIT_DISABLED',
          error:'雙店驗證模式未啟用',state:state()});
      if(Object.keys(body).sort().join(',')!==
         'expectedRevision,ownerName,shopName')
        throw Error('雙店驗證只接受 expectedRevision、ownerName、shopName');
      if(typeof body.ownerName!=='string'||
         typeof body.shopName!=='string')
        throw Error('第二間店的店主與店名必須是文字');
      if(!repo||repo.read().shops.length!==1||
         repo.read().shops[0]?.id!==1)
        return send(res,409,{ok:false,code:'R2_AUDIT_REQUIRES_ONE_SHOP',
          error:'只可在單店來源世界中開啟驗證目標店',state:state()});
      result=commit({kind:'open-shop',
        expectedRevision:ensureRevision(body),shopId:2,
        ownerName:body.ownerName,shopName:body.shopName});
      break;
    }
    case '/api/supply': {
      if(!repo)return send(res,409,{ok:false,error:'請先初始化世界',state:state()});
      const revision=ensureRevision(body),timespanSeconds=
        commandNumber(body.timespanSeconds,'timespanSeconds',1);
      if(![60,600,3600].includes(timespanSeconds))
        throw Error('供貨子步驟只支援來源驗證的 60／600／3600 秒');
      const before=repo.read();
      if(before.revision!==revision)
        return send(res,409,{ok:false,error:'REVISION_CONFLICT',state:state()});
      if(before.shops.length!==1)throw Error('先開店，再執行來源供貨');
      const command=sampleOriginalPlus(before,timespanSeconds);
      result=commit(command);
      break;
    }
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
        expectedPrice:commandNumber(body.expectedPrice,'expectedPrice',1),
      });
      break;
    }
    case '/api/use': {
      if(!repo)return send(res,409,{ok:false,
        error:'請先初始化來源世界',state:state()});
      const targeted=Object.hasOwn(body,'targetShopId');
      if(targeted&&(!targetAdvertisementMemoryAudit||
           body.itemId!==62||body.useId!==1))
        return send(res,403,{ok:false,code:'UNREVIEWED_HTTP_TARGET',
          error:'僅記憶體驗證模式可指定原版 #62/1 目標店',state:state()});
      const fields=['expectedRevision','itemId','useId','requestedCount',
        ...(targeted?['targetShopId']:[])];
      if(Object.keys(body).length!==fields.length||
         fields.some(key=>!Object.hasOwn(body,key)))
        throw Error('USE 僅接受共用 use-item 四欄；不可指定回呼、亂數或舊商品命令');
      const expectedRevision=ensureRevision(body);
      const itemId=commandNumber(body.itemId,'itemId',1);
      const useId=commandNumber(body.useId,'useId');
      const requestedCount=commandNumber(body.requestedCount,'requestedCount',1);
      const targetShopId=targeted?commandNumber(body.targetShopId,'targetShopId',1):null;
      const world=repo.read();
      if(world.revision!==expectedRevision)
        return send(res,409,{ok:false,code:'REVISION_CONFLICT',
          error:'REVISION_CONFLICT',state:state()});
      if(targeted){
        // Browser never chooses the acting shop. Resolve canonical target ID
        // from this authoritative world; GameCore rechecks it within CAS.
        if(world.shops.length!==2||world.shops[0]?.id!==1||
           !world.shops.some(shop=>shop.id===targetShopId&&
             shop.status===1&&shop.id!==1))
          return send(res,409,{ok:false,code:'INVALID_SOURCE_TARGET',
            error:'目標不在已開設的第二間來源店舖中',state:state()});
      }
      const randomDraws=sampleSourceUse(world,{itemId,useId,requestedCount});
      result=commit({kind:'use-item',expectedRevision,
        shopId:1,itemId,useId,requestedCount,
        ...(targeted?{targetShopId}:{}),
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
      const sourceRule=streetModule.reviewedB41?.saleRules?.[itemId]??null;
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
    case '/api/advance-time': {
      if(!repo)return send(res,409,{ok:false,error:'請先初始化世界',state:state()});
      const revision=ensureRevision(body);
      const minutes=commandNumber(body.minutes,'minutes',1);
      if(minutes>60)throw Error('每次可快轉 1 至 60 分鐘，避免跳過未實作週期');
      const before=repo.read();
      if(before.revision!==revision)
        return send(res,409,{ok:false,error:'REVISION_CONFLICT',state:state()});
      if(before.shops.length!==1)throw Error('請先完成來源開店');
      result=commit(sampleSourceTime(before,minutes));
      break;
    }
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

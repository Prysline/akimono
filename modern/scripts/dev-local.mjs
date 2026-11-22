/**
 * B-43 local-only browser adapter. No public server or authentication.
 * All authoritative changes pass GameCore -> StreetModule -> WorldState CAS.
 * "供貨子步驟" calls the reviewed 59-item original PLUS fragment, not a turn.
 */
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {sourceCommandDraws}
  from '../src/local-source-command-draws.mjs';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createLocalWorldSaveStore} from '../src/local-world-save-store.mjs';
import {reviewOriginalPeriodBootstrap,createOriginalPeriodSeed}
  from '../src/original-period-world-seed.mjs';
import {normalizeLocalSourceText} from '../src/local-source-text.mjs';
import {createPeriodMemoryWorld,createMemoryWorldAdapter,
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

let repo=null;
const saveStore=createLocalWorldSaveStore({
  directory:process.env.AKIMONO_SAVE_DIR??path.join(root,'modern/.local-data'),
  marketBuyRegistry:streetModule.marketBuyRegistry,
  useItem:streetModule.useItem,
});
const port=Number(process.env.AKIMONO_PORT??'4173');
if(!Number.isSafeInteger(port)||port<0||port>65535)throw Error('invalid port');
const send=(res,status,obj)=>{
  res.writeHead(status,{'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(JSON.stringify(obj));
};
function state(){
  const world=repo?.read()??null;
  const save=saveStore.status();
  const period=streetModule.reviewedB41.periodSeconds;
  const shift=streetModule.reviewedB41.clockShiftSeconds;
  const nextSettlementAtSeconds=world?
    (Math.floor((world.nowSeconds+shift)/period)+1)*period-shift:null;
  return {
    world,
    save,
    nextSettlementAtSeconds,
    secondsUntilSettlement:world?nextSettlementAtSeconds-world.nowSeconds:null,
    shop:world?.shops[0]??null,
    marketOffers:world?.market?streetModule.listMarketOffers(world):[],
    // Product names for owned inventory must not disappear when source
    // wholesale stock is sold out; catalog is not the market's offers.
    itemCatalog:(streetModule.marketBuyRegistry?.entries??[])
      .map(e=>({itemId:e.itemId,name:e.itemName})),
    useOffers:streetModule.listUseOffers(world),
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
      '來源 #10／#40～#44 共用展示架','原版自然販售片段／時間（EVENT 待審閱）'],
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
  return executeMemoryCommand({repository:repo,streetModule,command});
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
  if(!rule?.beforeCallback)return [];
  const testMode=process.env.AKIMONO_E2E_DETERMINISTIC_RNG==='1';
  let draws;
  if(testMode){
    const scenario=process.env.AKIMONO_E2E_USE_SCENARIO??'mixed';
    const mixed=Array.from({length:5},
      ()=>[0,0,...Array(8).fill(999999)]).flat();
    const gaussian=Array(10).fill(0);
    const cases={
      mixed:[999999,...mixed,999999],
      'mixed-loss':[999999,...mixed,0],
      'zero-loss':[999999,...Array(50).fill(999999),0],
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
  // Original funcb uses <=100/1000 and runs BEFORE MakeAmount. It is
  // followed by five 10-draw groups OR five 2-draw groups, then lostbook.
  return draws.slice(0,draws[0]<=100000?12:52);
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
  let result;
  switch(url.pathname){
    case '/api/load': {
      if(repo)return send(res,409,{ok:false,
        error:'目前世界已啟用；不能將磁碟世界覆蓋正在營業的記憶體世界',state:state()});
      const saved=saveStore.load();
      repo=createMemoryWorldAdapter(saved.world);
      return send(res,200,{ok:true,code:'LOADED',
        details:{action:'load-world',generation:saved.generation,
          recoveredPreviousGeneration:saved.recovered,
          revision:saved.world.revision},
        state:state()});
    }
    case '/api/save': {
      if(!repo)return send(res,409,{ok:false,
        error:'請先初始化／載入世界才可存檔',state:state()});
      const world=repo.read();
      if(world.revision!==ensureRevision(body))
        return send(res,409,{ok:false,error:'REVISION_CONFLICT',state:state()});
      const expectedGeneration=commandNumber(body.expectedGeneration,
        'expectedGeneration');
      const saved=saveStore.save(world,{expectedGeneration});
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
      const w=createPeriodMemoryWorld({worldId:randomUUID(),
        streetId:streetModule.id,nowSeconds,
        period:createOriginalPeriodSeed(reviewedPeriodSeed)});
      const staged=createMemoryWorldAdapter(w);
      const applied=executeMemoryCommand({repository:staged,streetModule,
        command:{kind:'initialize-source-market',expectedRevision:0}});
      if(!applied.ok)return send(res,409,{...applied});
      repo=staged;
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
    case '/api/showcase': {
      if(!repo)return send(res,409,{ok:false,error:'請先初始化世界',state:state()});
      const itemId=commandNumber(body.itemId,'itemId');
      const sourceRule=streetModule.reviewedB41?.saleRules?.[itemId]??null;
       if(itemId!==0&&!sourceRule)
         throw Error('僅支援已審閱的自然販售 ITEM 或清空展示架');
       if(body.priceOverride!==(sourceRule?.unitPrice??0))
         throw Error('展示架只接受已審閱原版 ITEM 原價');
      result=commit({kind:'edit-showcase',
        expectedRevision:ensureRevision(body),shopId:1,shelf:0,
        itemId,per:100,priceOverride:body.priceOverride});
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

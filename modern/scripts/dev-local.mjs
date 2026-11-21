/**
 * B-40 local-only browser adapter. NO public server, credentials or disk save.
 * All authoritative changes pass GameCore -> StreetModule -> WorldState CAS.
 * "供貨子步驟" calls the reviewed 59-item original PLUS fragment, not a turn.
 */
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomInt,randomUUID} from 'node:crypto';
import {createStandardStreetModule} from '../src/standard-street-module.mjs';
import {createMemoryWorld,createMemoryWorldAdapter,
  applyGameCommand,executeMemoryCommand} from '../src/game-core-contract.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=rel=>readFile(path.join(root,rel),'utf8');
const [
  itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,
  originalConfigSource,originalCompilerSource,originalBuySource,
  originalBuyItemSource,originalBuyCalcSource,
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
].map(read));

const streetModule=createStandardStreetModule({
  itemDsl,rebelDsl,originalAdminInitSource,originalDataReadSource,
  originalDataWriteSource,originalTurnSource,originalWholeSource,
  originalConfigSource,originalCompilerSource,
  originalBuySource,originalBuyItemSource,originalBuyCalcSource,
});
if(!['initialize-source-market','open-shop','reviewed-sparse-all-plus',
  'buy-market-item-10'].every(c=>streetModule.capabilities.includes(c)))
  throw Error('B-40 runtime source-review capabilities missing');

let repo=null;
const port=Number(process.env.AKIMONO_PORT??'4173');
if(!Number.isSafeInteger(port)||port<0||port>65535)throw Error('invalid port');
const send=(res,status,obj)=>{
  res.writeHead(status,{'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(JSON.stringify(obj));
};
function state(){
  const world=repo?.read()??null;
  return {
    world,
    shop:world?.shops[0]??null,
    item10:world?.market?streetModule.quoteMarketItem10(world):null,
    capabilities:['建立來源世界','原版開店','真實 PLUS 供貨子步驟','市場 #10 進貨'],
    disabled:['上架／販售','遊戲週期推進','週期結算','存檔／載入','多人'],
    memoryOnly:true,
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
  const pool=Array.from({length:118},()=>randomInt(1000000));
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
    case '/api/initialize': {
      if(repo)return send(res,409,{ok:false,error:'世界已存在；請重啟本機服務建立新世界',state:state()});
      const nowSeconds=Math.floor(Date.now()/1000);
      const w=createMemoryWorld({worldId:randomUUID(),
        streetId:streetModule.id,nowSeconds});
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
      result=commit({kind:'buy-market-item-10',
        expectedRevision:ensureRevision(body),shopId:1,
        requestedCount:commandNumber(body.requestedCount,'requestedCount',1),
        marketShelf:commandNumber(body.marketShelf,'marketShelf'),
        expectedPrice:commandNumber(body.expectedPrice,'expectedPrice',1),
      });
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
  console.log(`商人物語 B-40 本機介面：http://127.0.0.1:${server.address().port}`);
  console.log('本機記憶體，關閉服務資料即遺失；Ctrl+C 停止。');
});
